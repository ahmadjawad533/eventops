import { OutreachStatus } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import {
  memoryDb,
  DbOutreachRequest,
  DbOutreachCampaign,
} from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class OutreachRepository {
  public async createRequest(data: {
    requesting_org_id: string;
    target_community_org_id: string;
    event_id: string;
    purpose: string;
    target_audience: string;
    requested_recipient_count: number;
    message_subject: string;
    message_body: string;
    status?: OutreachStatus;
  }) {
    try {
      return await prisma.outreachRequest.create({
        data: {
          requesting_org_id: data.requesting_org_id,
          target_community_org_id: data.target_community_org_id,
          event_id: data.event_id,
          purpose: data.purpose,
          target_audience: data.target_audience,
          requested_recipient_count: data.requested_recipient_count,
          message_subject: data.message_subject,
          message_body: data.message_body,
          status: (data.status || OutreachStatus.PENDING) as any,
        },
        include: {
          requesting_org: true,
          target_community: true,
          event: true,
          campaign: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma create outreach request failed, using memory store');
      const req = memoryDb.createOutreachRequest(data);
      const reqOrg = memoryDb.findOrganizationById(req.requesting_org_id);
      const tgtOrg = memoryDb.findOrganizationById(req.target_community_org_id);
      const ev = memoryDb.findEventById(req.event_id);
      return {
        ...req,
        requesting_org: reqOrg || undefined,
        target_community: tgtOrg || undefined,
        event: ev || undefined,
        campaign: undefined,
      };
    }
  }

  public async findRequestById(id: string) {
    try {
      return await prisma.outreachRequest.findUnique({
        where: { id },
        include: {
          requesting_org: true,
          target_community: true,
          event: true,
          campaign: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma findRequestById outreach failed, using memory store');
      const req = memoryDb.findOutreachRequestById(id);
      if (!req) return null;

      const reqOrg = memoryDb.findOrganizationById(req.requesting_org_id);
      const tgtOrg = memoryDb.findOrganizationById(req.target_community_org_id);
      const ev = memoryDb.findEventById(req.event_id);
      const campaign = memoryDb.findOutreachCampaignByRequestId(req.id);

      return {
        ...req,
        requesting_org: reqOrg || undefined,
        target_community: tgtOrg || undefined,
        event: ev || undefined,
        campaign: campaign || undefined,
      };
    }
  }

  public async updateRequest(id: string, updates: Partial<DbOutreachRequest>) {
    try {
      return await prisma.outreachRequest.update({
        where: { id },
        data: updates as any,
        include: {
          requesting_org: true,
          target_community: true,
          event: true,
          campaign: true,
        },
      });
    } catch (error) {
      const updated = memoryDb.updateOutreachRequest(id, updates);
      if (!updated) return null;
      const reqOrg = memoryDb.findOrganizationById(updated.requesting_org_id);
      const tgtOrg = memoryDb.findOrganizationById(updated.target_community_org_id);
      const ev = memoryDb.findEventById(updated.event_id);
      const campaign = memoryDb.findOutreachCampaignByRequestId(updated.id);
      return {
        ...updated,
        requesting_org: reqOrg || undefined,
        target_community: tgtOrg || undefined,
        event: ev || undefined,
        campaign: campaign || undefined,
      };
    }
  }

  public async findPaginatedRequests(options: {
    requesting_org_id?: string;
    target_community_org_id?: string;
    event_id?: string;
    status?: OutreachStatus;
    page: number;
    limit: number;
  }) {
    const { requesting_org_id, target_community_org_id, event_id, status, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (requesting_org_id) where.requesting_org_id = requesting_org_id;
      if (target_community_org_id) where.target_community_org_id = target_community_org_id;
      if (event_id) where.event_id = event_id;
      if (status) where.status = status;

      const [items, total] = await Promise.all([
        prisma.outreachRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            requesting_org: true,
            target_community: true,
            event: true,
            campaign: true,
          },
        }),
        prisma.outreachRequest.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findPaginatedRequests failed, using memory store');
      const res = memoryDb.findOutreachRequests({
        requesting_org_id,
        target_community_org_id,
        event_id,
        status,
        skip,
        take: limit,
      });

      const items = res.items.map((r) => {
        const reqOrg = memoryDb.findOrganizationById(r.requesting_org_id);
        const tgtOrg = memoryDb.findOrganizationById(r.target_community_org_id);
        const ev = memoryDb.findEventById(r.event_id);
        const campaign = memoryDb.findOutreachCampaignByRequestId(r.id);
        return {
          ...r,
          requesting_org: reqOrg || undefined,
          target_community: tgtOrg || undefined,
          event: ev || undefined,
          campaign: campaign || undefined,
        };
      });

      return { items, total: res.total };
    }
  }

  public async countDailyRequests(org_id: string, sinceDate: Date): Promise<number> {
    try {
      return await prisma.outreachRequest.count({
        where: {
          requesting_org_id: org_id,
          created_at: { gte: sinceDate },
        },
      });
    } catch (error) {
      return memoryDb.countDailyOutreachRequests(org_id, sinceDate);
    }
  }

  // --- Campaign Metrics ---
  public async createCampaign(data: {
    outreach_request_id: string;
    sent_count?: number;
    delivered_count?: number;
    opened_count?: number;
    clicked_count?: number;
    registrations_count?: number;
  }) {
    try {
      return await prisma.outreachCampaign.create({
        data: {
          outreach_request_id: data.outreach_request_id,
          sent_count: data.sent_count || 0,
          delivered_count: data.delivered_count || 0,
          opened_count: data.opened_count || 0,
          clicked_count: data.clicked_count || 0,
          registrations_count: data.registrations_count || 0,
        },
      });
    } catch (error) {
      return memoryDb.createOutreachCampaign(data);
    }
  }

  public async findCampaignByRequestId(requestId: string) {
    try {
      return await prisma.outreachCampaign.findUnique({
        where: { outreach_request_id: requestId },
      });
    } catch (error) {
      return memoryDb.findOutreachCampaignByRequestId(requestId);
    }
  }

  public async updateCampaign(
    requestId: string,
    updates: {
      sent_count?: number;
      delivered_count?: number;
      opened_count?: number;
      clicked_count?: number;
      registrations_count?: number;
    }
  ) {
    try {
      return await prisma.outreachCampaign.update({
        where: { outreach_request_id: requestId },
        data: updates,
      });
    } catch (error) {
      return memoryDb.updateOutreachCampaign(requestId, updates);
    }
  }

  /**
   * Internal method used solely by background notification engine.
   * Gathers recipient emails for the community without exposing them to the API.
   */
  public async getInternalCommunityRecipients(communityOrgId: string, limit: number): Promise<string[]> {
    try {
      const followers = await prisma.communityFollower.findMany({
        where: { community_org_id: communityOrgId },
        take: limit,
        include: { user: { select: { email: true } } },
      });
      const emails = followers.map((f) => f.user.email);

      if (emails.length < limit) {
        const members = await prisma.organizationMember.findMany({
          where: { org_id: communityOrgId },
          take: limit - emails.length,
          include: { user: { select: { email: true } } },
        });
        for (const m of members) {
          if (!emails.includes(m.user.email)) {
            emails.push(m.user.email);
          }
        }
      }
      return emails;
    } catch (error) {
      const emails: string[] = [];
      const followers = memoryDb.getFollowers(communityOrgId, 0, limit);
      for (const f of followers.items) {
        const u = memoryDb.findUserById(f.user_id);
        if (u && !emails.includes(u.email)) {
          emails.push(u.email);
        }
      }

      if (emails.length < limit) {
        const members = memoryDb.getMembers(communityOrgId, 0, limit - emails.length);
        for (const m of members.items) {
          const u = memoryDb.findUserById(m.user_id);
          if (u && !emails.includes(u.email)) {
            emails.push(u.email);
          }
        }
      }
      return emails;
    }
  }

  public async findOrgById(id: string) {
    try {
      return await prisma.organization.findUnique({ where: { id } });
    } catch (error) {
      return memoryDb.findOrganizationById(id);
    }
  }

  public async findEventById(id: string) {
    try {
      return await prisma.event.findUnique({ where: { id } });
    } catch (error) {
      return memoryDb.findEventById(id);
    }
  }

  public async findOrgMember(org_id: string, user_id: string) {
    try {
      return await prisma.organizationMember.findUnique({
        where: { org_id_user_id: { org_id, user_id } },
      });
    } catch (error) {
      return memoryDb.findMember(org_id, user_id);
    }
  }

  public async createAuditLog(data: {
    actor_user_id?: string | null;
    action: string;
    target_type: string;
    target_id: string;
    metadata?: any;
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          actor_user_id: data.actor_user_id || null,
          action: data.action,
          target_type: data.target_type,
          target_id: data.target_id,
          metadata: data.metadata || undefined,
        },
      });
    } catch (error) {
      return memoryDb.createAuditLog(data);
    }
  }
}

export const outreachRepository = new OutreachRepository();
