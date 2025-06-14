import React, { useState, useContext, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiCalendar,
  FiPhone,
  FiTrendingUp,
  FiBarChart2,
  FiTag,
  FiLogOut,
  FiMenu,
  FiSettings,
} from 'react-icons/fi';
import { navRegistry } from '../../constants/navRegistry';
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

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [navItems, setNavItems] = useState([]);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    let tenantIndustry = 'general';
    try {
      const tenantStr = localStorage.getItem('activeTenant');
      if (tenantStr && tenantStr !== 'undefined') {
        const tenantObj = JSON.parse(tenantStr);
        tenantIndustry = tenantObj?.industry?.toLowerCase() || 'general';
      }
    } catch (err) {
      console.warn('⚠️ Could not parse tenant industry:', err);
    }

    const items = navRegistry[tenantIndustry] || navRegistry['general'];
    setNavItems(items);
  }, []);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className={`nav-container ${isOpen ? 'open' : 'collapsed'}`}>
      {/* Hamburger Toggle */}
      <div className="hamburger" onClick={toggleMenu}>
        <FiMenu size={24} color="currentColor" />
      </div>

      {/* Profile Header */}
      <div className="profile-section">
        <img src="/assets/profile.jpg" alt="Profile" className="profile-icon" />
        {isOpen && <span className="profile-name">Your Profile</span>}
      </div>

      {/* Main Navigation */}
      <ul className="nav-list">
        {navItems.map(({ path, label, icon }) => (
          <li key={path} className="nav-item">
            <NavLink
              to={path}
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{ICON_MAP[icon] || <FiHome />}</span>
              {isOpen && <span className="nav-text">{label}</span>}
            </NavLink>
          </li>
        ))}

        {/* Logout Button */}
        <li className="nav-item logout">
          <button onClick={handleLogout} className="logout-button">
            <span className="nav-icon"><FiLogOut /></span>
            {isOpen && <span className="nav-text">Logout</span>}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;