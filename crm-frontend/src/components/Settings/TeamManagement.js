import React, { useEffect, useState, useCallback, useContext, useMemo } from 'react';
import './TeamManagement.css';
import EmployeePopup from '../Profile/EmployeePopup';
import { AuthContext } from '../../App';
import api, { normalizeArray } from '../../apiClient';

const TEAM_LIST_ENDPOINTS = ['/accounts/team/', '/accounts/users/', '/tenant/users/'];
const TEAM_CREATE_ENDPOINTS = [
  '/accounts/team/add-member/',
  '/accounts/add-team-member/',
  '/accounts/users/',
  '/tenant/users/',
];
const ROUTING_ENDPOINT = '/accounts/voice/routing/';

const ROLE_OPTIONS = [
  { value: 'Tech', label: 'Member (Tech)' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Admin', label: 'Admin' },
];

const AFTER_HOURS_OPTIONS = [
  { value: 'VOICEMAIL', label: 'Voicemail' },
  { value: 'AI', label: 'AI Assistant' },
  { value: 'RING_GROUP', label: 'Ring Group' },
];

const DEFAULT_ROUTING_DRAFT = {
  name: 'Default',
  ai_first: false,
  ai_override_enabled: false,
  business_hours_start: '',
  business_hours_end: '',
  timezone: 'America/New_York',
  after_hours_route: 'VOICEMAIL',
  default_ring_timeout: 15,
  members: [],
};

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
  id: Number(member?.id || member?.user_id || member?.pk || 0),
  first_name: member?.first_name || member?.firstName || '',
  last_name: member?.last_name || member?.lastName || '',
  email: member?.email || '',
  role: resolveMemberRole(member),
});

const readApiError = (error, fallbackMessage) =>
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  fallbackMessage;

const normalizeTimeInputValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
};

const toPositiveInt = (value, fallback = 15) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.round(parsed);
};

const reorderMembers = (members, sourceUserId, targetUserId) => {
  const sourceIndex = members.findIndex((item) => Number(item.user_id) === Number(sourceUserId));
  const targetIndex = members.findIndex((item) => Number(item.user_id) === Number(targetUserId));

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return members;
  }

  const next = [...members];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
};

const mapRoutingResponseToDraft = (payload = {}) => {
  const policy = payload?.policy || {};
  const firstGroup = Array.isArray(payload?.ring_groups) && payload.ring_groups.length > 0
    ? payload.ring_groups[0]
    : null;
  const rawMembers = Array.isArray(firstGroup?.members) ? firstGroup.members : [];

  const members = [...rawMembers]
    .sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0))
    .map((member, index) => ({
      user_id: Number(member?.user_id || 0),
      order_index: Number(member?.order_index ?? index),
      ring_timeout: toPositiveInt(member?.ring_timeout, toPositiveInt(policy?.default_ring_timeout, 15)),
      is_active: member?.is_active !== false,
    }))
    .filter((member) => member.user_id > 0);

  return {
    name: String(policy?.name || DEFAULT_ROUTING_DRAFT.name),
    ai_first: !!policy?.ai_first,
    ai_override_enabled: !!policy?.ai_override_enabled,
    business_hours_start: normalizeTimeInputValue(policy?.business_hours_start),
    business_hours_end: normalizeTimeInputValue(policy?.business_hours_end),
    timezone: String(policy?.timezone || DEFAULT_ROUTING_DRAFT.timezone),
    after_hours_route: String(policy?.after_hours_route || DEFAULT_ROUTING_DRAFT.after_hours_route),
    default_ring_timeout: toPositiveInt(policy?.default_ring_timeout, 15),
    members,
  };
};

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
    role: 'Tech',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Tech');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  const [routingDraft, setRoutingDraft] = useState(DEFAULT_ROUTING_DRAFT);
  const [routingLoading, setRoutingLoading] = useState(true);
  const [routingSaving, setRoutingSaving] = useState(false);
  const [routingError, setRoutingError] = useState(null);
  const [routingSuccess, setRoutingSuccess] = useState(null);
  const [candidateUserId, setCandidateUserId] = useState('');
  const [draggedUserId, setDraggedUserId] = useState(null);

  const { logout } = useContext(AuthContext);

  const memberById = useMemo(
    () =>
      normalizeArray(teamMembers).reduce((acc, member) => {
        if (Number(member?.id) > 0) acc.set(Number(member.id), member);
        return acc;
      }, new Map()),
    [teamMembers]
  );

  const selectedRingUserIds = useMemo(
    () => new Set((routingDraft?.members || []).map((member) => Number(member.user_id))),
    [routingDraft]
  );

  const availableRingCandidates = useMemo(
    () => normalizeArray(teamMembers).filter((member) => !selectedRingUserIds.has(Number(member.id))),
    [teamMembers, selectedRingUserIds]
  );

  const fetchTeamMembers = useCallback(async () => {
    setFetching(true);
    setError(null);

    try {
      let lastError = null;

      for (const endpoint of TEAM_LIST_ENDPOINTS) {
        try {
          const response = await api.get(endpoint);
          const members = parseApiList(response.data)
            .map((member) => normalizeMember(member))
            .filter((member) => Number(member.id) > 0);
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

  const fetchRoutingPolicy = useCallback(async () => {
    setRoutingLoading(true);
    setRoutingError(null);

    try {
      const response = await api.get(ROUTING_ENDPOINT);
      setRoutingDraft(mapRoutingResponseToDraft(response.data));
    } catch (err) {
      setRoutingError(readApiError(err, 'Unable to load routing policy.'));
    } finally {
      setRoutingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamMembers();
    fetchRoutingPolicy();
  }, [fetchTeamMembers, fetchRoutingPolicy]);

  useEffect(() => {
    setRoutingDraft((previous) => {
      const validUserIds = new Set(normalizeArray(teamMembers).map((member) => Number(member.id)));
      const filtered = (previous.members || []).filter((member) => validUserIds.has(Number(member.user_id)));
      if (filtered.length === (previous.members || []).length) {
        return previous;
      }
      return {
        ...previous,
        members: filtered.map((member, index) => ({ ...member, order_index: index })),
      };
    });
  }, [teamMembers]);

  useEffect(() => {
    if (!availableRingCandidates.length) {
      setCandidateUserId('');
      return;
    }

    const selected = Number(candidateUserId);
    if (!selected || !availableRingCandidates.some((candidate) => Number(candidate.id) === selected)) {
      setCandidateUserId(String(availableRingCandidates[0].id));
    }
  }, [availableRingCandidates, candidateUserId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setNewMember((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
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
      is_active: true,
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
      await fetchRoutingPolicy();
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

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setError(null);
    setInviteSuccess(null);
    try {
      const { data } = await api.post('/accounts/auth/invite-user/', {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setInviteSuccess(data?.detail || `Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
    } catch (err) {
      setError(readApiError(err, 'Failed to send invite.'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoutingDraftChange = (patch) => {
    setRoutingSuccess(null);
    setRoutingDraft((previous) => ({ ...previous, ...(patch || {}) }));
  };

  const handleRingMemberChange = (userId, patch) => {
    setRoutingSuccess(null);
    setRoutingDraft((previous) => ({
      ...previous,
      members: (previous.members || []).map((member) =>
        Number(member.user_id) === Number(userId)
          ? { ...member, ...(patch || {}) }
          : member
      ),
    }));
  };

  const handleAddRingMember = () => {
    const nextUserId = Number(candidateUserId);
    if (!nextUserId) return;

    setRoutingSuccess(null);
    setRoutingDraft((previous) => {
      if ((previous.members || []).some((member) => Number(member.user_id) === nextUserId)) {
        return previous;
      }

      const defaultTimeout = toPositiveInt(previous.default_ring_timeout, 15);
      return {
        ...previous,
        members: [
          ...(previous.members || []),
          {
            user_id: nextUserId,
            order_index: (previous.members || []).length,
            ring_timeout: defaultTimeout,
            is_active: true,
          },
        ],
      };
    });
  };

  const handleRemoveRingMember = (userId) => {
    setRoutingSuccess(null);
    setRoutingDraft((previous) => ({
      ...previous,
      members: (previous.members || [])
        .filter((member) => Number(member.user_id) !== Number(userId))
        .map((member, index) => ({ ...member, order_index: index })),
    }));
  };

  const handleDragStart = (event, userId) => {
    setDraggedUserId(Number(userId));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(userId));
  };

  const handleDropOnMember = (event, targetUserId) => {
    event.preventDefault();
    const sourceUserId = Number(event.dataTransfer.getData('text/plain') || draggedUserId);
    if (!sourceUserId || Number(targetUserId) === sourceUserId) {
      setDraggedUserId(null);
      return;
    }

    setRoutingSuccess(null);
    setRoutingDraft((previous) => ({
      ...previous,
      members: reorderMembers(previous.members || [], sourceUserId, Number(targetUserId)).map(
        (member, index) => ({ ...member, order_index: index })
      ),
    }));
    setDraggedUserId(null);
  };

  const handleSaveRouting = async () => {
    setRoutingSaving(true);
    setRoutingError(null);
    setRoutingSuccess(null);

    const defaultTimeout = toPositiveInt(routingDraft.default_ring_timeout, 15);
    const normalizedMembers = (routingDraft.members || []).map((member, index) => ({
      user_id: Number(member.user_id),
      order_index: index,
      ring_timeout: toPositiveInt(member.ring_timeout, defaultTimeout),
      is_active: member.is_active !== false,
    }));

    const payload = {
      name: (routingDraft.name || 'Default').trim() || 'Default',
      is_active: true,
      business_hours_start: routingDraft.business_hours_start || null,
      business_hours_end: routingDraft.business_hours_end || null,
      timezone: (routingDraft.timezone || 'America/New_York').trim() || 'America/New_York',
      after_hours_route: routingDraft.after_hours_route || 'VOICEMAIL',
      ai_override_enabled: !!routingDraft.ai_override_enabled,
      ai_first: !!routingDraft.ai_first,
      default_ring_timeout: defaultTimeout,
      ring_groups: [
        {
          name: 'Primary',
          order_index: 0,
          members: normalizedMembers,
        },
      ],
    };

    try {
      const response = await api.put(ROUTING_ENDPOINT, payload);
      setRoutingDraft(mapRoutingResponseToDraft(response.data));
      setRoutingSuccess('Routing policy saved.');
    } catch (err) {
      setRoutingError(readApiError(err, 'Unable to save routing policy.'));
    } finally {
      setRoutingSaving(false);
    }
  };

  const handleViewEmployee = (member) => {
    setSelectedEmployee(member);
  };

  const handleClosePopup = () => {
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = async () => {
    await fetchTeamMembers();
    await fetchRoutingPolicy();
  };

  return (
    <div className="team-management">
      <div className="team-header">
        <h2>Team Management</h2>
        <button className="logout-btn" onClick={logout} type="button">Log Out</button>
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

      <div className="team-invite-section">
        <h3>Invite by Email</h3>
        <p className="team-muted">Send an invite link — no password needed. They'll set up their own account.</p>
        {inviteSuccess && <p className="success-message">{inviteSuccess}</p>}
        <form onSubmit={handleInviteMember} className="team-form">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="submit" disabled={inviteLoading}>
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </div>

      <h3>Current Team</h3>
      {fetching ? (
        <p className="team-muted">Loading team members...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : normalizeArray(teamMembers).length === 0 ? (
        <div className="team-empty">
          <p>You are the only member in this team. Invite your first teammate.</p>
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

      <section className="team-routing-panel" aria-labelledby="team-routing-title">
        <div className="team-routing-panel-head">
          <div>
            <h3 id="team-routing-title">Inbound Ring Routing</h3>
            <p className="team-muted">Ordered ring group configuration for this tenant.</p>
          </div>
          <button
            type="button"
            className="ghost-btn"
            onClick={fetchRoutingPolicy}
            disabled={routingLoading || routingSaving}
          >
            Reload
          </button>
        </div>

        {routingError && <p className="error-message">{routingError}</p>}
        {routingSuccess && <p className="success-message">{routingSuccess}</p>}

        {routingLoading ? (
          <p className="team-muted">Loading routing policy...</p>
        ) : (
          <>
            <div className="team-routing-grid">
              <label>
                Policy Name
                <input
                  type="text"
                  value={routingDraft.name}
                  onChange={(event) => handleRoutingDraftChange({ name: event.target.value })}
                />
              </label>

              <label>
                Timezone
                <input
                  type="text"
                  value={routingDraft.timezone}
                  onChange={(event) => handleRoutingDraftChange({ timezone: event.target.value })}
                />
              </label>

              <label>
                Business Hours Start
                <input
                  type="time"
                  value={routingDraft.business_hours_start}
                  onChange={(event) =>
                    handleRoutingDraftChange({ business_hours_start: event.target.value })
                  }
                />
              </label>

              <label>
                Business Hours End
                <input
                  type="time"
                  value={routingDraft.business_hours_end}
                  onChange={(event) =>
                    handleRoutingDraftChange({ business_hours_end: event.target.value })
                  }
                />
              </label>

              <label>
                After Hours Route
                <select
                  value={routingDraft.after_hours_route}
                  onChange={(event) =>
                    handleRoutingDraftChange({ after_hours_route: event.target.value })
                  }
                >
                  {AFTER_HOURS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Default Ring Timeout (sec)
                <input
                  type="number"
                  min={1}
                  value={routingDraft.default_ring_timeout}
                  onChange={(event) =>
                    handleRoutingDraftChange({
                      default_ring_timeout: toPositiveInt(event.target.value, 15),
                    })
                  }
                />
              </label>
            </div>

            <div className="team-routing-toggles">
              <label className="team-toggle-item">
                <input
                  type="checkbox"
                  checked={!!routingDraft.ai_first}
                  onChange={(event) =>
                    handleRoutingDraftChange({ ai_first: event.target.checked })
                  }
                />
                AI-first mode
              </label>
              <label className="team-toggle-item">
                <input
                  type="checkbox"
                  checked={!!routingDraft.ai_override_enabled}
                  onChange={(event) =>
                    handleRoutingDraftChange({ ai_override_enabled: event.target.checked })
                  }
                />
                AI override enabled
              </label>
            </div>

            <div className="ring-group-editor">
              <div className="ring-group-editor-head">
                <h4>Primary Ring Group</h4>
                <p className="team-muted">
                  Drag to reorder users. Routing resolves as <code>user:{'{id}'}</code> in this order.
                </p>
              </div>

              <div className="ring-group-add-row">
                <select
                  value={candidateUserId}
                  onChange={(event) => setCandidateUserId(event.target.value)}
                  disabled={!availableRingCandidates.length}
                >
                  {availableRingCandidates.length ? (
                    availableRingCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.first_name} {candidate.last_name} ({candidate.email})
                      </option>
                    ))
                  ) : (
                    <option value="">No available team members</option>
                  )}
                </select>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleAddRingMember}
                  disabled={!availableRingCandidates.length}
                >
                  Add to Ring Group
                </button>
              </div>

              {(routingDraft.members || []).length === 0 ? (
                <p className="team-muted">No ring members configured.</p>
              ) : (
                <ul className="ring-member-list">
                  {(routingDraft.members || []).map((member) => {
                    const user = memberById.get(Number(member.user_id));
                    const displayName = user
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : `User ${member.user_id}`;
                    const email = user?.email || '';

                    return (
                      <li
                        key={member.user_id}
                        className="ring-member-item"
                        draggable
                        onDragStart={(event) => handleDragStart(event, member.user_id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDropOnMember(event, member.user_id)}
                      >
                        <span className="ring-drag-handle" aria-hidden="true">::</span>
                        <div className="ring-member-meta">
                          <strong>{displayName}</strong>
                          <small>{email || `user:${member.user_id}`}</small>
                          <small className="ring-identity">Identity: user:{member.user_id}</small>
                        </div>

                        <label className="ring-timeout-field">
                          Timeout
                          <input
                            type="number"
                            min={1}
                            value={member.ring_timeout}
                            onChange={(event) =>
                              handleRingMemberChange(member.user_id, {
                                ring_timeout: toPositiveInt(event.target.value, routingDraft.default_ring_timeout),
                              })
                            }
                          />
                        </label>

                        <label className="ring-active-field">
                          <input
                            type="checkbox"
                            checked={member.is_active !== false}
                            onChange={(event) =>
                              handleRingMemberChange(member.user_id, {
                                is_active: event.target.checked,
                              })
                            }
                          />
                          Active
                        </label>

                        <button
                          type="button"
                          className="ring-remove-btn"
                          onClick={() => handleRemoveRingMember(member.user_id)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="team-routing-actions">
              <button type="button" onClick={handleSaveRouting} disabled={routingSaving}>
                {routingSaving ? 'Saving...' : 'Save Routing Policy'}
              </button>
            </div>
          </>
        )}
      </section>

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
