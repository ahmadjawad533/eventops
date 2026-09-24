import {
  EventStatus,
  RegistrationStatus,
  RoleType,
  OrganizerDashboardMetrics,
  CommunityDashboardMetrics,
} from '@eventops/shared-types';
import {
  DashboardsRepository,
  dashboardsRepository,
} from './dashboards.repository';
import { AppError } from '../../middleware/errorHandler';

export class DashboardsService {
  constructor(private readonly repo: DashboardsRepository = dashboardsRepository) {}

  public async getOrganizerDashboard(
    userId: string,
    orgId?: string
  ): Promise<OrganizerDashboardMetrics> {
    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const userOrgs = await this.repo.findUserOrganizations(userId);
      if (userOrgs.length === 0) {
        return this.getEmptyOrganizerMetrics();
      }
      targetOrgId = userOrgs[0].id;
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(targetOrgId, userId);
      if (!membership) {
        throw new AppError(
          'You are not authorized to view dashboard analytics for this organization',
          403,
          'FORBIDDEN'
        );
      }
    }

    const data = await this.repo.getOrganizerData(targetOrgId);

    let publishedCount = 0;
    let draftCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let totalRegistrations = 0;
    let totalAttended = 0;
    let totalConfirmedSponsorships = 0;

    const eventsBreakdown = data.events.map((ev) => {
      if (ev.status === EventStatus.PUBLISHED) publishedCount++;
      else if (ev.status === EventStatus.DRAFT) draftCount++;
      else if (ev.status === EventStatus.COMPLETED) completedCount++;
      else if (ev.status === EventStatus.CANCELLED) cancelledCount++;

      const registered = ev.registrations.length;
      const attended = ev.registrations.filter(
        (r: any) => r.status === RegistrationStatus.ATTENDED
      ).length;

      totalRegistrations += registered;
      totalAttended += attended;
      totalConfirmedSponsorships += (ev.confirmed_sponsorships || []).length;

      const rate = registered > 0 ? Math.round((attended / registered) * 100) : 0;
      const remainingCapacity = Math.max(0, ev.capacity - registered);

      return {
        id: ev.id,
        title: ev.title,
        status: ev.status as EventStatus,
        start_date:
          ev.start_date instanceof Date ? ev.start_date.toISOString() : String(ev.start_date),
        capacity: ev.capacity,
        registered_count: registered,
        attended_count: attended,
        attendance_rate: rate,
        remaining_capacity: remainingCapacity,
      };
    });

    const averageAttendanceRate =
      totalRegistrations > 0
        ? Math.round((totalAttended / totalRegistrations) * 100)
        : 0;

    const recentActivity = data.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      created_at:
        log.created_at instanceof Date ? log.created_at.toISOString() : String(log.created_at),
      metadata: log.metadata,
    }));

    return {
      summary: {
        total_events: data.events.length,
        published_events: publishedCount,
        draft_events: draftCount,
        completed_events: completedCount,
        cancelled_events: cancelledCount,
        total_registrations: totalRegistrations,
        total_attended: totalAttended,
        average_attendance_rate: averageAttendanceRate,
        total_collaborations: data.collaborations.length,
        total_sponsorships_confirmed: totalConfirmedSponsorships,
      },
      events_breakdown: eventsBreakdown,
      recent_activity: recentActivity,
    };
  }

  public async getCommunityDashboard(
    userId: string,
    orgId?: string
  ): Promise<CommunityDashboardMetrics> {
    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const userOrgs = await this.repo.findUserOrganizations(userId);
      if (userOrgs.length === 0) {
        return this.getEmptyCommunityMetrics();
      }
      targetOrgId = userOrgs[0].id;
    }

    if (!isPlatformAdmin) {
      const membership = await this.repo.findOrgMember(targetOrgId, userId);
      if (!membership) {
        throw new AppError(
          'You are not authorized to view dashboard analytics for this community',
          403,
          'FORBIDDEN'
        );
      }
    }

    const data = await this.repo.getCommunityData(targetOrgId);

    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalRegistrations = 0;
    let totalCampaigns = 0;

    const campaignsBreakdown = data.outreach_requests
      .filter((req) => Boolean(req.campaign))
      .map((req) => {
        totalCampaigns++;
        const camp = req.campaign!;
        totalDelivered += camp.delivered_count || 0;
        totalOpened += camp.opened_count || 0;
        totalClicked += camp.clicked_count || 0;
        totalRegistrations += camp.registrations_count || 0;

        const openRate =
          camp.delivered_count > 0
            ? Math.round((camp.opened_count / camp.delivered_count) * 100)
            : 0;
        const clickRate =
          camp.delivered_count > 0
            ? Math.round((camp.clicked_count / camp.delivered_count) * 100)
            : 0;

        return {
          id: camp.id,
          outreach_request_id: req.id,
          purpose: req.purpose,
          target_audience: req.target_audience,
          requesting_org_name: req.requesting_org?.name || 'Partner Org',
          sent_count: camp.sent_count,
          delivered_count: camp.delivered_count,
          opened_count: camp.opened_count,
          clicked_count: camp.clicked_count,
          registrations_count: camp.registrations_count,
          open_rate: openRate,
          click_rate: clickRate,
          created_at:
            camp.created_at instanceof Date
              ? camp.created_at.toISOString()
              : String(camp.created_at),
        };
      });

    const averageOpenRate =
      totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
    const averageClickRate =
      totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0;
    const conversionRate =
      totalDelivered > 0 ? Math.round((totalRegistrations / totalDelivered) * 100) : 0;

    const recentActivity = data.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      created_at:
        log.created_at instanceof Date ? log.created_at.toISOString() : String(log.created_at),
      metadata: log.metadata,
    }));

    return {
      summary: {
        member_count: data.member_count,
        follower_count: data.follower_count,
        total_outreach_campaigns: totalCampaigns,
        total_outreach_delivered: totalDelivered,
        total_outreach_opened: totalOpened,
        total_outreach_clicked: totalClicked,
        total_outreach_registrations: totalRegistrations,
        average_open_rate: averageOpenRate,
        average_click_rate: averageClickRate,
        conversion_rate: conversionRate,
      },
      campaigns_breakdown: campaignsBreakdown,
      recent_activity: recentActivity,
    };
  }

  public async getAuditLogs(
    userId: string,
    options: {
      action?: string;
      target_type?: string;
      target_id?: string;
      actor_user_id?: string;
      page: number;
      limit: number;
    }
  ) {
    const roles = await this.repo.getUserRoles(userId);
    const isPlatformAdmin = roles.some((r: any) => r.role_type === RoleType.PLATFORM_ADMIN);

    let targetIds: string[] | undefined;
    let actorIdFilter = options.actor_user_id;

    if (!isPlatformAdmin) {
      // Non-platform admin: can only see logs targeting their organizations or their user ID
      const userOrgs = await this.repo.findUserOrganizations(userId);
      const userOrgIds = userOrgs.map((o) => o.id);
      targetIds = [...userOrgIds, userId];

      // If user specified an actor filter, ensure they cannot query other users
      if (!actorIdFilter) {
        actorIdFilter = undefined;
      }
    }

    const { items, total } = await this.repo.findAuditLogs({
      actor_user_id: actorIdFilter,
      action: options.action,
      target_type: options.target_type,
      target_id: options.target_id,
      target_ids: targetIds,
      page: options.page,
      limit: options.limit,
    });

    const totalPages = Math.ceil(total / options.limit);

    return {
      items,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1,
      },
    };
  }

  private getEmptyOrganizerMetrics(): OrganizerDashboardMetrics {
    return {
      summary: {
        total_events: 0,
        published_events: 0,
        draft_events: 0,
        completed_events: 0,
        cancelled_events: 0,
        total_registrations: 0,
        total_attended: 0,
        average_attendance_rate: 0,
        total_collaborations: 0,
        total_sponsorships_confirmed: 0,
      },
      events_breakdown: [],
      recent_activity: [],
    };
  }

  private getEmptyCommunityMetrics(): CommunityDashboardMetrics {
    return {
      summary: {
        member_count: 0,
        follower_count: 0,
        total_outreach_campaigns: 0,
        total_outreach_delivered: 0,
        total_outreach_opened: 0,
        total_outreach_clicked: 0,
        total_outreach_registrations: 0,
        average_open_rate: 0,
        average_click_rate: 0,
        conversion_rate: 0,
      },
      campaigns_breakdown: [],
      recent_activity: [],
    };
  }
}

export const dashboardsService = new DashboardsService();
