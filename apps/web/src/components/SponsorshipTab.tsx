import React, { useEffect, useState } from 'react';
import {
  Organization,
  Event as EventModel,
  UserRole,
  SponsorshipStatus,
} from '@eventops/shared-types';
import { Card, Button, Input, Select, Badge } from './DesignSystem';

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
  const [budgetFilter] = useState('');

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

  // Handle Apply as Sponsor
  const handleApplySponsorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOpp || !selectedSponsorOrgId) {
      setErrorMsg('Sponsor Organization is required');
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
          notes: applyNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit application');
      }

      setSuccessMsg('Sponsorship application submitted successfully!');
      setShowApplyModal(false);
      setApplyNotes('');
      loadApplications();
      loadOpportunities();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingApply(false);
    }
  };

  // Handle Update Application Status (CRM pipeline transition)
  const handleUpdateStatus = async (applicationId: string, nextStatus: SponsorshipStatus) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/sponsorship/applications/${applicationId}/status`, {
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

  const pipelineStages: { stage: SponsorshipStatus; title: string }[] = [
    { stage: SponsorshipStatus.POTENTIAL, title: 'Potential' },
    { stage: SponsorshipStatus.CONTACTED, title: 'Contacted' },
    { stage: SponsorshipStatus.INTERESTED, title: 'Interested' },
    { stage: SponsorshipStatus.NEGOTIATION, title: 'Negotiation' },
    { stage: SponsorshipStatus.CONFIRMED, title: 'Confirmed' },
    { stage: SponsorshipStatus.COMPLETED, title: 'Completed' },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner - Dark Obsidian Design System Parity */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>💼</span> Sponsorship CRM & Marketplace
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Propose package sponsorships (catering, booths, swag) and manage sponsor relationships across a streamlined CRM pipeline.
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowPostModal(true)}>
            + Post Sponsorship Need
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mt-5 pt-3.5 border-t border-zinc-800/80">
          <Button
            variant={viewMode === 'board' ? 'primary' : 'outline'}
            onClick={() => setViewMode('board')}
          >
            Opportunities Board ({filteredOpportunities.length})
          </Button>
          <Button
            variant={viewMode === 'crm' ? 'primary' : 'outline'}
            onClick={() => setViewMode('crm')}
          >
            CRM Pipeline Board ({applications.length})
          </Button>
        </div>
      </Card>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex justify-between items-center">
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
            <Input
              placeholder="Search sponsorship packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Loading sponsorship opportunities...
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <Card className="text-center py-12 text-zinc-400 text-xs">
              No sponsorship opportunities found. Post the first one to start collaborating!
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOpportunities.map((opp) => (
                <Card key={opp.id} hoverEffect className="flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-white text-sm leading-tight">
                        {opp.title}
                      </h3>
                      {opp.budget_range && <Badge variant="success">{opp.budget_range}</Badge>}
                    </div>

                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>
                        <span className="text-zinc-500">Event: </span>
                        <span className="text-zinc-200 font-medium">
                          {opp.event?.title || 'Summit Event'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Organizer: </span>
                        <span className="text-zinc-300">
                          {opp.event?.organizer?.name || 'Organizer Team'}
                        </span>
                      </div>
                    </div>

                    {/* Needs Badges */}
                    <div className="pt-2">
                      <div className="text-[11px] font-medium text-zinc-400 mb-1.5">Needs:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {opp.needs?.catering && <Badge variant="info">🥗 Catering</Badge>}
                        {opp.needs?.booth && <Badge variant="purple">🎪 Booth Space</Badge>}
                        {opp.needs?.swag && <Badge variant="warning">👕 Swag / Merch</Badge>}
                        {opp.needs?.speaker && <Badge variant="default">🎤 Speaker Slot</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">
                      {opp.applications?.length || 0} applied
                    </span>
                    <Button
                      variant="action"
                      onClick={() => {
                        setTargetOpp(opp);
                        setShowApplyModal(true);
                      }}
                    >
                      Apply as Sponsor
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CRM PIPELINE */}
      {viewMode === 'crm' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-400">
            Track and manage sponsor applications across your CRM pipeline:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineStages.map((stageInfo) => {
              const stageApps = applications.filter((a) => a.status === stageInfo.stage);
              return (
                <Card key={stageInfo.stage} className="p-3 flex flex-col min-h-[380px]">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
                    <span className="text-xs font-semibold text-white">
                      {stageInfo.title}
                    </span>
                    <Badge variant="default">{stageApps.length}</Badge>
                  </div>

                  <div className="space-y-2 flex-1">
                    {stageApps.length === 0 ? (
                      <div className="text-[11px] text-zinc-500 text-center py-6">
                        No applications
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <div
                          key={app.id}
                          className="bg-[#18181b] border border-zinc-800 rounded-lg p-2.5 text-xs space-y-1.5 shadow-sm"
                        >
                          <div className="font-semibold text-zinc-200 truncate">
                            {app.sponsor_org?.name || 'Sponsor Org'}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate">
                            {app.opportunity?.title || 'Sponsorship Package'}
                          </div>
                          {app.notes && (
                            <div className="text-[10px] text-zinc-400 italic bg-[#121215] p-1.5 rounded border border-zinc-800">
                              "{app.notes}"
                            </div>
                          )}

                          {/* Quick Stage Transitions */}
                          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap gap-1">
                            {stageInfo.stage === SponsorshipStatus.POTENTIAL && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.CONTACTED)}
                                className="text-[10px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                              >
                                Contact →
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.CONTACTED && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.INTERESTED)}
                                className="text-[10px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                              >
                                Interested →
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.INTERESTED && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.NEGOTIATION)}
                                className="text-[10px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700"
                              >
                                Negotiate →
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.NEGOTIATION && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.CONFIRMED)}
                                className="text-[10px] px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                              >
                                Confirm ✓
                              </button>
                            )}
                            {stageInfo.stage === SponsorshipStatus.CONFIRMED && (
                              <button
                                onClick={() => handleUpdateStatus(app.id, SponsorshipStatus.COMPLETED)}
                                className="text-[10px] px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                              >
                                Complete ✓
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: POST SPONSORED NEED */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Post Sponsorship Need</h3>
              <button onClick={() => setShowPostModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handlePostOpportunity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Select Event</label>
                <Select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full"
                >
                  {userEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.format})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Package Title</label>
                <Input
                  type="text"
                  placeholder="e.g. Gold Tier Catering & Booth Package"
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Budget Range</label>
                <Select
                  value={oppBudget}
                  onChange={(e) => setOppBudget(e.target.value)}
                  className="w-full"
                >
                  <option value="$500 - $1,500">$500 - $1,500</option>
                  <option value="$2,000 - $5,000">$2,000 - $5,000</option>
                  <option value="$5,000 - $10,000">$5,000 - $10,000</option>
                  <option value="$10,000+">$10,000+</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">Needs & Requirements</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={needsCatering}
                      onChange={(e) => setNeedsCatering(e.target.checked)}
                      className="rounded bg-[#18181b] border-zinc-800"
                    />
                    <span>Catering</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={needsBooth}
                      onChange={(e) => setNeedsBooth(e.target.checked)}
                      className="rounded bg-[#18181b] border-zinc-800"
                    />
                    <span>Booth Space</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={needsSwag}
                      onChange={(e) => setNeedsSwag(e.target.checked)}
                      className="rounded bg-[#18181b] border-zinc-800"
                    />
                    <span>Swag / Merch</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={needsSpeaker}
                      onChange={(e) => setNeedsSpeaker(e.target.checked)}
                      className="rounded bg-[#18181b] border-zinc-800"
                    />
                    <span>Speaker Slot</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowPostModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmittingOpp}>
                  {isSubmittingOpp ? 'Posting...' : 'Post Need'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: APPLY AS SPONSOR */}
      {showApplyModal && targetOpp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Apply for Sponsorship</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySponsorship} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Package</label>
                <div className="p-2.5 bg-[#18181b] border border-zinc-800 rounded-lg text-xs text-white font-medium">
                  {targetOpp.title} ({targetOpp.budget_range || 'Custom Tier'})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Applying Sponsor Organization</label>
                <Select
                  value={selectedSponsorOrgId}
                  onChange={(e) => setSelectedSponsorOrgId(e.target.value)}
                  className="w-full"
                >
                  {userOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Proposal & Notes</label>
                <textarea
                  rows={3}
                  placeholder="Offer catering sponsorship, swag booth setup, or custom grant funding details..."
                  value={applyNotes}
                  onChange={(e) => setApplyNotes(e.target.value)}
                  className="w-full p-3 bg-[#141417] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="action" disabled={isSubmittingApply}>
                  {isSubmittingApply ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
