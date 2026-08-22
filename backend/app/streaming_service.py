"""Streaming analysis service — SSE-based real-time LLM token streaming."""

import json
import logging
import time

from openai import OpenAI, APITimeoutError, APIConnectionError, RateLimitError

from app.config import settings
from app.models import Condition, DocumentationGap, QuoteValidation
from app.prompts.analysis_prompt import build_analysis_prompt

logger = logging.getLogger(__name__)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key,
    timeout=60.0,
    max_retries=0,
)

MODEL_NAME = "google/gemini-2.5-flash"


def stream_analysis(note_text: str):
    """Generator that yields SSE-compatible events during analysis.

    Yields dicts with 'event' and 'data' keys:
    - {"event": "start", "data": {"message": "Starting analysis..."}}
    - {"event": "token", "data": {"token": "..."}}  (raw LLM tokens)
    - {"event": "progress", "data": {"stage": "parsing"}}
    - {"event": "progress", "data": {"stage": "validating_quotes"}}
    - {"event": "complete", "data": {full_analysis_dict}}
    - {"event": "error", "data": {"message": "..."}}
    """
    if not note_text or not note_text.strip():
        yield {"event": "error", "data": {"message": "Note text is empty."}}
        return

    if len(note_text) > 30000:
        yield {"event": "error", "data": {"message": "Note exceeds 30,000 character limit."}}
        return

    yield {"event": "start", "data": {"message": "Starting analysis..."}}

    system_prompt, user_prompt = build_analysis_prompt(note_text)

    try:
        yield {"event": "progress", "data": {"stage": "calling_model"}}

        # Use streaming mode for real-time tokens
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=4096,
            response_format={"type": "json_object"},
            stream=True,
        )

        full_content = ""
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_content += token
                yield {"event": "token", "data": {"token": token}}

        yield {"event": "progress", "data": {"stage": "parsing"}}

        raw_output = json.loads(full_content)

        conditions = [Condition(**c) for c in raw_output.get("conditions", [])]
        gaps = [DocumentationGap(**g) for g in raw_output.get("documentation_gaps", [])]
        summary = raw_output.get("summary", "No summary generated.")

        yield {"event": "progress", "data": {"stage": "validating_quotes"}}

        quote_validation = validate_quotes_stream(conditions, note_text)

        result = {
            "conditions": [c.model_dump() for c in conditions],
            "gaps": [g.model_dump() for g in gaps],
            "summary": summary,
            "quote_validation": [q.model_dump() for q in quote_validation],
            "model_version": MODEL_NAME,
            "prompt_version": "v2",
            "status": "completed",
        }

        yield {"event": "complete", "data": result}

    except (APITimeoutError, APIConnectionError) as e:
        logger.error(f"Streaming API error: {e}")
        yield {"event": "error", "data": {"message": "API connection failed. Please try again."}}
    except json.JSONDecodeError:
        logger.error("Model returned invalid JSON in stream")
        yield {"event": "error", "data": {"message": "AI returned malformed output. Please retry."}}
    except RateLimitError:
        yield {"event": "error", "data": {"message": "Rate limit exceeded. Please wait."}}
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield {"event": "error", "data": {"message": f"Analysis failed: {str(e)[:200]}"}}


def validate_quotes_stream(conditions: list[Condition], note_text: str) -> list[QuoteValidation]:
    """Same as gemini_service.validate_quotes — checks quotes verbatim."""
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
