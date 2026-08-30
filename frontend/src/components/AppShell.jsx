import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Send,
  FileText,
  MessageCircle,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/contacts',
    label: 'Contacts',
    icon: Users,
  },
  {
    to: '/events',
    label: 'Events',
    icon: CalendarDays,
  },
  {
    to: '/campaigns',
    label: 'Campaigns',
    icon: Send,
  },
  {
    to: '/templates',
    label: 'Templates',
    icon: FileText,
  },
  {
    to: '/inbox',
    label: 'Inbox',
    icon: MessageCircle,
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
  },
  {
    to: '/settings',
    label: 'WhatsApp Settings',
    icon: SettingsIcon,
  },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  function handleLogout() {
    logout();

    // Replace current history entry so the user cannot
    // simply press Back and return to the protected screen.
    navigate('/login', {
      replace: true,
    });
  }

  /*
   * ---------------------------------------------------------
   * USER DISPLAY
   * ---------------------------------------------------------
   *
   * Never assume that the backend returned user.name.
   * If name is unavailable, use email.
   */

  const displayName =
    user?.name ||
    user?.email ||
    'User';

  /*
   * Generate safe initials.
   *
   * Examples:
   * "Bharat Admin" -> BA
   * "admin@bharatinfotechs.com" -> A
   * missing user -> U
   */

  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const role =
    user?.role ||
    'user';

  return (
    <div className="app-shell">

      {/* =====================================================
          DESKTOP SIDEBAR
          ===================================================== */}

      <aside className="sidebar">

        {/* ---------------------------------------------------
            BRAND
            --------------------------------------------------- */}

        <div className="sidebar-brand">
          <h1>Bharat Infotechs</h1>

          <p>
            Smart Business Software,
            <br />
            Built for Growth.
          </p>
        </div>

        {/* ---------------------------------------------------
            DESKTOP NAVIGATION
            --------------------------------------------------- */}

        <nav
          className="sidebar-nav"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <Icon size={16} />

                <span>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* ---------------------------------------------------
            DESKTOP USER / LOGOUT
            --------------------------------------------------- */}

        <div className="sidebar-footer">

          <div className="sidebar-user">

            <div className="sidebar-avatar">
              {initials}
            </div>

            <div>
              <div
                style={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 140,
                }}
              >
                {displayName}
              </div>

              <div
                style={{
                  opacity: 0.7,
                  fontSize: 11,
                  textTransform: 'capitalize',
                }}
              >
                {role}
              </div>
            </div>

          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>

        </div>

      </aside>


      {/* =====================================================
          MOBILE HEADER
          ===================================================== */}

      <header className="mobile-header">

        <div className="mobile-brand">

          <div className="mobile-brand-name">
            Bharat Infotechs
          </div>

          <div className="mobile-brand-subtitle">
            Smart Business Software
          </div>

        </div>

        {/* ---------------------------------------------------
            MOBILE LOGOUT

            This stays visible at the top of the mobile app.
            --------------------------------------------------- */}

        <button
          type="button"
          className="mobile-logout"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogOut size={16} />

          <span>
            Logout
          </span>
        </button>

      </header>


      {/* =====================================================
          MOBILE NAVIGATION
          ===================================================== */}

      <nav
        className="mobile-nav"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mobile-nav-link${isActive ? ' active' : ''}`
              }
            >
              <Icon size={17} />

              <span>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>


      {/* =====================================================
          APPLICATION CONTENT
          ===================================================== */}

      <main className="main-content">
        <Outlet />
      </main>

    </div>
  );
}