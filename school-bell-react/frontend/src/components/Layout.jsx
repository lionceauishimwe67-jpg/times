import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout({ children }) {
  const { logout } = useAuth();
  const nav = useNavigate();
  const handleLogout = async () => { await logout(); nav('/login'); };
  return (
    <div className="container">
      <header className="header">
        <h1>🏫 School Bell System</h1>
        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/schedule">Schedule</NavLink>
          <NavLink to="/special-days">Special Days</NavLink>
          <NavLink to="/settings">⚙️ Settings</NavLink>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
