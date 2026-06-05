import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { timetableApi, announcementApi } from '../../services/api';
import { fileKindFromAnnouncement, hasAnnouncementAttachment } from '../../utils/announcementFiles';
import { usePolling } from '../../hooks/usePolling';
import { useSocket } from '../../context/SocketContext';
import { useBellSound } from '../../hooks/useBellSound';
import { Announcement, Language } from '../../types';
import './Display.css';

interface DisplayProps {
  language?: Language;
  rotationSpeed?: number;
}

interface ClassStatus {
  class_id: number;
  class_name: string;
  level: string;
  is_active: boolean;
  subject_name: string | null;
  teacher_name: string | null;
  classroom_name: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface PeriodInfo {
  label: string;
  type: string;
  start: string;
  end: string;
}

interface ClassesResponseMeta {
  current_period: PeriodInfo | null;
  next_period: PeriodInfo | null;
  is_break_or_lunch: boolean;
}

const Display: React.FC<DisplayProps> = ({
  language = 'en',
  rotationSpeed = 5000,
}) => {
  const { bellTriggered, bellData, joinDisplayRoom, announcementUpdated, timetableUpdated } = useSocket();
  const { playBellSound } = useBellSound();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcementRefreshKey, setAnnouncementRefreshKey] = useState(0);
  const [classesRefreshKey, setClassesRefreshKey] = useState(0);
  const [periodMeta, setPeriodMeta] = useState<ClassesResponseMeta | null>(null);

  useEffect(() => {
    joinDisplayRoom();
  }, [joinDisplayRoom]);

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAllClasses = useCallback(async () => {
    const response = await timetableApi.getAllClassesStatus();
    setPeriodMeta(response.data.meta);
    return response.data.data;
  }, [classesRefreshKey]);

  const {
    data: allClasses,
    loading: classesLoading,
    error: classesError,
    lastUpdated,
  } = usePolling<ClassStatus[]>({
    fetchFn: fetchAllClasses,
    interval: 5000,
  });

  const fetchAnnouncements = useCallback(async () => {
    const response = await announcementApi.getAll();
    return response.data.data || response.data;
  }, [announcementRefreshKey]);

  const { data: announcements } = usePolling<Announcement[]>({
    fetchFn: fetchAnnouncements,
    interval: 60000,
  });

  useEffect(() => {
    if (announcementUpdated > 0) {
      setAnnouncementRefreshKey(prev => prev + 1);
      setCurrentSlide(0);
    }
  }, [announcementUpdated]);

  useEffect(() => {
    if (timetableUpdated > 0) {
      setClassesRefreshKey(prev => prev + 1);
    }
  }, [timetableUpdated]);

  useEffect(() => {
    if (bellTriggered) playBellSound();
  }, [bellTriggered, playBellSound]);

  const photoAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter(a => hasAnnouncementAttachment(a) && !a.title?.toLowerCase().includes('logo'));
  }, [announcements]);

  const logoAnnouncement = useMemo(() => {
    if (!announcements) return null;
    return announcements.find(a => hasAnnouncementAttachment(a) && a.title?.toLowerCase().includes('logo'));
  }, [announcements]);

  const logoImageUrl = useMemo(() => {
    if (logoAnnouncement) {
      return logoAnnouncement.image_url || logoAnnouncement.image_data || logoAnnouncement.image_path || null;
    }
    // Fallback: try direct file from uploads
    return `${window.location.origin}/uploads/announcements/logo1.jpg`;
  }, [logoAnnouncement]);

  const textAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter(a => !hasAnnouncementAttachment(a));
  }, [announcements]);

  const totalAnnouncements = useMemo(() =>
    (photoAnnouncements?.length || 0) + (textAnnouncements?.length || 0),
    [photoAnnouncements, textAnnouncements]
  );

  useEffect(() => {
    if (totalAnnouncements <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalAnnouncements);
    }, rotationSpeed);
    return () => clearInterval(timer);
  }, [totalAnnouncements, rotationSpeed]);

  const formatTime = useMemo(() =>
    currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    [currentTime]);

  const formatDate = useMemo(() =>
    currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    [currentTime]);

  const getTimeRemainingUntil = (endTime: string): string => {
    const [hours, minutes] = endTime.split(':').map(Number);
    const end = new Date();
    end.setHours(hours, minutes, 0, 0);
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return '0:00';
    const totalSeconds = Math.floor(diff / 1000);
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = (startTime: string, endTime: string): number => {
    const now = new Date();
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(); start.setHours(sh, sm, 0, 0);
    const end = new Date(); end.setHours(eh, em, 0, 0);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getSubjectColor = (subjectName: string): string => {
    const colors = ['#1976d2', '#e91e63', '#9c27b0', '#673ab7', '#009688', '#4caf50', '#ff9800', '#ff5722', '#795548', '#607d8b'];
    const hash = subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const connectionStatus = classesError ? 'error' : 'connected';

  const activeClasses = useMemo(() => {
    if (!allClasses) return [];
    return allClasses.filter(cls => cls.class_name !== 'L3nit' && cls.is_active && cls.subject_name);
  }, [allClasses]);

  const hasActiveLessons = activeClasses.length > 0;
  const currentPeriod = periodMeta?.current_period;
  const isBreakOrLunch = periodMeta?.is_break_or_lunch;

  const getPeriodIcon = (type: string) => {
    switch (type) {
      case 'break': return '☕';
      case 'lunch': return '🍽️';
      case 'assembly': return '📢';
      default: return '📖';
    }
  };

  const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;

  const bibleVerses = [
    `"Uwiteka ni we mugizo wanjye, nta kintu nzabura" - Zaburi 23:1`,
    `"Imana ni urukundo" - 1 Yohana 4:8`,
    `"Nshobora byose muri Kristu unkomeza" - Abafilipi 4:13`,
    `"Uwiteka arakurinda mu nzira zawe zose" - Zaburi 121:7`,
    `"Ntiwitegere ubwenge bwawe, ahubwo utegere Uwiteka" - Imigani 3:5`,
    `"Ariko abitegere Uwiteka bazahuza ingufu" - Yesaya 40:31`,
    `"Mungere zose, kuko we arinda mitego yanyu" - 1 Petero 5:7`,
    `"Uwiteka aragukiza mu kaga" - Zaburi 34:7`,
    `"Nkundane kuko Imana yabakunze" - 1 Yohana 4:19`,
    `"Mubane n'abantu mu mahoro" - Abanyaroma 12:18`,
    `"Inezagitaka iragwa ariko ijambo ry'Imana rihoraho" - Yesaya 40:8`,
    `"Urukundo ntirugera gushira" - 1 Abakorinto 13:8`,
    `"Mukozwe umukwezo mwishimye kuko Uwiteka ari mwiza" - Zaburi 100:5`,
    `"Imana ikurinde mu rugendo rwawe" - Zaburi 121:8`,
    `"Mukore ibintu byose mu rukundo" - 1 Abakorinto 16:14`,
  ];
  const verseIndex = currentTime.getDate() % bibleVerses.length;
  const weekendVerse = bibleVerses[verseIndex];

  const weekendContent = isWeekend ? (
    <div className="weekend-fullscreen">
      <div className="weekend-emoji">🎉</div>
      <h1 className="weekend-title">{currentTime.getDay() === 6 ? 'Enjoy Your Weekend' : 'Sunday'}</h1>
      <div className="weekend-verse">{weekendVerse}</div>
      <div className="weekend-date">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  ) : null;

  if (classesLoading && !allClasses) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="display-container">
      {bellTriggered && (
        <div className="bell-notification-overlay">
          <div className="bell-notification-content">
            <div className="bell-icon">🔔</div>
            <h2 className="bell-title">BELL RINGING</h2>
            <p className="bell-reason">{bellData?.reason || 'Manual trigger'}</p>
            <div className="bell-pulse"></div>
          </div>
        </div>
      )}

      <div className="display-main display-main-grid">
        {/* Header */}
        <div className="display-header">
          <div className="display-header-left">
            {logoImageUrl && (
              <img className="display-logo" src={logoImageUrl} alt="School Logo" />
            )}
            <div className="display-title-section">
              <h1 className="display-title">
                LYCEE SAINT ALEXANDRE SAULI DE MUHURA
              </h1>
              <span className="display-subtitle">Timetable</span>
            </div>
          </div>
          <div className="display-header-center">
            <div className="display-date">{formatDate}</div>
            <div className="display-time">{formatTime}</div>
          </div>
          <div className="display-header-right">
            <a href="/admin" className="admin-link">Admin</a>
          </div>
        </div>

        {/* Main Content */}
        <div className="display-content-area">
          {/* Class Grid / Activity Display */}
          <div className="display-timetable">
            <div className="class-grid-wrapper">
              {isWeekend ? weekendContent : (
                isBreakOrLunch && currentPeriod && !hasActiveLessons ? (
                  <div className="activity-fullscreen">
                    <div className="activity-icon">{getPeriodIcon(currentPeriod.type)}</div>
                    <div className="activity-label">{currentPeriod.label}</div>
                    <div className="activity-time">{currentPeriod.start} - {currentPeriod.end}</div>
                    <div className="activity-eta">
                      {currentPeriod.type === 'lunch' ? '🍽️ Lunch Time' :
                       currentPeriod.type === 'break' ? '☕ Break Time' :
                       currentPeriod.type === 'assembly' ? '📢 Assembly' :
                       currentPeriod.type === 'etude' ? '📖 Étude / Study Hall' : '⏸️ Break'}
                    </div>
                  </div>
                ) : (
                <>
                <div className="live-highlight-title">
                  {isBreakOrLunch ? `${getPeriodIcon(currentPeriod?.type || '')} ${currentPeriod?.label || ''}` : '📚 Class Schedule'}
                </div>
                <div className="class-grid">
                  {allClasses?.filter(cls => cls.class_name !== 'L3nit').map((cls) => {
                    const isActive = cls.is_active && cls.subject_name;
                    const subjectColor = isActive ? getSubjectColor(cls.subject_name!) : '#94a3b8';
                    const progress = isActive && cls.start_time && cls.end_time
                      ? getProgressPercent(cls.start_time, cls.end_time) : 0;
                    const timeRemaining = isActive && cls.end_time ? getTimeRemainingUntil(cls.end_time) : '';

                    return (
                      <div
                        key={cls.class_id}
                        className={`class-card ${isActive ? 'class-card-active' : 'class-card-inactive'}`}
                        style={isActive ? { borderColor: subjectColor } : {}}
                      >
                        <div className="class-card-header">
                          <span className="class-card-name">{cls.class_name}</span>
                          {isActive && <span className="class-card-live">LIVE</span>}
                          {isBreakOrLunch && currentPeriod && (
                            <span className="class-card-live" style={{ background: currentPeriod.type === 'lunch' ? '#f59e0b' : '#3b82f6' }}>
                              {getPeriodIcon(currentPeriod.type)}
                            </span>
                          )}
                        </div>
                        <div className="class-card-body">
                          {isActive ? (
                            <>
                              <div className="class-card-subject" style={{ color: subjectColor }}>
                                <span className="subject-icon">📖</span>
                                {cls.subject_name}
                              </div>
                              {cls.teacher_name && (
                                <div className="class-card-teacher">
                                  <span className="teacher-icon">👤</span>
                                  {cls.teacher_name}
                                </div>
                              )}
                              {cls.classroom_name && (
                                <div className="class-card-classroom">
                                  <span className="classroom-icon">📍</span>
                                  {cls.classroom_name}
                                </div>
                              )}
                              <div className="class-card-time-row">
                                <span className="class-card-time">
                                  <span className="time-icon">🕐</span>
                                  {cls.start_time} – {cls.end_time}
                                </span>
                                <span className="class-card-remaining" style={{ color: subjectColor }}>
                                  {timeRemaining}
                                </span>
                              </div>
                              <div className="class-card-progress">
                                <div className="class-card-progress-bar" style={{ width: `${progress}%`, backgroundColor: subjectColor }} />
                              </div>
                            </>
                          ) : isBreakOrLunch && currentPeriod ? (
                            <div className="class-card-break">
                              <div className="break-icon-lg">{getPeriodIcon(currentPeriod.type)}</div>
                              <div className="break-label">{currentPeriod.label}</div>
                              <div className="break-time">{currentPeriod.start} - {currentPeriod.end}</div>
                            </div>
                          ) : (
                            <div className="class-card-empty">
                              <span className="empty-icon">📋</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
                )
              )}
            </div>
          </div>

          {/* Announcements Panel - Right Side */}
          <div className="display-announcements">
            <div className="announcements-header">
              <h2 className="announcements-title">Announcements</h2>
            </div>
            {totalAnnouncements === 0 ? (
              <div className="announcement-empty-state">
                <div className="announcement-empty-icon">📢</div>
                <p className="announcement-empty-text">No announcements</p>
              </div>
            ) : (
              <div className="unified-slideshow">
                <div className="slideshow-progress">
                  {Array.from({ length: totalAnnouncements }).map((_, idx) => (
                    <span key={idx} className={`progress-dot ${idx === currentSlide % totalAnnouncements ? 'active' : ''}`} />
                  ))}
                </div>
                {[...photoAnnouncements, ...textAnnouncements].map((announcement, index) => {
                  const isActive = index === currentSlide % totalAnnouncements;
                  const hasAttachment = hasAnnouncementAttachment(announcement);
                  const fileKind = fileKindFromAnnouncement(announcement);
                  const fileUrl = announcement.image_url || announcement.image_path || '';

                  return (
                    <div key={announcement.id} className={`unified-announcement-slide ${isActive ? 'active' : ''}`}>
                      <div className={`unified-card ${hasAttachment ? 'has-image' : 'text-only'}`}>
                        {hasAttachment && fileKind === 'pdf' && fileUrl && (
                          <div className="unified-card-image unified-card-pdf">
                            <iframe title={announcement.title} src={fileUrl} className="announcement-pdf-frame" />
                          </div>
                        )}
                        {hasAttachment && fileKind === 'image' && fileUrl && (
                          <div className="unified-card-image">
                            <img src={fileUrl} alt={announcement.title || 'Announcement'}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                        )}
                        {hasAttachment && fileKind === 'document' && fileUrl && (
                          <div className="unified-card-document">
                            <span className="document-icon">📄</span>
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="document-link">Download document</a>
                          </div>
                        )}
                        <div className={`unified-card-text ${hasAttachment ? 'with-image' : 'standalone'}`}>
                          <h3 className="unified-card-title">{announcement.title}</h3>
                          {announcement.text_content && <p className="unified-card-body">{announcement.text_content}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span>{connectionStatus === 'connected' ? 'Live' : 'Connection Error'}</span>
          {hasActiveLessons && <span className="active-count-badge">{activeClasses.length} active</span>}
          {isBreakOrLunch && currentPeriod && <span className="active-count-badge" style={{ background: '#3b82f6' }}>{currentPeriod.label}</span>}
        </div>
        <div>
          Last updated: {lastUpdated?.toLocaleTimeString() || '--'}
        </div>
      </div>
    </div>
  );
};

export default Display;
