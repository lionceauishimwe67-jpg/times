import React, { useState, useEffect } from 'react';
import { timetableApi } from '../../services/api';
import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from '../../services/network';
import './ManagerDashboard.css';

interface TimetableEntry {
  id: number;
  class_name: string;
  subject_name: string;
  teacher_name: string;
  classroom_name: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_active: boolean;
}

const ManagerDashboard: React.FC = () => {
  const [currentLesson, setCurrentLesson] = useState<TimetableEntry | null>(null);
  const [upcomingLessons, setUpcomingLessons] = useState<TimetableEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<'active' | 'delayed' | 'no_teacher'>('active');
  const [countdown, setCountdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchCurrentLesson();
    fetchUpcomingLessons();
    startCountdown();

    const interval = setInterval(() => {
      fetchCurrentLesson();
      fetchUpcomingLessons();
      startCountdown();
    }, 60000);

    // Connect to Socket.IO
    const socketInstance = io(API_ORIGIN);
    setSocket(socketInstance);

    socketInstance.emit('join-manager-room');

    socketInstance.on('notification', (notification: any) => {
      setNotifications(prev => [notification, ...prev]);
    });

    socketInstance.on('lesson-status-change', (data: any) => {
      fetchCurrentLesson();
      fetchUpcomingLessons();
    });

    socketInstance.on('teacher-checkin', (data: any) => {
      console.log('Teacher checked in:', data);
    });

    socketInstance.on('teacher-checkout', (data: any) => {
      console.log('Teacher checked out:', data);
    });

    return () => {
      clearInterval(interval);
      socketInstance.disconnect();
    };
  }, []);

  const fetchCurrentLesson = async () => {
    try {
      const response = await timetableApi.getAll();
      const entries = response.data.data || [];
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const current = entries.find((entry: TimetableEntry) => {
        const [startHours, startMinutes] = entry.start_time.split(':').map(Number);
        const [endHours, endMinutes] = entry.end_time.split(':').map(Number);
        const startTime = startHours * 60 + startMinutes;
        const endTime = endHours * 60 + endMinutes;

        return entry.day_of_week === currentDay && 
               entry.is_active && 
               currentTime >= startTime && 
               currentTime < endTime;
      });

      setCurrentLesson(current || null);
      
      if (current) {
        setSystemStatus('active');
      } else {
        setSystemStatus('no_teacher');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching current lesson:', error);
      setLoading(false);
    }
  };

  const fetchUpcomingLessons = async () => {
    try {
      const response = await timetableApi.getAll();
      const entries = response.data.data || [];
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const upcoming = entries
        .filter((entry: TimetableEntry) => {
          const [startHours, startMinutes] = entry.start_time.split(':').map(Number);
          const startTime = startHours * 60 + startMinutes;
          return entry.day_of_week === currentDay && 
                 entry.is_active && 
                 startTime > currentTime;
        })
        .slice(0, 5);

      setUpcomingLessons(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming lessons:', error);
    }
  };

  const startCountdown = () => {
    if (!currentLesson) {
      setCountdown('');
      return;
    }

    const now = new Date();
    const [endHours, endMinutes] = currentLesson.end_time.split(':').map(Number);
    const endTime = new Date();
    endTime.setHours(endHours, endMinutes, 0, 0);

    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) {
      setCountdown('Lesson ended');
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setCountdown(`${hours}h ${minutes}m ${seconds}s`);
  };

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      startCountdown();
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [currentLesson]);

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'active': return '#10b981';
      case 'delayed': return '#f59e0b';
      case 'no_teacher': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'active': return 'System Active';
      case 'delayed': return 'Lesson Delayed';
      case 'no_teacher': return 'No Teacher Present';
      default: return 'Unknown';
    }
  };

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <h1>Manager Dashboard</h1>
        <div className="system-status" style={{ backgroundColor: getStatusColor() }}>
          {getStatusText()}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="dashboard-content">
          <div className="section current-lesson">
            <h2>Current Lesson</h2>
            {currentLesson ? (
              <div className="lesson-card active">
                <div className="lesson-info">
                  <h3>{currentLesson.subject_name}</h3>
                  <p>Class: {currentLesson.class_name}</p>
                  <p>Teacher: {currentLesson.teacher_name}</p>
                  <p>Classroom: {currentLesson.classroom_name}</p>
                  <p>Time: {currentLesson.start_time} - {currentLesson.end_time}</p>
                </div>
                <div className="countdown">
                  <p>Time Remaining:</p>
                  <div className="countdown-timer">{countdown}</div>
                </div>
              </div>
            ) : (
              <div className="no-lesson">
                <p>No active lesson at this time</p>
              </div>
            )}
          </div>

          <div className="section upcoming-lessons">
            <h2>Upcoming Lessons</h2>
            {upcomingLessons.length > 0 ? (
              <div className="lessons-list">
                {upcomingLessons.map((lesson) => (
                  <div key={lesson.id} className="lesson-card">
                    <h3>{lesson.subject_name}</h3>
                    <p>Class: {lesson.class_name}</p>
                    <p>Teacher: {lesson.teacher_name}</p>
                    <p>Classroom: {lesson.classroom_name}</p>
                    <p>Time: {lesson.start_time} - {lesson.end_time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-lesson">
                <p>No upcoming lessons today</p>
              </div>
            )}
          </div>

          <div className="section notifications">
            <h2>Notifications</h2>
            {notifications.length > 0 ? (
              <div className="notifications-list">
                {notifications.map((notification, index) => (
                  <div key={index} className="notification-card">
                    <h3>{notification.title}</h3>
                    <p>{notification.body}</p>
                    <p className="timestamp">{new Date().toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-lesson">
                <p>No new notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
