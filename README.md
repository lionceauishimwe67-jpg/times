# School Digital Timetable Display System

A modern, real-time digital timetable display system designed for schools. Built with React + TypeScript frontend and Node.js + Express + MySQL backend.

## Features

### Core Features
- **🕐 Intelligent Schedule Display**: Automatically shows relevant schedule based on current time
  - Lunch Break (12:25 PM - 1:25 PM)
  - Afternoon Break (3:30 PM - 3:45 PM)
  - Day Ends (5:00 PM)
  - Etude Time (6:30 PM - 8:25 PM)
- **Live Timetable Display**: Shows current active sessions based on real-time with "NOW" indicator
- **Announcements Slideshow**: Auto-rotating images with smooth transitions
- **Real-Time Updates**: Polling every 5-10 seconds, no manual refresh needed
- **Role-Based Access**: Admin (Headteacher) with full CRUD, Display mode view-only
- **Temporary Sessions**: One-day override support for schedule changes

### Professional Features
- **🛡️ Error Boundaries**: Graceful error handling with user-friendly error pages
- **⏳ Skeleton Loading**: Professional loading states with shimmer effects
- **🔄 Auto-Retry Logic**: API requests automatically retry on network failures
- **📊 Professional Dashboard**: Modern admin dashboard with quick actions
- **🎨 Enhanced UI/UX**: Glowing effects, animations, and polished visual design
- **📱 Responsive Design**: Optimized for large displays and mobile devices
- **🔍 Request Tracking**: Debug-friendly request IDs for troubleshooting
- **⚡ Performance Optimized**: Efficient polling and data fetching

### Technical Features
- TypeScript for type safety
- High contrast UI for visibility across rooms
- Comprehensive error handling and network recovery
- Multi-language support (English, French, Swahili)
- Per-screen filtering capabilities
- Request/response interceptors with logging

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  Node.js Backend │────▶│   MySQL DB      │
│  (Display/App)  │◄────│    (Express)     │◄────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        ▲                                              ▲
        │                                              │
        └────────────── Raspberry Pi ──────────────────┘
                    (Chromium Kiosk Mode)
```

## Project Structure

```
school-timetable/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── timetableController.ts
│   │   │   └── announcementController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── upload.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── timetable.ts
│   │   │   ├── announcements.ts
│   │   │   └── display.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── scripts/
│   │   │   └── initDatabase.ts
│   │   └── server.ts
│   ├── uploads/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Display/
│   │   │   ├── Login/
│   │   │   └── Admin/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── schema.sql
│   └── sample_data.sql
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- MySQL (v8.0+)
- npm or yarn

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Configure environment variables in `.env`:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=school_timetable
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

4. **Initialize database:**
```bash
npm run init-db
```

5. **Start development server:**
```bash
npm run dev
```

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Start development server:**
```bash
npm start
```

## Raspberry Pi Setup

### Kiosk Mode Configuration

1. **Install Chromium:**
```bash
sudo apt update
sudo apt install chromium-browser
```

2. **Configure autostart:**
```bash
mkdir -p ~/.config/lxsession/LXDE-pi/
nano ~/.config/lxsession/LXDE-pi/autostart
```

3. **Add to autostart file:**
```
@chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=TranslateUI http://YOUR_SERVER_IP:3000/display
```

4. **Disable screen sleep:**
```bash
sudo nano /etc/lightdm/lightdm.conf
```

Add under `[Seat:*]`:
```
xserver-command=X -s 0 dpms
```

### Display Commands

**Basic kiosk mode:**
```bash
chromium-browser --kiosk http://<server-ip>:3000/display
```

**Full kiosk with error suppression:**
```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble --disable-features=TranslateUI --app=http://<server-ip>:3000/display
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/change-password` - Change password

### Timetable
- `GET /api/timetable/current-sessions` - Get current active sessions (public)
- `GET /api/timetable/entries` - Get all timetable entries (auth)
- `POST /api/timetable` - Create entry (admin)
- `PUT /api/timetable/:id` - Update entry (admin)
- `DELETE /api/timetable/:id` - Delete entry (admin)
- `GET /api/timetable/reference-data` - Get classes, teachers, etc.

### Announcements
- `GET /api/announcements` - Get active announcements (public)
- `GET /api/announcements/all` - Get all announcements (auth)
- `POST /api/announcements` - Create announcement (admin)
- `PUT /api/announcements/:id` - Update announcement (admin)
- `DELETE /api/announcements/:id` - Delete announcement (admin)

## Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

*Change immediately after first login!*

## System Workflow

1. **Admin** logs into the dashboard at `/admin`
2. **Admin** updates timetable or uploads announcements
3. **Backend** saves data to MySQL
4. **Display screens** (Raspberry Pi) poll the API every 5-10 seconds
5. **Screens** automatically update to show new data

## Database Schema

### Core Tables
- **classes** - Class information (L3 SWD, L5 CSA, etc.)
- **teachers** - Teacher profiles
- **classrooms** - Room information
- **subjects** - Subject list
- **timetable** - Schedule entries with temp override support
- **announcements** - Slideshow images
- **users** - Admin authentication

## Production Deployment

### Build Frontend
```bash
cd frontend
npm run build
```

### Production Backend
```bash
cd backend
npm run build
npm start
```

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=http://your-domain.com
JWT_SECRET=strong_random_secret
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify MySQL is running
   - Check credentials in `.env`
   - Ensure database exists: `npm run init-db`

2. **Frontend can't connect to backend**
   - Check `proxy` setting in `frontend/package.json`
   - Verify backend is running on port 5000
   - Check firewall settings

3. **Display not updating**
   - Verify network connectivity
   - Check browser console for errors
   - Ensure API is accessible from Raspberry Pi

## License

MIT License - See LICENSE file for details

## Support

For issues and feature requests, please contact the system administrator.
