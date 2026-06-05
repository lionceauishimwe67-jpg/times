import React, { useState, useEffect } from 'react';
import { breakTimesApi } from '../../services/api';
import './BreakTimeEditor.css';

interface BreakTime {
  id: number;
  name: string;
  break_type: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
}

const BreakTimeEditor: React.FC = () => {
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BreakTime | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    break_type: 'morning',
    start_time: '',
    end_time: '',
    days_of_week: [1, 2, 3, 4, 5] as number[]
  });

  useEffect(() => {
    loadBreakTimes();
  }, []);

  const loadBreakTimes = async () => {
    try {
      const response = await breakTimesApi.getAll();
      setBreakTimes(response.data.breakTimes.map((bt: any) => ({
        ...bt,
        days_of_week: JSON.parse(bt.days_of_week)
      })));
    } catch (error) {
      console.error('Failed to load break times:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (breakTime: BreakTime) => {
    setEditing(breakTime);
    setFormData({
      name: breakTime.name,
      break_type: breakTime.break_type,
      start_time: breakTime.start_time,
      end_time: breakTime.end_time,
      days_of_week: breakTime.days_of_week
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this break time?')) return;
    
    try {
      await breakTimesApi.delete(id);
      loadBreakTimes();
    } catch (error) {
      console.error('Failed to delete break time:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editing) {
        await breakTimesApi.update(editing.id, formData);
      } else {
        await breakTimesApi.create(formData);
      }
      setShowForm(false);
      setEditing(null);
      setFormData({
        name: '',
        break_type: 'morning',
        start_time: '',
        end_time: '',
        days_of_week: [1, 2, 3, 4, 5]
      });
      loadBreakTimes();
    } catch (error) {
      console.error('Failed to save break time:', error);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return <div className="loading-state">Loading break times...</div>;
  }

  return (
    <div className="break-time-editor">
      <div className="break-time-header">
        <h2>Break Time Management</h2>
        <button
          onClick={() => {
            setEditing(null);
            setFormData({
              name: '',
              break_type: 'morning',
              start_time: '',
              end_time: '',
              days_of_week: [1, 2, 3, 4, 5]
            });
            setShowForm(true);
          }}
          className="add-break-btn"
        >
          + Add Break Time
        </button>
      </div>

      {showForm && (
        <div className="break-time-form">
          <h3>{editing ? 'Edit Break Time' : 'Add New Break Time'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-control"
                required
              />
            </div>

            <div className="form-group">
              <label>Break Type</label>
              <select
                value={formData.break_type}
                onChange={(e) => setFormData({ ...formData, break_type: e.target.value })}
                className="form-control"
              >
                <option value="morning">Morning Break</option>
                <option value="lunch">Lunch Break</option>
                <option value="afternoon">Afternoon Break</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
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
              <label>Days of Week</label>
              <div className="days-selector">
                {dayNames.map((name, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`day-btn ${formData.days_of_week.includes(index) ? 'selected' : ''}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editing ? 'Update' : 'Create'}
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
        {breakTimes.map((breakTime) => (
          <div key={breakTime.id} className="break-time-card">
            <div className="break-time-card-header">
              <div className="break-time-info">
                <h3>{breakTime.name}</h3>
                <p className="break-time-type">{breakTime.break_type} Break</p>
                <p className="break-time-time">
                  {breakTime.start_time} - {breakTime.end_time}
                </p>
                <div className="break-time-days">
                  {breakTime.days_of_week.map((day) => (
                    <span key={day} className="break-time-day">
                      {dayNames[day]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="break-time-actions">
                <button
                  onClick={() => handleEdit(breakTime)}
                  className="btn-edit"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(breakTime.id)}
                  className="btn-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreakTimeEditor;
