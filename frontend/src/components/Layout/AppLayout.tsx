import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Note Insight</h1>
          <span className="app-subtitle">Clinical Documentation Analysis</span>
        </div>
        <nav className="header-nav">
          <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`}>
            Dashboard
          </Link>
          <Link to="/metrics" className={`nav-link ${location.pathname === "/metrics" ? "active" : ""}`}>
            Metrics
          </Link>
        </nav>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="btn btn-outline btn-sm">
            Sign Out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
