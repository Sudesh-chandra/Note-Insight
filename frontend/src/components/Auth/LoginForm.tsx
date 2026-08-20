import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

interface LoginFormProps {
  onToggleToSignup: () => void;
}

export function LoginForm({ onToggleToSignup }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      // Firebase auth errors contain user-friendly messages
      if (message.includes("invalid-credential") || message.includes("wrong-password")) {
        setError("Invalid email or password. Please try again.");
      } else if (message.includes("user-not-found")) {
        setError("No account found with this email.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Sign In</h2>
      <p className="auth-subtitle">Access your clinical note analyses</p>

      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="doctor@clinic.com"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Your password"
          disabled={loading}
          minLength={6}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="auth-toggle">
        Don't have an account?{" "}
        <button type="button" onClick={onToggleToSignup} className="link-btn">
          Sign up
        </button>
      </p>
    </form>
  );
}
