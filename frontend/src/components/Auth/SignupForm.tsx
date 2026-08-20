import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

interface SignupFormProps {
  onToggleToLogin: () => void;
}

export function SignupForm({ onToggleToLogin }: SignupFormProps) {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      if (message.includes("email-already-in-use")) {
        setError("An account with this email already exists.");
      } else if (message.includes("weak-password")) {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Create Account</h2>
      <p className="auth-subtitle">Start analyzing your clinical notes</p>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="doctor@clinic.com"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="At least 6 characters"
          disabled={loading}
          minLength={6}
        />
      </div>

      <div className="form-group">
        <label htmlFor="signup-confirm">Confirm Password</label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Repeat your password"
          disabled={loading}
          minLength={6}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="auth-toggle">
        Already have an account?{" "}
        <button type="button" onClick={onToggleToLogin} className="link-btn">
          Sign in
        </button>
      </p>
    </form>
  );
}
