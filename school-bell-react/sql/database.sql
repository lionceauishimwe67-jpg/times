-- School Bell System - MySQL schema
-- Run in phpMyAdmin (XAMPP) or: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS school_bell_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE school_bell_system;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  day_of_week TINYINT(1) NOT NULL UNIQUE,  -- 0=Mon..6=Sun
  is_enabled TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS special_days (
  id INT PRIMARY KEY AUTO_INCREMENT,
  calendar_date DATE NOT NULL UNIQUE,
  end_date DATE NULL,
  label VARCHAR(128) NOT NULL,
  is_enabled TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  schedule_id INT NULL,
  special_day_id INT NULL,
  ring_time TIME NOT NULL,
  end_time TIME NULL,
  label VARCHAR(128) NOT NULL,
  duration_seconds SMALLINT NOT NULL DEFAULT 5,
  should_ring TINYINT(1) DEFAULT 1,
  FOREIGN KEY (schedule_id) REFERENCES weekly_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (special_day_id) REFERENCES special_days(id) ON DELETE CASCADE
);

-- Seed: 7 weekday rows (0=Mon..6=Sun)
INSERT IGNORE INTO weekly_schedules (day_of_week, is_enabled) VALUES
  (0,1),(1,1),(2,1),(3,1),(4,1),(5,0),(6,0);

-- Seed admin user (username: admin, password: admin123)
-- bcrypt hash of "admin123" generated with Node bcryptjs
INSERT IGNORE INTO users (username, password_hash) VALUES
  ('admin', '$2a$10$Vbjw7K8hTjuTTWx0TJjdDepZOOTNiUS1ERDj0RlRCrY09Q2uY5C3a');
