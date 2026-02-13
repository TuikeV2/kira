-- Migration: Add ban fields to users table
-- Run this SQL to add the ban functionality

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason VARCHAR(255) DEFAULT NULL;

-- Create index for faster queries on banned users
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);
