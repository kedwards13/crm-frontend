import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './TeamManagement.css';
import EmployeePopup from '../Profile/EmployeePopup';

const UserCard = ({ member, onClick }) => {
  const defaultAvatar = '/default-avatar.png';
  return (
    <div className="user-card" onClick={onClick}>
      <img
        src={member.avatar || defaultAvatar}
        alt={`${member.first_name} ${member.last_name}`}
        className="user-card-avatar"
      />
      <div className="user-card-info">
        <h4>
          {member.first_name} {member.last_name}
        </h4>
        <p>
          {member.email} <em>({member.role})</em>
        </p>
      </div>
    </div>
  );
};

const TeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'Member',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Use the environment variable for the API URL or fallback to localhost:808
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:808';
  const token = localStorage.getItem('token');

  const fetchTeamMembers = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      if (!token) {
        throw new Error("User is not authenticated");
      }
      const response = await axios.get(`${API_BASE_URL}/api/accounts/team/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeamMembers(response.data);
    } catch (err) {
      console.error("Error fetching team:", err);
      setError('Unable to load team members. Please try again.');
    } finally {
      setFetching(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewMember((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Map form fields to backend expected keys (using snake_case)
    const payload = {
      first_name: newMember.firstName,
      last_name: newMember.lastName,
      email: newMember.email,
      phone_number: newMember.phoneNumber,
      password: newMember.password,
      role: newMember.role,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/accounts/add-team-member/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.message);
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        role: 'Member',
      });
      fetchTeamMembers();
    } catch (err) {
      console.error("Error adding team member:", err);
      const backendError =
        err.response?.data?.error ||
        err.response?.data?.phone_number?.[0] ||
        'Failed to add member. Please try again.';
      setError(backendError);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = (member) => {
    setSelectedEmployee(member);
  };

  const handleClosePopup = () => {
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = (updatedEmployee) => {
    console.log("Saved employee from popup:", updatedEmployee);
    fetchTeamMembers();
  };

  return (
    <div className="team-management">
      <h2>Team Management</h2>

      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleAddMember} className="team-form">
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={newMember.firstName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={newMember.lastName}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={newMember.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="phoneNumber"
          placeholder="Phone Number"
          value={newMember.phoneNumber}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={newMember.password}
          onChange={handleChange}
          required
        />
        <select
          name="role"
          value={newMember.role}
          onChange={handleChange}
          required
        >
          <option value="Member">Member</option>
          <option value="Manager">Manager</option>
          <option value="Admin">Admin</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </form>

      <h3>Current Team</h3>
      {fetching ? (
        <p>Loading team members...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : teamMembers.length === 0 ? (
        <p>You are the only member in this team. Invite your first teammate!</p>
      ) : (
        <div className="team-list-container">
          <div className="team-list">
            {teamMembers.map((member) => (
              <div key={member.id} onClick={() => handleViewEmployee(member)} style={{ cursor: 'pointer' }}>
                <UserCard member={member} />
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedEmployee && (
        <EmployeePopup
          employee={selectedEmployee}
          onClose={handleClosePopup}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
};

export default TeamManagement;