import type { Analysis, Condition } from "../../types";

interface AnalysisViewProps {
  analysis: Analysis;
  onEditReview: () => void;
}

export function AnalysisView({ analysis, onEditReview }: AnalysisViewProps) {
  // Use reviewed data if available, otherwise show AI output
  const conditions = analysis.reviewed_conditions || analysis.ai_conditions;
  const gaps = analysis.reviewed_gaps || analysis.ai_gaps;
  const summary = analysis.reviewed_summary || analysis.ai_summary;
  const isReviewed = analysis.review_status === "reviewed";

  // Build a map of quote validation results
  const quoteValidationMap = new Map<string, boolean>();
  for (const qv of analysis.quote_validation) {
    quoteValidationMap.set(qv.evidence_quote, qv.found_in_note);
  }

  const hasHallucinatedQuotes = analysis.quote_validation.some((qv) => !qv.found_in_note);

  return (
    <div className="analysis-view">
      {/* Status banner */}
      <div className="analysis-status-bar">
        {analysis.status === "failed" ? (
          <div className="status-banner failed">Analysis failed. Please try again.</div>
        ) : isReviewed ? (
          <div className="status-banner reviewed">
            Reviewed on {analysis.reviewed_at ? new Date(analysis.reviewed_at).toLocaleString() : ""}
          </div>
        ) : (
          <div className="status-banner pending">AI Draft — Not yet reviewed</div>
        )}

        {hasHallucinatedQuotes && (
          <div className="status-banner warning">
            Warning: Some evidence quotes could not be verified in the original note.
          </div>
        )}
      </div>

      {/* Summary */}
      <section className="analysis-section">
        <h3>Encounter Summary</h3>
        <p className="summary-text">{summary}</p>
      </section>

      {/* Conditions */}
      <section className="analysis-section">
        <h3>
          Identified Conditions
          <span className="count-badge">{conditions.length}</span>
        </h3>
        <div className="conditions-list">
          {conditions.map((condition, index) => (
            <ConditionCard
              key={`${condition.name}-${index}`}
              condition={condition}
              isHallucinated={
                quoteValidationMap.get(condition.evidence_quote) === false
              }
            />
          ))}
        </div>
      </section>

      {/* Documentation Gaps */}
      <section className="analysis-section">
        <h3>
          Documentation Gaps
          <span className="count-badge">{gaps.length}</span>
        </h3>
        <div className="gaps-list">
          {gaps.map((gap, index) => (
            <div key={index} className={`gap-item gap-${gap.severity}`}>
              <span className={`severity-dot severity-${gap.severity}`} />
              <span className="gap-description">{gap.description}</span>
              <span className={`severity-label severity-${gap.severity}`}>
                {gap.severity}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Edit button */}
      {!isReviewed && (
        <div className="analysis-actions">
          <button onClick={onEditReview} className="btn btn-primary">
            Review & Correct
          </button>
        </div>
      )}
    </div>
  );
}

function ConditionCard({
  condition,
  isHallucinated,
}: {
  condition: Condition;
  isHallucinated: boolean;
}) {
  const statusLabels: Record<string, string> = {
    well_documented: "Well Documented",
    ambiguous: "Ambiguous",
    mentioned_without_assessment: "Mentioned, No Assessment",
  };

  return (
    <div className={`condition-card ${isHallucinated ? "hallucinated" : ""}`}>
      <div className="condition-header">
        <h4 className="condition-name">{condition.name}</h4>
        <span className={`status-pill ${condition.documentation_status}`}>
          {statusLabels[condition.documentation_status] || condition.documentation_status}
        </span>
      </div>

      <div className="condition-detail">
        <span className="detail-label">Evidence:</span>
        <blockquote className="evidence-quote">
          "{condition.evidence_quote}"
          {isHallucinated && (
            <span className="hallucination-warning" title="This quote was not found in the original note">
              {" "}Not found in note
            </span>
          )}
        </blockquote>
      </div>

      <div className="condition-meta">
        <span className="detail-label">ICD-10:</span>
        <span className="icd-code">{condition.icd10_code}</span>
        <span className="detail-label">Confidence:</span>
        <div className="confidence-bar-container">
          <div
            className="confidence-bar"
            style={{ width: `${condition.confidence * 100}%` }}
          />
          <span className="confidence-value">{(condition.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
