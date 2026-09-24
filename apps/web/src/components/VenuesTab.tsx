import React, { useEffect, useState } from 'react';
import {
  Organization,
  Event as EventModel,
  UserRole,
  VenueRequestStatus,
} from '@eventops/shared-types';

interface VenueItem {
  id: string;
  owner_org_id: string;
  name: string;
  capacity: number;
  facilities: Record<string, any>;
  city: string;
  created_at: string;
  owner_org?: Organization;
  requests?: VenueRequestItem[];
}

interface VenueRequestItem {
  id: string;
  venue_id: string;
  event_id: string;
  requesting_org_id: string;
  status: VenueRequestStatus;
  notes?: string | null;
  created_at: string;
  venue?: VenueItem;
  event?: EventModel;
  requesting_org?: Organization;
}

interface VenuesTabProps {
  token: string | null;
  userOrgs: Organization[];
  userEvents: EventModel[];
  roles: UserRole[];
}

export function VenuesTab({ token, userOrgs, userEvents }: VenuesTabProps) {
  const [viewMode, setViewMode] = useState<'directory' | 'inbox'>('directory');
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [bookingRequests, setBookingRequests] = useState<VenueRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [minCapacity, setMinCapacity] = useState<number | ''>('');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');

  // List Venue Modal
  const [showListModal, setShowListModal] = useState(false);
  const [selectedOwnerOrgId, setSelectedOwnerOrgId] = useState(userOrgs[0]?.id || '');
  const [venueName, setVenueName] = useState('');
  const [venueCapacity, setVenueCapacity] = useState(250);
  const [venueCity, setVenueCity] = useState('Berlin');
  const [facAv, setFacAv] = useState(true);
  const [facProjector, setFacProjector] = useState(true);
  const [facStage, setFacStage] = useState(true);
  const [facWifi, setFacWifi] = useState(true);
  const [facCatering, setFacCatering] = useState(false);
  const [facParking, setFacParking] = useState(false);
  const [isListingVenue, setIsListingVenue] = useState(false);

  // Request Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [targetVenue, setTargetVenue] = useState<VenueItem | null>(null);
  const [selectedEventId, setSelectedEventId] = useState(userEvents[0]?.id || '');
  const [selectedReqOrgId, setSelectedReqOrgId] = useState(userOrgs[0]?.id || '');
  const [bookingNotes, setBookingNotes] = useState('Requesting space for full-day event with AV setup.');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Counter Modal / state
  const [counterReqId, setCounterReqId] = useState<string | null>(null);
  const [counterNotes, setCounterNotes] = useState('');

  // Load Venues
  const loadVenues = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      let url = '/api/venues?limit=50';
      if (cityFilter !== 'all') url += `&city=${encodeURIComponent(cityFilter)}`;
      if (minCapacity !== '') url += `&min_capacity=${minCapacity}`;
      if (selectedFacility !== 'all') url += `&facility=${encodeURIComponent(selectedFacility)}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data?.items) {
        setVenues(data.data.items);
      }
    } catch {
      setErrorMsg('Failed to fetch venues');
    } finally {
      setLoading(false);
    }
  };

  // Load Booking Requests
  const loadRequests = async () => {
    try {
      const res = await fetch('/api/venues/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data?.items) {
        setBookingRequests(data.data.items);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadVenues();
    loadRequests();
  }, [token, cityFilter, selectedFacility]);

  // Handle List Venue
  const handleListVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwnerOrgId || !venueName || !venueCity) {
      setErrorMsg('All fields are required');
      return;
    }

    try {
      setIsListingVenue(true);
      setErrorMsg(null);
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner_org_id: selectedOwnerOrgId,
          name: venueName,
          capacity: Number(venueCapacity),
          city: venueCity,
          facilities: {
            av: facAv,
            projector: facProjector,
            stage: facStage,
            wifi: facWifi,
            catering: facCatering,
            parking: facParking,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to list venue');
      }

      setSuccessMsg('Venue listed successfully!');
      setShowListModal(false);
      setVenueName('');
      loadVenues();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsListingVenue(false);
    }
  };

  // Handle Submit Booking Request
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVenue || !selectedEventId || !selectedReqOrgId) {
      setErrorMsg('Venue, event, and requesting organization are required');
      return;
    }

    try {
      setIsSubmittingBooking(true);
      setErrorMsg(null);
      const res = await fetch(`/api/venues/${targetVenue.id}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          venue_id: targetVenue.id,
          event_id: selectedEventId,
          requesting_org_id: selectedReqOrgId,
          notes: bookingNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to request venue booking');
      }

      setSuccessMsg('Booking request submitted to venue owner!');
      setShowBookingModal(false);
      setBookingNotes('');
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Handle Respond to Request
  const handleRespond = async (requestId: string, action: 'accept' | 'reject' | 'counter', notes?: string) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`/api/venues/requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, notes }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Failed to ${action} request`);
      }

      setSuccessMsg(`Booking request ${action}ed successfully!`);
      setCounterReqId(null);
      loadRequests();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const facilityOptions = [
    { key: 'all', label: 'All Facilities' },
    { key: 'stage', label: '🎭 Stage' },
    { key: 'projector', label: '📽️ Projector' },
    { key: 'av', label: '🎙️ AV Setup' },
    { key: 'wifi', label: '📶 High-Speed WiFi' },
    { key: 'catering', label: '☕ Catering' },
    { key: 'parking', label: '🚗 Parking' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-900/40 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🏛️</span> Venues Marketplace & Booking Requests
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Find event spaces, auditoriums, tech hubs, and conference venues. Filter by capacity,
              facilities, and city. Coordinate venue bookings and counter-proposals in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowListModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-blue-950 flex items-center gap-1.5"
            >
              <span>+</span> List a Venue
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setViewMode('directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'directory'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            Venues Directory ({venues.length})
          </button>
          <button
            onClick={() => setViewMode('inbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'inbox'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800'
            }`}
          >
            Booking Requests Inbox ({bookingRequests.length})
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

      {/* VIEW: VENUES DIRECTORY */}
      {viewMode === 'directory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
            <input
              type="text"
              placeholder="Search by venue name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            >
              <option value="all">All Cities</option>
              <option value="Berlin">Berlin</option>
              <option value="Munich">Munich</option>
              <option value="Hamburg">Hamburg</option>
              <option value="Frankfurt">Frankfurt</option>
              <option value="San Francisco">San Francisco</option>
              <option value="New York">New York</option>
              <option value="London">London</option>
            </select>
            <input
              type="number"
              placeholder="Min Capacity (e.g. 100)"
              value={minCapacity}
              onChange={(e) => setMinCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500"
            />
            <button
              onClick={loadVenues}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
            >
              Filter Venues
            </button>
          </div>

          {/* Facility Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium">Filter Facility:</span>
            {facilityOptions.map((fac) => (
              <button
                key={fac.key}
                onClick={() => setSelectedFacility(fac.key)}
                className={`px-2.5 py-1 text-xs rounded-lg transition border ${
                  selectedFacility === fac.key
                    ? 'bg-blue-600/30 border-blue-500/60 text-blue-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {fac.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading venues...
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-400 text-sm">
              No venues found matching your criteria. List your venue to start hosting events!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between transition"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-white text-base leading-tight">
                        {venue.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-blue-950 border border-blue-800/60 text-blue-300 text-[10px] font-semibold rounded-md whitespace-nowrap">
                        👥 Capacity {venue.capacity}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="text-slate-500">Location: </span>
                        <span className="text-slate-200 font-medium">📍 {venue.city}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Host: </span>
                        <span className="text-slate-300">
                          {venue.owner_org?.name || 'Venue Owner'}
                        </span>
                      </div>
                    </div>

                    {/* Facility Tags */}
                    <div className="pt-2">
                      <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                        Available Facilities:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {venue.facilities?.stage && (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded">
                            🎭 Stage
                          </span>
                        )}
                        {venue.facilities?.projector && (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded">
                            📽️ Projector
                          </span>
                        )}
                        {venue.facilities?.av && (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded">
                            🎙️ AV Audio
                          </span>
                        )}
                        {venue.facilities?.wifi && (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded">
                            📶 WiFi
                          </span>
                        )}
                        {venue.facilities?.catering && (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded">
                            ☕ Catering Area
                          </span>
                        )}
                        {venue.facilities?.parking && (
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded">
                            🚗 Parking
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-end">
                    <button
                      onClick={() => {
                        setTargetVenue(venue);
                        setShowBookingModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition shadow-md shadow-blue-950"
                    >
                      Request Booking
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: BOOKING REQUESTS INBOX */}
      {viewMode === 'inbox' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400">
            Incoming and outgoing venue booking requests and counter-proposals:
          </div>

          {bookingRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-400 text-sm">
              No booking requests found. Browse the venue directory to request spaces for your events!
            </div>
          ) : (
            <div className="space-y-3">
              {bookingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {req.venue?.name || 'Venue'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Event: <span className="text-slate-200">{req.event?.title || 'Summit'}</span> |
                        Requester: <span className="text-slate-200">{req.requesting_org?.name || 'Requester Org'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === VenueRequestStatus.REQUESTED && (
                        <span className="px-2.5 py-0.5 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-medium rounded-full">
                          Requested
                        </span>
                      )}
                      {req.status === VenueRequestStatus.ACCEPTED && (
                        <span className="px-2.5 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-medium rounded-full">
                          Accepted ✓
                        </span>
                      )}
                      {req.status === VenueRequestStatus.COUNTERED && (
                        <span className="px-2.5 py-0.5 bg-amber-950 border border-amber-800 text-amber-300 text-xs font-medium rounded-full">
                          Countered ⇋
                        </span>
                      )}
                      {req.status === VenueRequestStatus.REJECTED && (
                        <span className="px-2.5 py-0.5 bg-rose-950 border border-rose-800 text-rose-300 text-xs font-medium rounded-full">
                          Rejected ✕
                        </span>
                      )}
                    </div>
                  </div>

                  {req.notes && (
                    <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="text-slate-500 font-medium">Notes / Proposal: </span>
                      {req.notes}
                    </div>
                  )}

                  {/* Actions for Pending Requests */}
                  {req.status === VenueRequestStatus.REQUESTED && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleRespond(req.id, 'reject')}
                        className="px-3 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-lg text-xs transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setCounterReqId(req.id);
                          setCounterNotes('We can host, but need to adjust access hours.');
                        }}
                        className="px-3 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-lg text-xs transition"
                      >
                        Counter Terms...
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, 'accept')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-emerald-950"
                      >
                        Accept Booking ✓
                      </button>
                    </div>
                  )}

                  {/* Inline Counter Proposal Box */}
                  {counterReqId === req.id && (
                    <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg space-y-2 mt-2">
                      <label className="block text-xs font-medium text-amber-300">
                        Counter Proposal Terms:
                      </label>
                      <textarea
                        rows={2}
                        value={counterNotes}
                        onChange={(e) => setCounterNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setCounterReqId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'counter', counterNotes)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition"
                        >
                          Send Counter Offer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: LIST VENUE */}
      {showListModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-base">
                List a Venue Profile
              </h3>
              <button onClick={() => setShowListModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleListVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Owner Organization
                </label>
                <select
                  value={selectedOwnerOrgId}
                  onChange={(e) => setSelectedOwnerOrgId(e.target.value)}
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
                  Venue Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spree Arena & Innovation Center"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Capacity (Seats / Persons)
                  </label>
                  <input
                    type="number"
                    value={venueCapacity}
                    onChange={(e) => setVenueCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Berlin"
                    value={venueCity}
                    onChange={(e) => setVenueCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Venue Facilities Included
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={facAv}
                      onChange={(e) => setFacAv(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600"
                    />
                    🎙️ AV Sound System
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={facProjector}
                      onChange={(e) => setFacProjector(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600"
                    />
                    📽️ High-Def Projector
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={facStage}
                      onChange={(e) => setFacStage(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600"
                    />
                    🎭 Stage & Podium
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={facWifi}
                      onChange={(e) => setFacWifi(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600"
                    />
                    📶 High-Speed WiFi
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={facCatering}
                      onChange={(e) => setFacCatering(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600"
                    />
                    ☕ Catering Kitchen
                  </label>
                  <label className="flex items-center gap-2 text-slate-300">
                    <input
                      type="checkbox"
                      checked={facParking}
                      onChange={(e) => setFacParking(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600"
                    />
                    🚗 On-site Parking
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isListingVenue}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
                >
                  {isListingVenue ? 'Listing...' : 'List Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST BOOKING */}
      {showBookingModal && targetVenue && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-white text-base">
                  Request Venue Booking
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Venue: {targetVenue.name} ({targetVenue.city})
                </p>
              </div>
              <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Select Event to Host
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  required
                >
                  {userEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} (Capacity: {ev.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Requesting Organization
                </label>
                <select
                  value={selectedReqOrgId}
                  onChange={(e) => setSelectedReqOrgId(e.target.value)}
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
                  Booking Dates & Requirement Notes
                </label>
                <textarea
                  rows={3}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
                >
                  {isSubmittingBooking ? 'Submitting...' : 'Submit Booking Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
