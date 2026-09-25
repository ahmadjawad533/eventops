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
import {
  Calendar,
  Users,
  Handshake,
  Send,
  Briefcase,
  Building2,
  BarChart3,
  ShieldCheck,
  Ticket,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ChevronRight,
  UserPlus,
  LogOut,
  QrCode,
  Globe,
  ExternalLink,
  GraduationCap,
  Flame,
  Radio,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { CollaborationTab } from './components/CollaborationTab';
import { OutreachTab } from './components/OutreachTab';
import { SponsorshipTab } from './components/SponsorshipTab';
import { VenuesTab } from './components/VenuesTab';
import { DashboardsTab } from './components/DashboardsTab';

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
  const [activeTab, setActiveTab] = useState<
    | 'events'
    | 'organizations'
    | 'certificates'
    | 'profile'
    | 'collaborations'
    | 'outreach'
    | 'sponsorships'
    | 'venues'
    | 'dashboards'
  >('events');

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const [qrInputPayload, setQrInputPayload] = useState<string>('');
  const [checkInStatusTarget, setCheckInStatusTarget] = useState<RegistrationStatus>(
    RegistrationStatus.CHECKED_IN
  );
  const [checkInResult, setCheckInResult] = useState<any>(null);

  // Public Certificate Verification state
  const [verifyIdInput, setVerifyIdInput] = useState('');
  const [certificateData, setCertificateData] = useState<CertificateVerification | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  // Initial Health Check & Data Fetch
  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      loadOrganizations();
      loadEvents();
    }
  }, [token]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  };

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.data.user);
        setRoles(data.data.roles);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const loadOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      if (res.ok && data.success) {
        setOrgs(data.data.items || []);
        if (data.data.items?.length > 0 && !newEventOrgId) {
          setNewEventOrgId(data.data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load events', err);
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
      if (!res.ok) throw new Error(data.error?.message || 'Authentication failed');

      const accessToken = data.data.tokens.accessToken;
      localStorage.setItem('eventops_token', accessToken);
      setToken(accessToken);
      setUser(data.data.user);
      setRoles(data.data.roles);
      setAuthSuccess('Welcome back to EventOps!');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      const accessToken = data.data.tokens.accessToken;
      localStorage.setItem('eventops_token', accessToken);
      setToken(accessToken);
      setUser(data.data.user);
      setRoles(data.data.roles);
      setAuthSuccess('Account created successfully!');
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

  const handleAddInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTag.trim()) return;
    setProfileMsg(null);

    try {
      const updatedInterests = [...(user?.interests || []), newTag.trim()];
      const res = await fetch('/api/users/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests: updatedInterests }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to add interest tag');

      setUser(data.data);
      setNewTag('');
      setProfileMsg('Interest tag added successfully!');
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProfileMsg(null);

    try {
      const res = await fetch('/api/users/me/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role_type: selectedNewRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to assign role');

      setRoles(data.data);
      setProfileMsg(`Role ${selectedNewRole} assigned!`);
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
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

      setOrgActionMsg(`Organization "${data.data.name}" created successfully!`);
      setShowCreateOrgModal(false);
      setNewOrgName('');
      setNewOrgDesc('');
      setNewOrgWebsite('');
      loadOrganizations();
    } catch (err: any) {
      setOrgActionMsg(`Error: ${err.message}`);
    }
  };

  const handleJoinOrg = async (orgId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/communities/${orgId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to join community');
      setOrgActionMsg('Successfully joined community!');
      loadOrganizations();
    } catch (err: any) {
      setOrgActionMsg(`Error: ${err.message}`);
    }
  };

  const handleFollowOrg = async (orgId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/communities/${orgId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to follow organization');
      setOrgActionMsg('Successfully followed organization!');
      loadOrganizations();
    } catch (err: any) {
      setOrgActionMsg(`Error: ${err.message}`);
    }
  };

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
          location: newEventLocation,
          capacity: newEventCapacity,
          start_date: new Date(newEventStartDate).toISOString(),
          end_date: new Date(newEventEndDate).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create event');

      setEventActionMsg(`Event "${data.data.title}" created in DRAFT status!`);
      setShowCreateEventModal(false);
      setNewEventTitle('');
      setNewEventDesc('');
      loadEvents();
    } catch (err: any) {
      setEventActionMsg(`Error: ${err.message}`);
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
      if (!res.ok) throw new Error(data.error?.message || 'Failed to publish event');
      setEventActionMsg('Event published live!');
      loadEvents();
    } catch (err: any) {
      setEventActionMsg(`Error: ${err.message}`);
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

      setActiveTicket(data.data);
      setEventActionMsg('Registration confirmed! HMAC-signed QR ticket generated.');
      loadEvents();
    } catch (err: any) {
      setEventActionMsg(`Error: ${err.message}`);
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
    } catch {
      setCertificateData({ valid: false, message: 'Verification lookup failed' });
    } finally {
      setCertLoading(false);
    }
  };

  const isPlatformAdmin = roles.some((r) => r.role_type === RoleType.PLATFORM_ADMIN);

  // Filtered lists
  const filteredOrgs = orgs.filter((o) => {
    const matchesType = orgTypeFilter === 'all' || o.type === orgTypeFilter;
    const matchesQuery =
      o.name.toLowerCase().includes(searchOrgQuery.toLowerCase()) ||
      (o.description || '').toLowerCase().includes(searchOrgQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  const filteredEvents = events.filter((e) => {
    const matchesCat = eventCategoryFilter === 'all' || e.category === eventCategoryFilter;
    const matchesFmt = eventFormatFilter === 'all' || e.format === eventFormatFilter;
    const matchesQuery =
      e.title.toLowerCase().includes(searchEventQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchEventQuery.toLowerCase());
    return matchesCat && matchesFmt && matchesQuery;
  });

  const navigationItems = [
    { id: 'events', label: 'Events & Discovery', icon: Calendar, badge: events.length },
    { id: 'organizations', label: 'Communities & Orgs', icon: Users, badge: orgs.length },
    { id: 'collaborations', label: 'Co-Host & Workspace', icon: Handshake },
    { id: 'outreach', label: 'Audience Outreach', icon: Send },
    { id: 'sponsorships', label: 'Sponsorships CRM', icon: Briefcase },
    { id: 'venues', label: 'Venues & Bookings', icon: Building2 },
    { id: 'dashboards', label: 'Analytics & Audit', icon: BarChart3 },
    { id: 'certificates', label: 'Verify Certificate', icon: ShieldCheck },
    { id: 'profile', label: 'Profile & Roles', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 md:px-8 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('events')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-white font-mono">EventOps</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    MVP v0.8
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Community &amp; Event Collaboration Platform</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3.5">
            {health && (
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-slate-900/90 text-slate-300 border border-slate-800 shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                API Online
              </span>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                    {user.name}
                    {isPlatformAdmin && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">{user.email}</div>
                </div>

                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-500 p-0.5 flex items-center justify-center font-bold text-slate-950 text-xs shadow-lg">
                  <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition border border-transparent hover:border-rose-500/20"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 relative z-10 flex flex-col lg:flex-row gap-8">
        {!user ? (
          /* Authentication Screen */
          <div className="max-w-md w-full mx-auto my-auto glass-panel border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />

            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 glow-emerald">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to EventOps</h2>
              <p className="text-xs text-slate-400 mt-1">
                Collaborate across communities, host events &amp; request sponsorships securely.
              </p>
            </div>

            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  authMode === 'login'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  authMode === 'register'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="organizer@eventops.local"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-xl shadow-emerald-950/50 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Alex Morgan"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="alex@techcommunity.org"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Roles</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[RoleType.ORGANIZER, RoleType.COMMUNITY_ADMIN, RoleType.ATTENDEE, RoleType.SPONSOR].map(
                      (role) => (
                        <label
                          key={role}
                          className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                            selectedRoles.includes(role)
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-semibold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoles.includes(role)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRoles([...selectedRoles, role]);
                              else setSelectedRoles(selectedRoles.filter((r) => r !== role));
                            }}
                            className="hidden"
                          />
                          <span className="text-[11px] font-mono">{role}</span>
                        </label>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Interests</label>
                  <input
                    type="text"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                    placeholder="react, devops, AI"
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-xl shadow-emerald-950/50 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Creating account...' : 'Complete Registration'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Logged In Dashboard Layout */
          <>
            {/* Sidebar Navigation */}
            <aside
              className={`fixed inset-y-0 left-0 z-30 w-64 glass-panel border-r border-slate-800 p-4 transform transition-transform duration-300 lg:relative lg:translate-x-0 rounded-2xl shrink-0 ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
                    Navigation Menu
                  </div>
                  <nav className="space-y-1">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id as any);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-md'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Quick Actions Card */}
                <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-white flex items-center justify-between">
                    <span>Quick Actions</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="w-full py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg transition border border-emerald-500/30 flex items-center justify-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Host New Event</span>
                  </button>
                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition border border-slate-800 flex items-center justify-center space-x-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Org / Chapter</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content Pane */}
            <div className="flex-1 space-y-6 min-w-0">
              {eventActionMsg && (
                <div className="p-4 glass-panel border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex justify-between items-center shadow-xl">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{eventActionMsg}</span>
                  </div>
                  <button onClick={() => setEventActionMsg(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* TAB 1: EVENTS DISCOVERY & MANAGEMENT */}
              {activeTab === 'events' && (
                <div className="space-y-6">
                  {/* Hero Banner */}
                  <div className="relative glass-panel border border-slate-800 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Luma &amp; Partiful Inspired Discovery</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                          Explore Events &amp; Tech Summits
                        </h2>
                        <p className="text-xs text-slate-400 max-w-xl">
                          RSVP for upcoming offline &amp; virtual gatherings, receive HMAC-signed ticket passes, and earn verified attendance certificates.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowCreateEventModal(true)}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950 flex items-center space-x-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Event</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="glass-panel p-4 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                      <input
                        type="text"
                        value={searchEventQuery}
                        onChange={(e) => setSearchEventQuery(e.target.value)}
                        placeholder="Search event title, location..."
                        className="w-full pl-10 pr-4 py-2 glass-input rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center space-x-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400">Category:</span>
                        <select
                          value={eventCategoryFilter}
                          onChange={(e) => setEventCategoryFilter(e.target.value)}
                          className="px-3 py-1.5 glass-input rounded-xl text-xs"
                        >
                          <option value="all">All Categories</option>
                          <option value={EventCategory.TECH}>Tech</option>
                          <option value={EventCategory.DESIGN}>Design</option>
                          <option value={EventCategory.BUSINESS}>Business</option>
                          <option value={EventCategory.SCIENCE}>Science</option>
                          <option value={EventCategory.SOCIAL}>Social</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs text-slate-400">Format:</span>
                        <select
                          value={eventFormatFilter}
                          onChange={(e) => setEventFormatFilter(e.target.value)}
                          className="px-3 py-1.5 glass-input rounded-xl text-xs"
                        >
                          <option value="all">All Formats</option>
                          <option value={EventFormat.OFFLINE}>Offline</option>
                          <option value={EventFormat.ONLINE}>Online</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Event Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.length === 0 ? (
                      <div className="col-span-full py-16 text-center glass-panel rounded-3xl border border-slate-800 text-slate-500 text-xs">
                        No events found matching current search criteria.
                      </div>
                    ) : (
                      filteredEvents.map((ev) => {
                        const startDate = new Date(ev.start_date);
                        const isPublished = ev.status === EventStatus.PUBLISHED;
                        return (
                          <div key={ev.id} className="glass-card rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group">
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center space-x-2">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    {ev.category}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                    {ev.format}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                                    isPublished
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  }`}
                                >
                                  {ev.status}
                                </span>
                              </div>

                              <div>
                                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition line-clamp-1">
                                  {ev.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                              </div>

                              <div className="space-y-2 text-xs text-slate-400">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span className="truncate">{ev.location || 'Virtual Link'}</span>
                                </div>
                              </div>

                              {/* Capacity Bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>Capacity Utilization</span>
                                  <span className="font-mono text-emerald-400">
                                    {ev.registered_count} / {ev.capacity}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(100, (ev.registered_count / ev.capacity) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-2">
                              {isPublished ? (
                                <button
                                  onClick={() => handleRegisterEvent(ev.id)}
                                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-1.5"
                                >
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>RSVP / Register</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePublishEvent(ev.id)}
                                  className="flex-1 py-2 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 font-bold text-xs rounded-xl transition border border-amber-500/30 flex items-center justify-center space-x-1.5"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Publish Event</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setCheckInEventId(ev.id);
                                  setShowCheckInModal(true);
                                }}
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition border border-slate-800"
                                title="Organizer Entrance Scanner"
                              >
                                Check-In
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: COMMUNITIES & ORGANIZATIONS HUB */}
              {activeTab === 'organizations' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Communities &amp; Organizations</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Join chapters as a verified member or follow communities for public event broadcasts.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowCreateOrgModal(true)}
                      className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Community / Org</span>
                    </button>
                  </div>

                  {orgActionMsg && (
                    <div className="p-3.5 glass-panel border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex justify-between items-center">
                      <span>{orgActionMsg}</span>
                      <button onClick={() => setOrgActionMsg(null)} className="text-slate-400 hover:text-white">
                        &times;
                      </button>
                    </div>
                  )}

                  {/* Filter Bar */}
                  <div className="glass-panel p-4 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <input
                      type="text"
                      value={searchOrgQuery}
                      onChange={(e) => setSearchOrgQuery(e.target.value)}
                      placeholder="Search community name..."
                      className="w-full sm:w-72 px-3.5 py-2 glass-input rounded-xl text-xs"
                    />

                    <select
                      value={orgTypeFilter}
                      onChange={(e) => setOrgTypeFilter(e.target.value)}
                      className="px-3 py-1.5 glass-input rounded-xl text-xs w-full sm:w-auto"
                    >
                      <option value="all">All Types</option>
                      <option value={OrganizationType.COMMUNITY}>Community</option>
                      <option value={OrganizationType.COMPANY}>Company</option>
                      <option value={OrganizationType.NGO}>Non-Profit / NGO</option>
                      <option value={OrganizationType.UNIVERSITY}>University</option>
                    </select>
                  </div>

                  {/* Org Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrgs.map((o) => (
                      <div key={o.id} className="glass-card rounded-3xl p-5 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              {o.type}
                            </span>
                            {o.verified && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-white">{o.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2">{o.description}</p>

                          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono pt-2">
                            <span><strong className="text-emerald-400">{o.member_count}</strong> members</span>
                            <span>•</span>
                            <span><strong className="text-indigo-400">{o.follower_count}</strong> followers</span>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-2">
                          <button
                            onClick={() => handleJoinOrg(o.id)}
                            className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold text-xs rounded-xl transition border border-emerald-500/30"
                          >
                            Join Member
                          </button>
                          <button
                            onClick={() => handleFollowOrg(o.id)}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition border border-slate-800"
                          >
                            Follow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COLLABORATION & WORKSPACE */}
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

              {/* TAB 4: PERMISSION-BASED OUTREACH */}
              {activeTab === 'outreach' && (
                <OutreachTab
                  token={token}
                  user={user}
                  roles={roles}
                  orgs={orgs}
                  events={events}
                  onActionMsg={(msg) => setEventActionMsg(msg)}
                />
              )}

              {/* TAB 5: SPONSORSHIPS MARKETPLACE & CRM */}
              {activeTab === 'sponsorships' && (
                <SponsorshipTab token={token} userOrgs={orgs} userEvents={events} roles={roles} />
              )}

              {/* TAB 6: VENUES MARKETPLACE & BOOKINGS */}
              {activeTab === 'venues' && (
                <VenuesTab token={token} userOrgs={orgs} userEvents={events} roles={roles} />
              )}

              {/* TAB 7: DASHBOARDS & AUDIT TRAIL */}
              {activeTab === 'dashboards' && (
                <DashboardsTab token={token} userOrgs={orgs} userEvents={events} roles={roles} />
              )}

              {/* TAB 8: CERTIFICATE VERIFICATION PORTAL */}
              {activeTab === 'certificates' && (
                <div className="space-y-6">
                  <div className="glass-panel p-8 border border-slate-800 rounded-3xl max-w-2xl mx-auto text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto glow-emerald">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Public Certificate Verification Portal</h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Verify the authenticity of EventOps attendee credentials and certificates of completion.
                    </p>

                    <form onSubmit={handleVerifyCertificate} className="flex gap-2 max-w-md mx-auto pt-2">
                      <input
                        type="text"
                        value={verifyIdInput}
                        onChange={(e) => setVerifyIdInput(e.target.value)}
                        placeholder="e.g. EO-CERT-1711234567-A1B2"
                        required
                        className="flex-1 px-4 py-2.5 glass-input rounded-xl text-xs font-mono"
                      />
                      <button
                        type="submit"
                        disabled={certLoading}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950"
                      >
                        {certLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </form>

                    {certificateData && (
                      <div className="mt-6 text-left p-6 glass-panel rounded-2xl border border-slate-800 space-y-4">
                        {certificateData.valid ? (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                              <CheckCircle2 className="w-5 h-5" />
                              <span>OFFICIAL VERIFIED CERTIFICATE</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-slate-500">Attendee:</span>
                                <div className="font-bold text-white">{certificateData.certificate?.attendee_name}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Event Title:</span>
                                <div className="font-bold text-white">{certificateData.certificate?.event_title}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Issued By:</span>
                                <div className="font-bold text-emerald-400">{certificateData.certificate?.organizer_name}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Verification ID:</span>
                                <div className="font-mono text-slate-300">{certificateData.certificate?.verification_id}</div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-rose-400 font-bold text-xs">
                            ❌ {certificateData.message || 'Invalid Certificate ID'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 9: PROFILE & ROLES */}
              {activeTab === 'profile' && user && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="glass-panel p-6 border border-slate-800 rounded-3xl space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 p-0.5 flex items-center justify-center font-bold text-slate-950 text-xl shadow-xl">
                        <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-white">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{user.name}</h2>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>

                    {profileMsg && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                        {profileMsg}
                      </div>
                    )}

                    <div>
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Assigned Roles</h3>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => (
                          <span
                            key={r.id}
                            className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          >
                            {r.role_type}
                          </span>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleAssignRole} className="space-y-3 pt-4 border-t border-slate-800">
                      <label className="block text-xs font-semibold text-slate-300">Assign Additional Role</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedNewRole}
                          onChange={(e) => setSelectedNewRole(e.target.value as RoleType)}
                          className="flex-1 px-3 py-2 glass-input rounded-xl text-xs"
                        >
                          <option value={RoleType.ORGANIZER}>ORGANIZER</option>
                          <option value={RoleType.COMMUNITY_ADMIN}>COMMUNITY_ADMIN</option>
                          <option value={RoleType.SPONSOR}>SPONSOR</option>
                          <option value={RoleType.VENUE_OWNER}>VENUE_OWNER</option>
                        </select>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition">
                          Assign Role
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MODAL 1: TICKET DISPLAY WITH SIGNED QR CODE */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-emerald-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-indigo-500" />
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                VIP TICKET PASS
              </span>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl">
              <img src={activeTicket.ticket.qr_code_data_url} alt="HMAC Signed QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <div className="space-y-1 font-mono">
              <div className="text-xs font-bold text-emerald-400">{activeTicket.ticket.ticket_code}</div>
              <div className="text-[10px] text-slate-500 truncate max-w-xs mx-auto">
                Sig: {activeTicket.ticket.signature}
              </div>
            </div>

            <button
              onClick={() => setActiveTicket(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: ORGANIZER CHECK-IN SCANNER */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Organizer Check-In Terminal</h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Scan or Enter QR Code / Payload</label>
                <textarea
                  required
                  rows={3}
                  value={qrInputPayload}
                  onChange={(e) => setQrInputPayload(e.target.value)}
                  placeholder="Paste QR payload string or ticket code..."
                  className="w-full p-3 glass-input rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Entrance Target Status</label>
                <select
                  value={checkInStatusTarget}
                  onChange={(e) => setCheckInStatusTarget(e.target.value as RegistrationStatus)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                >
                  <option value={RegistrationStatus.CHECKED_IN}>CHECKED IN (Entrance Verification)</option>
                  <option value={RegistrationStatus.ATTENDED}>ATTENDED (Auto-Issue Certificate)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Verify HMAC Signature &amp; Transition
              </button>
            </form>

            {checkInResult && (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                {checkInResult.error ? (
                  <div className="text-rose-400">❌ {checkInResult.error}</div>
                ) : (
                  <div className="space-y-2 text-emerald-400">
                    <div>✓ Attendee updated to {checkInResult.registration?.status}!</div>
                    {checkInResult.certificate && (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] text-emerald-300">
                        🎓 Certificate Issued: {checkInResult.certificate.verification_id}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Host New Event</h3>
              <button onClick={() => setShowCreateEventModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organizing Chapter / Org</label>
                <select
                  value={newEventOrgId}
                  onChange={(e) => setNewEventOrgId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Title</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems &amp; Cloud Summit"
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Keynote topics, speakers, and workshop details..."
                  className="w-full p-3 glass-input rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as EventCategory)}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  >
                    <option value={EventCategory.TECH}>Tech</option>
                    <option value={EventCategory.DESIGN}>Design</option>
                    <option value={EventCategory.BUSINESS}>Business</option>
                    <option value={EventCategory.SCIENCE}>Science</option>
                    <option value={EventCategory.SOCIAL}>Social</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Format</label>
                  <select
                    value={newEventFormat}
                    onChange={(e) => setNewEventFormat(e.target.value as EventFormat)}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  >
                    <option value={EventFormat.OFFLINE}>Offline</option>
                    <option value={EventFormat.ONLINE}>Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location / URL</label>
                  <input
                    type="text"
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={newEventCapacity}
                    onChange={(e) => setNewEventCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Create Event Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE ORGANIZATION */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Create Community / Organization</h3>
              <button onClick={() => setShowCreateOrgModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Name</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. React Berlin Chapter"
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Type</label>
                <select
                  value={newOrgType}
                  onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                >
                  <option value={OrganizationType.COMMUNITY}>Community</option>
                  <option value={OrganizationType.COMPANY}>Company</option>
                  <option value={OrganizationType.NGO}>Non-Profit / NGO</option>
                  <option value={OrganizationType.UNIVERSITY}>University</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  required
                  value={newOrgDesc}
                  onChange={(e) => setNewOrgDesc(e.target.value)}
                  placeholder="Describe your community mission..."
                  className="w-full p-3 glass-input rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Website URL (Optional)</label>
                <input
                  type="url"
                  value={newOrgWebsite}
                  onChange={(e) => setNewOrgWebsite(e.target.value)}
                  placeholder="https://community.org"
                  className="w-full px-3.5 py-2.5 glass-input rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
              >
                Register Organization
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

