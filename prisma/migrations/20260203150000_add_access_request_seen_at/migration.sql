-- Add seenAt field to access_requests table
-- This tracks when a user has acknowledged seeing a rejection
ALTER TABLE "access_requests" ADD COLUMN "seenAt" TIMESTAMP(3);
