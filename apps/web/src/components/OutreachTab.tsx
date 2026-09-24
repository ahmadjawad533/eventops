import React, { useState, useEffect } from 'react';
import {
  OutreachRequest,
  OutreachStatus,
  UserProfile,
  UserRole,
  Organization,
  Event as EventModel,
} from '@eventops/shared-types';

interface OrgWithCounts extends Organization {
  member_count: number;
  follower_count: number;
}

interface EventWithCounts extends EventModel {
  registered_count: number;
  remaining_capacity: number;
}

interface OutreachTabProps {
  token: string | null;
  user: UserProfile | null;
  roles: UserRole[];
  orgs: OrgWithCounts[];
  events: EventWithCounts[];
  onActionMsg: (msg: string) => void;
}

export function OutreachTab({
  token,
  user,
  roles,
  orgs,
  events,
  onActionMsg,
}: OutreachTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'review_queue'>('campaigns');
  const [requests, setRequests] = useState<OutreachRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Outreach Request Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEventId, setNewEventId] = useState('');
  const [newReqOrgId, setNewReqOrgId] = useState('');
  const [newTargetCommId, setNewTargetCommId] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newRecipientCount, setNewRecipientCount] = useState(100);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Modal (Approve with edits / Reject / Ask info)
  const [selectedReq, setSelectedReq] = useState<OutreachRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'approve_with_edits' | 'reject' | 'needs_info'>('approve');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Campaign Performance Modal
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [activeCampaignData, setActiveCampaignData] = useState<any>(null);

  const loadRequests = () => {
    if (!token) return;
    setLoading(true);
    let url = '/api/outreach?limit=50';
    if (statusFilter !== 'all') url += `&status=${statusFilter}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items) {
          setRequests(json.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [token, statusFilter]);

  // Set default form values
  useEffect(() => {
    if (showNewModal) {
      if (events.length > 0 && !newEventId) {
        setNewEventId(events[0].id);
        setNewReqOrgId(events[0].organizer_org_id);
      }
      if (orgs.length > 0 && !newTargetCommId) {
        const comms = orgs.filter((o) => o.type === 'community' && o.id !== newReqOrgId);
        if (comms.length > 0) setNewTargetCommId(comms[0].id);
        else if (orgs.length > 1) setNewTargetCommId(orgs.find((o) => o.id !== newReqOrgId)?.id || '');
      }
    }
  }, [showNewModal, events, orgs]);

  const handleEventSelect = (eId: string) => {
    setNewEventId(eId);
    const ev = events.find((e) => e.id === eId);
    if (ev) {
      setNewReqOrgId(ev.organizer_org_id);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newReqOrgId === newTargetCommId) {
      alert('Cannot send outreach request to your own organization.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requesting_org_id: newReqOrgId,
          target_community_org_id: newTargetCommId,
          event_id: newEventId,
          purpose: newPurpose,
          target_audience: newAudience,
          requested_recipient_count: Number(newRecipientCount),
          message_subject: newSubject,
          message_body: newBody,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit outreach request');
      }

      setShowNewModal(false);
      setNewPurpose('');
      setNewAudience('');
      setNewSubject('');
      setNewBody('');
      onActionMsg('Outreach request submitted to community review queue!');
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Error submitting outreach request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReviewModal = (req: OutreachRequest, action: 'approve' | 'approve_with_edits' | 'reject' | 'needs_info') => {
    setSelectedReq(req);
    setReviewAction(action);
    setEditSubject(req.message_subject);
    setEditBody(req.message_body);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedReq) return;

    try {
      const res = await fetch(`/api/outreach/${selectedReq.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: reviewAction,
          message_subject: reviewAction === 'approve_with_edits' ? editSubject : undefined,
          message_body: reviewAction === 'approve_with_edits' ? editBody : undefined,
          notes: reviewNotes || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Review action failed');
      }

      setShowReviewModal(false);
      setSelectedReq(null);
      onActionMsg(`Outreach request ${reviewAction}ed successfully!`);
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCampaignMetrics = async (req: OutreachRequest) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/outreach/${req.id}/campaign`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setActiveCampaignData({
          ...json.data,
          event_title: req.event?.title,
          requesting_org: req.requesting_org?.name,
          target_community: req.target_community?.name,
          id: req.id,
        });
        setShowCampaignModal(true);
      }
    } catch (err: any) {
      alert(err.message || 'Could not fetch campaign metrics');
    }
  };

  const handleSimulateActivity = async (actionType: 'open' | 'click' | 'register') => {
    if (!token || !activeCampaignData) return;
    try {
      const payload: any = {};
      if (actionType === 'open') payload.opens = 5;
      if (actionType === 'click') payload.clicks = 3;
      if (actionType === 'register') payload.registrations = 1;

      const res = await fetch(`/api/outreach/${activeCampaignData.id}/simulate-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setActiveCampaignData((prev: any) => ({
          ...prev,
          opened_count: json.data.opened_count,
          clicked_count: json.data.clicked_count,
          registrations_count: json.data.registrations_count,
          open_rate: prev.delivered_count > 0 ? (json.data.opened_count / prev.delivered_count) * 100 : 0,
          click_rate: json.data.opened_count > 0 ? (json.data.clicked_count / json.data.opened_count) * 100 : 0,
        }));
        onActionMsg(`Simulated campaign ${actionType} event`);
        loadRequests();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const myCampaigns = requests.filter((r) => r.requesting_org_id === orgs[0]?.id || r.requesting_org?.id === orgs[0]?.id);
  const reviewQueue = requests.filter((r) => r.status === OutreachStatus.PENDING || r.status === OutreachStatus.NEEDS_INFO);

  return (
    <div className="space-y-6">
      {/* Privacy Guarantee Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-2">
              <span>🔒</span> Core Innovation: Permission-Based Outreach
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Privacy-Preserving Audience Reach
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              External organizers <strong className="text-indigo-300">never see member emails or follower lists</strong>.
              All outreach must be approved by target community admins. The platform delivers emails on the organizer's behalf and reports only aggregated metrics.
            </p>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-950 transition flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>+</span> Submit Outreach Request
          </button>
        </div>

        {/* Sub-Tabs: Campaigns vs Review Queue */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveSubTab('campaigns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'campaigns'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Outreach Requests &amp; Campaigns ({requests.length})
          </button>

          <button
            onClick={() => setActiveSubTab('review_queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
              activeSubTab === 'review_queue'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Community Admin Review Queue
            {reviewQueue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {reviewQueue.length} pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: REQUESTS & CAMPAIGNS */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-3 bg-slate-900/40 p-3 border border-slate-800 rounded-xl">
            <span className="text-xs font-medium text-slate-400">Filter by Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Requests</option>
              <option value={OutreachStatus.PENDING}>Pending Review</option>
              <option value={OutreachStatus.APPROVED}>Approved &amp; Active</option>
              <option value={OutreachStatus.NEEDS_INFO}>Needs Info</option>
              <option value={OutreachStatus.REJECTED}>Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading outreach requests...</div>
          ) : requests.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <p className="text-base font-semibold text-slate-300">No outreach campaigns found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Submit an outreach request to reach developers in partner communities safely without PII exposure.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium hover:bg-indigo-600/30 transition"
              >
                Submit First Outreach
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => {
                const isApproved = req.status === OutreachStatus.APPROVED;
                const isPending = req.status === OutreachStatus.PENDING;
                const isNeedsInfo = req.status === OutreachStatus.NEEDS_INFO;
                const isRejected = req.status === OutreachStatus.REJECTED;

                return (
                  <div
                    key={req.id}
                    className={`bg-slate-900/60 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition ${
                      isApproved
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : isPending
                        ? 'border-amber-500/30 bg-amber-950/10'
                        : isNeedsInfo
                        ? 'border-purple-500/30 bg-purple-950/10'
                        : 'border-rose-500/30 bg-rose-950/10'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/30">
                          Target: {req.target_community?.name || 'Community'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isNeedsInfo
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-white text-base leading-snug">{req.message_subject}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          For Event: <span className="text-slate-200 font-medium">{req.event?.title}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Purpose: <span className="text-slate-400">{req.purpose}</span>
                        </p>
                      </div>

                      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
                        <p className="line-clamp-2 italic">"{req.message_body}"</p>
                      </div>

                      {/* Aggregated Campaign Metrics Preview */}
                      {isApproved && req.campaign && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
                          <div className="bg-slate-950/40 p-1.5 rounded">
                            <span className="block text-[10px] text-slate-400">Delivered</span>
                            <span className="font-bold text-xs text-emerald-400">{req.campaign.delivered_count}</span>
                          </div>
                          <div className="bg-slate-950/40 p-1.5 rounded">
                            <span className="block text-[10px] text-slate-400">Opened</span>
                            <span className="font-bold text-xs text-indigo-400">{req.campaign.opened_count}</span>
                          </div>
                          <div className="bg-slate-950/40 p-1.5 rounded">
                            <span className="block text-[10px] text-slate-400">Clicks</span>
                            <span className="font-bold text-xs text-purple-400">{req.campaign.clicked_count}</span>
                          </div>
                          <div className="bg-slate-950/40 p-1.5 rounded">
                            <span className="block text-[10px] text-slate-400">Signups</span>
                            <span className="font-bold text-xs text-white">{req.campaign.registrations_count}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>

                      {isApproved ? (
                        <button
                          onClick={() => openCampaignMetrics(req)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
                        >
                          📊 View Campaign Metrics
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Awaiting community approval</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: COMMUNITY ADMIN REVIEW QUEUE */}
      {activeSubTab === 'review_queue' && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-white mb-1">Incoming Outreach Requests for Review</h3>
            <p className="text-xs text-slate-400">
              As community administrators, you decide what messages reach your members. You can approve as-is, edit the wording for tone, ask for more details, or reject.
            </p>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No pending requests in your community's review queue.
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        From: <strong className="text-slate-200">{req.requesting_org?.name}</strong> ➔ Target Community:{' '}
                        <strong className="text-indigo-400">{req.target_community?.name}</strong>
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">{req.message_subject}</h4>
                      <p className="text-xs text-slate-400">
                        Event: <span className="text-slate-200">{req.event?.title}</span> • Target Audience:{' '}
                        <span className="text-slate-200">{req.target_audience}</span>
                      </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 self-start sm:self-auto">
                      {req.status}
                    </span>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 space-y-2">
                    <p className="font-semibold text-slate-300">Message Body Preview:</p>
                    <p className="whitespace-pre-wrap">{req.message_body}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={() => openReviewModal(req, 'approve')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => openReviewModal(req, 'approve_with_edits')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                      ✏️ Approve with Edits
                    </button>
                    <button
                      onClick={() => openReviewModal(req, 'needs_info')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                      💬 Ask for Info
                    </button>
                    <button
                      onClick={() => openReviewModal(req, 'reject')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs rounded-lg transition ml-auto"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SUBMIT NEW OUTREACH REQUEST */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Submit Outreach Request</h3>
                <p className="text-xs text-slate-400">Request permission to reach a partner community</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Select Event to Promote</label>
                <select
                  required
                  value={newEventId}
                  onChange={(e) => handleEventSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Target Community</label>
                <select
                  required
                  value={newTargetCommId}
                  onChange={(e) => setNewTargetCommId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {orgs
                    .filter((o) => o.id !== newReqOrgId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Purpose</label>
                  <input
                    type="text"
                    required
                    value={newPurpose}
                    onChange={(e) => setNewPurpose(e.target.value)}
                    placeholder="e.g. Call for Speakers / Tickets"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Target Audience</label>
                  <input
                    type="text"
                    required
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value)}
                    placeholder="e.g. Fullstack engineers"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Requested Recipient Count</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={newRecipientCount}
                  onChange={(e) => setNewRecipientCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Subject Line</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Invitation to CloudCon 2026 for React Berlin Members"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Message Body</label>
                <textarea
                  rows={4}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Dear community members, we are excited to invite you to..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit to Admin Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REVIEW MODAL (APPROVE / EDIT / REJECT) */}
      {showReviewModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {reviewAction === 'approve'
                  ? 'Approve Outreach Request'
                  : reviewAction === 'approve_with_edits'
                  ? 'Approve with Community Edits'
                  : reviewAction === 'needs_info'
                  ? 'Request More Information'
                  : 'Reject Outreach Request'}
              </h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
              {reviewAction === 'approve_with_edits' && (
                <>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Edited Subject Line</label>
                    <input
                      type="text"
                      required
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Edited Message Body</label>
                    <textarea
                      rows={5}
                      required
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  {reviewAction === 'reject'
                    ? 'Reason for Rejection'
                    : reviewAction === 'needs_info'
                    ? 'Questions / Information Needed'
                    : 'Internal Review Notes (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional review feedback..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-semibold rounded-lg ${
                    reviewAction === 'reject'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : reviewAction === 'needs_info'
                      ? 'bg-purple-600 hover:bg-purple-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  Confirm {reviewAction.replace(/_/g, ' ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AGGREGATED CAMPAIGN METRICS */}
      {showCampaignModal && activeCampaignData && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">📊 Aggregated Campaign Performance</h3>
                <p className="text-xs text-slate-400">{activeCampaignData.event_title}</p>
              </div>
              <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            {/* Privacy note */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300">
              🔒 Recipient member addresses are protected. Metrics below represent aggregate engagement metrics across the campaign.
            </div>

            {/* 4 Stat Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Sent</span>
                <span className="text-xl font-bold text-white mt-1 block">{activeCampaignData.sent_count}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Delivered</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">{activeCampaignData.delivered_count}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Open Rate</span>
                <span className="text-xl font-bold text-indigo-400 mt-1 block">
                  {Math.round(activeCampaignData.open_rate || 0)}%
                </span>
                <span className="text-[10px] text-slate-500">({activeCampaignData.opened_count} opens)</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Click Rate</span>
                <span className="text-xl font-bold text-purple-400 mt-1 block">
                  {Math.round(activeCampaignData.click_rate || 0)}%
                </span>
                <span className="text-[10px] text-slate-500">({activeCampaignData.clicked_count} clicks)</span>
              </div>
            </div>

            {/* Conversions bar */}
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Direct Event Registrations</span>
                <span className="text-lg font-bold text-emerald-400">{activeCampaignData.registrations_count} Attendees</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                Conversion: {activeCampaignData.delivered_count > 0 ? Math.round((activeCampaignData.registrations_count / activeCampaignData.delivered_count) * 100) : 0}%
              </span>
            </div>

            {/* Demo Simulation Controls */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Demo Activity Simulator:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSimulateActivity('open')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs rounded-lg border border-slate-700"
                >
                  + Simulate 5 Opens
                </button>
                <button
                  onClick={() => handleSimulateActivity('click')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs rounded-lg border border-slate-700"
                >
                  + Simulate 3 Clicks
                </button>
                <button
                  onClick={() => handleSimulateActivity('register')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs rounded-lg border border-slate-700"
                >
                  + Simulate 1 Ticket Registration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
