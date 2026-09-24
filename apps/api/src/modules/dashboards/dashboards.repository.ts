import {
  EventStatus,
  RegistrationStatus,
  SponsorshipStatus,
} from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import { memoryDb } from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class DashboardsRepository {
  public async getOrganizerData(orgId: string) {
    try {
      const events = await prisma.event.findMany({
        where: { organizer_org_id: orgId },
        include: {
          registrations: true,
          sponsorship_opportunities: {
            include: {
              applications: true,
            },
          },
        },
        orderBy: { start_date: 'desc' },
      });

      const collaborations = await prisma.collaboration.findMany({
        where: {
          OR: [{ requesting_org_id: orgId }, { target_org_id: orgId }],
        },
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { target_id: orgId },
            { target_type: 'organization', target_id: orgId },
            { target_type: 'event', target_id: { in: events.map((e) => e.id) } },
          ],
        },
        take: 10,
        orderBy: { created_at: 'desc' },
      });

      return {
        events: events.map((e) => ({
          ...e,
          registrations: e.registrations,
          confirmed_sponsorships: e.sponsorship_opportunities.flatMap((o) =>
            o.applications.filter((a) => a.status === ('confirmed' as any))
          ),
        })),
        collaborations,
        auditLogs,
      };
    } catch (error) {
      logger.debug('Prisma getOrganizerData failed, using memory store');
      const allEvents = Array.from(memoryDb.events.values()).filter(
        (e) => e.organizer_org_id === orgId
      );

      const eventsWithDetails = allEvents.map((ev) => {
        const regs = Array.from(memoryDb.registrations.values()).filter(
          (r) => r.event_id === ev.id
        );
        const opps = Array.from(memoryDb.sponsorshipOpportunities.values()).filter(
          (o) => o.event_id === ev.id
        );
        const confirmedSponsorships = opps.flatMap((opp) =>
          Array.from(memoryDb.sponsorshipApplications.values()).filter(
            (a) => a.opportunity_id === opp.id && a.status === SponsorshipStatus.CONFIRMED
          )
        );

        return {
          ...ev,
          registrations: regs,
          confirmed_sponsorships: confirmedSponsorships,
        };
      });

      const eventIds = new Set(allEvents.map((e) => e.id));
      const collabs = Array.from(memoryDb.collaborations.values()).filter(
        (c) => c.requesting_org_id === orgId || c.target_org_id === orgId
      );

      const auditLogs = memoryDb.auditLogs
        .filter((l) => l.target_id === orgId || eventIds.has(l.target_id))
        .slice(0, 10);

      return {
        events: eventsWithDetails,
        collaborations: collabs,
        auditLogs,
      };
    }
  }

  public async getCommunityData(orgId: string) {
    try {
      const [membersCount, followersCount] = await Promise.all([
        prisma.organizationMember.count({ where: { org_id: orgId } }),
        prisma.communityFollower.count({ where: { community_org_id: orgId } }),
      ]);

      const outreachRequests = await prisma.outreachRequest.findMany({
        where: { target_community_org_id: orgId },
        include: {
          requesting_org: true,
          campaign: true,
        },
        orderBy: { created_at: 'desc' },
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          OR: [
            { target_id: orgId },
            { target_type: 'organization', target_id: orgId },
            { target_type: 'outreach_request', target_id: { in: outreachRequests.map((r) => r.id) } },
          ],
        },
        take: 10,
        orderBy: { created_at: 'desc' },
      });

      return {
        member_count: membersCount,
        follower_count: followersCount,
        outreach_requests: outreachRequests,
        auditLogs,
      };
    } catch (error) {
      logger.debug('Prisma getCommunityData failed, using memory store');
      let memberCount = 0;
      for (const m of memoryDb.members.values()) {
        if (m.org_id === orgId) memberCount++;
      }

      let followerCount = 0;
      for (const f of memoryDb.followers.values()) {
        if (f.community_org_id === orgId) followerCount++;
      }

      const requests = Array.from(memoryDb.outreachRequests.values())
        .filter((r) => r.target_community_org_id === orgId)
        .map((r) => {
          const reqOrg = memoryDb.findOrganizationById(r.requesting_org_id);
          const campaign = memoryDb.findOutreachCampaignByRequestId(r.id);
          return {
            ...r,
            requesting_org: reqOrg || undefined,
            campaign: campaign || undefined,
          };
        });

      const reqIds = new Set(requests.map((r) => r.id));
      const auditLogs = memoryDb.auditLogs
        .filter((l) => l.target_id === orgId || reqIds.has(l.target_id))
        .slice(0, 10);

      return {
        member_count: memberCount,
        follower_count: followerCount,
        outreach_requests: requests,
        auditLogs,
      };
    }
  }

  public async findAuditLogs(options: {
    actor_user_id?: string;
    action?: string;
    target_type?: string;
    target_id?: string;
    target_ids?: string[];
    page: number;
    limit: number;
  }) {
    const { actor_user_id, action, target_type, target_id, target_ids, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (actor_user_id) where.actor_user_id = actor_user_id;
      if (action) where.action = action;
      if (target_type) where.target_type = target_type;
      if (target_id) where.target_id = target_id;
      if (target_ids && target_ids.length > 0) {
        where.target_id = { in: target_ids };
      }

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            actor: true,
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      const mapped = items.map((log) => ({
        id: log.id,
        actor_user_id: log.actor_user_id,
        action: log.action,
        target_type: log.target_type,
        target_id: log.target_id,
        metadata: log.metadata,
        created_at: log.created_at.toISOString(),
        actor_name: (log as any).actor?.name || undefined,
        actor_email: (log as any).actor?.email || undefined,
      }));

      return { items: mapped, total };
    } catch (error) {
      logger.debug('Prisma findAuditLogs failed, using memory store');
      let list = memoryDb.auditLogs;

      if (actor_user_id) {
        list = list.filter((l) => l.actor_user_id === actor_user_id);
      }
      if (action) {
        list = list.filter((l) => l.action === action);
      }
      if (target_type) {
        list = list.filter((l) => l.target_type === target_type);
      }
      if (target_id) {
        list = list.filter((l) => l.target_id === target_id);
      }
      if (target_ids && target_ids.length > 0) {
        const idSet = new Set(target_ids);
        list = list.filter((l) => idSet.has(l.target_id));
      }

      const total = list.length;
      const sliced = list.slice(skip, skip + limit);

      const mapped = sliced.map((log) => {
        const user = log.actor_user_id ? memoryDb.findUserById(log.actor_user_id) : null;
        return {
          id: log.id,
          actor_user_id: log.actor_user_id,
          action: log.action,
          target_type: log.target_type,
          target_id: log.target_id,
          metadata: log.metadata,
          created_at: log.created_at.toISOString(),
          actor_name: user?.name,
          actor_email: user?.email,
        };
      });

      return { items: mapped, total };
    }
  }

  public async findOrgMember(org_id: string, user_id: string) {
    try {
      return await prisma.organizationMember.findUnique({
        where: {
          org_id_user_id: { org_id, user_id },
        },
      });
    } catch (error) {
      logger.debug('Prisma findOrgMember failed, using memory store');
      return memoryDb.findMember(org_id, user_id);
    }
  }

  public async getUserRoles(user_id: string) {
    try {
      return await prisma.role.findMany({ where: { user_id } });
    } catch (error) {
      logger.debug('Prisma getUserRoles failed, using memory store');
      return memoryDb.getUserRoles(user_id);
    }
  }

  public async findOrganizationById(id: string) {
    try {
      return await prisma.organization.findUnique({ where: { id } });
    } catch (error) {
      logger.debug('Prisma findOrganizationById failed, using memory store');
      return memoryDb.findOrganizationById(id);
    }
  }

  public async findUserOrganizations(user_id: string) {
    try {
      const memberships = await prisma.organizationMember.findMany({
        where: { user_id },
        include: { organization: true },
      });
      return memberships.map((m) => m.organization);
    } catch (error) {
      logger.debug('Prisma findUserOrganizations failed, using memory store');
      const orgs = [];
      for (const m of memoryDb.members.values()) {
        if (m.user_id === user_id) {
          const org = memoryDb.findOrganizationById(m.org_id);
          if (org) orgs.push(org);
        }
      }
      return orgs;
    }
  }
}

export const dashboardsRepository = new DashboardsRepository();
