 // src/components/CustomerSubNav.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import './SubNav.css';

const CustomerSubNav = () => {
  return (
    <nav className="sub-nav">
      <ul>
        <li>
          <NavLink to="/customers/all" activeClassName="active">
            All Customers
          </NavLink>
        </li>
        <li>
          <NavLink to="/customers/new" activeClassName="active">
            Add Customer
          </NavLink>
        </li>
        <li>
          <NavLink to="/customers/history" activeClassName="active">
            Customer History
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default CustomerSubNav;