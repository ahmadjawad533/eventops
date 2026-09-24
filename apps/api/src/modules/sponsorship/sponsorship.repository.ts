import { SponsorshipStatus } from '@eventops/shared-types';
import { prisma } from '../../core/prisma';
import {
  memoryDb,
  DbSponsorshipOpportunity,
  DbSponsorshipApplication,
} from '../../core/memoryDb';
import { logger } from '../../core/logger';

export class SponsorshipRepository {
  public async createOpportunity(data: {
    event_id: string;
    title: string;
    needs: Record<string, any>;
    budget_range?: string | null;
  }) {
    try {
      return await prisma.sponsorshipOpportunity.create({
        data: {
          event_id: data.event_id,
          title: data.title,
          needs: data.needs as any,
          budget_range: data.budget_range || null,
        },
        include: {
          event: {
            include: {
              organizer: true,
            },
          },
          applications: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma createOpportunity failed, using memory store');
      const opp = memoryDb.createSponsorshipOpportunity(data);
      const ev = memoryDb.findEventById(opp.event_id);
      const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;
      return {
        ...opp,
        event: ev
          ? {
              ...ev,
              organizer: org || undefined,
            }
          : undefined,
        applications: [],
      };
    }
  }

  public async findOpportunityById(id: string) {
    try {
      return await prisma.sponsorshipOpportunity.findUnique({
        where: { id },
        include: {
          event: {
            include: {
              organizer: true,
            },
          },
          applications: {
            include: {
              sponsor_org: true,
            },
          },
        },
      });
    } catch (error) {
      logger.debug('Prisma findOpportunityById failed, using memory store');
      const opp = memoryDb.findSponsorshipOpportunityById(id);
      if (!opp) return null;
      const ev = memoryDb.findEventById(opp.event_id);
      const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;
      const apps = memoryDb
        .findSponsorshipApplicationsPaginated({ opportunity_id: id, take: 100 })
        .items.map((app) => ({
          ...app,
          sponsor_org: memoryDb.findOrganizationById(app.sponsor_org_id) || undefined,
        }));

      return {
        ...opp,
        event: ev
          ? {
              ...ev,
              organizer: org || undefined,
            }
          : undefined,
        applications: apps,
      };
    }
  }

  public async findOpportunitiesPaginated(options: {
    event_id?: string;
    search?: string;
    budget_range?: string;
    page: number;
    limit: number;
  }) {
    const { event_id, search, budget_range, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (event_id) where.event_id = event_id;
      if (budget_range) where.budget_range = budget_range;
      if (search) {
        where.title = { contains: search, mode: 'insensitive' };
      }

      const [items, total] = await Promise.all([
        prisma.sponsorshipOpportunity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            event: {
              include: {
                organizer: true,
              },
            },
            applications: true,
          },
        }),
        prisma.sponsorshipOpportunity.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findOpportunitiesPaginated failed, using memory store');
      const res = memoryDb.findSponsorshipOpportunitiesPaginated({
        event_id,
        search,
        budget_range,
        skip,
        take: limit,
      });

      const enriched = res.items.map((opp) => {
        const ev = memoryDb.findEventById(opp.event_id);
        const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;
        const apps = memoryDb.findSponsorshipApplicationsPaginated({
          opportunity_id: opp.id,
          take: 100,
        }).items;
        return {
          ...opp,
          event: ev
            ? {
                ...ev,
                organizer: org || undefined,
              }
            : undefined,
          applications: apps,
        };
      });

      return { items: enriched, total: res.total };
    }
  }

  public async createApplication(data: {
    opportunity_id: string;
    sponsor_org_id: string;
    status?: SponsorshipStatus;
    notes?: string | null;
  }) {
    try {
      return await prisma.sponsorshipApplication.create({
        data: {
          opportunity_id: data.opportunity_id,
          sponsor_org_id: data.sponsor_org_id,
          status: (data.status || SponsorshipStatus.POTENTIAL) as any,
          notes: data.notes || null,
        },
        include: {
          opportunity: {
            include: {
              event: {
                include: {
                  organizer: true,
                },
              },
            },
          },
          sponsor_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma createApplication failed, using memory store');
      const app = memoryDb.createSponsorshipApplication(data);
      const opp = memoryDb.findSponsorshipOpportunityById(app.opportunity_id);
      const sponsorOrg = memoryDb.findOrganizationById(app.sponsor_org_id);
      const ev = opp ? memoryDb.findEventById(opp.event_id) : null;
      const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;

      return {
        ...app,
        opportunity: opp
          ? {
              ...opp,
              event: ev
                ? {
                    ...ev,
                    organizer: org || undefined,
                  }
                : undefined,
            }
          : undefined,
        sponsor_org: sponsorOrg || undefined,
      };
    }
  }

  public async findApplicationById(id: string) {
    try {
      return await prisma.sponsorshipApplication.findUnique({
        where: { id },
        include: {
          opportunity: {
            include: {
              event: {
                include: {
                  organizer: true,
                },
              },
            },
          },
          sponsor_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma findApplicationById failed, using memory store');
      const app = memoryDb.findSponsorshipApplicationById(id);
      if (!app) return null;

      const opp = memoryDb.findSponsorshipOpportunityById(app.opportunity_id);
      const sponsorOrg = memoryDb.findOrganizationById(app.sponsor_org_id);
      const ev = opp ? memoryDb.findEventById(opp.event_id) : null;
      const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;

      return {
        ...app,
        opportunity: opp
          ? {
              ...opp,
              event: ev
                ? {
                    ...ev,
                    organizer: org || undefined,
                  }
                : undefined,
            }
          : undefined,
        sponsor_org: sponsorOrg || undefined,
      };
    }
  }

  public async findExistingApplication(opportunity_id: string, sponsor_org_id: string) {
    try {
      return await prisma.sponsorshipApplication.findFirst({
        where: {
          opportunity_id,
          sponsor_org_id,
        },
      });
    } catch (error) {
      logger.debug('Prisma findExistingApplication failed, using memory store');
      return memoryDb.findExistingSponsorshipApplication(opportunity_id, sponsor_org_id);
    }
  }

  public async findApplicationsPaginated(options: {
    opportunity_id?: string;
    sponsor_org_id?: string;
    status?: SponsorshipStatus;
    page: number;
    limit: number;
  }) {
    const { opportunity_id, sponsor_org_id, status, page, limit } = options;
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (opportunity_id) where.opportunity_id = opportunity_id;
      if (sponsor_org_id) where.sponsor_org_id = sponsor_org_id;
      if (status) where.status = status as any;

      const [items, total] = await Promise.all([
        prisma.sponsorshipApplication.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            opportunity: {
              include: {
                event: {
                  include: {
                    organizer: true,
                  },
                },
              },
            },
            sponsor_org: true,
          },
        }),
        prisma.sponsorshipApplication.count({ where }),
      ]);

      return { items, total };
    } catch (error) {
      logger.debug('Prisma findApplicationsPaginated failed, using memory store');
      const res = memoryDb.findSponsorshipApplicationsPaginated({
        opportunity_id,
        sponsor_org_id,
        status,
        skip,
        take: limit,
      });

      const enriched = res.items.map((app) => {
        const opp = memoryDb.findSponsorshipOpportunityById(app.opportunity_id);
        const sponsorOrg = memoryDb.findOrganizationById(app.sponsor_org_id);
        const ev = opp ? memoryDb.findEventById(opp.event_id) : null;
        const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;

        return {
          ...app,
          opportunity: opp
            ? {
                ...opp,
                event: ev
                  ? {
                      ...ev,
                      organizer: org || undefined,
                    }
                  : undefined,
              }
            : undefined,
          sponsor_org: sponsorOrg || undefined,
        };
      });

      return { items: enriched, total: res.total };
    }
  }

  public async updateApplication(id: string, updates: Partial<DbSponsorshipApplication>) {
    try {
      return await prisma.sponsorshipApplication.update({
        where: { id },
        data: updates as any,
        include: {
          opportunity: {
            include: {
              event: {
                include: {
                  organizer: true,
                },
              },
            },
          },
          sponsor_org: true,
        },
      });
    } catch (error) {
      logger.debug('Prisma updateApplication failed, using memory store');
      const app = memoryDb.updateSponsorshipApplication(id, updates);
      if (!app) return null;

      const opp = memoryDb.findSponsorshipOpportunityById(app.opportunity_id);
      const sponsorOrg = memoryDb.findOrganizationById(app.sponsor_org_id);
      const ev = opp ? memoryDb.findEventById(opp.event_id) : null;
      const org = ev ? memoryDb.findOrganizationById(ev.organizer_org_id) : null;

      return {
        ...app,
        opportunity: opp
          ? {
              ...opp,
              event: ev
                ? {
                    ...ev,
                    organizer: org || undefined,
                  }
                : undefined,
            }
          : undefined,
        sponsor_org: sponsorOrg || undefined,
      };
    }
  }

  public async findEventById(id: string) {
    try {
      return await prisma.event.findUnique({
        where: { id },
        include: { organizer: true },
      });
    } catch (error) {
      logger.debug('Prisma findEventById failed, using memory store');
      const ev = memoryDb.findEventById(id);
      if (!ev) return null;
      const org = memoryDb.findOrganizationById(ev.organizer_org_id);
      return {
        ...ev,
        organizer: org || undefined,
      };
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
          metadata: data.metadata || null,
        },
      });
    } catch (error) {
      logger.debug('Prisma createAuditLog failed, using memory store');
      return memoryDb.createAuditLog(data);
    }
  }
}

export const sponsorshipRepository = new SponsorshipRepository();
