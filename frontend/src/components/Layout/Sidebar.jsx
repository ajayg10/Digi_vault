import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineFolder,
  HiOutlineCollection,
  HiOutlineCalendar,
  HiOutlineTrash,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { useState } from 'react';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: <HiOutlineHome />, label: 'Dashboard' },
  { path: '/files', icon: <HiOutlineFolder />, label: 'Files' },
  { path: '/projects', icon: <HiOutlineCollection />, label: 'Projects' },
  { path: '/meetings', icon: <HiOutlineCalendar />, label: 'Meetings' },
  { path: '/trash', icon: <HiOutlineTrash />, label: 'Trash' },
  { path: '/settings', icon: <HiOutlineCog />, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <HiOutlineX /> : <HiOutlineMenu />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <HiOutlineShieldCheck />
          </div>
          <span className="sidebar-logo-text">DigiVault</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email truncate">{user?.email}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Logout">
            <HiOutlineLogout />
          </button>
        </div>
      </aside>
    </>
  );
}
