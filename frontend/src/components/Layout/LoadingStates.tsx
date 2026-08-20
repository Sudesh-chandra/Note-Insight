export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-container">
      <div className="error-icon">!</div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}
