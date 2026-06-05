import React, { useState, useEffect } from 'react';
import { dynamicEventsApi } from '../../services/api';
import { timetableApi } from '../../services/api';
import './DynamicEventCreator.css';

interface DynamicEvent {
  id: number;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  affected_classes: number[] | null;
  location: string;
  notify_teachers: boolean;
  notify_students: boolean;
  status: string;
  created_by_name: string;
  created_at: string;
}

interface Class {
  id: number;
  name: string;
}

const DynamicEventCreator: React.FC = () => {
  const [events, setEvents] = useState<DynamicEvent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DynamicEvent | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'assembly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    affected_classes: [] as number[],
    location: '',
    notify_teachers: true,
    notify_students: false
  });

  useEffect(() => {
    loadEvents();
    loadClasses();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await dynamicEventsApi.getAll();
      setEvents(response.data.events.map((e: any) => ({
        ...e,
        affected_classes: e.affected_classes ? JSON.parse(e.affected_classes) : null
      })));
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await timetableApi.getReferenceData();
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const handleEdit = (event: DynamicEvent) => {
    setEditing(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date,
      start_time: event.start_time,
      end_time: event.end_time,
      affected_classes: event.affected_classes || [],
      location: event.location,
      notify_teachers: event.notify_teachers,
      notify_students: event.notify_students
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await dynamicEventsApi.delete(id);
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    
    try {
      await dynamicEventsApi.cancel(id);
      loadEvents();
    } catch (error) {
      console.error('Failed to cancel event:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editing) {
        await dynamicEventsApi.update(editing.id, formData);
      } else {
        await dynamicEventsApi.create(formData);
      }
      setShowForm(false);
      setEditing(null);
      setFormData({
        title: '',
        description: '',
        event_type: 'assembly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        affected_classes: [],
        location: '',
        notify_teachers: true,
        notify_students: false
      });
      loadEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const toggleClass = (classId: number) => {
    setFormData(prev => ({
      ...prev,
      affected_classes: prev.affected_classes.includes(classId)
        ? prev.affected_classes.filter(id => id !== classId)
        : [...prev.affected_classes, classId]
    }));
  };

  const selectAllClasses = () => {
    setFormData(prev => ({
      ...prev,
      affected_classes: classes.map(c => c.id)
    }));
  };

  const clearAllClasses = () => {
    setFormData(prev => ({
      ...prev,
      affected_classes: []
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'assembly': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-yellow-100 text-yellow-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'special': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="loading-state">Loading events...</div>;
  }

  return (
    <div className="dynamic-event-creator">
      <div className="event-header">
        <h2>Dynamic Events</h2>
        <button
          onClick={() => {
            setEditing(null);
            setFormData({
              title: '',
              description: '',
              event_type: 'assembly',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
              start_time: '',
              end_time: '',
              affected_classes: [],
              location: '',
              notify_teachers: true,
              notify_students: false
            });
            setShowForm(true);
          }}
          className="add-event-btn"
        >
          + Quick Add Event
        </button>
      </div>

      {showForm && (
        <div className="event-form">
          <h3>{editing ? 'Edit Event' : 'Add New Event'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Event Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-control"
                placeholder="e.g., Emergency Assembly, Staff Meeting"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-control"
                rows={2}
                placeholder="Event details..."
              />
            </div>

            <div className="form-group">
              <label>Event Type</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="form-control"
              >
                <option value="assembly">Assembly</option>
                <option value="meeting">Meeting</option>
                <option value="emergency">Emergency</option>
                <option value="special">Special Event</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="form-control"
                placeholder="e.g., Main Hall, Classroom 101"
              />
            </div>

            <div className="form-group">
              <label>Affected Classes</label>
              <div className="class-selector">
                <div className="class-selector-header">
                  <div className="class-selector-actions">
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="btn-small btn-primary"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllClasses}
                      className="btn-small btn-secondary"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="class-selector-body">
                  {classes.length === 0 ? (
                    <p className="text-sm text-gray-500">No classes available</p>
                  ) : (
                    classes.map((cls) => (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleClass(cls.id)}
                        className={`class-btn ${formData.affected_classes.includes(cls.id) ? 'selected' : ''}`}
                      >
                        {cls.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
              {formData.affected_classes.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No classes selected = All classes affected</p>
              )}
            </div>

            <div className="notification-options">
              <div className="notification-option">
                <input
                  type="checkbox"
                  checked={formData.notify_teachers}
                  onChange={(e) => setFormData({ ...formData, notify_teachers: e.target.checked })}
                />
                <label>Notify Teachers</label>
              </div>
              <div className="notification-option">
                <input
                  type="checkbox"
                  checked={formData.notify_students}
                  onChange={(e) => setFormData({ ...formData, notify_students: e.target.checked })}
                />
                <label>Notify Students</label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editing ? 'Update' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        {events.length === 0 ? (
          <div className="empty-state">No dynamic events scheduled</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-card-header">
                <div className="event-card-content">
                  <div className="event-title-row">
                    <h3>{event.title}</h3>
                    <span className={`event-badge event-badge-${event.event_type}`}>
                      {event.event_type}
                    </span>
                    <span className={`event-badge event-status-${event.status}`}>
                      {event.status}
                    </span>
                  </div>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                  <div className="event-meta">
                    <span className="event-meta-item">📅 {event.start_date} - {event.end_date}</span>
                    <span className="event-meta-item">⏰ {event.start_time} - {event.end_time}</span>
                    {event.location && <span className="event-meta-item">📍 {event.location}</span>}
                  </div>
                  {event.affected_classes && event.affected_classes.length > 0 && (
                    <div className="event-classes">
                      {event.affected_classes.map((classId) => {
                        const cls = classes.find(c => c.id === classId);
                        return cls ? (
                          <span key={classId} className="event-class">
                            {cls.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <p className="event-footer">
                    Created by {event.created_by_name} • {new Date(event.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="event-card-actions">
                  <button
                    onClick={() => handleEdit(event)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  {event.status === 'scheduled' && (
                    <button
                      onClick={() => handleCancel(event.id)}
                      className="btn-cancel"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DynamicEventCreator;
