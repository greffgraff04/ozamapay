-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('SUPER_ADMIN', 'COO', 'AGENT_MANAGER', 'GRAPHISTE', 'SUPPORT', 'CAMERAMAN', 'MODEL');

-- CreateEnum
CREATE TYPE "TeamChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT');

-- CreateEnum
CREATE TYPE "TeamTaskPriority" AS ENUM ('URGENT', 'NORMAL', 'BAS');

-- CreateEnum
CREATE TYPE "TeamTaskStatus" AS ENUM ('TODO', 'EN_COURS', 'REVIZYON', 'FINI');

-- CreateEnum
CREATE TYPE "TeamFileCategory" AS ENUM ('DESIGN', 'VIDEO', 'PHOTO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TeamReportType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TeamReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TeamAnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');

-- CreateEnum
CREATE TYPE "TeamCalendarEventType" AS ENUM ('MEETING', 'DEADLINE', 'LAUNCH', 'OTHER');

-- CreateEnum
CREATE TYPE "TeamNotificationType" AS ENUM ('MESSAGE', 'TASK', 'REPORT', 'ANNOUNCEMENT', 'CALENDAR', 'MEETING');

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "displayName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "TeamChannelType" NOT NULL DEFAULT 'PUBLIC',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "priority" "TeamTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TeamTaskStatus" NOT NULL DEFAULT 'TODO',
    "deadline" TIMESTAMP(3),
    "projectTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "category" "TeamFileCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "TeamReportType" NOT NULL,
    "status" "TeamReportStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TeamReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "priority" "TeamAnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "type" "TeamCalendarEventType" NOT NULL DEFAULT 'OTHER',
    "createdById" TEXT NOT NULL,
    "meetingUrl" TEXT,
    "isJitsiMeeting" BOOLEAN NOT NULL DEFAULT false,
    "jitsiRoomId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "TeamNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeamChannelMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_TeamCalendarEventAttendees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_email_key" ON "TeamInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_token_key" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_token_idx" ON "TeamInvitation"("token");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_idx" ON "TeamInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_role_idx" ON "TeamMember"("role");

-- CreateIndex
CREATE INDEX "TeamMember_isActive_idx" ON "TeamMember"("isActive");

-- CreateIndex
CREATE INDEX "TeamChannel_createdById_idx" ON "TeamChannel"("createdById");

-- CreateIndex
CREATE INDEX "TeamChannel_type_idx" ON "TeamChannel"("type");

-- CreateIndex
CREATE INDEX "TeamMessage_channelId_idx" ON "TeamMessage"("channelId");

-- CreateIndex
CREATE INDEX "TeamMessage_senderId_idx" ON "TeamMessage"("senderId");

-- CreateIndex
CREATE INDEX "TeamMessage_replyToId_idx" ON "TeamMessage"("replyToId");

-- CreateIndex
CREATE INDEX "TeamMessage_createdAt_idx" ON "TeamMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TeamTask_assignedToId_idx" ON "TeamTask"("assignedToId");

-- CreateIndex
CREATE INDEX "TeamTask_assignedById_idx" ON "TeamTask"("assignedById");

-- CreateIndex
CREATE INDEX "TeamTask_status_idx" ON "TeamTask"("status");

-- CreateIndex
CREATE INDEX "TeamTask_priority_idx" ON "TeamTask"("priority");

-- CreateIndex
CREATE INDEX "TeamTask_projectTag_idx" ON "TeamTask"("projectTag");

-- CreateIndex
CREATE INDEX "TeamTaskComment_taskId_idx" ON "TeamTaskComment"("taskId");

-- CreateIndex
CREATE INDEX "TeamTaskComment_authorId_idx" ON "TeamTaskComment"("authorId");

-- CreateIndex
CREATE INDEX "TeamFile_uploadedById_idx" ON "TeamFile"("uploadedById");

-- CreateIndex
CREATE INDEX "TeamFile_category_idx" ON "TeamFile"("category");

-- CreateIndex
CREATE INDEX "TeamFile_taskId_idx" ON "TeamFile"("taskId");

-- CreateIndex
CREATE INDEX "TeamReport_authorId_idx" ON "TeamReport"("authorId");

-- CreateIndex
CREATE INDEX "TeamReport_status_idx" ON "TeamReport"("status");

-- CreateIndex
CREATE INDEX "TeamReport_type_idx" ON "TeamReport"("type");

-- CreateIndex
CREATE INDEX "TeamAnnouncement_authorId_idx" ON "TeamAnnouncement"("authorId");

-- CreateIndex
CREATE INDEX "TeamAnnouncement_priority_idx" ON "TeamAnnouncement"("priority");

-- CreateIndex
CREATE INDEX "TeamCalendarEvent_createdById_idx" ON "TeamCalendarEvent"("createdById");

-- CreateIndex
CREATE INDEX "TeamCalendarEvent_type_idx" ON "TeamCalendarEvent"("type");

-- CreateIndex
CREATE INDEX "TeamCalendarEvent_startAt_idx" ON "TeamCalendarEvent"("startAt");

-- CreateIndex
CREATE INDEX "TeamNotification_recipientId_idx" ON "TeamNotification"("recipientId");

-- CreateIndex
CREATE INDEX "TeamNotification_isRead_idx" ON "TeamNotification"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "_TeamChannelMembers_AB_unique" ON "_TeamChannelMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_TeamChannelMembers_B_index" ON "_TeamChannelMembers"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TeamCalendarEventAttendees_AB_unique" ON "_TeamCalendarEventAttendees"("A", "B");

-- CreateIndex
CREATE INDEX "_TeamCalendarEventAttendees_B_index" ON "_TeamCalendarEventAttendees"("B");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChannel" ADD CONSTRAINT "TeamChannel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TeamChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "TeamMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTask" ADD CONSTRAINT "TeamTask_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskComment" ADD CONSTRAINT "TeamTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskComment" ADD CONSTRAINT "TeamTaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFile" ADD CONSTRAINT "TeamFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFile" ADD CONSTRAINT "TeamFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "TeamTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamReport" ADD CONSTRAINT "TeamReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnnouncement" ADD CONSTRAINT "TeamAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCalendarEvent" ADD CONSTRAINT "TeamCalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNotification" ADD CONSTRAINT "TeamNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamChannelMembers" ADD CONSTRAINT "_TeamChannelMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "TeamChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamChannelMembers" ADD CONSTRAINT "_TeamChannelMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamCalendarEventAttendees" ADD CONSTRAINT "_TeamCalendarEventAttendees_A_fkey" FOREIGN KEY ("A") REFERENCES "TeamCalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamCalendarEventAttendees" ADD CONSTRAINT "_TeamCalendarEventAttendees_B_fkey" FOREIGN KEY ("B") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

