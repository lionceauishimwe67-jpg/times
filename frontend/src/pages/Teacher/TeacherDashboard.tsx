import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { timetableApi, notificationApi } from '../../services/api';
import './TeacherDashboard.css';

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
  status: string;
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<TimetableEntry[]>([]);
  const [todayLessons, setTodayLessons] = useState<TimetableEntry[]>([]);
  const [checkedInLessons, setCheckedInLessons] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState<string>('');

  useEffect(() => {
    fetchLessons();
    const interval = setInterval(fetchLessons, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLessons = async () => {
    try {
      const response = await timetableApi.getAll();
      const entries = response.data.data || [];
      setLessons(entries);
      
      const now = new Date();
      const currentDay = now.getDay();
      
      const today = entries.filter((entry: TimetableEntry) => 
        entry.day_of_week === currentDay && entry.is_active
      );
      setTodayLessons(today);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLoading(false);
    }
  };

  const handleCheckIn = async (timetableId: number) => {
    try {
      const teacherId = 1; // This should come from auth context
      await fetch('/api/teacher-checkins/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, timetableId })
      });
      
      setCheckedInLessons(prev => new Set([...prev, timetableId]));
      alert('Checked in successfully');
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in');
    }
  };

  const handleCheckOut = async (timetableId: number) => {
    try {
      const teacherId = 1; // This should come from auth context
      await fetch('/api/teacher-checkins/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, timetableId })
      });
      
      setCheckedInLessons(prev => {
        const newSet = new Set(prev);
        newSet.delete(timetableId);
        return newSet;
      });
      alert('Checked out successfully');
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Failed to check out');
    }
  };

  const getTeacherId = (): number => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return u.teacherId || u.id || 1;
      }
    } catch {}
    return 1;
  };

  const handleTestPush = async () => {
    try {
      await notificationApi.sendTestNotification({ teacherId: getTeacherId(), via: 'push' });
      alert('✅ Test push notification yoherejwe!');
    } catch (err: any) {
      alert('❌ Yanze: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTestSMS = async () => {
    try {
      await notificationApi.sendTestNotification({ teacherId: getTeacherId(), via: 'sms' });
      alert('✅ Test SMS yoherejwe! Reba terefone yawe.');
    } catch (err: any) {
      alert('❌ Yanze: ' + (err.response?.data?.error || err.message));
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  const getLessonStatus = (lesson: TimetableEntry) => {
    const now = new Date();
    const [startHours, startMinutes] = lesson.start_time.split(':').map(Number);
    const [endHours, endMinutes] = lesson.end_time.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;
    const endTime = endHours * 60 + endMinutes;
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (currentTime < startTime) return 'upcoming';
    if (currentTime >= startTime && currentTime < endTime) return 'ongoing';
    return 'completed';
  };

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Teacher Dashboard</h1>
          <p className="teacher-name">{teacherName}</p>
        </div>
        <button 
          onClick={() => navigate('/teacher/announcements')} 
          className="announcements-btn"
        >
          📢 View Announcements
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="dashboard-content">
          <div className="section today-lessons">
            <h2>Today's Lessons</h2>
            {todayLessons.length > 0 ? (
              <div className="lessons-list">
                {todayLessons.map((lesson) => {
                  const status = getLessonStatus(lesson);
                  const isCheckedIn = checkedInLessons.has(lesson.id);
                  
                  return (
                    <div key={lesson.id} className={`lesson-card ${status}`}>
                      <div className="lesson-info">
                        <h3>{lesson.subject_name}</h3>
                        <p>Class: {lesson.class_name}</p>
                        <p>Classroom: {lesson.classroom_name}</p>
                        <p>Time: {lesson.start_time} - {lesson.end_time}</p>
                        <p className={`status ${status}`}>{status}</p>
                      </div>
                      <div className="lesson-actions">
                        {!isCheckedIn && status !== 'completed' && (
                          <button onClick={() => handleCheckIn(lesson.id)} className="checkin">
                            Check In
                          </button>
                        )}
                        {isCheckedIn && status !== 'completed' && (
                          <button onClick={() => handleCheckOut(lesson.id)} className="checkout">
                            Check Out
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-lessons">
                <p>No lessons scheduled for today</p>
              </div>
            )}
          </div>

          <div className="section all-lessons">
            <h2>All Scheduled Lessons</h2>
            <div className="lessons-list">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="lesson-card">
                  <h3>{lesson.subject_name}</h3>
                  <p>Class: {lesson.class_name}</p>
                  <p>Classroom: {lesson.classroom_name}</p>
                  <p>Day: {getDayName(lesson.day_of_week)}</p>
                  <p>Time: {lesson.start_time} - {lesson.end_time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="section test-notification">
            <h2>📡 Testing System</h2>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: '0.9rem' }}>
              Kanda hano kugirango ugere ko itumanaho rikora (SMS + Push)
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleTestPush} className="btn-test" style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                📲 Test Push Notification
              </button>
              <button onClick={handleTestSMS} className="btn-test" style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                💬 Test SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
