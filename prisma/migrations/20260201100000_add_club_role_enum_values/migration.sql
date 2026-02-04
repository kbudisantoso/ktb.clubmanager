-- Migration: Add new ClubRole enum values
-- This must be committed before the values can be used

ALTER TYPE "ClubRole" ADD VALUE IF NOT EXISTS 'SECRETARY';
ALTER TYPE "ClubRole" ADD VALUE IF NOT EXISTS 'MEMBER';
