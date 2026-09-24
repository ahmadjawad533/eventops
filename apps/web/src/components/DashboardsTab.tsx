import React, { useEffect, useState } from 'react';
import {
  Organization,
  Event as EventModel,
  UserRole,
  OrganizerDashboardMetrics,
  CommunityDashboardMetrics,
  AuditLogItem,
  RoleType,
} from '@eventops/shared-types';

interface DashboardsTabProps {
  token: string | null;
  userOrgs: Organization[];
  userEvents: EventModel[];
  roles: UserRole[];
}

export function DashboardsTab({ token, userOrgs, userEvents, roles }: DashboardsTabProps) {
  const [subTab, setSubTab] = useState<'organizer' | 'community' | 'audit'>('organizer');
  const [selectedOrgId, setSelectedOrgId] = useState<string>(userOrgs[0]?.id || '');

  // Organizer Dashboard State
  const [organizerMetrics, setOrganizerMetrics] = useState<OrganizerDashboardMetrics | null>(null);
  const [loadingOrganizer, setLoadingOrganizer] = useState(false);

  // Community Dashboard State
  const [communityMetrics, setCommunityMetrics] = useState<CommunityDashboardMetrics | null>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditMeta, setAuditMeta] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState('');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // General error/success state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPlatformAdmin = roles.some((r) => r.role_type === RoleType.PLATFORM_ADMIN);

  // Load Organizer Metrics
  const loadOrganizerDashboard = async (orgId?: string) => {
    if (!token) return;
    setLoadingOrganizer(true);
    setErrorMsg(null);
    try {
      const query = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
      const res = await fetch(`/api/dashboards/organizer${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load organizer dashboard');
      setOrganizerMetrics(data.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingOrganizer(false);
    }
  };

  // Load Community Metrics
  const loadCommunityDashboard = async (orgId?: string) => {
    if (!token) return;
    setLoadingCommunity(true);
    setErrorMsg(null);
    try {
      const query = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
      const res = await fetch(`/api/dashboards/community${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load community dashboard');
      setCommunityMetrics(data.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async (page = 1) => {
    if (!token) return;
    setLoadingAudit(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (auditActionFilter) params.set('action', auditActionFilter);
      if (auditTypeFilter) params.set('target_type', auditTypeFilter);

      const res = await fetch(`/api/dashboards/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load audit logs');
      setAuditLogs(data.data.items || []);
      setAuditMeta(data.data.meta);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Sync when subtab or selectedOrg changes
  useEffect(() => {
    if (subTab === 'organizer') {
      loadOrganizerDashboard(selectedOrgId);
    } else if (subTab === 'community') {
      loadCommunityDashboard(selectedOrgId);
    } else if (subTab === 'audit') {
      loadAuditLogs(1);
    }
  }, [subTab, selectedOrgId, token]);

  const handleOrgChange = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('PUBLISH')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (act.includes('APPROVE') || act.includes('CONFIRM') || act.includes('ACCEPT')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    if (act.includes('REJECT') || act.includes('CANCEL') || act.includes('DELETE')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (act.includes('COUNTER') || act.includes('UPDATE') || act.includes('CHECK_IN')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    return 'bg-slate-500/10 text-slate-300 border-slate-700';
  };

  // Filter audit logs by search query client-side
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditSearchQuery.trim()) return true;
    const q = auditSearchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.target_type.toLowerCase().includes(q) ||
      log.target_id.toLowerCase().includes(q) ||
      (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
      (log.actor_email && log.actor_email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400">
            📊
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Analytics & Audit Hub</h2>
            <p className="text-xs text-slate-400">
              Real-time organizer metrics, audience delivery analytics, and immutable compliance audit logs.
            </p>
          </div>
        </div>

        {/* View Switcher Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubTab('organizer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'organizer'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 Organizer Analytics
          </button>
          <button
            onClick={() => setSubTab('community')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'community'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Community & Outreach
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              subTab === 'audit'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Audit Trail
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white text-sm">
            &times;
          </button>
        </div>
      )}

      {/* SUB-TAB 1: ORGANIZER ANALYTICS */}
      {subTab === 'organizer' && (
        <div className="space-y-6">
          {/* Org Selector & Refresh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Select Organization:</span>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {userOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadOrganizerDashboard(selectedOrgId)}
              disabled={loadingOrganizer}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 disabled:opacity-50"
            >
              {loadingOrganizer ? 'Refreshing...' : '🔄 Refresh Data'}
            </button>
          </div>

          {loadingOrganizer && !organizerMetrics ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading organizer metrics...</div>
          ) : organizerMetrics ? (
            <>
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Total Events
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {organizerMetrics.summary.total_events}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {organizerMetrics.summary.published_events} Live
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {organizerMetrics.summary.draft_events} Draft
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Registrations
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {organizerMetrics.summary.total_registrations}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Across all published &amp; completed events
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Attended Check-Ins
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">
                    {organizerMetrics.summary.total_attended}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Verified entrance tickets scanned
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Attendance Rate
                  </div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {organizerMetrics.summary.average_attendance_rate}%
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, organizerMetrics.summary.average_attendance_rate)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl col-span-2 md:col-span-1">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Collaborations & Sponsors
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xl font-bold text-indigo-400">
                      {organizerMetrics.summary.total_collaborations}
                    </span>
                    <span className="text-xs text-slate-400">collabs /</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {organizerMetrics.summary.total_sponsorships_confirmed}
                    </span>
                    <span className="text-xs text-slate-400">sponsors</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">Active partnership network</div>
                </div>
              </div>

              {/* Event Performance Breakdown Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-white text-sm">Event Performance Breakdown</h3>
                  <span className="text-xs text-slate-400">
                    {organizerMetrics.events_breakdown.length} Events Tracked
                  </span>
                </div>

                {organizerMetrics.events_breakdown.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No events created yet for this organization.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="p-3.5">Event Title</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Start Date</th>
                          <th className="p-3.5">Capacity</th>
                          <th className="p-3.5">Registered</th>
                          <th className="p-3.5">Attended</th>
                          <th className="p-3.5">Turnout %</th>
                          <th className="p-3.5">Remaining Seats</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {organizerMetrics.events_breakdown.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-800/30 transition">
                            <td className="p-3.5 font-medium text-white">{ev.title}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold border uppercase bg-slate-800 text-slate-300 border-slate-700">
                                {ev.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400">
                              {new Date(ev.start_date).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">{ev.capacity}</td>
                            <td className="p-3.5 font-mono font-semibold text-emerald-400">
                              {ev.registered_count}
                            </td>
                            <td className="p-3.5 font-mono font-semibold text-blue-400">
                              {ev.attended_count}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  ev.attendance_rate >= 70
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : ev.attendance_rate >= 40
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {ev.attendance_rate}%
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-400">
                              {ev.remaining_capacity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Activity for Org */}
              {organizerMetrics.recent_activity.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <h3 className="font-bold text-white text-sm mb-3">Recent Organization Activity</h3>
                  <div className="space-y-2">
                    {organizerMetrics.recent_activity.slice(0, 5).map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getActionBadgeClass(
                              act.action
                            )}`}
                          >
                            {act.action}
                          </span>
                          <span className="text-slate-300">
                            Target: <span className="font-mono text-slate-400">{act.target_type}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(act.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* SUB-TAB 2: COMMUNITY GROWTH & OUTREACH */}
      {subTab === 'community' && (
        <div className="space-y-6">
          {/* Org Selector & Refresh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/40 p-3.5 border border-slate-800 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Select Community:</span>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {userOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.type})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => loadCommunityDashboard(selectedOrgId)}
              disabled={loadingCommunity}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 disabled:opacity-50"
            >
              {loadingCommunity ? 'Refreshing...' : '🔄 Refresh Data'}
            </button>
          </div>

          {loadingCommunity && !communityMetrics ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading community metrics...</div>
          ) : communityMetrics ? (
            <>
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Total Audience
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {communityMetrics.summary.member_count + communityMetrics.summary.follower_count}
                  </div>
                  <div className="flex items-center space-x-1 mt-2 text-[10px] text-slate-400">
                    <span className="text-emerald-400 font-semibold">{communityMetrics.summary.member_count}</span> members,
                    <span className="text-indigo-400 font-semibold">{communityMetrics.summary.follower_count}</span> followers
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Campaigns
                  </div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">
                    {communityMetrics.summary.total_outreach_campaigns}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Permissioned outreach broadcasts
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Delivered Volume
                  </div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">
                    {communityMetrics.summary.total_outreach_delivered}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Zero raw PII exposure
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Average Open Rate
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {communityMetrics.summary.average_open_rate}%
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, communityMetrics.summary.average_open_rate)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Average Click Rate
                  </div>
                  <div className="text-2xl font-bold text-purple-400 mt-1">
                    {communityMetrics.summary.average_click_rate}%
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-purple-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, communityMetrics.summary.average_click_rate)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    Conversion Rate
                  </div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {communityMetrics.summary.conversion_rate}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    {communityMetrics.summary.total_outreach_registrations} registrations
                  </div>
                </div>
              </div>

              {/* Outreach Campaign ROI Breakdown Table */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-white text-sm">Campaign Performance &amp; ROI Breakdown</h3>
                  <span className="text-xs text-slate-400">
                    {communityMetrics.campaigns_breakdown.length} Broadcasts
                  </span>
                </div>

                {communityMetrics.campaigns_breakdown.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No outreach campaigns executed for this community yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                        <tr>
                          <th className="p-3.5">Requesting Org</th>
                          <th className="p-3.5">Campaign Purpose</th>
                          <th className="p-3.5">Audience Segment</th>
                          <th className="p-3.5">Delivered</th>
                          <th className="p-3.5">Opened</th>
                          <th className="p-3.5">Clicked</th>
                          <th className="p-3.5">Registered</th>
                          <th className="p-3.5">Open %</th>
                          <th className="p-3.5">Click %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {communityMetrics.campaigns_breakdown.map((camp) => (
                          <tr key={camp.id} className="hover:bg-slate-800/30 transition">
                            <td className="p-3.5 font-semibold text-white">
                              {camp.requesting_org_name}
                            </td>
                            <td className="p-3.5 text-slate-300 max-w-xs truncate" title={camp.purpose}>
                              {camp.purpose}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {camp.target_audience}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">{camp.delivered_count}</td>
                            <td className="p-3.5 font-mono text-blue-400">{camp.opened_count}</td>
                            <td className="p-3.5 font-mono text-purple-400">{camp.clicked_count}</td>
                            <td className="p-3.5 font-mono font-semibold text-emerald-400">
                              {camp.registrations_count}
                            </td>
                            <td className="p-3.5 font-mono font-semibold text-emerald-400">
                              {camp.open_rate}%
                            </td>
                            <td className="p-3.5 font-mono font-semibold text-purple-400">
                              {camp.click_rate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* SUB-TAB 3: AUDIT TRAIL & COMPLIANCE LOG */}
      {subTab === 'audit' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="Search action, target, actor..."
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 w-52"
              />

              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  loadAuditLogs(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE_EVENT">CREATE_EVENT</option>
                <option value="UPDATE_EVENT">UPDATE_EVENT</option>
                <option value="REGISTER_EVENT">REGISTER_EVENT</option>
                <option value="CHECK_IN_ATTENDEE">CHECK_IN_ATTENDEE</option>
                <option value="PROPOSE_COLLABORATION">PROPOSE_COLLABORATION</option>
                <option value="RESPOND_COLLABORATION">RESPOND_COLLABORATION</option>
                <option value="SUBMIT_OUTREACH">SUBMIT_OUTREACH</option>
                <option value="APPROVE_OUTREACH">APPROVE_OUTREACH</option>
                <option value="CREATE_SPONSORSHIP_OPPORTUNITY">CREATE_SPONSORSHIP_OPPORTUNITY</option>
                <option value="UPDATE_SPONSORSHIP_STATUS">UPDATE_SPONSORSHIP_STATUS</option>
                <option value="SUBMIT_BOOKING_REQUEST">SUBMIT_BOOKING_REQUEST</option>
                <option value="RESPOND_BOOKING_REQUEST">RESPOND_BOOKING_REQUEST</option>
              </select>

              <select
                value={auditTypeFilter}
                onChange={(e) => {
                  setAuditTypeFilter(e.target.value);
                  loadAuditLogs(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">All Target Types</option>
                <option value="EVENT">EVENT</option>
                <option value="ORGANIZATION">ORGANIZATION</option>
                <option value="COLLABORATION">COLLABORATION</option>
                <option value="OUTREACH">OUTREACH</option>
                <option value="SPONSORSHIP">SPONSORSHIP</option>
                <option value="VENUE_BOOKING">VENUE_BOOKING</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">
                Total: <span className="font-mono text-white">{auditMeta.total}</span> entries
              </span>
              <button
                onClick={() => loadAuditLogs(auditMeta.page)}
                disabled={loadingAudit}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 disabled:opacity-50"
              >
                {loadingAudit ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            {loadingAudit ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading audit trail records...</div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No audit trail records found matching criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Target Type &amp; ID</th>
                      <th className="p-3.5">Actor</th>
                      <th className="p-3.5">Metadata / Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-200">{log.target_type}</div>
                          <div className="font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                            {log.target_id}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-white font-medium">
                            {log.actor_name || 'System / Platform'}
                          </div>
                          {log.actor_email && (
                            <div className="text-[11px] text-slate-400">{log.actor_email}</div>
                          )}
                        </td>
                        <td className="p-3.5 max-w-sm">
                          {log.metadata && Object.keys(log.metadata).length > 0 ? (
                            <pre className="p-1.5 bg-slate-950/80 rounded border border-slate-800 text-[10px] text-slate-400 font-mono overflow-x-auto max-h-16">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {auditMeta.totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => loadAuditLogs(auditMeta.page - 1)}
                  disabled={!auditMeta.hasPrevPage || loadingAudit}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition border border-slate-700"
                >
                  ← Previous
                </button>
                <span className="text-slate-400">
                  Page <strong className="text-white">{auditMeta.page}</strong> of{' '}
                  <strong className="text-white">{auditMeta.totalPages}</strong>
                </span>
                <button
                  onClick={() => loadAuditLogs(auditMeta.page + 1)}
                  disabled={!auditMeta.hasNextPage || loadingAudit}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg transition border border-slate-700"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
