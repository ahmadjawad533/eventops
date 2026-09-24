import React, { useEffect, useState } from 'react';
import {
  RoleType,
  OrganizationType,
  EventCategory,
  EventFormat,
  EventStatus,
  RegistrationStatus,
  UserProfile,
  UserRole,
  Organization,
  Event as EventModel,
  CertificateVerification,
} from '@eventops/shared-types';
import { CollaborationTab } from './components/CollaborationTab';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface OrgWithCounts extends Organization {
  member_count: number;
  follower_count: number;
}

interface EventWithCounts extends EventModel {
  registered_count: number;
  remaining_capacity: number;
}

interface RegisteredTicket {
  registration: {
    id: string;
    event_id: string;
    ticket_code: string;
    status: RegistrationStatus;
    registered_at: string;
    checked_in_at?: string | null;
  };
  ticket: {
    ticket_code: string;
    signature: string;
    qr_payload: string;
    qr_code_data_url: string;
  };
}

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eventops_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'events' | 'organizations' | 'certificates' | 'profile' | 'collaborations'>('events');

  // Auth Form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([RoleType.ATTENDEE]);
  const [interestsInput, setInterestsInput] = useState('react, typescript, open-source');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile editing
  const [newTag, setNewTag] = useState('');
  const [selectedNewRole, setSelectedNewRole] = useState<RoleType>(RoleType.ORGANIZER);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Organizations state
  const [orgs, setOrgs] = useState<OrgWithCounts[]>([]);
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>('all');
  const [searchOrgQuery, setSearchOrgQuery] = useState('');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState<OrganizationType>(OrganizationType.COMMUNITY);
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [orgActionMsg, setOrgActionMsg] = useState<string | null>(null);

  // Events state
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('all');
  const [eventFormatFilter, setEventFormatFilter] = useState<string>('all');
  const [searchEventQuery, setSearchEventQuery] = useState('');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventActionMsg, setEventActionMsg] = useState<string | null>(null);

  // New Event Form
  const [newEventOrgId, setNewEventOrgId] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<EventCategory>(EventCategory.TECH);
  const [newEventFormat, setNewEventFormat] = useState<EventFormat>(EventFormat.OFFLINE);
  const [newEventLocation, setNewEventLocation] = useState('Berlin Tech Hub');
  const [newEventCapacity, setNewEventCapacity] = useState(50);
  const [newEventStartDate, setNewEventStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [newEventEndDate, setNewEventEndDate] = useState(
    new Date(Date.now() + 90000000).toISOString().slice(0, 16)
  );

  // Ticket modal / view
  const [activeTicket, setActiveTicket] = useState<RegisteredTicket | null>(null);

  // Organizer Check-In state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInEventId, setCheckInEventId] = useState<string>('');
  const [qrInputPayload, setQrInputPayload] = useState('');
  const [checkInStatusTarget, setCheckInStatusTarget] = useState<RegistrationStatus>(RegistrationStatus.CHECKED_IN);
  const [checkInResult, setCheckInResult] = useState<any>(null);

  // Certificate Verification state
  const [verifyIdInput, setVerifyIdInput] = useState('');
  const [certificateData, setCertificateData] = useState<CertificateVerification | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  // Load health check
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  // Fetch current user if token exists
  useEffect(() => {
    if (!token) {
      setUser(null);
      setRoles([]);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((json) => {
        if (json.success && json.data) {
          setUser(json.data.user);
          setRoles(json.data.roles);
        }
      })
      .catch(() => {
        localStorage.removeItem('eventops_token');
        setToken(null);
        setUser(null);
        setRoles([]);
      });
  }, [token]);

  // Load organizations
  const loadOrgs = () => {
    let url = '/api/organizations?limit=50';
    if (orgTypeFilter !== 'all') url += `&type=${orgTypeFilter}`;
    if (searchOrgQuery.trim()) url += `&search=${encodeURIComponent(searchOrgQuery.trim())}`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items) {
          setOrgs(json.data.items);
          if (json.data.items.length > 0 && !newEventOrgId) {
            setNewEventOrgId(json.data.items[0].id);
          }
        }
      })
      .catch(() => {});
  };

  // Load events
  const loadEvents = () => {
    let url = '/api/events?limit=50';
    if (eventCategoryFilter !== 'all') url += `&category=${eventCategoryFilter}`;
    if (eventFormatFilter !== 'all') url += `&format=${eventFormatFilter}`;
    if (searchEventQuery.trim()) url += `&search=${encodeURIComponent(searchEventQuery.trim())}`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items) setEvents(json.data.items);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadOrgs();
  }, [orgTypeFilter, searchOrgQuery]);

  useEffect(() => {
    loadEvents();
  }, [eventCategoryFilter, eventFormatFilter, searchEventQuery]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);

    const interests = interestsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          roles: selectedRoles,
          interests,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');

      localStorage.setItem('eventops_token', data.data.tokens.accessToken);
      setToken(data.data.tokens.accessToken);
      setUser(data.data.user);
      setRoles(data.data.roles);
      setAuthSuccess('Account registered successfully!');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Login failed');

      localStorage.setItem('eventops_token', data.data.tokens.accessToken);
      setToken(data.data.tokens.accessToken);
      setUser(data.data.user);
      setRoles(data.data.roles);
      setAuthSuccess('Welcome back!');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('eventops_token');
    setToken(null);
    setUser(null);
    setRoles([]);
  };

  const handleAddInterest = async () => {
    if (!newTag.trim() || !user) return;
    const currentInterests = user.interests || [];
    if (currentInterests.includes(newTag.trim())) return;

    const updatedInterests = [...currentInterests, newTag.trim()];

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests: updatedInterests }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser((prev) => (prev ? { ...prev, interests: updatedInterests } : null));
        setNewTag('');
        setProfileMsg('Interest added!');
        setTimeout(() => setProfileMsg(null), 3000);
      }
    } catch (err: any) {
      setProfileMsg('Failed to update interest');
    }
  };

  const handleRemoveInterest = async (tagToRemove: string) => {
    if (!user) return;
    const updatedInterests = (user.interests || []).filter((t) => t !== tagToRemove);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests: updatedInterests }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUser((prev) => (prev ? { ...prev, interests: updatedInterests } : null));
      }
    } catch (err: any) {}
  };

  const handleAssignRole = async () => {
    if (!token) return;
    setProfileMsg(null);

    try {
      const res = await fetch('/api/users/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role_type: selectedNewRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to assign role');

      setRoles((prev) => [...prev, data.data]);
      setProfileMsg(`Role '${selectedNewRole}' added to your account!`);
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg(err.message);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setOrgActionMsg(null);

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newOrgName,
          type: newOrgType,
          description: newOrgDesc,
          website: newOrgWebsite || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create organization');

      setOrgActionMsg(`Organization '${data.data.name}' created!`);
      setShowCreateOrgModal(false);
      setNewOrgName('');
      setNewOrgDesc('');
      setNewOrgWebsite('');
      loadOrgs();
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((j) => j.success && setRoles(j.data.roles));
    } catch (err: any) {
      setOrgActionMsg(err.message);
    }
  };

  const handleJoinOrg = async (orgId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to join');
      setOrgActionMsg('Joined organization as member!');
      loadOrgs();
    } catch (err: any) {
      setOrgActionMsg(err.message);
    }
  };

  const handleFollowCommunity = async (orgId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/communities/${orgId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to follow');
      setOrgActionMsg('Now following community!');
      loadOrgs();
    } catch (err: any) {
      setOrgActionMsg(err.message);
    }
  };

  const handleToggleVerify = async (orgId: string, currentStatus: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Verification update failed');
      setOrgActionMsg(`Organization verification status updated to ${!currentStatus}`);
      loadOrgs();
    } catch (err: any) {
      setOrgActionMsg(err.message);
    }
  };

  // --- Phase 3 Event Handlers ---
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setEventActionMsg(null);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizer_org_id: newEventOrgId,
          title: newEventTitle,
          description: newEventDesc,
          category: newEventCategory,
          format: newEventFormat,
          start_date: new Date(newEventStartDate).toISOString(),
          end_date: new Date(newEventEndDate).toISOString(),
          location: newEventLocation,
          capacity: Number(newEventCapacity),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create event');

      setEventActionMsg(`Event '${data.data.title}' created (draft)!`);
      setShowCreateEventModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      loadEvents();
    } catch (err: any) {
      setEventActionMsg(err.message);
    }
  };

  const handlePublishEvent = async (eventId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/events/${eventId}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Publish failed');
      setEventActionMsg('Event published! Attendees can now register.');
      loadEvents();
    } catch (err: any) {
      setEventActionMsg(err.message);
    }
  };

  const handleRegisterEvent = async (eventId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');

      setEventActionMsg('Registration confirmed! Ticket & QR code issued below.');
      setActiveTicket(data.data);
      loadEvents();
    } catch (err: any) {
      setEventActionMsg(err.message);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !checkInEventId) return;
    setCheckInResult(null);

    try {
      const res = await fetch(`/api/events/${checkInEventId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qrPayload: qrInputPayload.trim(),
          targetStatus: checkInStatusTarget,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Check-in failed');

      setCheckInResult(data.data);
      loadEvents();
    } catch (err: any) {
      setCheckInResult({ error: err.message });
    }
  };

  const handleVerifyCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyIdInput.trim()) return;
    setCertLoading(true);
    setCertificateData(null);

    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(verifyIdInput.trim())}`);
      const data = await res.json();
      setCertificateData(data);
    } catch (err: any) {
      setCertificateData({ valid: false, message: 'Verification lookup failed' });
    } finally {
      setCertLoading(false);
    }
  };

  const isPlatformAdmin = roles.some((r) => r.role_type === RoleType.PLATFORM_ADMIN);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
              EO
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">EventOps</h1>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MVP Phase 3
                </span>
              </div>
              <p className="text-xs text-slate-400">Community & Event Collaboration Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {health && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                API Online
              </span>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right text-xs">
                  <div className="font-semibold text-white">{user.name}</div>
                  <div className="text-slate-400">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition border border-slate-700"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!user ? (
          /* Authentication Screen */
          <div className="max-w-md mx-auto mt-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  authMode === 'login' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  authMode === 'register' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs">
                {authSuccess}
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="organizer@eventops.local"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Alex Morgan"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="alex@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password (min 8 chars)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Initial Account Roles</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: RoleType.ATTENDEE, label: 'Attendee' },
                      { key: RoleType.ORGANIZER, label: 'Organizer' },
                      { key: RoleType.COMMUNITY_ADMIN, label: 'Community Admin' },
                      { key: RoleType.PLATFORM_ADMIN, label: 'Platform Admin' },
                    ].map((r) => (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => {
                          if (selectedRoles.includes(r.key)) {
                            if (selectedRoles.length > 1) setSelectedRoles(selectedRoles.filter((x) => x !== r.key));
                          } else {
                            setSelectedRoles([...selectedRoles, r.key]);
                          }
                        }}
                        className={`p-2 rounded border text-left flex items-center justify-between transition ${
                          selectedRoles.includes(r.key)
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{r.label}</span>
                        {selectedRoles.includes(r.key) && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Interests</label>
                  <input
                    type="text"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Logged In Dashboard with Phase 3 Tabs */
          <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex flex-wrap items-center space-x-2 border-b border-slate-800 pb-3 gap-y-2">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === 'events'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Events Discovery ({events.length})
              </button>
              <button
                onClick={() => setActiveTab('organizations')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === 'organizations'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Communities & Orgs ({orgs.length})
              </button>
              <button
                onClick={() => setActiveTab('collaborations')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === 'collaborations'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Collaborations
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === 'certificates'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Verify Certificate
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === 'profile'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Profile & Roles
              </button>
            </div>

            {eventActionMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex justify-between items-center">
                <span>{eventActionMsg}</span>
                <button onClick={() => setEventActionMsg(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>
            )}

            {/* TAB 1: EVENTS DISCOVERY & MANAGEMENT */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <input
                      type="text"
                      value={searchEventQuery}
                      onChange={(e) => setSearchEventQuery(e.target.value)}
                      placeholder="Search events by title or keyword..."
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                    />

                    <select
                      value={eventCategoryFilter}
                      onChange={(e) => setEventCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Categories</option>
                      <option value={EventCategory.TECH}>Tech</option>
                      <option value={EventCategory.DESIGN}>Design</option>
                      <option value={EventCategory.BUSINESS}>Business</option>
                      <option value={EventCategory.SCIENCE}>Science</option>
                      <option value={EventCategory.SOCIAL}>Social</option>
                    </select>

                    <select
                      value={eventFormatFilter}
                      onChange={(e) => setEventFormatFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Formats</option>
                      <option value={EventFormat.ONLINE}>Online</option>
                      <option value={EventFormat.OFFLINE}>Offline</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => setShowCreateEventModal(true)}
                      className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition shadow-md shadow-emerald-950"
                    >
                      + Create Event
                    </button>
                  </div>
                </div>

                {/* Event Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900/20 border border-slate-800/60 rounded-xl">
                      No events found. Create the first event to get started!
                    </div>
                  ) : (
                    events.map((event) => (
                      <div
                        key={event.id}
                        className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {event.category} &bull; {event.format}
                              </span>
                              <h3 className="font-bold text-white text-base mt-2">{event.title}</h3>
                            </div>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                                event.status === EventStatus.PUBLISHED
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              }`}
                            >
                              {event.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-3 mb-4">
                            {event.description}
                          </p>

                          <div className="space-y-1 text-xs text-slate-400 mb-4">
                            <div>
                              📅 <span className="text-slate-300">{new Date(event.start_date).toLocaleDateString()}</span>
                            </div>
                            {event.location && (
                              <div>
                                📍 <span className="text-slate-300">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800/80">
                          {/* Capacity status */}
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                            <span>
                              Capacity: <strong className="text-white">{event.registered_count}</strong> / {event.capacity}
                            </span>
                            <span className="text-emerald-400 font-mono">
                              {event.remaining_capacity} spots left
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            {event.status === EventStatus.DRAFT ? (
                              <button
                                onClick={() => handlePublishEvent(event.id)}
                                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
                              >
                                Publish Event
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegisterEvent(event.id)}
                                disabled={event.remaining_capacity <= 0}
                                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition"
                              >
                                {event.remaining_capacity <= 0 ? 'Capacity Full' : 'Register (Get QR Ticket)'}
                              </button>
                            )}

                            {/* Organizer Check-In terminal button */}
                            <button
                              onClick={() => {
                                setCheckInEventId(event.id);
                                setShowCheckInModal(true);
                              }}
                              className="w-full py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition border border-slate-700"
                            >
                              Scan & Check-In Terminal
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ORGANIZATIONS & COMMUNITIES */}
            {activeTab === 'organizations' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <input
                      type="text"
                      value={searchOrgQuery}
                      onChange={(e) => setSearchOrgQuery(e.target.value)}
                      placeholder="Search organizations & communities..."
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                    />

                    <select
                      value={orgTypeFilter}
                      onChange={(e) => setOrgTypeFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Types</option>
                      <option value={OrganizationType.COMMUNITY}>Communities</option>
                      <option value={OrganizationType.COMPANY}>Companies</option>
                      <option value={OrganizationType.UNIVERSITY}>Universities</option>
                      <option value={OrganizationType.NGO}>NGOs</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition shadow-md shadow-emerald-950"
                  >
                    + Create Organization / Community
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {orgs.map((org) => (
                    <div
                      key={org.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                              {org.name}
                              {org.verified && (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                  ✓
                                </span>
                              )}
                            </h3>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              {org.type}
                            </span>
                          </div>

                          {isPlatformAdmin && (
                            <button
                              onClick={() => handleToggleVerify(org.id, org.verified)}
                              className={`px-2 py-1 text-[10px] font-medium rounded border transition ${
                                org.verified
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {org.verified ? 'Unverify' : 'Verify'}
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-3 mb-4">{org.description || 'No description provided.'}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span>
                            <strong className="text-white font-mono">{org.member_count}</strong> Members
                          </span>
                          {org.type === OrganizationType.COMMUNITY && (
                            <span>
                              <strong className="text-white font-mono">{org.follower_count}</strong> Followers
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleJoinOrg(org.id)}
                            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                          >
                            Join Member
                          </button>
                          {org.type === OrganizationType.COMMUNITY && (
                            <button
                              onClick={() => handleFollowCommunity(org.id)}
                              className="flex-1 py-1.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/30 transition"
                            >
                              Follow
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VERIFY CERTIFICATE (PUBLIC PAGE) */}
            {activeTab === 'certificates' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold">
                    ✓
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Verify Attendance Certificate</h2>
                  <p className="text-xs text-slate-400 mb-6">
                    Enter the verification ID printed on an EventOps certificate to cryptographically verify attendance.
                  </p>

                  <form onSubmit={handleVerifyCertificate} className="flex gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      required
                      value={verifyIdInput}
                      onChange={(e) => setVerifyIdInput(e.target.value)}
                      placeholder="e.g. EO-CERT-..."
                      className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={certLoading}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition"
                    >
                      {certLoading ? 'Verifying...' : 'Verify'}
                    </button>
                  </form>
                </div>

                {/* Verification Result Card */}
                {certificateData && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    {certificateData.valid && certificateData.certificate ? (
                      <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                            <span className="font-bold text-emerald-400 text-sm tracking-wide uppercase">
                              Official Certificate of Attendance
                            </span>
                          </div>
                          <span className="text-xs font-mono text-emerald-300">
                            {certificateData.certificate.verification_id}
                          </span>
                        </div>

                        <div className="space-y-4 my-4">
                          <p className="text-xs text-slate-400">This certifies that</p>
                          <h3 className="text-2xl font-bold text-white tracking-tight">
                            {certificateData.certificate.attendee_name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            has attended and participated in
                          </p>
                          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                            <h4 className="text-lg font-semibold text-emerald-300">
                              {certificateData.certificate.event_title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                              Organized by {certificateData.certificate.organizer_name}
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-emerald-500/20 flex justify-between text-xs text-slate-400">
                          <span>Issued: {new Date(certificateData.certificate.issued_at).toLocaleDateString()}</span>
                          <span className="text-emerald-400 font-semibold">Status: Authenticated &amp; Verified</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-rose-400 text-sm">
                        ❌ {certificateData.message || 'Certificate ID was not found or is invalid.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PROFILE */}
            {activeTab === 'profile' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{user.name}</h2>
                    <p className="text-sm text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Member since: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 mr-1">Active Roles:</span>
                    {roles.map((r) => (
                      <span
                        key={r.id}
                        className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      >
                        {r.role_type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {profileMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs">
                    {profileMsg}
                  </div>
                )}

                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-white mb-1">Assign Additional Role</h3>
                  <div className="flex flex-wrap gap-3 items-center mt-3">
                    <select
                      value={selectedNewRole}
                      onChange={(e) => setSelectedNewRole(e.target.value as RoleType)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {[
                        RoleType.ATTENDEE,
                        RoleType.ORGANIZER,
                        RoleType.COMMUNITY_ADMIN,
                        RoleType.SPONSOR,
                        RoleType.VENUE_OWNER,
                        RoleType.PLATFORM_ADMIN,
                      ].map((role) => (
                        <option key={role} value={role}>
                          {role.toUpperCase().replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignRole}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                    >
                      + Add Role
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/80">
                  <h3 className="text-sm font-semibold text-white mb-1">Profile Interests</h3>
                  <div className="flex flex-wrap gap-2 mb-4 mt-3">
                    {(user.interests || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveInterest(tag)}
                          className="text-slate-400 hover:text-rose-400 text-sm ml-1"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                      placeholder="Add tag (e.g. devops)"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddInterest}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: COLLABORATION MARKETPLACE & WORKSPACES */}
            {activeTab === 'collaborations' && (
              <CollaborationTab
                token={token}
                user={user}
                roles={roles}
                orgs={orgs}
                events={events}
                onActionMsg={(msg) => setEventActionMsg(msg)}
              />
            )}
          </div>
        )}

        {/* MODAL 1: TICKET DISPLAY WITH SIGNED QR CODE */}
        {activeTicket && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <h3 className="font-bold text-white text-sm">🎟️ Event Ticket &amp; QR Code</h3>
                <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>

              <div className="bg-white p-3 rounded-xl inline-block shadow-inner mb-4">
                <img
                  src={activeTicket.ticket.qr_code_data_url}
                  alt="Ticket QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>

              <div className="space-y-1 text-xs font-mono text-slate-300 mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ticket:</span>
                  <span className="text-emerald-400 font-bold">{activeTicket.ticket.ticket_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-slate-300 uppercase">{activeTicket.registration.status}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mb-4">
                Present this QR code at event entrance. Contains tamper-proof cryptographic signature.
              </p>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeTicket.ticket.qr_payload);
                  alert('QR payload copied to clipboard for check-in testing!');
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
              >
                Copy QR Payload (for Check-In scan)
              </button>
            </div>
          </div>
        )}

        {/* MODAL 2: ORGANIZER CHECK-IN TERMINAL */}
        {showCheckInModal && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">Organizer Check-In Terminal</h3>
                  <p className="text-xs text-slate-400">Scan QR payload to transition status and issue certificates</p>
                </div>
                <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCheckInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Scan / Paste QR Payload JSON
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={qrInputPayload}
                    onChange={(e) => setQrInputPayload(e.target.value)}
                    placeholder='{"registrationId": "...", "ticketCode": "...", "signature": "..."}'
                    className="w-full font-mono px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Status Transition</label>
                  <select
                    value={checkInStatusTarget}
                    onChange={(e) => setCheckInStatusTarget(e.target.value as RegistrationStatus)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={RegistrationStatus.CHECKED_IN}>CHECKED IN (Entrance)</option>
                    <option value={RegistrationStatus.ATTENDED}>ATTENDED (Auto-issues Certificate)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition"
                >
                  Verify Signature &amp; Update Status
                </button>
              </form>

              {/* Terminal Result */}
              {checkInResult && (
                <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  {checkInResult.error ? (
                    <div className="text-rose-400 text-xs">❌ {checkInResult.error}</div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="text-emerald-400 font-semibold">
                        ✓ Attendee successfully transitioned to {checkInResult.registration?.status}!
                      </div>
                      {checkInResult.certificate && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300">
                          🎓 <strong>Certificate Auto-Generated!</strong>
                          <div className="font-mono text-[11px] mt-1">
                            ID: {checkInResult.certificate.verification_id}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 3: CREATE EVENT */}
        {showCreateEventModal && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <h3 className="font-bold text-white text-base">Create New Event</h3>
                <button onClick={() => setShowCreateEventModal(false)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Organizing Community / Org</label>
                  <select
                    value={newEventOrgId}
                    onChange={(e) => setNewEventOrgId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g. Microservices & Distributed Systems Conf"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={newEventCategory}
                      onChange={(e) => setNewEventCategory(e.target.value as EventCategory)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={EventCategory.TECH}>Tech</option>
                      <option value={EventCategory.DESIGN}>Design</option>
                      <option value={EventCategory.BUSINESS}>Business</option>
                      <option value={EventCategory.SCIENCE}>Science</option>
                      <option value={EventCategory.SOCIAL}>Social</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Format</label>
                    <select
                      value={newEventFormat}
                      onChange={(e) => setNewEventFormat(e.target.value as EventFormat)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={EventFormat.OFFLINE}>Offline</option>
                      <option value={EventFormat.ONLINE}>Online</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Location / Link</label>
                    <input
                      type="text"
                      value={newEventLocation}
                      onChange={(e) => setNewEventLocation(e.target.value)}
                      placeholder="City or URL"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Capacity</label>
                    <input
                      type="number"
                      min={1}
                      value={newEventCapacity}
                      onChange={(e) => setNewEventCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    required
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    placeholder="Event agenda and details..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateEventModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                  >
                    Create Draft
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: CREATE ORGANIZATION */}
        {showCreateOrgModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-bold text-lg text-white">Create Organization or Community</h3>
                <button onClick={() => setShowCreateOrgModal(false)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. NextGen AI Developers"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                  <select
                    value={newOrgType}
                    onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={OrganizationType.COMMUNITY}>Community</option>
                    <option value={OrganizationType.COMPANY}>Company</option>
                    <option value={OrganizationType.UNIVERSITY}>University</option>
                    <option value={OrganizationType.NGO}>NGO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newOrgDesc}
                    onChange={(e) => setNewOrgDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrgModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        EventOps MVP &copy; 2026. Built with permission-based privacy by design.
      </footer>
    </div>
  );
}

export default App;
