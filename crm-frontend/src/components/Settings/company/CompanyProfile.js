import React, { useEffect, useState } from 'react';
import api from '../../../apiClient';
import TagInput from '../../../pages/settings/components/TagInput.tsx';
import { getActiveTenant, setActiveTenant } from '../../../helpers/tenantHelpers';
import '../SettingsCommon.css';

const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific (LA)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/New_York', label: 'Eastern (NY)' },
  { value: 'UTC', label: 'UTC' },
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const STATE_CODE_SET = new Set(US_STATES.map((state) => state.code));
const STATE_NAME_TO_CODE = US_STATES.reduce((acc, state) => {
  acc[state.name.toLowerCase()] = state.code;
  return acc;
}, {});

const ZIP_REGEX = /^\d{5}(?:-\d{4})?$/;
const CITY_REGEX = /^[a-zA-Z][a-zA-Z .'-]{1,58}$/;
const HEX_COLOR_REGEX = /^#(?:[0-9A-Fa-f]{3}){1,2}$/;
const HEX_COLOR_NO_HASH_REGEX = /^(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const normalizeStateCode = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  if (STATE_CODE_SET.has(upper)) return upper;
  return STATE_NAME_TO_CODE[raw.toLowerCase()] || '';
};

const normalizeColor = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (HEX_COLOR_REGEX.test(raw)) return raw.toUpperCase();
  if (HEX_COLOR_NO_HASH_REGEX.test(raw)) return `#${raw}`.toUpperCase();
  return raw;
};

const normalizeServiceAreas = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
};

const normalizeServiceAreaInput = (value) => {
  const clean = String(value || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  if (ZIP_REGEX.test(clean)) return clean;
  return clean
    .split(' ')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
};

const validateServiceAreaInput = (value) => {
  if (ZIP_REGEX.test(value) || CITY_REGEX.test(value)) return true;
  return 'Enter a ZIP code (12345) or a city name.';
};

const extractTenantPayload = (payload) => {
  if (!payload) return {};
  if (payload?.tenant && typeof payload.tenant === 'object') return payload.tenant;
  if (Array.isArray(payload?.results)) return payload.results[0] || {};
  if (payload?.results && typeof payload.results === 'object') return payload.results;
  return payload;
};

export default function CompanyProfile() {
  const [form, setForm] = useState({
    name: '',
    domain: '',
    timezone: 'America/New_York',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    logo: '',
    primaryColor: '',
    serviceAreas: [],
  });
  const [tenantSnapshot, setTenantSnapshot] = useState(getActiveTenant() || {});
  const [tenantPreferences, setTenantPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [preferencesResponse, meResponse] = await Promise.all([
          api.get('/accounts/preferences/').catch(() => ({ data: {} })),
          api.get('/accounts/auth/me/').catch(() => ({ data: {} })),
        ]);
        if (!mounted) return;

        const activeTenant = getActiveTenant() || {};
        const tenantData = {
          ...activeTenant,
          ...extractTenantPayload(meResponse?.data?.activeTenant || meResponse?.data?.tenant || {}),
        };
        const preferences = preferencesResponse?.data?.preferences || {};
        const profile = preferences?.company_profile || {};
        const branding = preferences?.branding || {};

        setTenantSnapshot(tenantData);
        setTenantPreferences(preferences);
        setForm((prev) => ({
          ...prev,
          name: profile?.name || tenantData?.name || '',
          domain: profile?.domain || tenantData?.domain || '',
          timezone: profile?.timezone || tenantData?.timezone || 'America/New_York',
          address1: profile?.address1 || profile?.address_1 || '',
          address2: profile?.address2 || profile?.address_2 || '',
          city: profile?.city || '',
          state: normalizeStateCode(profile?.state || profile?.province || ''),
          zip: profile?.zip || profile?.zip_code || '',
          logo: branding?.logo_url || branding?.logo || tenantData?.logo || '',
          primaryColor:
            normalizeColor(
              branding?.primary_color ||
              branding?.primaryColor ||
              tenantData?.primary_color ||
              ''
            ) || '',
          serviceAreas: normalizeServiceAreas(
            preferences?.service_areas || preferences?.serviceAreas || tenantData?.service_areas
          ),
        }));
      } catch (e) {
        console.warn('Could not load company profile:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSave = async () => {
    setMsg('');

    const normalizedColor = normalizeColor(form.primaryColor);
    const companyProfile = {
      ...(tenantPreferences?.company_profile || {}),
      name: form.name.trim(),
      domain: form.domain.trim(),
      timezone: form.timezone,
      address1: form.address1.trim(),
      address2: form.address2.trim(),
      city: form.city.trim(),
      state: form.state,
      zip: form.zip.trim(),
    };
    const nextPreferences = {
      ...(tenantPreferences || {}),
      company_profile: companyProfile,
      branding: {
        ...(tenantPreferences?.branding || {}),
        logo_url: form.logo.trim(),
        primary_color: normalizedColor,
      },
      service_areas: form.serviceAreas,
    };

    try {
      const response = await api.patch('/accounts/preferences/', {
        preferences: nextPreferences,
      });
      const savedPreferences = response?.data?.preferences || nextPreferences;
      const updatedTenant = {
        ...tenantSnapshot,
        name: form.name.trim() || tenantSnapshot?.name || '',
        domain: form.domain.trim() || tenantSnapshot?.domain || '',
        preferences: savedPreferences,
        logo: form.logo.trim(),
        primary_color: normalizedColor,
      };

      setTenantSnapshot(updatedTenant);
      setTenantPreferences(savedPreferences);
      setMsg('✅ Saved!');
      setActiveTenant({
        ...(getActiveTenant() || {}),
        ...updatedTenant,
      });
    } catch (e) {
      const detail =
        e?.payload?.detail ||
        e?.payload?.error ||
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        'Save failed. Check fields or try again.';
      setMsg(`❌ ${detail}`);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login'; // simple redirect
  };

  if (loading) return <div className="settings-page"><p>Loading…</p></div>;

  return (
    <div className="settings-page">
      <h2>Company Profile</h2>

      {msg && <p className="settings-msg">{msg}</p>}

      <div className="settings-card">
        <div className="settings-form">
          <label>Company Name
            <input name="name" value={form.name} onChange={onChange} />
          </label>

          <label>Domain
            <input name="domain" value={form.domain} onChange={onChange} placeholder="example.com" />
          </label>

          <label>Timezone
            <select name="timezone" value={form.timezone} onChange={onChange}>
              {TIMEZONE_OPTIONS.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>{timezone.label}</option>
              ))}
            </select>
          </label>

          <label>Logo URL
            <input name="logo" value={form.logo} onChange={onChange} placeholder="https://…" />
          </label>

          <label>Primary Color
            <div className="settings-inline-inputs">
              <input
                type="color"
                name="primaryColorPicker"
                value={HEX_COLOR_REGEX.test(normalizeColor(form.primaryColor)) ? normalizeColor(form.primaryColor) : '#0EA5E9'}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                aria-label="Primary color picker"
              />
              <input
                type="text"
                name="primaryColor"
                value={form.primaryColor}
                onChange={onChange}
                placeholder="#0EA5E9"
              />
            </div>
          </label>

          {form.logo && (
            <div className="logo-preview">
              <img src={form.logo} alt="Company Logo" style={{ maxHeight: '60px', marginTop: '10px' }} />
            </div>
          )}
        </div>
      </div>

      <h3>Address</h3>
      <div className="settings-card">
        <div className="settings-form two-col">
          <label>Address 1
            <input name="address1" value={form.address1 || ''} onChange={onChange} />
          </label>
          <label>Address 2
            <input name="address2" value={form.address2 || ''} onChange={onChange} />
          </label>
          <label>City
            <input name="city" value={form.city || ''} onChange={onChange} />
          </label>
          <label>State
            <select name="state" value={form.state || ''} onChange={onChange}>
              <option value="">Select a state</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          </label>
          <label>ZIP
            <input name="zip" value={form.zip || ''} onChange={onChange} />
          </label>
        </div>
      </div>

      <h3>Service Areas</h3>
      <div className="settings-card">
        <TagInput
          label="Zip Codes or Cities"
          values={form.serviceAreas}
          onChange={(serviceAreas) => setForm((prev) => ({ ...prev, serviceAreas }))}
          placeholder="Add ZIP code or city and press Enter"
          helperText="Examples: 33602, Tampa, St. Petersburg"
          validate={validateServiceAreaInput}
          normalize={normalizeServiceAreaInput}
          addButtonText="Add Area"
          emptyLabel="No service areas added yet."
        />
      </div>

      <div className="settings-actions">
        <button className="settings-primary" onClick={onSave}>💾 Save</button>
        <button className="settings-secondary" onClick={handleLogout}>🚪 Logout</button>
      </div>
    </div>
  );
}
