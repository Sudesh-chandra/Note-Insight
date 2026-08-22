import { useMemo } from "react";
import type { Condition } from "../../types";

interface EvidenceHighlightProps {
  noteText: string;
  conditions: Condition[];
  highlightedConditionIndex: number | null;
  onConditionHover: (index: number | null) => void;
}

/**
 * Renders the clinical note text with evidence quotes highlighted.
 * When a condition card is hovered, its evidence_quote is highlighted in the note.
 */
export function EvidenceHighlight({
  noteText,
  conditions,
  highlightedConditionIndex,
}: EvidenceHighlightProps) {
  const segments = useMemo(() => {
    if (highlightedConditionIndex === null || highlightedConditionIndex >= conditions.length) {
      return [{ text: noteText, highlighted: false, conditionName: "" }];
    }

    const condition = conditions[highlightedConditionIndex]!;
    const quote = condition.evidence_quote;
    if (!quote) return [{ text: noteText, highlighted: false, conditionName: "" }];

    // Normalize for matching
    const normalizedNote = noteText.toLowerCase();
    const normalizedQuote = quote.toLowerCase();
    const startIndex = normalizedNote.indexOf(normalizedQuote);
    const condName = condition.name;

    if (startIndex === -1) {
      return [{ text: noteText, highlighted: false, conditionName: condName }];
    }

    const before = noteText.slice(0, startIndex);
    const match = noteText.slice(startIndex, startIndex + quote.length);
    const after = noteText.slice(startIndex + quote.length);

    return [
      { text: before, highlighted: false, conditionName: "" },
      { text: match, highlighted: true, conditionName: condName },
      { text: after, highlighted: false, conditionName: "" },
    ];
  }, [noteText, conditions, highlightedConditionIndex]);

  return (
    <div className="evidence-highlight">
      {segments.map((segment, i) =>
        segment.highlighted ? (
          <mark key={i} className="evidence-match" title={`Evidence for: ${segment.conditionName}`}>
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </div>
  );
}
