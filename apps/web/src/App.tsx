import React, { useEffect, useState } from 'react';
import {
  RoleType,
  OrganizationType,
  UserProfile,
  UserRole,
  Organization,
} from '@eventops/shared-types';

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

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eventops_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'profile' | 'organizations'>('profile');

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState<OrganizationType>(OrganizationType.COMMUNITY);
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [orgActionMsg, setOrgActionMsg] = useState<string | null>(null);

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
    if (orgTypeFilter !== 'all') {
      url += `&type=${orgTypeFilter}`;
    }
    if (searchQuery.trim()) {
      url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items) {
          setOrgs(json.data.items);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadOrgs();
  }, [orgTypeFilter, searchQuery]);

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
      // Re-fetch roles as creator is assigned community_admin / organizer
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

  const isPlatformAdmin = roles.some((r) => r.role_type === RoleType.PLATFORM_ADMIN);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
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
                  MVP Phase 2
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!user ? (
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
          /* Logged In Dashboard with Tabs */
          <div className="space-y-6">
            {/* Tabs Bar */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
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
              <button
                onClick={() => setActiveTab('organizations')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === 'organizations'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Communities & Organizations ({orgs.length})
              </button>
            </div>

            {orgActionMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex justify-between items-center">
                <span>{orgActionMsg}</span>
                <button onClick={() => setOrgActionMsg(null)} className="text-slate-400 hover:text-white">
                  &times;
                </button>
              </div>
            )}

            {/* Tab 1: Profile */}
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

                {/* Multi-role expansion */}
                <div className="pt-4">
                  <h3 className="text-sm font-semibold text-white mb-1">Assign Additional Role</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Add another role to this account (e.g. Organizer, Sponsor, Community Admin).
                  </p>
                  <div className="flex flex-wrap gap-3 items-center">
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

                {/* Interests Tags */}
                <div className="pt-6 border-t border-slate-800/80">
                  <h3 className="text-sm font-semibold text-white mb-1">Profile Interests</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Topics used for event and collaboration discovery.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
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

            {/* Tab 2: Communities & Organizations */}
            {activeTab === 'organizations' && (
              <div className="space-y-6">
                {/* Search & Actions Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Organization Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {orgs.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 text-sm bg-slate-900/20 border border-slate-800/60 rounded-xl">
                      No organizations found. Create the first one above!
                    </div>
                  ) : (
                    orgs.map((org) => (
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
                                  <span
                                    title="Verified Organization"
                                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                                  >
                                    ✓
                                  </span>
                                )}
                              </h3>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                {org.type}
                              </span>
                            </div>

                            {/* Verified Toggle (Platform Admin) */}
                            {isPlatformAdmin && (
                              <button
                                onClick={() => handleToggleVerify(org.id, org.verified)}
                                className={`px-2 py-1 text-[10px] font-medium rounded border transition ${
                                  org.verified
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                {org.verified ? 'Unverify' : 'Verify'}
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-3 mb-4">
                            {org.description || 'No description provided.'}
                          </p>

                          {org.website && (
                            <a
                              href={org.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-400 hover:underline block mb-4"
                            >
                              {org.website}
                            </a>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-800/80">
                          {/* Stats */}
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

                          {/* Action Buttons: Join vs Follow distinction */}
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
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Create Organization */}
        {showCreateOrgModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-bold text-lg text-white">Create Organization or Community</h3>
                <button
                  onClick={() => setShowCreateOrgModal(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
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
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
                    placeholder="Brief description of the organization..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Website (Optional)</label>
                  <input
                    type="url"
                    value={newOrgWebsite}
                    onChange={(e) => setNewOrgWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrgModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg shadow-md shadow-emerald-950"
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
