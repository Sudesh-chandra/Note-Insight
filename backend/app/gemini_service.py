from openai import OpenAI, APITimeoutError, APIConnectionError, RateLimitError
import json
import logging
import time

from app.config import settings
from app.models import Condition, DocumentationGap, QuoteValidation
from app.prompts.analysis_prompt import build_analysis_prompt

logger = logging.getLogger(__name__)

# OpenRouter client (OpenAI-compatible API)
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key,
    timeout=60.0,
    max_retries=0,  # We handle retries ourselves
)

# Using Gemini 2.5 Flash via OpenRouter (higher-tier model)
MODEL_NAME = "google/gemini-2.5-flash"
PROMPT_VERSION = "v2"
MAX_RETRIES = 2
RETRY_DELAY_SECONDS = 2


def analyze_note(note_text: str) -> dict:
    """Send note to Gemini (via OpenRouter) and return structured analysis.

    Returns dict with keys: conditions, gaps, summary, quote_validation, status
    Handles malformed output, timeouts, and API failures gracefully.
    """
    # Input validation — guard against empty or oversized notes
    if not note_text or not note_text.strip():
        return _failure_result("Note text is empty. Please paste a clinical note.")

    if len(note_text) > 30000:
        return _failure_result("Note exceeds the 30,000 character limit. Please shorten it.")

    system_prompt, user_prompt = build_analysis_prompt(note_text)

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=4096,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from model")

            raw_output = json.loads(content)

            conditions = [Condition(**c) for c in raw_output.get("conditions", [])]
            gaps = [DocumentationGap(**g) for g in raw_output.get("documentation_gaps", [])]
            summary = raw_output.get("summary", "No summary generated.")

            if not conditions and not gaps:
                logger.warning("Model returned empty conditions and gaps")

            # Validate evidence quotes against source note
            quote_validation = validate_quotes(conditions, note_text)

            return {
                "conditions": conditions,
                "gaps": gaps,
                "summary": summary,
                "quote_validation": quote_validation,
                "model_version": MODEL_NAME,
                "prompt_version": PROMPT_VERSION,
                "status": "completed",
            }

        except (APITimeoutError, APIConnectionError) as e:
            # Transient errors — retry with backoff
            last_error = e
            logger.warning(
                f"Transient error on attempt {attempt + 1}/{MAX_RETRIES + 1}: {e}"
            )
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY_SECONDS * (attempt + 1))
                continue

        except RateLimitError as e:
            logger.error(f"Rate limit hit: {e}")
            return _failure_result("Rate limit exceeded. Please wait a moment and try again.")

        except json.JSONDecodeError as e:
            logger.error(f"Model returned invalid JSON: {e}")
            return _failure_result("AI returned malformed output. Please retry.")

        except Exception as e:
            logger.error(f"API error: {e}")
            return _failure_result(f"Analysis failed: {str(e)[:200]}")

    logger.error(f"All {MAX_RETRIES + 1} attempts failed. Last error: {last_error}")
    return _failure_result("Analysis failed after multiple attempts. Please try again later.")


def validate_quotes(conditions: list[Condition], note_text: str) -> list[QuoteValidation]:
    """Check that every evidence_quote is a real substring of the note.

    Normalizes whitespace before comparison to handle minor formatting differences.
    """
    validations = []
    normalized_note = " ".join(note_text.split())

    for condition in conditions:
        quote = condition.evidence_quote
        normalized_quote = " ".join(quote.split())
        found = normalized_quote in normalized_note
        validations.append(
            QuoteValidation(
                condition_name=condition.name,
                evidence_quote=quote,
                found_in_note=found,
            )
        )

    return validations


def _failure_result(message: str) -> dict:
    """Standard failure response when the model returns garbage or errors out."""
    return {
        "conditions": [],
        "gaps": [DocumentationGap(description=message, severity="high")],
        "summary": "Analysis failed. Please try again.",
        "quote_validation": [],
        "model_version": MODEL_NAME,
        "prompt_version": PROMPT_VERSION,
        "status": "failed",
    }
