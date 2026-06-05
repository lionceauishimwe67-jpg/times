# Unified Smart School Bell System - Architecture Document

## Overview
This document describes the merged architecture combining "Smart Bell React" and "Time System" into a single, scalable application.

## System Architecture

### 1. Backend (Node.js + Express + SQLite)

**Single Backend Server** - Port 5000
- All time and timetable logic moved to backend
- Single source of truth for all scheduling
- Socket.io for real-time updates
- SQLite database with unified schema

#### Folder Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Database connection and helpers
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── timetableController.ts
│   │   ├── bellController.ts
│   │   ├── deviceController.ts
│   │   ├── notificationController.ts
│   │   └── announcementController.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── activityLogger.ts
│   ├── migrations/
│   │   └── unifiedSchema.sql    # Unified database schema
│   ├── routes/
│   │   ├── auth.ts              # /api/auth
│   │   ├── timetable.ts         # /api/timetable
│   │   ├── bell.ts              # /api/bell (NEW - merged from Smart Bell)
│   │   ├── devices.ts           # /api/devices (NEW - ESP32 integration)
│   │   ├── notifications.ts     # /api/notifications
│   │   ├── announcements.ts    # /api/announcements
│   │   ├── teachers.ts          # /api/teachers
│   │   └── display.ts           # /api/display
│   ├── schedulers/
│   │   ├── bellScheduler.ts     # NEW - Unified bell scheduler
│   │   ├── lessonStatusScheduler.ts
│   │   ├── notificationScheduler.ts
│   │   └── notificationTriggerScheduler.ts
│   ├── services/
│   │   ├── notificationService.ts
│   │   └── bellService.ts       # NEW - Bell control logic
│   ├── types/
│   │   └── index.ts
│   └── server.ts               # Main server entry point
├── uploads/                    # Static files
├── database.sqlite             # SQLite database
└── package.json
```

#### Consolidated API Routes

**Authentication**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password

**Timetable (Time System)**
- `GET /api/timetable/week` - Get weekly schedule
- `GET /api/timetable/today` - Get today's schedule
- `GET /api/timetable/current-sessions` - Get current active sessions
- `GET /api/timetable/entries` - Get all timetable entries
- `POST /api/timetable` - Create timetable entry
- `PUT /api/timetable/:id` - Update timetable entry
- `DELETE /api/timetable/:id` - Delete timetable entry
- `GET /api/timetable/reference-data` - Get classes, teachers, subjects

**Bell Control (Smart Bell React - Merged)**
- `POST /api/bell/ring-now` - Manual bell trigger (admin)
- `GET /api/bell/ring-now` - ESP32 polls for bell trigger
- `POST /api/bell/heartbeat` - ESP32 heartbeat
- `GET /api/bell/devices` - Get device status (admin)
- `GET /api/bell/current-session` - Get current session state
- `GET /api/bell/logs` - Get bell logs (admin)

**Devices (ESP32 Integration - NEW)**
- `GET /api/devices` - List all devices
- `POST /api/devices` - Register new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device

**Notifications**
- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/preferences` - Update preferences
- `POST /api/notifications/test` - Send test notification

**Announcements**
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement
- `POST /api/announcements/reorder` - Reorder announcements

**Teachers**
- `GET /api/teachers` - Get all teachers
- `POST /api/teachers` - Create teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

**Display**
- `GET /api/display/config/:displayId` - Get display config
- `POST /api/display/config/:displayId` - Save display config
- `GET /api/display/configs` - Get all display configs

### 2. Frontend (React)

**Single React Application** - Port 3000
- Display only - no time logic
- Fetches all data from backend APIs
- Socket.io client for real-time updates

#### Folder Structure
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── Timetable/
│   │   │   ├── TimetableGrid.tsx
│   │   │   ├── TimetableCell.tsx
│   │   │   └── TimetableLegend.tsx
│   │   ├── Bell/
│   │   │   ├── BellControl.tsx      # NEW - Manual bell trigger
│   │   │   ├── DeviceStatus.tsx     # NEW - ESP32 status
│   │   │   └── BellLogs.tsx         # NEW - Bell history
│   │   └── Common/
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── SocketContext.tsx       # NEW - Socket.io context
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTimetable.ts
│   │   └── useCurrentSession.ts     # NEW - Real-time session hook
│   ├── pages/
│   │   ├── Admin/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── FullTimetableView.tsx
│   │   │   ├── BellControl.tsx      # NEW - Bell management
│   │   │   ├── DeviceManagement.tsx # NEW - ESP32 management
│   │   │   └── TeacherManagement.tsx
│   │   ├── Display/
│   │   │   └── Display.tsx          # Public display view
│   │   ├── Teacher/
│   │   │   └── TeacherDashboard.tsx
│   │   ├── Login.tsx
│   │   └── App.tsx
│   ├── services/
│   │   └── api.ts                  # API client with axios
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── helpers.ts
│   ├── App.tsx
│   └── index.tsx
└── package.json
```

### 3. Database Schema (Unified SQLite)

**Tables:**
- `users` - Admin authentication
- `teachers` - Teacher information
- `classes` - Class/grade information
- `subjects` - Subject information
- `classrooms` - Classroom locations
- `timetable` - Schedule entries (merged from both systems)
- `special_days` - Holidays and special events
- `bell_logs` - Bell trigger history (NEW from Smart Bell)
- `devices` - ESP32 and bell devices (NEW from Smart Bell)
- `device_heartbeats` - Device status tracking (NEW)
- `teacher_checkins` - Teacher attendance
- `notifications` - Notification system
- `notification_preferences` - User notification settings
- `announcements` - Display announcements
- `display_configs` - Display configurations
- `system_state` - System state for bell triggering (NEW)

See `backend/src/migrations/unifiedSchema.sql` for complete schema.

### 4. Backend Scheduler Service

**Bell Scheduler** (`bellScheduler.ts`)
- Runs every 10 seconds
- Determines current session based on time
- Checks for session transitions (lesson → break → lesson)
- Triggers bell automatically at correct times
- Handles special days (holidays, events)
- Updates system state
- Broadcasts via Socket.io

**Lesson Status Scheduler** (existing)
- Runs every minute
- Updates lesson status (scheduled, active, completed, no_teacher)
- Tracks teacher check-ins
- Notifies managers of absent teachers

**Notification Scheduler** (existing)
- Sends advance notifications to teachers
- Handles notification preferences

### 5. Real-Time Features (Socket.io)

**Events Emitted by Backend:**
- `current-session` - Current session update
- `countdown` - Countdown to session end
- `bell-triggered` - Bell was triggered
- `lesson-status-change` - Lesson status changed
- `device-status-change` - Device status update

**Events Listened by Backend:**
- `join-manager-room` - Admin joins manager room
- `join-display-room` - Display joins display room

### 6. ESP32 Integration

**ESP32 Communication:**
- **Heartbeat**: `POST /api/bell/heartbeat` every 30 seconds
- **Bell Poll**: `GET /api/bell/ring-now` every 5 seconds
- **Device ID**: Unique identifier stored in devices table
- **Status Tracking**: Last seen timestamp, online/offline status

**Backend to ESP32:**
- Bell trigger flag in system_state table
- ESP32 polls and consumes flag
- Backend logs all bell triggers

### 7. Conflict Prevention

**No Duplicate Routes:**
- All routes consolidated under `/api/` prefix
- Smart Bell routes moved to `/api/bell/`
- Device routes at `/api/devices/`
- No overlapping endpoints

**Single Port:**
- Backend runs on port 5000 only
- Frontend runs on port 3000 only
- No multiple servers for same service

**Backend as Source of Truth:**
- All time logic in backend schedulers
- Frontend only displays data from APIs
- No frontend time calculations
- System state stored in database

**No Duplicate State:**
- Single system_state table
- Single current session tracking
- Single bell trigger mechanism
- Unified device management

### 8. Migration Steps

1. **Database Migration**
   - Run `unifiedSchema.sql` to create unified tables
   - Migrate existing timetable data
   - Migrate existing teachers
   - Migrate existing announcements

2. **Backend Integration**
   - Add bell scheduler to server.ts
   - Add bell routes
   - Add device routes
   - Update existing schedulers if needed

3. **Frontend Updates**
   - Add Socket.io client
   - Add bell control components
   - Add device management components
   - Update Display page to use backend time logic
   - Remove frontend time calculations

4. **ESP32 Updates**
   - Update ESP32 firmware to use new endpoints
   - Change base URL to port 5000
   - Update heartbeat endpoint
   - Update bell poll endpoint

### 9. Security Considerations

- Admin-only routes protected with `requireAuth` middleware
- ESP32 endpoints use device_id for identification
- No authentication required for ESP32 (device-based)
- CORS configured for frontend origin
- Helmet.js for security headers
- Rate limiting on sensitive endpoints

### 10. Scalability

**Horizontal Scaling:**
- Socket.io can be scaled with Redis adapter
- Database can be migrated to MySQL/PostgreSQL
- Stateless API design

**Future Features:**
- Mobile app support (same APIs)
- Multiple bell zones
- Custom bell sounds
- Parent notifications
- Student attendance tracking

## Summary

The merged system provides:
- ✅ Single backend with unified scheduling
- ✅ Single frontend with display-only logic
- ✅ Automatic bell triggering based on timetable
- ✅ Real-time updates via Socket.io
- ✅ ESP32 integration for physical bells
- ✅ No duplicate logic or conflicts
- ✅ Clean separation of concerns
- ✅ Scalable architecture
