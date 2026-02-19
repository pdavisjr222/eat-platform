-- Migration: Add sync metadata and new tables for offline-first functionality
-- Date: 2026-01-08
-- Description: Adds sync metadata to all tables, creates vendor referrals, video calls, and sync infrastructure

BEGIN TRANSACTION;

-- Add sync metadata columns to all existing tables
-- Users table
ALTER TABLE users ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE users ADD COLUMN last_synced_at INTEGER;
ALTER TABLE users ADD COLUMN device_id TEXT;
ALTER TABLE users ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN deleted_at INTEGER;

-- Member profiles
ALTER TABLE member_profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE member_profiles ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE member_profiles ADD COLUMN last_synced_at INTEGER;
ALTER TABLE member_profiles ADD COLUMN device_id TEXT;
ALTER TABLE member_profiles ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE member_profiles ADD COLUMN deleted_at INTEGER;

-- Listings
ALTER TABLE listings ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE listings ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE listings ADD COLUMN last_synced_at INTEGER;
ALTER TABLE listings ADD COLUMN device_id TEXT;
ALTER TABLE listings ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN deleted_at INTEGER;

-- Vendors
ALTER TABLE vendors ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vendors ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE vendors ADD COLUMN last_synced_at INTEGER;
ALTER TABLE vendors ADD COLUMN device_id TEXT;
ALTER TABLE vendors ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN deleted_at INTEGER;

-- Coupons
ALTER TABLE coupons ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE coupons ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE coupons ADD COLUMN last_synced_at INTEGER;
ALTER TABLE coupons ADD COLUMN device_id TEXT;
ALTER TABLE coupons ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupons ADD COLUMN deleted_at INTEGER;

-- Foraging spots
ALTER TABLE foraging_spots ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE foraging_spots ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE foraging_spots ADD COLUMN last_synced_at INTEGER;
ALTER TABLE foraging_spots ADD COLUMN device_id TEXT;
ALTER TABLE foraging_spots ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE foraging_spots ADD COLUMN deleted_at INTEGER;

-- Garden clubs
ALTER TABLE garden_clubs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE garden_clubs ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE garden_clubs ADD COLUMN last_synced_at INTEGER;
ALTER TABLE garden_clubs ADD COLUMN device_id TEXT;
ALTER TABLE garden_clubs ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE garden_clubs ADD COLUMN deleted_at INTEGER;

-- Seed banks
ALTER TABLE seed_banks ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE seed_banks ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE seed_banks ADD COLUMN last_synced_at INTEGER;
ALTER TABLE seed_banks ADD COLUMN device_id TEXT;
ALTER TABLE seed_banks ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE seed_banks ADD COLUMN deleted_at INTEGER;

-- Resource hubs
ALTER TABLE resource_hubs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE resource_hubs ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE resource_hubs ADD COLUMN last_synced_at INTEGER;
ALTER TABLE resource_hubs ADD COLUMN device_id TEXT;
ALTER TABLE resource_hubs ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE resource_hubs ADD COLUMN deleted_at INTEGER;

-- Events
ALTER TABLE events ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE events ADD COLUMN last_synced_at INTEGER;
ALTER TABLE events ADD COLUMN device_id TEXT;
ALTER TABLE events ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN deleted_at INTEGER;

-- Event registrations
ALTER TABLE event_registrations ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE event_registrations ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE event_registrations ADD COLUMN last_synced_at INTEGER;
ALTER TABLE event_registrations ADD COLUMN device_id TEXT;
ALTER TABLE event_registrations ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_registrations ADD COLUMN deleted_at INTEGER;

-- Training modules
ALTER TABLE training_modules ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE training_modules ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE training_modules ADD COLUMN last_synced_at INTEGER;
ALTER TABLE training_modules ADD COLUMN device_id TEXT;
ALTER TABLE training_modules ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE training_modules ADD COLUMN deleted_at INTEGER;

-- User training progress
ALTER TABLE user_training_progress ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user_training_progress ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE user_training_progress ADD COLUMN last_synced_at INTEGER;
ALTER TABLE user_training_progress ADD COLUMN device_id TEXT;
ALTER TABLE user_training_progress ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_training_progress ADD COLUMN deleted_at INTEGER;

-- Meal plans
ALTER TABLE meal_plans ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE meal_plans ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE meal_plans ADD COLUMN last_synced_at INTEGER;
ALTER TABLE meal_plans ADD COLUMN device_id TEXT;
ALTER TABLE meal_plans ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE meal_plans ADD COLUMN deleted_at INTEGER;

-- Recipes
ALTER TABLE recipes ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE recipes ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE recipes ADD COLUMN last_synced_at INTEGER;
ALTER TABLE recipes ADD COLUMN device_id TEXT;
ALTER TABLE recipes ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE recipes ADD COLUMN deleted_at INTEGER;

-- Shopping lists
ALTER TABLE shopping_lists ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shopping_lists ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE shopping_lists ADD COLUMN last_synced_at INTEGER;
ALTER TABLE shopping_lists ADD COLUMN device_id TEXT;
ALTER TABLE shopping_lists ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shopping_lists ADD COLUMN deleted_at INTEGER;

-- Chat messages
ALTER TABLE chat_messages ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE chat_messages ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE chat_messages ADD COLUMN last_synced_at INTEGER;
ALTER TABLE chat_messages ADD COLUMN device_id TEXT;
ALTER TABLE chat_messages ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN deleted_at INTEGER;

-- Reviews
ALTER TABLE reviews ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE reviews ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE reviews ADD COLUMN last_synced_at INTEGER;
ALTER TABLE reviews ADD COLUMN device_id TEXT;
ALTER TABLE reviews ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reviews ADD COLUMN deleted_at INTEGER;

-- Job posts
ALTER TABLE job_posts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE job_posts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE job_posts ADD COLUMN last_synced_at INTEGER;
ALTER TABLE job_posts ADD COLUMN device_id TEXT;
ALTER TABLE job_posts ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE job_posts ADD COLUMN deleted_at INTEGER;

-- Job applications
ALTER TABLE job_applications ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE job_applications ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE job_applications ADD COLUMN last_synced_at INTEGER;
ALTER TABLE job_applications ADD COLUMN device_id TEXT;
ALTER TABLE job_applications ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE job_applications ADD COLUMN deleted_at INTEGER;

-- Credit transactions
ALTER TABLE credit_transactions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE credit_transactions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE credit_transactions ADD COLUMN last_synced_at INTEGER;
ALTER TABLE credit_transactions ADD COLUMN device_id TEXT;
ALTER TABLE credit_transactions ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE credit_transactions ADD COLUMN deleted_at INTEGER;
ALTER TABLE credit_transactions ADD COLUMN recurring_source_id TEXT;

-- Subscription plans
ALTER TABLE subscription_plans ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE subscription_plans ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE subscription_plans ADD COLUMN last_synced_at INTEGER;
ALTER TABLE subscription_plans ADD COLUMN device_id TEXT;
ALTER TABLE subscription_plans ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN deleted_at INTEGER;

-- Payments
ALTER TABLE payments ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payments ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE payments ADD COLUMN last_synced_at INTEGER;
ALTER TABLE payments ADD COLUMN device_id TEXT;
ALTER TABLE payments ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN deleted_at INTEGER;

-- Notifications
ALTER TABLE notifications ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notifications ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE notifications ADD COLUMN last_synced_at INTEGER;
ALTER TABLE notifications ADD COLUMN device_id TEXT;
ALTER TABLE notifications ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE notifications ADD COLUMN deleted_at INTEGER;

-- Audit logs
ALTER TABLE audit_logs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE audit_logs ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE audit_logs ADD COLUMN last_synced_at INTEGER;
ALTER TABLE audit_logs ADD COLUMN device_id TEXT;
ALTER TABLE audit_logs ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE audit_logs ADD COLUMN deleted_at INTEGER;

-- Create indexes for sync metadata
CREATE INDEX idx_users_sync ON users(sync_status, last_synced_at);
CREATE INDEX idx_listings_sync ON listings(sync_status, last_synced_at);
CREATE INDEX idx_messages_sync ON chat_messages(sync_status, last_synced_at);

-- Create sync infrastructure tables
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  data TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_registry (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_type TEXT NOT NULL,
  fcm_token TEXT,
  last_active_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conflict_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT,
  device_id TEXT,
  server_version INTEGER NOT NULL,
  client_version INTEGER NOT NULL,
  server_data TEXT,
  client_data TEXT,
  resolution TEXT,
  resolved_by TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create vendor referral table
CREATE TABLE IF NOT EXISTS vendor_referrals (
  id TEXT PRIMARY KEY,
  referrer_vendor_id TEXT NOT NULL,
  referred_vendor_id TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  conversion_date INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  total_earnings REAL NOT NULL DEFAULT 0,
  recurring_commission_rate REAL NOT NULL DEFAULT 2.0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at INTEGER,
  device_id TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  FOREIGN KEY (referrer_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Create video call tables
CREATE TABLE IF NOT EXISTS video_calls (
  id TEXT PRIMARY KEY,
  call_type TEXT NOT NULL,
  host_user_id TEXT NOT NULL,
  channel_name TEXT NOT NULL UNIQUE,
  agora_token TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  started_at INTEGER,
  ended_at INTEGER,
  duration INTEGER,
  recording_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at INTEGER,
  device_id TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_call_participants (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER,
  left_at INTEGER,
  is_muted INTEGER NOT NULL DEFAULT 0,
  is_video_on INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at INTEGER,
  device_id TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  FOREIGN KEY (call_id) REFERENCES video_calls(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for new tables
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id, status);
CREATE INDEX idx_sync_queue_device ON sync_queue(device_id, status);
CREATE INDEX idx_device_registry_user ON device_registry(user_id);
CREATE INDEX idx_conflict_log_record ON conflict_log(table_name, record_id);
CREATE INDEX idx_vendor_referrals_referrer ON vendor_referrals(referrer_vendor_id);
CREATE INDEX idx_vendor_referrals_referred ON vendor_referrals(referred_vendor_id);
CREATE INDEX idx_video_calls_host ON video_calls(host_user_id, status);
CREATE INDEX idx_video_call_participants_call ON video_call_participants(call_id);
CREATE INDEX idx_video_call_participants_user ON video_call_participants(user_id);

COMMIT;
