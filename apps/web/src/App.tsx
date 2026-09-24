import React, { useEffect, useState } from 'react';
import { RoleType, UserProfile, UserRole } from '@eventops/shared-types';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('eventops_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);

  // UI state
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
        if (!res.ok) {
          throw new Error('Session expired');
        }
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
      if (!res.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

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
      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

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
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to assign role');
      }

      setRoles((prev) => [...prev, data.data]);
      setProfileMsg(`Role '${selectedNewRole}' added to your account!`);
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg(err.message);
    }
  };

  const toggleRoleSelection = (role: RoleType) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

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
                  MVP Phase 1
                </span>
              </div>
              <p className="text-xs text-slate-400">Community & Event Collaboration Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {health && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                API Online ({health.environment})
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
            {/* Auth Mode Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  authMode === 'login'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  authMode === 'register'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Password (min 8 chars)
                  </label>
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
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Initial Account Roles (Select one or multiple)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: RoleType.ATTENDEE, label: 'Attendee' },
                      { key: RoleType.ORGANIZER, label: 'Organizer' },
                      { key: RoleType.COMMUNITY_ADMIN, label: 'Community Admin' },
                      { key: RoleType.SPONSOR, label: 'Sponsor' },
                      { key: RoleType.VENUE_OWNER, label: 'Venue Owner' },
                    ].map((r) => (
                      <button
                        type="button"
                        key={r.key}
                        onClick={() => toggleRoleSelection(r.key)}
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Interests (comma separated)
                  </label>
                  <input
                    type="text"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                    placeholder="technology, ai, design, networking"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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
          /* Logged In Dashboard / Profile */
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
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
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs">
                  {profileMsg}
                </div>
              )}

              {/* Multi-role expansion */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Multi-Role Support: Assign Another Role to this Account
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  In EventOps, a single account can hold multiple roles simultaneously (e.g. attendee, organizer, and sponsor).
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

              {/* Profile Interests Tags */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Profile Interests (Saved for Event Recommendations)
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Tags that define your topics of interest across communities and events.
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(user.interests || []).length > 0 ? (
                    (user.interests || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveInterest(tag)}
                          className="text-slate-400 hover:text-rose-400 text-sm ml-1"
                          title="Remove interest"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No interests added yet.</span>
                  )}
                </div>

                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()}
                    placeholder="Add an interest (e.g. kubernetes, AI)"
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
