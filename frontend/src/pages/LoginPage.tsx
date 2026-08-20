import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoginForm } from "../components/Auth/LoginForm";
import { SignupForm } from "../components/Auth/SignupForm";

export function LoginPage() {
  const { user } = useAuth();
  const [isSignup, setIsSignup] = useState(false);

  // Redirect to dashboard if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <h1>Note Insight</h1>
          <p>Clinical Documentation Analysis</p>
        </div>
        {isSignup ? (
          <SignupForm onToggleToLogin={() => setIsSignup(false)} />
        ) : (
          <LoginForm onToggleToSignup={() => setIsSignup(true)} />
        )}
      </div>
    </div>
  );
}
