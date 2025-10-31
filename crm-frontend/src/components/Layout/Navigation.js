// src/components/Layout/Navigation.js
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../App';
import {
  FiHome, FiFileText, FiUsers, FiCalendar, FiPhone,
  FiTrendingUp, FiBarChart2, FiTag, FiLogOut, FiMenu, FiSettings
} from 'react-icons/fi';

import { getNavForIndustry, getIndustryKey } from '../../constants/uiRegistry';
import { getUserRole } from '../../helpers/tenantHelpers';
import './Navigation.css';

const ICON_MAP = {
  FiHome: <FiHome />,
  FiFileText: <FiFileText />,
  FiUsers: <FiUsers />,
  FiCalendar: <FiCalendar />,
  FiPhone: <FiPhone />,
  FiTrendingUp: <FiTrendingUp />,
  FiBarChart2: <FiBarChart2 />,
  FiTag: <FiTag />,
  FiSettings: <FiSettings />,
};

export default function Navigation({
  collapsed = false,
  onToggle = () => {},
  peekOnHover = true,
  autoCollapseMobile = true,
}) {
  const { logout, user, tenant } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 720px)').matches);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const mm = window.matchMedia('(max-width: 720px)');
    const handle = () => setIsMobile(mm.matches);
    mm.addEventListener('change', handle);
    return () => mm.removeEventListener('change', handle);
  }, []);

  // Get actual industryKey and userRole from context
  const industryKey = useMemo(() => getIndustryKey('general'), [tenant]);
  const userRole = getUserRole(user?.role || 'Member');

  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const items = getNavForIndustry(industryKey, userRole);
    setNavItems(items);
  }, [industryKey, userRole, location]);

  useEffect(() => {
    const update = () => setNavItems(getNavForIndustry(industryKey, userRole));
    const onStorage = (e) => {
      if (e.key === 'activeTenant' || e.key === 'ui_overrides') update();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [industryKey, userRole]);

  const handleHamburger = () => {
    if (isMobile && autoCollapseMobile) {
      setDrawerOpen((v) => !v);
    } else {
      onToggle();
    }
  };

  const handleLogout = () => {
    logout?.();
    if (isMobile && autoCollapseMobile) setDrawerOpen(false);
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (isMobile && autoCollapseMobile) setDrawerOpen(false);
  };

  const sidebarClasses = [
    'sidebar',
    collapsed ? 'is-collapsed' : '',
    peekOnHover ? 'peek-on-hover' : '',
    isMobile && autoCollapseMobile ? 'is-mobile' : '',
    isMobile && autoCollapseMobile && drawerOpen ? 'open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {isMobile && autoCollapseMobile && (
        <button
          className={`sidebar-scrim ${drawerOpen ? 'visible' : ''}`}
          aria-hidden={!drawerOpen}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <nav className={sidebarClasses} aria-label="Primary">
        <div className="sidebar-inner">
          <button
            className="sidebar-hamburger"
            type="button"
            onClick={handleHamburger}
            aria-label={isMobile ? (drawerOpen ? 'Close menu' : 'Open menu') : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
            title={isMobile ? (drawerOpen ? 'Close' : 'Menu') : (collapsed ? 'Expand' : 'Collapse')}
          >
            <FiMenu size={22} />
          </button>

          <div className="sidebar-profile" aria-label="Account">
            <img
              src={user?.avatar || '/assets/profile.jpg'}
              alt=""
              className="sidebar-profile-avatar"
            />
            <span className="sidebar-profile-name">{user?.name || 'Your Profile'}</span>
          </div>

          <ul className="sidebar-nav" role="list">
            {navItems.map(({ path, label, icon }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
              return (
                <li key={path} className="sidebar-item">
                  <NavLink
                    to={path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    title={label}
                    onClick={handleLinkClick}
                  >
                    <span className="sidebar-icon">{ICON_MAP[icon] || <FiHome />}</span>
                    <span className="sidebar-text">{label}</span>
                  </NavLink>
                </li>
              );
            })}

            <li className="sidebar-spacer" aria-hidden="true" />

            <li className="sidebar-item">
              <button
                className="sidebar-link sidebar-logout"
                onClick={handleLogout}
                title="Logout"
                type="button"
              >
                <span className="sidebar-icon"><FiLogOut /></span>
                <span className="sidebar-text">Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}