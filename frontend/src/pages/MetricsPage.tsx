import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMetrics } from "../api/client";
import type { MetricsData } from "../types";
import { LoadingSpinner, ErrorMessage } from "../components/Layout/LoadingStates";

export function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading metrics..." />;

  if (error || !metrics) {
    return (
      <ErrorMessage
        message={error || "Metrics unavailable"}
        onRetry={() => navigate("/")}
      />
    );
  }

  return (
    <div className="metrics-page">
      <button onClick={() => navigate("/")} className="btn btn-outline btn-sm back-btn">
        &larr; Back to Dashboard
      </button>

      <h2>Clinician Correction Metrics</h2>
      <p className="section-description">
        Aggregated statistics showing how your reviews differ from AI output.
      </p>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <MetricCard label="Total Notes" value={metrics.total_notes} />
        <MetricCard label="Total Analyses" value={metrics.total_analyses} />
        <MetricCard label="Reviewed" value={metrics.reviewed_count} />
        <MetricCard label="Pending" value={metrics.pending_count} />
        <MetricCard
          label="Correction Rate"
          value={`${(metrics.correction_rate * 100).toFixed(1)}%`}
        />
      </div>

      {/* Condition Changes */}
      <section className="metrics-section">
        <h3>Condition Changes</h3>
        <div className="metrics-grid">
          <MetricCard label="Added by Clinician" value={metrics.conditions_added} />
          <MetricCard label="Removed by Clinician" value={metrics.conditions_removed} />
          <MetricCard label="Modified by Clinician" value={metrics.conditions_modified} />
        </div>
      </section>

      {/* Corrections by Field */}
      <section className="metrics-section">
        <h3>Corrections by Field</h3>
        <div className="field-breakdown">
          {Object.entries(metrics.corrections_by_field).map(([field, count]) => (
            <div key={field} className="field-row">
              <span className="field-name">{formatFieldName(field)}</span>
              <div className="field-bar-container">
                <div
                  className="field-bar"
                  style={{ width: `${Math.min(100, count * 10)}%` }}
                />
                <span className="field-count">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gap Changes */}
      <section className="metrics-section">
        <h3>Documentation Gap Changes</h3>
        <div className="metrics-grid">
          <MetricCard label="Gaps Added" value={metrics.gaps_added} />
          <MetricCard label="Gaps Removed" value={metrics.gaps_removed} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    name: "Condition Name",
    icd10_code: "ICD-10 Code",
    documentation_status: "Doc Status",
    evidence_quote: "Evidence Quote",
    confidence: "Confidence",
  };
  return labels[field] || field;
}
