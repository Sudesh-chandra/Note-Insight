import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Note Insight</h1>
          <span className="app-subtitle">Clinical Documentation Analysis</span>
        </div>
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
