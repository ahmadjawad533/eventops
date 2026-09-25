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
  Zap,
  Star,
  Check,
  Crown,
  ShieldAlert,
  SlidersHorizontal,
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

// Pre-seeded Demo Accounts for 1-Click Instant Sign In
const DEMO_ACCOUNTS = [
  {
    name: 'Olivia Organizer',
    email: 'organizer@summit.org',
    password: 'Password123!',
    role: RoleType.ORGANIZER,
    label: '👑 Organizer',
    desc: 'Event Host & Producer',
  },
  {
    name: 'Chloe Community',
    email: 'admin@reactcommunity.org',
    password: 'Password123!',
    role: RoleType.COMMUNITY_ADMIN,
    label: '👥 Community Admin',
    desc: 'Community & Audience Manager',
  },
  {
    name: 'Sam Sponsor',
    email: 'sponsor@cloudcorp.io',
    password: 'Password123!',
    role: RoleType.SPONSOR,
    label: '💼 Corporate Sponsor',
    desc: 'Brand Partnerships & CRM',
  },
  {
    name: 'Aaron Attendee',
    email: 'attendee@coders.net',
    password: 'Password123!',
    role: RoleType.ATTENDEE,
    label: '🎟️ Attendee',
    desc: 'RSVP & Ticket Collector',
  },
  {
    name: 'Platform SuperAdmin',
    email: 'admin@eventops.io',
    password: 'Password123!',
    role: RoleType.PLATFORM_ADMIN,
    label: '⚡ Super Admin',
    desc: 'Platform-wide Governance',
  },
];

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
  const [email, setEmail] = useState('organizer@summit.org');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Olivia Organizer');
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([RoleType.ORGANIZER]);
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
  const [newEventCapacity, setNewEventCapacity] = useState(100);
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
      const res = await fetch('/api/users/profile', {
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

  // Robust Quick Demo Sign In with Auto-Register Fallback
  const handleQuickDemoSignIn = async (demo: typeof DEMO_ACCOUNTS[0]) => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);
    setEmail(demo.email);
    setPassword(demo.password);

    try {
      // 1. Try login first
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demo.email, password: demo.password }),
      });

      let data = await res.json();

      // 2. If login fails because user doesn't exist, auto-register!
      if (!res.ok) {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: demo.email,
            password: demo.password,
            name: demo.name,
            roles: [demo.role],
            interests: ['tech', 'networking', 'open-source'],
          }),
        });

        data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Quick sign-in failed');
      }

      const accessToken = data.data.tokens.accessToken;
      localStorage.setItem('eventops_token', accessToken);
      setToken(accessToken);
      setUser(data.data.user);
      setRoles(data.data.roles);
      setAuthSuccess(`Signed in as ${demo.name} (${demo.label})!`);
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
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = await res.json();

      // Auto-fallback to register if user doesn't exist yet
      if (!res.ok && (data.error?.code === 'INVALID_CREDENTIALS' || res.status === 401)) {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: name || email.split('@')[0],
            roles: selectedRoles,
            interests: ['tech', 'events'],
          }),
        });
        data = await res.json();
      }

      if (!res.ok) throw new Error(data.error?.message || 'Authentication failed');

      const accessToken = data.data.tokens.accessToken;
      localStorage.setItem('eventops_token', accessToken);
      setToken(accessToken);
      setUser(data.data.user);
      setRoles(data.data.roles);
      setAuthSuccess('Authenticated successfully!');
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
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
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

      await fetchUserProfile();
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
      setOrgActionMsg('Successfully joined community as verified member!');
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
      setEventActionMsg('Event published live to discovery network!');
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
      setEventActionMsg('Registration confirmed! Signed HMAC QR VIP Pass generated.');
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
    { id: 'organizations', label: 'Communities & Hubs', icon: Users, badge: orgs.length },
    { id: 'collaborations', label: 'Co-Host & Workspace', icon: Handshake },
    { id: 'outreach', label: 'Audience Outreach', icon: Send },
    { id: 'sponsorships', label: 'Sponsorships CRM', icon: Briefcase },
    { id: 'venues', label: 'Venues & Bookings', icon: Building2 },
    { id: 'dashboards', label: 'Analytics & Audit', icon: BarChart3 },
    { id: 'certificates', label: 'Verify Certificate', icon: ShieldCheck },
    { id: 'profile', label: 'Profile & Roles', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Dynamic Ambient Blur Lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] glow-orb-emerald rounded-full animate-pulse-slow" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] glow-orb-purple rounded-full animate-pulse-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] glow-orb-blue rounded-full animate-pulse-slow" />
      </div>

      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 glass-panel-deep px-4 md:px-8 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/80 border border-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center space-x-3 cursor-pointer group"
              onClick={() => setActiveTab('events')}
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-sky-400 to-purple-500 p-0.5 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-all">
                <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-white font-mono gradient-text-neon">
                    EventOps
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    MVP v0.8
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Community &amp; Event Collaboration Platform
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {health && (
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                API Healthy
              </span>
            )}

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                    {user.name}
                    {isPlatformAdmin && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-md">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                </div>

                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-400 to-purple-500 p-0.5 flex items-center justify-center font-bold text-slate-950 text-xs shadow-xl">
                  <div className="w-full h-full bg-[#030712] rounded-[14px] flex items-center justify-center text-white">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
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
          /* Glassmorphic Authentication Screen with Instant 1-Click Demo Accounts */
          <div className="max-w-xl w-full mx-auto my-auto glass-panel-deep border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-purple-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 glow-orb-emerald animate-float">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                EventOps Portal
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Discover events, co-host with partner communities, and manage sponsorships with zero member PII exposure.
              </p>
            </div>

            {/* Instant Demo Accounts Quick Sign-In Bar */}
            <div className="p-4 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  1-Click Instant Demo Sign In
                </span>
                <span className="text-[10px] text-slate-400 font-mono">No Setup Needed</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.slice(0, 4).map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleQuickDemoSignIn(demo)}
                    className="p-2.5 bg-slate-900/90 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left transition flex flex-col justify-between group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                      {demo.label}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate mt-0.5">{demo.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 p-1 bg-slate-950/90 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`py-2.5 text-xs font-bold rounded-xl transition ${
                  authMode === 'login'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`py-2.5 text-xs font-bold rounded-xl transition ${
                  authMode === 'register'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register Custom Account
              </button>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
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
                    placeholder="organizer@summit.org"
                    className="w-full px-4 py-3 glass-input-glow rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Password123!"
                    className="w-full px-4 py-3 glass-input-glow rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 glass-button-primary text-white font-bold rounded-xl text-xs transition shadow-xl disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In to Portal'}
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
                    placeholder="Olivia Organizer"
                    className="w-full px-4 py-3 glass-input-glow rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="organizer@summit.org"
                    className="w-full px-4 py-3 glass-input-glow rounded-xl text-xs"
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
                    className="w-full px-4 py-3 glass-input-glow rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Roles</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[RoleType.ORGANIZER, RoleType.COMMUNITY_ADMIN, RoleType.ATTENDEE, RoleType.SPONSOR].map(
                      (role) => (
                        <label
                          key={role}
                          className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition ${
                            selectedRoles.includes(role)
                              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-semibold'
                              : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
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
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 glass-button-primary text-white font-bold rounded-xl text-xs transition shadow-xl disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Logged In Dashboard Layout */
          <>
            {/* Glass Sidebar Navigation */}
            <aside
              className={`fixed inset-y-0 left-0 z-30 w-64 glass-panel-deep border-r border-white/10 p-4 transform transition-transform duration-300 lg:relative lg:translate-x-0 rounded-3xl shrink-0 ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                    Platform Navigation
                  </div>
                  <nav className="space-y-1.5">
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
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-indigo-500/10 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950/80 border border-slate-800 text-emerald-400">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Quick Launchpad */}
                <div className="p-4 bg-slate-950/70 border border-white/10 rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Quick Launchpad</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="w-full py-2.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl transition border border-emerald-500/30 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Host New Event</span>
                  </button>
                  <button
                    onClick={() => setShowCreateOrgModal(true)}
                    className="w-full py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition border border-white/10 flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register Org / Chapter</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6 min-w-0">
              {eventActionMsg && (
                <div className="p-4 glass-panel-deep border border-emerald-500/40 rounded-2xl text-emerald-400 text-xs flex justify-between items-center shadow-xl">
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
                  <div className="relative glass-panel-deep border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/15 via-teal-500/15 to-purple-500/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Flame className="w-4 h-4 text-emerald-400" />
                          <span>Luma &amp; Partiful Inspired Event Hub</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                          Discover Tech Summits &amp; Meetups
                        </h2>
                        <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                          RSVP for upcoming offline &amp; virtual gatherings, receive HMAC-signed VIP ticket passes, and earn verified attendance credentials.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowCreateEventModal(true)}
                        className="px-5 py-3 glass-button-primary text-white font-bold text-xs rounded-2xl transition flex items-center space-x-2 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Event</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Controls */}
                  <div className="glass-panel-deep p-4 border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={searchEventQuery}
                        onChange={(e) => setSearchEventQuery(e.target.value)}
                        placeholder="Search event title, location..."
                        className="w-full pl-10 pr-4 py-2.5 glass-input-glow rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="flex items-center space-x-2">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400">Category:</span>
                        <select
                          value={eventCategoryFilter}
                          onChange={(e) => setEventCategoryFilter(e.target.value)}
                          className="px-3 py-1.5 glass-input-glow rounded-xl text-xs"
                        >
                          <option value="all">All Categories</option>
                          <option value={EventCategory.TECH}>Tech</option>
                          <option value={EventCategory.DESIGN}>Design</option>
                          <option value={EventCategory.BUSINESS}>Business</option>
                          <option value={EventCategory.SCIENCE}>Science</option>
                          <option value={EventCategory.SOCIAL}>Social</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400">Format:</span>
                        <select
                          value={eventFormatFilter}
                          onChange={(e) => setEventFormatFilter(e.target.value)}
                          className="px-3 py-1.5 glass-input-glow rounded-xl text-xs"
                        >
                          <option value="all">All Formats</option>
                          <option value={EventFormat.OFFLINE}>Offline</option>
                          <option value={EventFormat.ONLINE}>Online</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Glass Event Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.length === 0 ? (
                      <div className="col-span-full py-20 text-center glass-panel-deep rounded-3xl border border-white/10 text-slate-500 text-xs">
                        No events found matching search filters.
                      </div>
                    ) : (
                      filteredEvents.map((ev) => {
                        const startDate = new Date(ev.start_date);
                        const isPublished = ev.status === EventStatus.PUBLISHED;
                        return (
                          <div
                            key={ev.id}
                            className="glass-card-neon rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group"
                          >
                            <div className="space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center space-x-2">
                                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    {ev.category}
                                  </span>
                                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                    {ev.format}
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                                    isPublished
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  }`}
                                >
                                  {ev.status}
                                </span>
                              </div>

                              <div>
                                <h3 className="text-lg font-extrabold text-white group-hover:text-emerald-300 transition line-clamp-1">
                                  {ev.title}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {ev.description}
                                </p>
                              </div>

                              <div className="space-y-2 text-xs text-slate-400 pt-1">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span>
                                    {startDate.toLocaleDateString()} at{' '}
                                    {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                                  <span className="truncate">{ev.location || 'Virtual Platform'}</span>
                                </div>
                              </div>

                              {/* Capacity Bar */}
                              <div className="space-y-1.5 pt-2">
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>Seats Reserved</span>
                                  <span className="font-mono text-emerald-400 font-bold">
                                    {ev.registered_count} / {ev.capacity}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                                  <div
                                    className="bg-gradient-to-r from-emerald-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, (ev.registered_count / ev.capacity) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="pt-5 mt-5 border-t border-white/10 flex items-center gap-2">
                              {isPublished ? (
                                <button
                                  onClick={() => handleRegisterEvent(ev.id)}
                                  className="flex-1 py-2.5 px-3 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2"
                                >
                                  <Ticket className="w-4 h-4" />
                                  <span>RSVP Now</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePublishEvent(ev.id)}
                                  className="flex-1 py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl transition border border-amber-500/30 flex items-center justify-center space-x-2"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  <span>Publish Event</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setCheckInEventId(ev.id);
                                  setShowCheckInModal(true);
                                }}
                                className="px-3.5 py-2.5 glass-button-secondary text-slate-300 text-xs font-bold rounded-xl"
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

              {/* TAB 2: COMMUNITIES HUB */}
              {activeTab === 'organizations' && (
                <div className="space-y-6">
                  <div className="glass-panel-deep p-6 border border-white/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">Communities &amp; Hubs</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Join chapters as a verified member or follow communities for public event updates.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowCreateOrgModal(true)}
                      className="px-5 py-3 glass-button-primary text-white font-bold text-xs rounded-2xl flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Community / Hub</span>
                    </button>
                  </div>

                  {orgActionMsg && (
                    <div className="p-4 glass-panel-deep border border-emerald-500/40 rounded-xl text-emerald-400 text-xs flex justify-between items-center">
                      <span>{orgActionMsg}</span>
                      <button onClick={() => setOrgActionMsg(null)} className="text-slate-400 hover:text-white">
                        &times;
                      </button>
                    </div>
                  )}

                  {/* Filter Bar */}
                  <div className="glass-panel-deep p-4 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <input
                      type="text"
                      value={searchOrgQuery}
                      onChange={(e) => setSearchOrgQuery(e.target.value)}
                      placeholder="Search community name..."
                      className="w-full sm:w-80 px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                    />

                    <select
                      value={orgTypeFilter}
                      onChange={(e) => setOrgTypeFilter(e.target.value)}
                      className="px-4 py-2.5 glass-input-glow rounded-xl text-xs w-full sm:w-auto"
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
                      <div key={o.id} className="glass-card-neon rounded-3xl p-6 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {o.type}
                            </span>
                            {o.verified && (
                              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-extrabold text-white">{o.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{o.description}</p>

                          <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono pt-2">
                            <span><strong className="text-emerald-400">{o.member_count}</strong> members</span>
                            <span>•</span>
                            <span><strong className="text-indigo-400">{o.follower_count}</strong> followers</span>
                          </div>
                        </div>

                        <div className="pt-5 mt-5 border-t border-white/10 flex items-center gap-2">
                          <button
                            onClick={() => handleJoinOrg(o.id)}
                            className="flex-1 py-2.5 glass-button-primary text-white font-bold text-xs rounded-xl"
                          >
                            Join Member
                          </button>
                          <button
                            onClick={() => handleFollowOrg(o.id)}
                            className="flex-1 py-2.5 glass-button-secondary text-slate-300 font-bold text-xs rounded-xl"
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
                  <div className="glass-panel-deep p-10 border border-white/10 rounded-3xl max-w-2xl mx-auto text-center space-y-5">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto glow-orb-emerald animate-float">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Certificate Verification Portal</h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Verify the cryptographic authenticity of EventOps attendee credentials and certificates.
                    </p>

                    <form onSubmit={handleVerifyCertificate} className="flex gap-2 max-w-md mx-auto pt-2">
                      <input
                        type="text"
                        value={verifyIdInput}
                        onChange={(e) => setVerifyIdInput(e.target.value)}
                        placeholder="e.g. EO-CERT-1711234567-A1B2"
                        required
                        className="flex-1 px-4 py-3 glass-input-glow rounded-xl text-xs font-mono"
                      />
                      <button
                        type="submit"
                        disabled={certLoading}
                        className="px-5 py-3 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg"
                      >
                        {certLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </form>

                    {certificateData && (
                      <div className="mt-8 text-left p-6 glass-panel-deep rounded-2xl border border-white/10 space-y-4 shadow-2xl">
                        {certificateData.valid ? (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                              <CheckCircle2 className="w-5 h-5" />
                              <span>OFFICIAL VERIFIED CERTIFICATE</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-slate-500">Attendee:</span>
                                <div className="font-bold text-white text-sm mt-0.5">{certificateData.certificate?.attendee_name}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Event Title:</span>
                                <div className="font-bold text-white text-sm mt-0.5">{certificateData.certificate?.event_title}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Issued By:</span>
                                <div className="font-bold text-emerald-400 text-sm mt-0.5">{certificateData.certificate?.organizer_name}</div>
                              </div>
                              <div>
                                <span className="text-slate-500">Verification ID:</span>
                                <div className="font-mono text-slate-300 mt-0.5">{certificateData.certificate?.verification_id}</div>
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
                  <div className="glass-panel-deep p-8 border border-white/10 rounded-3xl space-y-6">
                    <div className="flex items-center space-x-5">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-400 via-teal-400 to-purple-500 p-0.5 flex items-center justify-center font-bold text-slate-950 text-2xl shadow-xl">
                        <div className="w-full h-full bg-[#030712] rounded-[22px] flex items-center justify-center text-white">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-white">{user.name}</h2>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    {profileMsg && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs">
                        {profileMsg}
                      </div>
                    )}

                    <div>
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">Assigned Roles</h3>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r) => (
                          <span
                            key={r.id}
                            className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          >
                            {r.role_type}
                          </span>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleAssignRole} className="space-y-3 pt-6 border-t border-white/10">
                      <label className="block text-xs font-semibold text-slate-300">Assign Additional Role</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedNewRole}
                          onChange={(e) => setSelectedNewRole(e.target.value as RoleType)}
                          className="flex-1 px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                        >
                          <option value={RoleType.ORGANIZER}>ORGANIZER</option>
                          <option value={RoleType.COMMUNITY_ADMIN}>COMMUNITY_ADMIN</option>
                          <option value={RoleType.SPONSOR}>SPONSOR</option>
                          <option value={RoleType.VENUE_OWNER}>VENUE_OWNER</option>
                        </select>
                        <button type="submit" className="px-5 py-2.5 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg">
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-deep border border-emerald-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500" />
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                VIP SIGNED PASS
              </span>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl">
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
              className="w-full py-3 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: ORGANIZER CHECK-IN SCANNER */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-deep border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
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
                  className="w-full p-3 glass-input-glow rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Entrance Target Status</label>
                <select
                  value={checkInStatusTarget}
                  onChange={(e) => setCheckInStatusTarget(e.target.value as RegistrationStatus)}
                  className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                >
                  <option value={RegistrationStatus.CHECKED_IN}>CHECKED IN (Entrance Verification)</option>
                  <option value={RegistrationStatus.ATTENDED}>ATTENDED (Auto-Issue Certificate)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Verify HMAC Signature &amp; Transition
              </button>
            </form>

            {checkInResult && (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-white/10 text-xs">
                {checkInResult.error ? (
                  <div className="text-rose-400 font-bold">❌ {checkInResult.error}</div>
                ) : (
                  <div className="space-y-2 text-emerald-400 font-bold">
                    <div>✓ Attendee updated to {checkInResult.registration?.status}!</div>
                    {checkInResult.certificate && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 font-mono">
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-deep border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
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
                  className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
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
                  className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Keynote topics, speakers, and workshop details..."
                  className="w-full p-3 glass-input-glow rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as EventCategory)}
                    className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
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
                    className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
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
                    className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={newEventCapacity}
                    onChange={(e) => setNewEventCapacity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Create Event Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE ORGANIZATION */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-deep border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
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
                  className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Organization Type</label>
                <select
                  value={newOrgType}
                  onChange={(e) => setNewOrgType(e.target.value as OrganizationType)}
                  className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
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
                  className="w-full p-3 glass-input-glow rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Website URL (Optional)</label>
                <input
                  type="url"
                  value={newOrgWebsite}
                  onChange={(e) => setNewOrgWebsite(e.target.value)}
                  placeholder="https://community.org"
                  className="w-full px-4 py-2.5 glass-input-glow rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 glass-button-primary text-white font-bold text-xs rounded-xl shadow-lg"
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
