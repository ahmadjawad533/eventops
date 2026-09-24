import React, { useState, useEffect } from 'react';
import {
  Collaboration,
  CollaborationMessage,
  CollaborationTask,
  CollaborationType,
  CollaborationStatus,
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

interface CollaborationTabProps {
  token: string | null;
  user: UserProfile | null;
  roles: UserRole[];
  orgs: OrgWithCounts[];
  events: EventWithCounts[];
  onActionMsg: (msg: string) => void;
}

export function CollaborationTab({
  token,
  user,
  roles,
  orgs,
  events,
  onActionMsg,
}: CollaborationTabProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterCollabId, setCounterCollabId] = useState<string | null>(null);
  const [counterText, setCounterText] = useState('');

  // Propose form state
  const [propEventId, setPropEventId] = useState('');
  const [propReqOrgId, setPropReqOrgId] = useState('');
  const [propTargetOrgId, setPropTargetOrgId] = useState('');
  const [propCollabType, setPropCollabType] = useState<CollaborationType>(CollaborationType.SPEAKER);
  const [propInitialMessage, setPropInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shared Workspace state
  const [activeWorkspaceCollab, setActiveWorkspaceCollab] = useState<Collaboration | null>(null);
  const [workspaceTasks, setWorkspaceTasks] = useState<CollaborationTask[]>([]);
  const [workspaceMessages, setWorkspaceMessages] = useState<CollaborationMessage[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // New thread message
  const [newMessageBody, setNewMessageBody] = useState('');

  // View thread modal for non-accepted collabs
  const [viewThreadCollab, setViewThreadCollab] = useState<Collaboration | null>(null);

  const loadCollaborations = () => {
    if (!token) return;
    setLoading(true);
    let url = '/api/collaboration?limit=50';
    if (statusFilter !== 'all') url += `&status=${statusFilter}`;
    if (typeFilter !== 'all') url += `&collab_type=${typeFilter}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items) {
          setCollaborations(json.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCollaborations();
  }, [token, statusFilter, typeFilter]);

  // Set default form values when opening propose modal
  useEffect(() => {
    if (showProposeModal) {
      if (events.length > 0 && !propEventId) {
        setPropEventId(events[0].id);
        setPropReqOrgId(events[0].organizer_org_id);
      }
      if (orgs.length > 1 && !propTargetOrgId) {
        const other = orgs.find((o) => o.id !== propReqOrgId);
        if (other) setPropTargetOrgId(other.id);
      }
    }
  }, [showProposeModal, events, orgs]);

  // Handle Event selection in propose modal
  const handleEventSelect = (eId: string) => {
    setPropEventId(eId);
    const ev = events.find((e) => e.id === eId);
    if (ev) {
      setPropReqOrgId(ev.organizer_org_id);
      if (propTargetOrgId === ev.organizer_org_id) {
        const other = orgs.find((o) => o.id !== ev.organizer_org_id);
        if (other) setPropTargetOrgId(other.id);
      }
    }
  };

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (propReqOrgId === propTargetOrgId) {
      alert('Target organization cannot be your own organization.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: propEventId,
          requesting_org_id: propReqOrgId,
          target_org_id: propTargetOrgId,
          collab_type: propCollabType,
          initial_message: propInitialMessage,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit proposal');
      }

      setShowProposeModal(false);
      setPropInitialMessage('');
      onActionMsg('Collaboration proposal sent successfully!');
      loadCollaborations();
    } catch (err: any) {
      alert(err.message || 'Error creating collaboration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespond = async (
    collabId: string,
    action: 'accept' | 'reject' | 'counter',
    message?: string
  ) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/collaboration/${collabId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, message }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Failed to ${action} collaboration`);
      }

      onActionMsg(`Collaboration proposal ${action}ed successfully!`);
      loadCollaborations();

      if (action === 'accept' && json.data) {
        openWorkspace(json.data);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterCollabId || !counterText.trim()) return;
    handleRespond(counterCollabId, 'counter', counterText.trim());
    setShowCounterModal(false);
    setCounterText('');
    setCounterCollabId(null);
  };

  const openWorkspace = async (collab: Collaboration) => {
    if (!token) return;
    setWorkspaceLoading(true);
    setActiveWorkspaceCollab(collab);
    try {
      const res = await fetch(`/api/collaboration/${collab.id}/workspace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to open shared workspace');
      }
      setWorkspaceTasks(json.data.tasks || []);
      setWorkspaceMessages(json.data.messages || []);
    } catch (err: any) {
      alert(err.message);
      setActiveWorkspaceCollab(null);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const reloadWorkspace = async (collabId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/collaboration/${collabId}/workspace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setWorkspaceTasks(json.data.tasks || []);
        setWorkspaceMessages(json.data.messages || []);
      }
    } catch (err) {}
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeWorkspaceCollab || !newTaskTitle.trim()) return;

    try {
      const res = await fetch(`/api/collaboration/${activeWorkspaceCollab.id}/workspace/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || undefined,
          assigned_org_id: newTaskAssignee || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Failed to add task');

      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('');
      reloadWorkspace(activeWorkspaceCollab.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    if (!token || !activeWorkspaceCollab) return;
    try {
      const res = await fetch(
        `/api/collaboration/${activeWorkspaceCollab.id}/workspace/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ completed: !currentCompleted }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Failed to update task');
      reloadWorkspace(activeWorkspaceCollab.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token || !activeWorkspaceCollab) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(
        `/api/collaboration/${activeWorkspaceCollab.id}/workspace/tasks/${taskId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Failed to delete task');
      reloadWorkspace(activeWorkspaceCollab.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, isWorkspace: boolean) => {
    e.preventDefault();
    const collab = isWorkspace ? activeWorkspaceCollab : viewThreadCollab;
    if (!token || !collab || !newMessageBody.trim()) return;

    // Use requesting or target org id
    const senderOrgId = collab.requesting_org_id;

    try {
      const res = await fetch(`/api/collaboration/${collab.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender_org_id: senderOrgId,
          body: newMessageBody.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || 'Failed to send message');

      setNewMessageBody('');
      if (isWorkspace) {
        reloadWorkspace(collab.id);
      } else {
        // Refresh single collab
        fetch(`/api/collaboration/${collab.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((j) => {
            if (j.data) setViewThreadCollab(j.data);
          });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openThreadModal = async (collab: Collaboration) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/collaboration/${collab.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setViewThreadCollab(json.data);
      } else {
        setViewThreadCollab(collab);
      }
    } catch (err) {
      setViewThreadCollab(collab);
    }
  };

  const completedTasksCount = workspaceTasks.filter((t) => t.completed).length;
  const taskProgressPct = workspaceTasks.length
    ? Math.round((completedTasksCount / workspaceTasks.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              🤝 Collaboration Marketplace &amp; Workspaces
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Cross-community proposals, negotiation threads, and shared post-acceptance operations workspaces.
            </p>
          </div>
          <button
            onClick={() => setShowProposeModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-950 transition flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>+</span> Propose Collaboration
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <span className="text-xs font-medium text-slate-400">Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            <option value={CollaborationStatus.PROPOSED}>Proposed</option>
            <option value={CollaborationStatus.COUNTERED}>Countered</option>
            <option value={CollaborationStatus.ACCEPTED}>Accepted</option>
            <option value={CollaborationStatus.REJECTED}>Rejected</option>
          </select>

          <span className="text-xs font-medium text-slate-400 ml-2">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value={CollaborationType.SPEAKER}>Speaker Exchange</option>
            <option value={CollaborationType.VENUE}>Venue Co-Hosting</option>
            <option value={CollaborationType.TECHNICAL}>Technical Track</option>
            <option value={CollaborationType.SPONSORSHIP}>Sponsorship</option>
            <option value={CollaborationType.OUTREACH}>Outreach Promotion</option>
            <option value={CollaborationType.MEDIA}>Media Partnership</option>
            <option value={CollaborationType.GENERAL}>General</option>
          </select>

          <button
            onClick={loadCollaborations}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 ml-auto"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Collaborations Grid / List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading collaborations...</div>
      ) : collaborations.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <p className="text-base font-semibold text-slate-300">No collaborations found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Propose a cross-org partnership with another community for speakers, venue co-hosting, or technical hackathons.
          </p>
          <button
            onClick={() => setShowProposeModal(true)}
            className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-600/30 transition"
          >
            Submit First Proposal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {collaborations.map((collab) => {
            const reqName = collab.requesting_org?.name || 'Requesting Org';
            const tgtName = collab.target_org?.name || 'Target Org';
            const eventTitle = collab.event?.title || 'Event';
            const isAccepted = collab.status === CollaborationStatus.ACCEPTED;
            const isCountered = collab.status === CollaborationStatus.COUNTERED;
            const isProposed = collab.status === CollaborationStatus.PROPOSED;
            const isRejected = collab.status === CollaborationStatus.REJECTED;

            return (
              <div
                key={collab.id}
                className={`bg-slate-900/60 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition ${
                  isAccepted
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : isCountered
                    ? 'border-purple-500/40 bg-purple-950/10'
                    : isRejected
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {collab.collab_type}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isAccepted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isCountered
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : isRejected
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {collab.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base leading-snug">{eventTitle}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-slate-300">{reqName}</span>
                      <span className="text-slate-600">➔</span>
                      <span className="font-semibold text-slate-300">{tgtName}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Created on {new Date(collab.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  {isAccepted ? (
                    <button
                      onClick={() => openWorkspace(collab)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-2"
                    >
                      <span>🚀</span> Enter Shared Workspace (Tasks &amp; Thread)
                    </button>
                  ) : isProposed || isCountered ? (
                    <>
                      <button
                        onClick={() => handleRespond(collab.id, 'accept', 'Accepted proposal')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          setCounterCollabId(collab.id);
                          setShowCounterModal(true);
                        }}
                        className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition"
                      >
                        Counter
                      </button>
                      <button
                        onClick={() => handleRespond(collab.id, 'reject', 'Declined')}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs rounded-lg transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => openThreadModal(collab)}
                        className="w-full py-1 text-center text-xs text-slate-400 hover:text-slate-200 mt-1"
                      >
                        View Negotiation Thread
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openThreadModal(collab)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition text-center"
                    >
                      View Rejected History
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: PROPOSE COLLABORATION */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Propose Cross-Org Collaboration</h3>
              <button onClick={() => setShowProposeModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Event</label>
                <select
                  required
                  value={propEventId}
                  onChange={(e) => handleEventSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.format})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Partner Organization / Community
                </label>
                <select
                  required
                  value={propTargetOrgId}
                  onChange={(e) => setPropTargetOrgId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {orgs
                    .filter((o) => o.id !== propReqOrgId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Collaboration Type</label>
                <select
                  value={propCollabType}
                  onChange={(e) => setPropCollabType(e.target.value as CollaborationType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={CollaborationType.SPEAKER}>Speaker Exchange</option>
                  <option value={CollaborationType.VENUE}>Venue Co-Hosting</option>
                  <option value={CollaborationType.TECHNICAL}>Technical Track / Hackathon</option>
                  <option value={CollaborationType.SPONSORSHIP}>Sponsorship</option>
                  <option value={CollaborationType.OUTREACH}>Outreach Promotion</option>
                  <option value={CollaborationType.MEDIA}>Media Partnership</option>
                  <option value={CollaborationType.GENERAL}>General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Initial Proposal Pitch / Terms
                </label>
                <textarea
                  rows={3}
                  required
                  value={propInitialMessage}
                  onChange={(e) => setPropInitialMessage(e.target.value)}
                  placeholder="Describe the opportunity, expected mutual benefits, and any initial proposals..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COUNTER-PROPOSAL */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Send Counter-Proposal</h3>
              <button onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <form onSubmit={handleCounterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Counter-Terms or Requested Adjustments
                </label>
                <textarea
                  rows={4}
                  required
                  value={counterText}
                  onChange={(e) => setCounterText(e.target.value)}
                  placeholder="Outline adjusted dates, speaker count, deliverables, or resource commitments..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg"
                >
                  Send Counter-Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW NEGOTIATION THREAD */}
      {viewThreadCollab && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Negotiation Thread</h3>
                <p className="text-xs text-slate-400">{viewThreadCollab.event?.title}</p>
              </div>
              <button onClick={() => setViewThreadCollab(null)} className="text-slate-400 hover:text-white">
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {(viewThreadCollab.messages || []).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No messages in this proposal thread.</p>
              ) : (
                viewThreadCollab.messages?.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      m.is_counterproposal
                        ? 'bg-purple-950/20 border-purple-500/30'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-200">
                        {m.sender_org?.name || 'Partner Org'}
                        {m.is_counterproposal && (
                          <span className="ml-2 text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                            [Counter-Offer]
                          </span>
                        )}
                      </span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))
              )}
            </div>

            {viewThreadCollab.status !== CollaborationStatus.REJECTED && (
              <form onSubmit={(e) => handleSendMessage(e, false)} className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  placeholder="Type a message to partner org..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: SHARED COLLABORATION WORKSPACE (FULLSCREEN / EXPANDED) */}
      {activeWorkspaceCollab && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Workspace Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Accepted Workspace
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeWorkspaceCollab.collab_type.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {activeWorkspaceCollab.event?.title || 'Collaboration Event'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-emerald-400 font-medium">{activeWorkspaceCollab.requesting_org?.name}</span>
                  <span>🤝</span>
                  <span className="text-emerald-400 font-medium">{activeWorkspaceCollab.target_org?.name}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveWorkspaceCollab(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs"
              >
                Close Workspace
              </button>
            </div>

            {/* Workspace Body: 2 Columns (Tasks & Message Feed) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              {/* Column 1 & 2: Task List */}
              <div className="lg:col-span-2 p-5 overflow-y-auto space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-white text-sm">📋 Shared Operations Task List</h3>
                    <span className="text-xs text-slate-400">
                      {completedTasksCount} / {workspaceTasks.length} Done ({taskProgressPct}%)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-2 transition-all duration-300"
                      style={{ width: `${taskProgressPct}%` }}
                    />
                  </div>
                </div>

                {/* Add Task Form */}
                <form onSubmit={handleCreateTask} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Add a new deliverable or action item..."
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Unassigned</option>
                      <option value={activeWorkspaceCollab.requesting_org_id}>
                        {activeWorkspaceCollab.requesting_org?.name || 'Requesting Org'}
                      </option>
                      <option value={activeWorkspaceCollab.target_org_id}>
                        {activeWorkspaceCollab.target_org?.name || 'Target Org'}
                      </option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                    >
                      + Add
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Optional notes or details..."
                    className="w-full px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </form>

                {/* Task Items */}
                <div className="space-y-2.5">
                  {workspaceTasks.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No tasks yet. Create one above!</p>
                  ) : (
                    workspaceTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition ${
                          t.completed
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={t.completed}
                            onChange={() => handleToggleTask(t.id, t.completed)}
                            className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                          />
                          <div>
                            <p
                              className={`text-xs font-semibold ${
                                t.completed ? 'line-through text-slate-400' : 'text-slate-100'
                              }`}
                            >
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                            )}
                            {t.assigned_org && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                Assigned to: {t.assigned_org.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-slate-500 hover:text-rose-400 text-xs px-1"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Collaboration Messages Feed */}
              <div className="p-5 flex flex-col justify-between overflow-hidden bg-slate-950/30">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm">💬 Operations Chat</h3>
                  <p className="text-[11px] text-slate-400">Direct thread with partner community</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                  {workspaceMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        m.is_counterproposal
                          ? 'bg-purple-950/20 border-purple-500/30'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-200">{m.sender_org?.name || 'Partner Org'}</span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => handleSendMessage(e, true)} className="pt-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={newMessageBody}
                    onChange={(e) => setNewMessageBody(e.target.value)}
                    placeholder="Type message to partner..."
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
