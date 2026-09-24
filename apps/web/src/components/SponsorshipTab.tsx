import React, { useEffect, useState } from 'react';
import {
  Organization,
  Event as EventModel,
  UserRole,
  SponsorshipStatus,
} from '@eventops/shared-types';

interface SponsorshipOpportunityItem {
  id: string;
  event_id: string;
  title: string;
  needs: Record<string, any>;
  budget_range?: string | null;
  created_at: string;
  event?: EventModel;
  applications?: SponsorshipApplicationItem[];
}

interface SponsorshipApplicationItem {
  id: string;
  opportunity_id: string;
  sponsor_org_id: string;
  status: SponsorshipStatus;
  notes?: string | null;
  created_at: string;
  opportunity?: SponsorshipOpportunityItem;
  sponsor_org?: Organization;
}

interface SponsorshipTabProps {
  token: string | null;
  userOrgs: Organization[];
  userEvents: EventModel[];
  roles: UserRole[];
}

export function SponsorshipTab({ token, userOrgs, userEvents }: SponsorshipTabProps) {
  const [viewMode, setViewMode] = useState<'board' | 'crm'>('board');
  const [opportunities, setOpportunities] = useState<SponsorshipOpportunityItem[]>([]);
  const [applications, setApplications] = useState<SponsorshipApplicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');

  // Post Opportunity Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(userEvents[0]?.id || '');
  const [oppTitle, setOppTitle] = useState('');
  const [oppBudget, setOppBudget] = useState('$2,000 - $5,000');
  const [needsCatering, setNeedsCatering] = useState(true);
  const [needsBooth, setNeedsBooth] = useState(true);
  const [needsSwag, setNeedsSwag] = useState(false);
  const [needsSpeaker, setNeedsSpeaker] = useState(false);
  const [isSubmittingOpp, setIsSubmittingOpp] = useState(false);

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [targetOpp, setTargetOpp] = useState<SponsorshipOpportunityItem | null>(null);
  const [selectedSponsorOrgId, setSelectedSponsorOrgId] = useState(userOrgs[0]?.id || '');
  const [applyNotes, setApplyNotes] = useState('');
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  // Load Opportunities
  const loadOpportunities = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/sponsorship/opportunities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data?.items) {
        setOpportunities(data.data.items);
      }
    } catch {
      setErrorMsg('Failed to fetch sponsorship opportunities');
    } finally {
      setLoading(false);
    }
  };

  // Load Applications
  const loadApplications = async () => {
    try {
      const res = await fetch('/api/sponsorship/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data?.items) {
        setApplications(data.data.items);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadOpportunities();
    loadApplications();
  }, [token]);

  // Handle Post Opportunity
  const handlePostOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !oppTitle) {
      setErrorMsg('Event and Title are required');
      return;
    }

    try {
      setIsSubmittingOpp(true);
      setErrorMsg(null);
      const res = await fetch('/api/sponsorship/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: selectedEventId,
          title: oppTitle,
          budget_range: oppBudget,
          needs: {
            catering: needsCatering,
            booth: needsBooth,
            swag: needsSwag,
            speaker: needsSpeaker,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to post opportunity');
      }

      setSuccessMsg('Sponsorship opportunity posted successfully!');
      setShowPostModal(false);
      setOppTitle('');
      loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingOpp(false);
    }
  };

  // Handle Apply to Opportunity
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOpp || !selectedSponsorOrgId) {
      setErrorMsg('Sponsor organization is required');
      return;
    }

    try {
      setIsSubmittingApply(true);
      setErrorMsg(null);
      const res = await fetch(`/api/sponsorship/opportunities/${targetOpp.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sponsor_org_id: selectedSponsorOrgId,
          notes: applyNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit application');
      }

      setSuccessMsg('Sponsorship application submitted successfully!');
      setShowApplyModal(false);
      setApplyNotes('');
      loadOpportunities();
      loadApplications();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingApply(false);
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (appId: string, nextStatus: SponsorshipStatus) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/sponsorship/applications/${appId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update application status');
      }

      setSuccessMsg(`Status updated to ${nextStatus}`);
      loadApplications();
      loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const filteredOpportunities = opportunities.filter((o) => {
    if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (budgetFilter && o.budget_range !== budgetFilter) {
      return false;
    }
    return true;
  });

  const pipelineStages: { stage: SponsorshipStatus; title: string; color: string }[] = [
    { stage: SponsorshipStatus.POTENTIAL, title: 'Potential', color: 'border-slate-700 bg-slate-900/60' },
    { stage: SponsorshipStatus.CONTACTED, title: 'Contacted', color: 'border-blue-700/50 bg-blue-950/20' },
    { stage: SponsorshipStatus.INTERESTED, title: 'Interested', color: 'border-indigo-700/50 bg-indigo-950/20' },
    { stage: SponsorshipStatus.NEGOTIATION, title: 'Negotiation', color: 'border-amber-700/50 bg-amber-950/20' },
    { stage: SponsorshipStatus.CONFIRMED, title: 'Confirmed', color: 'border-emerald-700/50 bg-emerald-950/20' },
    { stage: SponsorshipStatus.COMPLETED, title: 'Completed', color: 'border-teal-700/50 bg-teal-950/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-900/40 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>💼</span> Sponsorship Marketplace & CRM Pipeline
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Discover sponsorship opportunities, propose package sponsorships (catering, booths, swag),
              and manage sponsor relationships across an automated CRM pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPostModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-emerald-950 flex items-center gap-1.5"
            >
              <span>+</span> Post Sponsorship Need
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'board'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            Opportunities Board ({filteredOpportunities.length})
          </button>
          <button
            onClick={() => setViewMode('crm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'crm'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            CRM Pipeline Board ({applications.length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            ✕
          </button>
        </div>
      )}

      {/* VIEW: OPPORTUNITIES BOARD */}
      {viewMode === 'board' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Search sponsorship packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading sponsorship opportunities...
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-400 text-sm">
              No sponsorship opportunities found. Post the first one to start collaborating!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between transition"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-white text-base leading-tight">
                        {opp.title}
                      </h3>
                      {opp.budget_range && (
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800/60 text-emerald-400 text-[10px] font-semibold rounded-md whitespace-nowrap">
                          {opp.budget_range}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Event: </span>
                        <span className="text-slate-200 font-medium">
                          {opp.event?.title || 'Summit Event'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Organizer: </span>
                        <span className="text-slate-300">
                          {opp.event?.organizer?.name || 'Organizer Team'}
                        </span>
                      </div>
                    </div>

                    {/* Needs Badges */}
                    <div className="pt-2">
                      <div className="text-[11px] font-medium text-slate-400 mb-1.5">Needs:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.needs?.catering && (
                          <span className="px-2 py-0.5 bg-blue-950/60 border border-blue-800/50 text-blue-300 text-[10px] rounded">
                            🥗 Catering
                          </span>
                        )}
                        {opp.needs?.booth && (
                          <span className="px-2 py-0.5 bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-[10px] rounded">
                            🎪 Booth Space
                          </span>
                        )}
                        {opp.needs?.swag && (
                          <span className="px-2 py-0.5 bg-amber-950/60 border border-amber-800/50 text-amber-300 text-[10px] rounded">
                            👕 Swag / Merch
                          </span>
                        )}
                        {opp.needs?.speaker && (
                          <span className="px-2 py-0.5 bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[10px] rounded">
                            🎤 Speaker Slot
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {opp.applications?.length || 0} applied
                    </span>
                    <button
                      onClick={() => {
                        setTargetOpp(opp);
                        setShowApplyModal(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition shadow-md shadow-emerald-950"
                    >
                      Apply as Sponsor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CRM PIPELINE */}
      {viewMode === 'crm' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Drag or transition applications across your organizer CRM pipeline:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStages.map((stageInfo) => {
              const stageApps = applications.filter((a) => a.status === stageInfo.stage);
              return (
                <div
                  key={stageInfo.stage}
                  className={`border rounded-xl p-3 flex flex-col min-h-[400px] ${stageInfo.color}`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/60">
                    <span className="text-xs font-semibold text-white">
                      {stageInfo.title}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded-full font-bold">
                      {stageApps.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {stageApps.length === 0 ? (
                      <div className="text-[11px] text-slate-500 text-center py-6">
                        No applications
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <div
                          key={app.id}
                          className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2 shadow-sm"
                        >
                          <div className="font-semibold text-slate-200">
                            {app.sponsor_org?.name || 'Sponsor Org'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {app.opportunity?.title || 'Sponsorship Package'}
                          </div>
                          {app.notes && (
                            <div className="text-[10px] text-slate-400 italic bg-slate-950/60 p-1.5 rounded border border-slate-800/40">
                              "{app.notes}"
                            </div>
                          )}

                          {/* Quick Stage Transitions */}
                          <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                            {stageInfo.stage === SponsorshipStatus.POTENTIAL && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.CONTACTED)}
                                className="text-[10px] px-2 py-0.5 bg-blue-900/40 text-blue-300 hover:bg-blue-800/60 rounded border border-blue-700/40"
                              >
                                Contact →
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.CONTACTED && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.INTERESTED)}
                                className="text-[10px] px-2 py-0.5 bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/60 rounded border border-indigo-700/40"
                              >
                                Interested →
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.INTERESTED && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.NEGOTIATION)}
                                className="text-[10px] px-2 py-0.5 bg-amber-900/40 text-amber-300 hover:bg-amber-800/60 rounded border border-amber-700/40"
                              >
                                Negotiate →
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.NEGOTIATION && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.CONFIRMED)}
                                className="text-[10px] px-2 py-0.5 bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60 rounded border border-emerald-700/40"
                              >
                                Confirm ✓
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.CONFIRMED && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.COMPLETED)}
                                className="text-[10px] px-2 py-0.5 bg-teal-900/40 text-teal-300 hover:bg-teal-800/60 rounded border border-teal-700/40"
                              >
                                Complete ✓
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: POST SPONSORSHIP OPPORTUNITY */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-base">
                Post Sponsorship Need
              </h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostOpportunity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                >
                  {userEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Opportunity Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gold Tier & Keynote Stage Sponsor"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Budget / Investment Range
                </label>
                <input
                  type="text"
                  placeholder="e.g. $5,000 - $10,000"
                  value={oppBudget}
                  onChange={(e) => setOppBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Requested Support Needs
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={needsCatering}
                      onChange={(e) => setNeedsCatering(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-600"
                    />
                    🥗 Catering / Coffee
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={needsBooth}
                      onChange={(e) => setNeedsBooth(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-600"
                    />
                    🎪 Booth Space
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={needsSwag}
                      onChange={(e) => setNeedsSwag(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-600"
                    />
                    👕 Swag / Merch
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={needsSpeaker}
                      onChange={(e) => setNeedsSpeaker(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-600"
                    />
                    🎤 Speaker Slot
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpp}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
                >
                  {isSubmittingOpp ? 'Posting...' : 'Post Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPLY TO SPONSOR */}
      {showApplyModal && targetOpp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-white text-base">
                  Apply as Sponsor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Package: {targetOpp.title}
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sponsor Organization
                </label>
                <select
                  value={selectedSponsorOrgId}
                  onChange={(e) => setSelectedSponsorOrgId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                >
                  {userOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sponsorship Proposal & Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your sponsorship contribution (e.g. cash tier, in-kind swag, booth staff, catering support)..."
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApply}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
                >
                  {isSubmittingApply ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
