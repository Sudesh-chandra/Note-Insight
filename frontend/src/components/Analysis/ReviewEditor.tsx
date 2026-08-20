import { useState } from "react";
import { submitReview } from "../../api/client";
import type { Analysis, Condition, DocumentationGap } from "../../types";

interface ReviewEditorProps {
  noteId: string;
  analysis: Analysis;
  onSave: () => void;
  onCancel: () => void;
}

export function ReviewEditor({ noteId, analysis, onSave, onCancel }: ReviewEditorProps) {
  // Start with AI output as the editable draft
  const [conditions, setConditions] = useState<Condition[]>(
    analysis.reviewed_conditions || [...analysis.ai_conditions]
  );
  const [gaps, setGaps] = useState<DocumentationGap[]>(
    analysis.reviewed_gaps || [...analysis.ai_gaps]
  );
  const [summary, setSummary] = useState(
    analysis.reviewed_summary || analysis.ai_summary
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConditionChange = (index: number, field: keyof Condition, value: string | number) => {
    setConditions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as Condition;
      return updated;
    });
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        name: "",
        evidence_quote: "",
        documentation_status: "ambiguous" as const,
        icd10_code: "",
        confidence: 0.5,
      },
    ]);
  };

  const handleGapChange = (index: number, field: keyof DocumentationGap, value: string) => {
    setGaps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as DocumentationGap;
      return updated;
    });
  };

  const handleAddGap = () => {
    setGaps((prev) => [
      ...prev,
      { description: "", severity: "medium" as const },
    ]);
  };

  const handleRemoveGap = (index: number) => {
    setGaps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate before saving — at least one named condition required
    const validConditions = conditions.filter((c) => c.name.trim() !== "");
    if (validConditions.length === 0) {
      setError("At least one condition with a name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await submitReview(noteId, analysis.id, {
        conditions: validConditions,
        gaps: gaps.filter((g) => g.description.trim() !== ""),
        summary,
      });
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="review-editor">
      <h3>Review & Correct Analysis</h3>
      <p className="review-description">
        Edit any field below. The original AI output is preserved — your corrections
        are saved alongside it.
      </p>

      {error && <div className="form-error">{error}</div>}

      {/* Summary */}
      <div className="review-section">
        <label htmlFor="review-summary">Encounter Summary</label>
        <textarea
          id="review-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
        />
      </div>

      {/* Conditions */}
      <div className="review-section">
        <h4>Conditions ({conditions.length})</h4>
        {conditions.map((condition, index) => (
          <div key={index} className="review-condition-card">
            <div className="review-field">
              <label>Condition Name</label>
              <input
                type="text"
                value={condition.name}
                onChange={(e) => handleConditionChange(index, "name", e.target.value)}
              />
            </div>
            <div className="review-field">
              <label>Evidence Quote</label>
              <textarea
                value={condition.evidence_quote}
                onChange={(e) => handleConditionChange(index, "evidence_quote", e.target.value)}
                rows={2}
              />
            </div>
            <div className="review-field-row">
              <div className="review-field">
                <label>Status</label>
                <select
                  value={condition.documentation_status}
                  onChange={(e) => handleConditionChange(index, "documentation_status", e.target.value)}
                >
                  <option value="well_documented">Well Documented</option>
                  <option value="ambiguous">Ambiguous</option>
                  <option value="mentioned_without_assessment">Mentioned, No Assessment</option>
                </select>
              </div>
              <div className="review-field">
                <label>ICD-10 Code</label>
                <input
                  type="text"
                  value={condition.icd10_code}
                  onChange={(e) => handleConditionChange(index, "icd10_code", e.target.value)}
                />
              </div>
              <div className="review-field">
                <label>Confidence (0-1)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={condition.confidence}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    handleConditionChange(
                      index,
                      "confidence",
                      isNaN(parsed) ? 0 : Math.max(0, Math.min(1, parsed))
                    );
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => handleRemoveCondition(index)}
              className="btn btn-danger btn-sm"
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={handleAddCondition} className="btn btn-outline btn-sm">
          + Add Condition
        </button>
      </div>

      {/* Gaps */}
      <div className="review-section">
        <h4>Documentation Gaps ({gaps.length})</h4>
        {gaps.map((gap, index) => (
          <div key={index} className="review-gap-card">
            <div className="review-field">
              <label>Description</label>
              <textarea
                value={gap.description}
                onChange={(e) => handleGapChange(index, "description", e.target.value)}
                rows={2}
              />
            </div>
            <div className="review-field-row">
              <div className="review-field">
                <label>Severity</label>
                <select
                  value={gap.severity}
                  onChange={(e) => handleGapChange(index, "severity", e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => handleRemoveGap(index)}
              className="btn btn-danger btn-sm"
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={handleAddGap} className="btn btn-outline btn-sm">
          + Add Gap
        </button>
      </div>

      {/* Actions */}
      <div className="review-actions">
        <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Review"}
        </button>
        <button onClick={onCancel} className="btn btn-outline" disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
