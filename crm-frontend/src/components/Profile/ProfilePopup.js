// src/components/ProfilePopup.js
import React from 'react';
import './ProfilePopup.css'; // Create this CSS file for styling

const ProfilePopup = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="profile-popup-overlay" onClick={onClose}>
      <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <img src={user.avatar || '/default-avatar.png'} alt={`${user.firstName} ${user.lastName}`} className="profile-avatar" />
        <h2>{user.firstName} {user.lastName}</h2>
        <p>{user.email}</p>
        <p>{user.phoneNumber}</p>
        <p>Role: {user.role}</p>
      </div>
    </div>
  );
};

export default ProfilePopup;