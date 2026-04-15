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

const PRODUCT_NAME = 'Abon';
const PRODUCT_SUFFIX = '';
const HEX_COLOR_REGEX = /^#(?:[0-9A-Fa-f]{3}){1,2}$/;
const HEX_COLOR_NO_HASH_REGEX = /^(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

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

const normalizeBrandColor = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (HEX_COLOR_REGEX.test(raw)) return raw.toUpperCase();
  if (HEX_COLOR_NO_HASH_REGEX.test(raw)) return `#${raw}`.toUpperCase();
  return '';
};

const toRgbString = (hex = '') => {
  const normalized = String(hex || '')
    .replace('#', '')
    .trim();
  if (!normalized) return '';

  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((segment) => `${segment}${segment}`)
          .join('')
      : normalized;

  const value = Number.parseInt(expanded, 16);
  if (!Number.isFinite(value)) return '';

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `${red}, ${green}, ${blue}`;
};

export default function Navigation({
  collapsed = false,
  onToggle = () => {},
  peekOnHover = true,
  autoCollapseMobile = true,
  mobileOpen,
  onMobileOpenChange = () => {},
}) {
  const { logout, user, tenant } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 768px)').matches);
  const [drawerOpenInternal, setDrawerOpenInternal] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const isDrawerControlled = typeof mobileOpen === 'boolean';
  const drawerOpen = isDrawerControlled ? mobileOpen : drawerOpenInternal;
  const setDrawerOpen = (nextValue) => {
    const resolved = typeof nextValue === 'function' ? nextValue(drawerOpen) : nextValue;
    if (isDrawerControlled) {
      onMobileOpenChange(resolved);
      return;
    }
    setDrawerOpenInternal(resolved);
  };

  const tenantBranding = tenant?.preferences?.branding || {};
  const tenantLogo = tenantBranding?.logo_url || tenantBranding?.logo || tenant?.logo || '';
  const tenantPrimaryColor = normalizeBrandColor(
    tenantBranding?.primary_color || tenantBranding?.primaryColor || tenant?.primary_color || ''
  );
  const productName = tenant?.name || PRODUCT_NAME;
  const productMeta = tenant?.domain || PRODUCT_SUFFIX;

  useEffect(() => {
    const mm = window.matchMedia('(max-width: 768px)');
    const handle = () => setIsMobile(mm.matches);
    mm.addEventListener('change', handle);
    return () => mm.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      if (isDrawerControlled) onMobileOpenChange(false);
      else setDrawerOpenInternal(false);
    }
  }, [isMobile, isDrawerControlled, onMobileOpenChange]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [tenantLogo]);

  useEffect(() => {
    const root = document.documentElement;
    if (tenantPrimaryColor) {
      const accentRgb = toRgbString(tenantPrimaryColor);
      root.style.setProperty('--color-accent', tenantPrimaryColor);
      root.style.setProperty('--accentPrimary', tenantPrimaryColor);
      root.style.setProperty('--accent', tenantPrimaryColor);
      if (accentRgb) {
        root.style.setProperty('--accent-rgb', accentRgb);
        root.style.setProperty('--accent-dim', `rgba(${accentRgb}, 0.14)`);
        root.style.setProperty('--accent-glow', `rgba(${accentRgb}, 0.32)`);
        root.style.setProperty(
          '--accent-gradient',
          `linear-gradient(132deg, ${tenantPrimaryColor} 0%, ${tenantPrimaryColor} 58%, #4CC9F0 100%)`
        );
      }
      return;
    }
    root.style.removeProperty('--color-accent');
    root.style.removeProperty('--accentPrimary');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-rgb');
    root.style.removeProperty('--accent-dim');
    root.style.removeProperty('--accent-glow');
    root.style.removeProperty('--accent-gradient');
  }, [tenantPrimaryColor]);

  // Get actual industryKey and userRole from context
  const industryKey = useMemo(
    () => getIndustryKey((tenant?.industry || 'general').toLowerCase()),
    [tenant?.industry]
  );
  const userRole = getUserRole(user?.role || 'Member');

  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const items = getNavForIndustry(industryKey, userRole);
    setNavItems(Array.isArray(items) ? items : []);
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

  const handleHome = () => {
    navigate('/dashboard');
    if (isMobile && autoCollapseMobile) setDrawerOpen(false);
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

  const safeNavItems = Array.isArray(navItems) ? navItems : [];

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
          <div className="sidebar-header">
            <button
              className="sidebar-brand"
              type="button"
              onClick={handleHome}
              aria-label="Go to home"
            >
              <span className="sidebar-logo" aria-hidden="true">
                {tenantLogo && !logoLoadFailed ? (
                  <img
                    src={tenantLogo}
                    alt=""
                    className="sidebar-logo-img"
                    onError={() => setLogoLoadFailed(true)}
                  />
                ) : (
                  <span className="sidebar-logo-glyph">{productName?.[0] || 'A'}</span>
                )}
              </span>
              <span className="sidebar-brand-text">
                <span className="sidebar-brand-name">{productName}</span>
                <span className="sidebar-brand-meta">{productMeta}</span>
              </span>
            </button>

            <button
              className="sidebar-hamburger nav-toggle"
              type="button"
              onClick={handleHamburger}
              aria-label={isMobile ? (drawerOpen ? 'Close menu' : 'Open menu') : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
              title={isMobile ? (drawerOpen ? 'Close' : 'Menu') : (collapsed ? 'Expand' : 'Collapse')}
            >
              <FiMenu size={20} />
            </button>
          </div>

          <ul className="sidebar-nav">
            {safeNavItems.map(({ path, label, icon }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
              return (
                <li key={path} className="sidebar-item">
                  <NavLink
                    to={path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    title={label}
                    onClick={handleLinkClick}
                  >
                    {isActive && <span className="sidebar-active-indicator" aria-hidden="true" />}
                    <span className="sidebar-icon">{ICON_MAP[icon] || <FiHome />}</span>
                    <span className="sidebar-text">{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div className="sidebar-footer">
            <div className="sidebar-profile" aria-label="Account">
              <img
                src={user?.avatar || '/assets/profile.jpg'}
                alt=""
                className="sidebar-profile-avatar"
              />
              <div className="sidebar-profile-meta">
                <span className="sidebar-profile-name">{user?.name || 'Your Profile'}</span>
                <span className="sidebar-profile-role">{userRole || 'Member'}</span>
              </div>
            </div>

            <button
              className="sidebar-link sidebar-logout"
              onClick={handleLogout}
              title="Logout"
              type="button"
            >
              <span className="sidebar-icon"><FiLogOut /></span>
              <span className="sidebar-text">Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
