-- Notifications, durable delivery queue, support and knowledge base.
-- This migration intentionally does not alter existing learning or billing data.

CREATE TYPE "NotificationType" AS ENUM ('WELCOME', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'PROFILE_UPDATED', 'COURSE_STARTED', 'LESSON_AVAILABLE', 'LESSON_COMPLETED', 'HOMEWORK_ASSIGNED', 'HOMEWORK_DEADLINE', 'HOMEWORK_COMPLETED', 'COURSE_COMPLETED', 'CERTIFICATE_AVAILABLE', 'DAILY_LEARNING_REMINDER', 'DAILY_GOAL_COMPLETED', 'STREAK_AT_RISK', 'STREAK_UPDATED', 'STREAK_LOST', 'STREAK_FREEZE_USED', 'VOCABULARY_REVIEW_DUE', 'VOCABULARY_SESSION_COMPLETED', 'DIFFICULT_WORDS_READY', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'COINS_RECEIVED', 'XP_RECEIVED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELING', 'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_PAST_DUE', 'TRIAL_ENDING', 'REFUND_SUCCEEDED', 'REFUND_FAILED', 'COURSE_ACCESS_GRANTED', 'COURSE_ACCESS_REVOKED', 'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_REPLIED', 'SUPPORT_TICKET_STATUS_CHANGED', 'SUPPORT_TICKET_RESOLVED', 'SUPPORT_TICKET_REOPENED', 'SYSTEM_ANNOUNCEMENT', 'SECURITY_ALERT', 'ADMIN_MESSAGE');
CREATE TYPE "NotificationCategory" AS ENUM ('ACCOUNT', 'SECURITY', 'LEARNING', 'VOCABULARY', 'MOTIVATION', 'BILLING', 'SUPPORT', 'MARKETING', 'SYSTEM');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'ACTIVE', 'READ', 'ARCHIVED', 'EXPIRED', 'CANCELED');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WEB_PUSH');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'CANCELED', 'SKIPPED');
CREATE TYPE "NotificationEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');
CREATE TYPE "EmailSuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE', 'MANUAL');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SupportMessageKind" AS ENUM ('USER_MESSAGE', 'AGENT_REPLY', 'INTERNAL_NOTE', 'SYSTEM');
CREATE TYPE "HelpArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "UserNotificationSettings" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'en', "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true, "emailEnabled" BOOLEAN NOT NULL DEFAULT true, "webPushEnabled" BOOLEAN NOT NULL DEFAULT false,
  "learningEnabled" BOOLEAN NOT NULL DEFAULT true, "vocabularyEnabled" BOOLEAN NOT NULL DEFAULT true, "motivationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "billingEnabled" BOOLEAN NOT NULL DEFAULT true, "supportEnabled" BOOLEAN NOT NULL DEFAULT true, "marketingEnabled" BOOLEAN NOT NULL DEFAULT false,
  "systemEnabled" BOOLEAN NOT NULL DEFAULT true, "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false, "quietHoursStart" TEXT, "quietHoursEnd" TEXT,
  "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false, "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT false, "dailyReminderTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotificationPreference" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "notificationType" "NotificationType" NOT NULL, "channel" "NotificationChannel" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationEvent" (
  "id" TEXT NOT NULL, "type" "NotificationType" NOT NULL, "userId" TEXT NOT NULL, "entityType" TEXT, "entityId" TEXT, "payload" JSONB,
  "idempotencyKey" TEXT NOT NULL, "status" "NotificationEventStatus" NOT NULL DEFAULT 'RECEIVED', "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3), "errorMessage" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "eventId" TEXT, "userId" TEXT NOT NULL, "type" "NotificationType" NOT NULL, "category" "NotificationCategory" NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL', "title" TEXT NOT NULL, "message" TEXT NOT NULL, "actionUrl" TEXT, "actionLabel" TEXT,
  "imageUrl" TEXT, "payload" JSONB, "status" "NotificationStatus" NOT NULL DEFAULT 'ACTIVE', "readAt" TIMESTAMP(3), "seenAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL, "notificationId" TEXT NOT NULL, "userId" TEXT NOT NULL, "channel" "NotificationChannel" NOT NULL, "provider" TEXT,
  "providerMessageId" TEXT, "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sentAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "openedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3), "failureCode" TEXT, "failureMessage" TEXT, "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "channel" "NotificationChannel" NOT NULL, "locale" TEXT NOT NULL, "subject" TEXT,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "htmlBody" TEXT, "actionLabel" TEXT, "defaultActionUrl" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "endpoint" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL, "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailSuppression" (
  "id" TEXT NOT NULL, "emailHash" TEXT NOT NULL, "reason" "EmailSuppressionReason" NOT NULL, "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTeam" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTeamMember" (
  "id" TEXT NOT NULL, "teamId" TEXT NOT NULL, "userId" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportCategory" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "defaultTeamId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportSlaPolicy" (
  "id" TEXT NOT NULL, "categoryId" TEXT, "priority" "SupportTicketPriority" NOT NULL, "firstResponseMinutes" INTEGER NOT NULL,
  "resolutionMinutes" INTEGER NOT NULL, "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportSlaPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL, "number" TEXT NOT NULL, "userId" TEXT NOT NULL, "categoryId" TEXT, "assignedToId" TEXT, "assignedTeamId" TEXT,
  "subject" TEXT NOT NULL, "description" TEXT NOT NULL, "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN', "relatedOrderId" TEXT, "firstResponseAt" TIMESTAMP(3), "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3), "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT NOT NULL, "kind" "SupportMessageKind" NOT NULL DEFAULT 'USER_MESSAGE',
  "body" TEXT NOT NULL, "isInternal" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportAttachment" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "messageId" TEXT, "uploadedById" TEXT NOT NULL, "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "storageKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketStatusHistory" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "from" "SupportTicketStatus", "to" "SupportTicketStatus" NOT NULL, "actorId" TEXT,
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SupportTicketStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportRating" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "userId" TEXT NOT NULL, "rating" INTEGER NOT NULL, "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SupportRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HelpCategory" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HelpCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HelpArticle" (
  "id" TEXT NOT NULL, "categoryId" TEXT, "authorId" TEXT, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "summary" TEXT, "content" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en', "status" "HelpArticleStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HelpArticleFeedback" (
  "id" TEXT NOT NULL, "articleId" TEXT NOT NULL, "userId" TEXT, "helpful" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "HelpArticleFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemAnnouncement" (
  "id" TEXT NOT NULL, "authorId" TEXT NOT NULL, "title" TEXT NOT NULL, "message" TEXT NOT NULL, "actionUrl" TEXT, "audience" JSONB,
  "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT', "scheduledAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");
CREATE INDEX "UserNotificationPreference_userId_notificationType_idx" ON "UserNotificationPreference"("userId", "notificationType");
CREATE UNIQUE INDEX "UserNotificationPreference_userId_notificationType_channel_key" ON "UserNotificationPreference"("userId", "notificationType", "channel");
CREATE UNIQUE INDEX "NotificationEvent_idempotencyKey_key" ON "NotificationEvent"("idempotencyKey");
CREATE INDEX "NotificationEvent_status_createdAt_idx" ON "NotificationEvent"("status", "createdAt");
CREATE INDEX "NotificationEvent_userId_createdAt_idx" ON "NotificationEvent"("userId", "createdAt");
CREATE UNIQUE INDEX "Notification_eventId_key" ON "Notification"("eventId");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");
CREATE INDEX "Notification_expiresAt_idx" ON "Notification"("expiresAt");
CREATE UNIQUE INDEX "NotificationDelivery_idempotencyKey_key" ON "NotificationDelivery"("idempotencyKey");
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");
CREATE INDEX "NotificationDelivery_status_scheduledAt_idx" ON "NotificationDelivery"("status", "scheduledAt");
CREATE INDEX "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");
CREATE INDEX "NotificationTemplate_code_channel_locale_idx" ON "NotificationTemplate"("code", "channel", "locale");
CREATE UNIQUE INDEX "NotificationTemplate_code_channel_locale_key" ON "NotificationTemplate"("code", "channel", "locale");
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");
CREATE UNIQUE INDEX "EmailSuppression_emailHash_key" ON "EmailSuppression"("emailHash");
CREATE UNIQUE INDEX "SupportTeam_slug_key" ON "SupportTeam"("slug");
CREATE INDEX "SupportTeamMember_userId_isActive_idx" ON "SupportTeamMember"("userId", "isActive");
CREATE UNIQUE INDEX "SupportTeamMember_teamId_userId_key" ON "SupportTeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "SupportCategory_slug_key" ON "SupportCategory"("slug");
CREATE UNIQUE INDEX "SupportSlaPolicy_categoryId_priority_key" ON "SupportSlaPolicy"("categoryId", "priority");
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_priority_idx" ON "SupportTicket"("status", "priority");
CREATE INDEX "SupportTicket_assignedToId_status_idx" ON "SupportTicket"("assignedToId", "status");
CREATE INDEX "SupportTicket_assignedTeamId_status_idx" ON "SupportTicket"("assignedTeamId", "status");
CREATE INDEX "SupportTicket_lastMessageAt_idx" ON "SupportTicket"("lastMessageAt");
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE UNIQUE INDEX "SupportAttachment_storageKey_key" ON "SupportAttachment"("storageKey");
CREATE INDEX "SupportAttachment_ticketId_idx" ON "SupportAttachment"("ticketId");
CREATE INDEX "SupportTicketStatusHistory_ticketId_createdAt_idx" ON "SupportTicketStatusHistory"("ticketId", "createdAt");
CREATE UNIQUE INDEX "SupportRating_ticketId_key" ON "SupportRating"("ticketId");
CREATE INDEX "SupportRating_userId_createdAt_idx" ON "SupportRating"("userId", "createdAt");
CREATE UNIQUE INDEX "HelpCategory_slug_key" ON "HelpCategory"("slug");
CREATE UNIQUE INDEX "HelpArticle_slug_key" ON "HelpArticle"("slug");
CREATE INDEX "HelpArticle_status_locale_publishedAt_idx" ON "HelpArticle"("status", "locale", "publishedAt");
CREATE INDEX "HelpArticle_categoryId_status_idx" ON "HelpArticle"("categoryId", "status");
CREATE UNIQUE INDEX "HelpArticleFeedback_articleId_userId_key" ON "HelpArticleFeedback"("articleId", "userId");
CREATE INDEX "SystemAnnouncement_status_scheduledAt_idx" ON "SystemAnnouncement"("status", "scheduledAt");

ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "NotificationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTeamMember" ADD CONSTRAINT "SupportTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportCategory" ADD CONSTRAINT "SupportCategory_defaultTeamId_fkey" FOREIGN KEY ("defaultTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportSlaPolicy" ADD CONSTRAINT "SupportSlaPolicy_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SupportCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SupportCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "SupportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportAttachment" ADD CONSTRAINT "SupportAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketStatusHistory" ADD CONSTRAINT "SupportTicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketStatusHistory" ADD CONSTRAINT "SupportTicketStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportRating" ADD CONSTRAINT "SupportRating_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportRating" ADD CONSTRAINT "SupportRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpArticle" ADD CONSTRAINT "HelpArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpArticleFeedback" ADD CONSTRAINT "HelpArticleFeedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "HelpArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemAnnouncement" ADD CONSTRAINT "SystemAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
