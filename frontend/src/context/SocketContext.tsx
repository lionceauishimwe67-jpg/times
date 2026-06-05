import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from '../services/network';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  currentSession: any;
  countdown: any;
  bellTriggered: boolean;
  bellData: any;
  announcementUpdated: number;
  timetableUpdated: number;
  dayEnded: any;
  dayReset: any;
  joinManagerRoom: () => void;
  joinDisplayRoom: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  currentSession: null,
  countdown: null,
  bellTriggered: false,
  bellData: null,
  announcementUpdated: 0,
  timetableUpdated: 0,
  dayEnded: null,
  dayReset: null,
  joinManagerRoom: () => {},
  joinDisplayRoom: () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [countdown, setCountdown] = useState<any>(null);
  const [bellTriggered, setBellTriggered] = useState(false);
  const [bellData, setBellData] = useState<any>(null);
  const [announcementUpdated, setAnnouncementUpdated] = useState(0);
  const [timetableUpdated, setTimetableUpdated] = useState(0);
  const [dayEnded, setDayEnded] = useState<any>(null);
  const [dayReset, setDayReset] = useState<any>(null);

  useEffect(() => {
    const socketInstance = io(API_ORIGIN, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
      timeout: 15000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      setConnected(false);
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[Socket] Cannot reach backend at',
          API_ORIGIN,
          '— start API with: cd backend && npm run dev',
          err.message
        );
      }
    });

    socketInstance.on('current-session', (session) => {
      setCurrentSession(session);
    });

    socketInstance.on('countdown', (data) => {
      setCountdown(data);
    });

    socketInstance.on('bell-triggered', (data) => {
      console.log('Bell triggered:', data);
      setBellTriggered(true);
      setBellData(data);
      // Auto-reset after 5 seconds
      setTimeout(() => {
        setBellTriggered(false);
        setBellData(null);
      }, 5000);
    });

    socketInstance.on('lesson-status-change', (data) => {
      console.log('Lesson status changed:', data);
      // Could update UI or send notification
    });

    socketInstance.on('device-status-change', (data) => {
      console.log('Device status changed:', data);
    });

    socketInstance.on('announcement-updated', (data) => {
      console.log('Announcement updated:', data);
      setAnnouncementUpdated(prev => prev + 1);
    });

    socketInstance.on('timetable-updated', (data) => {
      console.log('Timetable updated:', data);
      setTimetableUpdated(prev => prev + 1);
    });

    socketInstance.on('day-ended', (data) => {
      console.log('Day ended event received:', data);
      setDayEnded(data);
    });

    socketInstance.on('day-reset', (data) => {
      console.log('Day reset event received:', data);
      setDayReset(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinManagerRoom = () => {
    if (socket) {
      socket.emit('join-manager-room');
    }
  };

  const joinDisplayRoom = () => {
    if (socket) {
      socket.emit('join-display-room');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        currentSession,
        countdown,
        bellTriggered,
        bellData,
        announcementUpdated,
        timetableUpdated,
        dayEnded,
        dayReset,
        joinManagerRoom,
        joinDisplayRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
