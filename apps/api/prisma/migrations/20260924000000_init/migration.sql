-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('attendee', 'organizer', 'community_admin', 'sponsor', 'venue_owner', 'platform_admin');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('community', 'company', 'university', 'ngo');

-- CreateEnum
CREATE TYPE "OrgMemberRole" AS ENUM ('member', 'moderator', 'admin', 'owner');

-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('tech', 'design', 'business', 'science', 'social', 'other');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('registered', 'checked_in', 'attended');

-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('outreach', 'sponsorship', 'venue', 'speaker', 'media', 'technical', 'general');

-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('proposed', 'countered', 'accepted', 'rejected');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('pending', 'approved', 'rejected', 'needs_info');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('potential', 'contacted', 'interested', 'negotiation', 'confirmed', 'completed');

-- CreateEnum
CREATE TYPE "VenueRequestStatus" AS ENUM ('requested', 'accepted', 'rejected', 'countered');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "org_id" UUID,
    "role_type" "RoleType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_in_org" "OrgMemberRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_followers" (
    "id" UUID NOT NULL,
    "community_org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "followed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organizer_org_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "format" "EventFormat" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticket_code" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'registered',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in_at" TIMESTAMP(3),

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "verification_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborations" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "requesting_org_id" UUID NOT NULL,
    "target_org_id" UUID NOT NULL,
    "collab_type" "CollaborationType" NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_messages" (
    "id" UUID NOT NULL,
    "collaboration_id" UUID NOT NULL,
    "sender_org_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_counterproposal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_requests" (
    "id" UUID NOT NULL,
    "requesting_org_id" UUID NOT NULL,
    "target_community_org_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL,
    "requested_recipient_count" INTEGER NOT NULL,
    "message_subject" TEXT NOT NULL,
    "message_body" TEXT NOT NULL,
    "status" "OutreachStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_campaigns" (
    "id" UUID NOT NULL,
    "outreach_request_id" UUID NOT NULL,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "opened_count" INTEGER NOT NULL DEFAULT 0,
    "clicked_count" INTEGER NOT NULL DEFAULT 0,
    "registrations_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_opportunities" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "needs" JSONB NOT NULL,
    "budget_range" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_applications" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "sponsor_org_id" UUID NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'potential',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "owner_org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "facilities" JSONB NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_requests" (
    "id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "requesting_org_id" UUID NOT NULL,
    "status" "VenueRequestStatus" NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "roles_user_id_idx" ON "roles"("user_id");
CREATE INDEX "roles_org_id_idx" ON "roles"("org_id");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_org_id_idx" ON "organization_members"("org_id");
CREATE UNIQUE INDEX "organization_members_org_id_user_id_key" ON "organization_members"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "community_followers_user_id_idx" ON "community_followers"("user_id");
CREATE INDEX "community_followers_community_org_id_idx" ON "community_followers"("community_org_id");
CREATE UNIQUE INDEX "community_followers_community_org_id_user_id_key" ON "community_followers"("community_org_id", "user_id");

-- CreateIndex
CREATE INDEX "events_organizer_org_id_idx" ON "events"("organizer_org_id");
CREATE INDEX "events_category_idx" ON "events"("category");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_start_date_idx" ON "events"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_ticket_code_key" ON "event_registrations"("ticket_code");
CREATE INDEX "event_registrations_user_id_idx" ON "event_registrations"("user_id");
CREATE INDEX "event_registrations_event_id_idx" ON "event_registrations"("event_id");
CREATE UNIQUE INDEX "event_registrations_event_id_user_id_key" ON "event_registrations"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_registration_id_key" ON "certificates"("registration_id");
CREATE UNIQUE INDEX "certificates_verification_id_key" ON "certificates"("verification_id");
CREATE INDEX "certificates_verification_id_idx" ON "certificates"("verification_id");

-- CreateIndex
CREATE INDEX "collaborations_event_id_idx" ON "collaborations"("event_id");
CREATE INDEX "collaborations_requesting_org_id_idx" ON "collaborations"("requesting_org_id");
CREATE INDEX "collaborations_target_org_id_idx" ON "collaborations"("target_org_id");

-- CreateIndex
CREATE INDEX "collaboration_messages_collaboration_id_idx" ON "collaboration_messages"("collaboration_id");

-- CreateIndex
CREATE INDEX "outreach_requests_requesting_org_id_idx" ON "outreach_requests"("requesting_org_id");
CREATE INDEX "outreach_requests_target_community_org_id_idx" ON "outreach_requests"("target_community_org_id");
CREATE INDEX "outreach_requests_event_id_idx" ON "outreach_requests"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "outreach_campaigns_outreach_request_id_key" ON "outreach_campaigns"("outreach_request_id");

-- CreateIndex
CREATE INDEX "sponsorship_opportunities_event_id_idx" ON "sponsorship_opportunities"("event_id");

-- CreateIndex
CREATE INDEX "sponsorship_applications_opportunity_id_idx" ON "sponsorship_applications"("opportunity_id");
CREATE INDEX "sponsorship_applications_sponsor_org_id_idx" ON "sponsorship_applications"("sponsor_org_id");

-- CreateIndex
CREATE INDEX "venues_owner_org_id_idx" ON "venues"("owner_org_id");
CREATE INDEX "venues_city_idx" ON "venues"("city");

-- CreateIndex
CREATE INDEX "venue_requests_venue_id_idx" ON "venue_requests"("venue_id");
CREATE INDEX "venue_requests_event_id_idx" ON "venue_requests"("event_id");
CREATE INDEX "venue_requests_requesting_org_id_idx" ON "venue_requests"("requesting_org_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_followers" ADD CONSTRAINT "community_followers_community_org_id_fkey" FOREIGN KEY ("community_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_followers" ADD CONSTRAINT "community_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_org_id_fkey" FOREIGN KEY ("organizer_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_requesting_org_id_fkey" FOREIGN KEY ("requesting_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_target_org_id_fkey" FOREIGN KEY ("target_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_collaboration_id_fkey" FOREIGN KEY ("collaboration_id") REFERENCES "collaborations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_sender_org_id_fkey" FOREIGN KEY ("sender_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_requests" ADD CONSTRAINT "outreach_requests_requesting_org_id_fkey" FOREIGN KEY ("requesting_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_requests" ADD CONSTRAINT "outreach_requests_target_community_org_id_fkey" FOREIGN KEY ("target_community_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_requests" ADD CONSTRAINT "outreach_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_requests" ADD CONSTRAINT "outreach_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "outreach_campaigns_outreach_request_id_fkey" FOREIGN KEY ("outreach_request_id") REFERENCES "outreach_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_opportunities" ADD CONSTRAINT "sponsorship_opportunities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_applications" ADD CONSTRAINT "sponsorship_applications_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "sponsorship_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsorship_applications" ADD CONSTRAINT "sponsorship_applications_sponsor_org_id_fkey" FOREIGN KEY ("sponsor_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_requests" ADD CONSTRAINT "venue_requests_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_requests" ADD CONSTRAINT "venue_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_requests" ADD CONSTRAINT "venue_requests_requesting_org_id_fkey" FOREIGN KEY ("requesting_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
