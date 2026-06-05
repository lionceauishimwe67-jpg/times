# Global Time System Documentation

## Overview

The Global Time System ensures that the timetable system runs based on accurate, real-world time instead of relying on local machine time. This prevents inconsistencies across devices and environments, eliminates time drift, and provides reliable scheduling for bells and lessons.

## Architecture

### Components

1. **Global Time Service** (`backend/src/services/globalTimeService.ts`)
   - Singleton service that manages time synchronization
   - Fetches time from external API (WorldTimeAPI)
   - Caches time data with periodic sync
   - Provides fallback to server time if API fails

2. **Time Controller** (`backend/src/controllers/timeController.ts`)
   - Exposes API endpoints for time operations
   - Handles time sync requests
   - Provides time status information

3. **Time Routes** (`backend/src/routes/time.ts`)
   - Defines API endpoints:
     - `GET /api/time/current` - Get current global time
     - `GET /api/time/sync` - Force time synchronization
     - `GET /api/time/status` - Get time sync status

4. **Frontend Time API** (`frontend/src/services/timeApi.ts`)
   - Client-side service for fetching time from backend
   - Handles API errors gracefully
   - Provides fallback to local time if backend unavailable

5. **Bell Scheduler Integration** (`backend/src/schedulers/bellScheduler.ts`)
   - Updated to use global time service
   - All time calculations based on global time
   - Logs time source for monitoring

## Time Source

### Primary Source: WorldTimeAPI

- **Endpoint**: `http://worldtimeapi.org/api/timezone/Africa/Kigali`
- **Timezone**: Africa/Kigali (UTC+2, no DST)
- **Sync Interval**: 5 minutes
- **Timeout**: 5 seconds

### Fallback Mechanism

If the external API fails:
1. System falls back to server time
2. Logs warning for monitoring
3. Continues operation with server time
4. Retries API sync on next interval

### Drift Calculation

The system calculates the drift offset between API time and server time:
- Positive offset: Server is behind API
- Negative offset: Server is ahead of API
- Used for monitoring and debugging

## Timezone Management

### Fixed Timezone: Africa/Kigali

- **UTC Offset**: +02:00
- **Daylight Saving Time**: Not observed
- **Consistency**: All calculations use this timezone

### Timezone Handling

- All stored times are in Africa/Kigali timezone
- API returns time in ISO 8601 format
- Frontend displays time in local format based on timezone

## Backend Implementation

### Global Time Service

```typescript
// Get current time
const timeData = await globalTimeService.getCurrentTime();
// Returns: { current_time, timezone, source, last_sync, drift_offset }

// Force sync
const syncedData = await globalTimeService.forceSync();

// Get time data for API response
const data = globalTimeService.getTimeData();
```

### Scheduler Integration

```typescript
// In bell scheduler
const timeData = await globalTimeService.getCurrentTime();
const now = timeData.current_time;
// Use 'now' for all time calculations
```

### API Endpoints

#### Get Current Time
```
GET /api/time/current
Response:
{
  "success": true,
  "data": {
    "current_time": "2026-04-24T13:15:00.000Z",
    "timezone": "Africa/Kigali",
    "source": "api",
    "last_sync": "2026-04-24T13:10:00.000Z",
    "drift_offset": 125,
    "server_time": "2026-04-24T13:15:00.125Z"
  }
}
```

#### Sync Time
```
GET /api/time/sync
Response:
{
  "success": true,
  "data": {
    "current_time": "2026-04-24T13:15:00.000Z",
    "timezone": "Africa/Kigali",
    "source": "api",
    "last_sync": "2026-04-24T13:15:00.000Z",
    "drift_offset": 0
  },
  "message": "Time synced successfully"
}
```

#### Get Time Status
```
GET /api/time/status
Response:
{
  "success": true,
  "data": {
    "current_time": "2026-04-24T13:15:00.000Z",
    "timezone": "Africa/Kigali",
    "source": "api",
    "last_sync": "2026-04-24T13:10:00.000Z",
    "drift_offset": 125,
    "server_time": "2026-04-24T13:15:00.125Z",
    "sync_interval": 300000,
    "is_syncing": false
  }
}
```

## Frontend Implementation

### Time API Service

```typescript
import { timeApi } from '../../services/timeApi';

// Get current time
const timeData = await timeApi.getCurrentTime();
const currentTime = new Date(timeData.current_time);

// Sync time
const syncedData = await timeApi.syncTime();

// Get status
const status = await timeApi.getTimeStatus();
```

### Display Component Integration

```typescript
// Update time every second from backend
useEffect(() => {
  const updateTime = async () => {
    try {
      const timeData = await timeApi.getCurrentTime();
      setCurrentTime(new Date(timeData.current_time));
      setTimeSource(timeData.source);
    } catch (error) {
      console.error('Failed to fetch time, using local time:', error);
      setCurrentTime(new Date());
      setTimeSource('local');
    }
  };

  updateTime();
  const timer = setInterval(updateTime, 1000);
  return () => clearInterval(timer);
}, []);
```

## Performance & Caching

### Caching Strategy

- **Sync Interval**: 5 minutes
- **Cache Duration**: 5 minutes (between syncs)
- **Time Calculation**: Cached time + elapsed time since last sync

### Benefits

- Reduces API calls (every 5 seconds vs every 5 minutes)
- Improves performance
- Reduces load on external API
- Maintains accuracy through calculation

### Sync Behavior

- Initial sync on service startup
- Periodic sync every 5 minutes
- Manual sync available via API endpoint
- Logs sync status for monitoring

## Monitoring & Logging

### Log Messages

```
[GlobalTime] Synced with API: 2026-04-24T13:10:00.000Z, Drift: 125ms
[GlobalTime] API sync failed, using fallback
[Bell Scheduler] Processing at 13:15 (Day 5) - Source: api
```

### Monitoring Points

- Time source (api/fallback/local)
- Drift offset
- Last sync time
- Sync failures
- API response time

## Benefits

### Accuracy

- **Real-world time**: Uses trusted external API
- **Consistent timezone**: All devices use Africa/Kigali
- **No drift**: Periodic sync prevents time drift

### Reliability

- **Fallback mechanism**: Continues operation if API fails
- **Error handling**: Graceful degradation
- **Monitoring**: Logs for debugging

### Consistency

- **Single source of truth**: Backend controls all time
- **Device independence**: Works on any device
- **Environment independence**: Works in any environment

## Troubleshooting

### Time Not Updating

1. Check backend logs for sync errors
2. Verify API endpoint is accessible
3. Check network connectivity
4. Verify timezone settings

### High Drift Offset

1. Check server time accuracy
2. Verify system time synchronization
3. Check for time zone misconfiguration
4. Review drift offset logs

### API Failures

1. Check WorldTimeAPI status
2. Verify network connectivity
3. Check firewall/proxy settings
4. Review timeout configuration

## Configuration

### Environment Variables

```env
# Time sync interval (milliseconds)
TIME_SYNC_INTERVAL=300000

# API timeout (milliseconds)
TIME_API_TIMEOUT=5000

# Timezone
TIMEZONE=Africa/Kigali
```

### Service Configuration

```typescript
// In globalTimeService.ts
private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
private readonly TIMEZONE = 'Africa/Kigali';
```

## Security Considerations

- API calls use HTTPS where available
- Timeout prevents hanging requests
- Fallback ensures system availability
- No sensitive data transmitted

## Future Enhancements

1. **Multiple Time Sources**: Add backup time APIs
2. **NTP Integration**: Direct NTP protocol support
3. **Timezone Configuration**: Allow timezone changes
4. **Advanced Monitoring**: Metrics dashboard
5. **Alert System**: Notify on sync failures

## Summary

The Global Time System provides:
- ✅ Accurate real-world time from external API
- ✅ Fixed timezone (Africa/Kigali) for consistency
- ✅ Backend-controlled time calculations
- ✅ Frontend time fetching from backend
- ✅ Fallback mechanism for reliability
- ✅ Efficient caching and periodic sync
- ✅ Monitoring and logging for debugging
- ✅ Device and environment independence

This ensures the timetable system runs accurately and consistently across all devices and environments.
