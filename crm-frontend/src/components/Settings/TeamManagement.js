import React, { useEffect, useState, useCallback, useContext } from 'react';
import './TeamManagement.css';
import EmployeePopup from '../Profile/EmployeePopup';
import { AuthContext } from '../../App';
import api, { normalizeArray } from '../../apiClient';

const TEAM_LIST_ENDPOINTS = ['/accounts/team/', '/accounts/users/', '/tenant/users/'];
const TEAM_CREATE_ENDPOINTS = ['/accounts/add-team-member/', '/accounts/users/', '/tenant/users/'];

const ROLE_OPTIONS = [
  { value: 'Tech', label: 'Member (Tech)' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

const isEndpointFallbackStatus = (status) => status === 404 || status === 405;

const parseApiList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.members)) return payload.members;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  return normalizeArray(payload);
};

const normalizeRole = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'manager') return 'Manager';
  if (normalized === 'tech' || normalized === 'member' || normalized === 'technician') return 'Tech';
  return '';
};

const resolveRoleFromGroups = (groups = []) => {
  if (!Array.isArray(groups)) return '';
  for (const item of groups) {
    const roleValue = typeof item === 'string' ? item : item?.name || item?.title || item?.role;
    const normalized = normalizeRole(roleValue);
    if (normalized) return normalized;
  }
  return '';
};

const resolveMemberRole = (member = {}) => {
  const directCandidates = [
    member?.role,
    member?.role_name,
    member?.role_type,
    member?.group,
    member?.group_name,
    member?.user_type,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeRole(candidate);
    if (normalized) return normalized;
  }

  return resolveRoleFromGroups(member?.groups || member?.group_names || member?.user_groups) || 'Tech';
};

const normalizeMember = (member = {}) => ({
  ...member,
  id: member?.id || member?.user_id || member?.pk || member?.email,
  first_name: member?.first_name || member?.firstName || '',
  last_name: member?.last_name || member?.lastName || '',
  email: member?.email || '',
  role: resolveMemberRole(member),
});

const readApiError = (error, fallbackMessage) =>
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  fallbackMessage;

const UserCard = ({ member, onClick }) => {
  const defaultAvatar = '/default-avatar.png';
  return (
    <div className="user-card" onClick={onClick} style={{ cursor: 'pointer' }}>
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
    role: 'Tech',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { logout } = useContext(AuthContext);

  const fetchTeamMembers = useCallback(async () => {
    setFetching(true);
    setError(null);

    try {
      let lastError = null;

      for (const endpoint of TEAM_LIST_ENDPOINTS) {
        try {
          const response = await api.get(endpoint);
          const members = parseApiList(response.data).map((member) => normalizeMember(member));
          setTeamMembers(members);
          return;
        } catch (err) {
          lastError = err;
          if (isEndpointFallbackStatus(err?.response?.status)) continue;
          break;
        }
      }

      setTeamMembers([]);
      setError(readApiError(lastError, 'Unable to load team members. Please try again.'));
    } catch (err) {
      setTeamMembers([]);
      setError(readApiError(err, 'Unable to load team members. Please try again.'));
    } finally {
      setFetching(false);
    }
  }, []);

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

    const payload = {
      first_name: newMember.firstName,
      last_name: newMember.lastName,
      email: newMember.email,
      phone_number: newMember.phoneNumber,
      password: newMember.password,
      role: newMember.role,
    };

    try {
      let response = null;
      let lastError = null;

      for (const endpoint of TEAM_CREATE_ENDPOINTS) {
        try {
          response = await api.post(endpoint, payload);
          break;
        } catch (err) {
          lastError = err;
          if (isEndpointFallbackStatus(err?.response?.status)) continue;
          break;
        }
      }

      if (!response) {
        throw lastError || new Error('Unable to create team member.');
      }

      setSuccess(response.data.message || 'User added successfully.');
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        role: 'Tech',
      });
      await fetchTeamMembers();
    } catch (err) {
      const backendError =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.phone_number?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.role?.[0] ||
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

  const handleSaveEmployee = () => {
    fetchTeamMembers();
  };

  return (
    <div className="team-management">
      <div className="team-header">
        <h2>Team Management</h2>
        <button className="logout-btn" onClick={logout}>🚪 Log Out</button>
      </div>

      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleAddMember} className="team-form">
        <input type="text" name="firstName" placeholder="First Name" value={newMember.firstName} onChange={handleChange} required />
        <input type="text" name="lastName" placeholder="Last Name" value={newMember.lastName} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={newMember.email} onChange={handleChange} required />
        <input type="text" name="phoneNumber" placeholder="Phone Number" value={newMember.phoneNumber} onChange={handleChange} />
        <input type="password" name="password" placeholder="Password" value={newMember.password} onChange={handleChange} required />
        <select name="role" value={newMember.role} onChange={handleChange} required>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</button>
      </form>

      <h3>Current Team</h3>
      {fetching ? (
        <p>Loading team members...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : normalizeArray(teamMembers).length === 0 ? (
        <div className="team-empty">
          <p>You are the only member in this team. Invite your first teammate!</p>
          <button onClick={fetchTeamMembers} type="button" className="ghost-btn">Refresh</button>
        </div>
      ) : (
        <div className="team-list-container">
          <div className="team-list">
            {normalizeArray(teamMembers).map((member) => (
              <UserCard
                key={member.id || member.email}
                member={member}
                onClick={() => handleViewEmployee(member)}
              />
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
