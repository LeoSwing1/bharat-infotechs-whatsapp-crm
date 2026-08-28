import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Send, FileText, MessageCircle, BarChart3, Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/campaigns', label: 'Campaigns', icon: Send },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'WhatsApp Settings', icon: SettingsIcon },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() : '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Bharat Infotechs</h1>
          <p>Smart Business Software,<br />Built for Growth.</p>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div style={{ opacity: 0.7, fontSize: 11, textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
