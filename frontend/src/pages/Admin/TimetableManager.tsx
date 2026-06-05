import React, { useState, useEffect } from 'react';
import { timetableApi } from '../../services/api';
import { TimetableEntry, ReferenceData, Class } from '../../types';
import './TimetableManager.css';

const TimetableManager: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    class_name: '',
    subject_name: '',
    teacher_name: '',
    classroom_name: '',
    start_time: '',
    end_time: '',
    day_of_week: 'Monday',
    is_temporary: false,
    temporary_date: '',
  });

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      setStatus('Loading timetable entries...');
      const [entriesRes, refRes] = await Promise.all([
        timetableApi.getAll(selectedClass ? { classId: Number(selectedClass) } : undefined),
        timetableApi.getReferenceData(),
      ]);

      setEntries(entriesRes.data.data || []);
      setReferenceData(refRes.data.data);
      setStatus('Timetable entries loaded successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      setStatus('Error loading timetable entries.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setFormData({
      class_name: '',
      subject_name: '',
      teacher_name: '',
      classroom_name: '',
      start_time: '',
      end_time: '',
      day_of_week: 'Monday',
      is_temporary: false,
      temporary_date: '',
    });
    setIsModalOpen(true);
    setStatus('Creating new timetable entry...');
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      class_name: entry.class_name,
      subject_name: entry.subject_name,
      teacher_name: entry.teacher_name,
      classroom_name: entry.classroom_name,
      start_time: entry.start_time,
      end_time: entry.end_time,
      day_of_week: daysOfWeek.find(d => d.value === entry.day_of_week)?.label || 'Monday',
      is_temporary: entry.is_temporary,
      temporary_date: entry.temporary_date || '',
    });
    setIsModalOpen(true);
    setStatus(`Editing ${entry.class_name} - ${entry.subject_name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dayValue = daysOfWeek.find(d => d.label === formData.day_of_week)?.value || 1;

    const data = {
      class_name: formData.class_name,
      subject_name: formData.subject_name,
      teacher_name: formData.teacher_name,
      classroom_name: formData.classroom_name,
      start_time: formData.start_time,
      end_time: formData.end_time,
      day_of_week: dayValue,
      is_temporary: formData.is_temporary,
      temporary_date: formData.is_temporary ? formData.temporary_date : null,
    };

    try {
      setStatus('Saving timetable entry...');
      if (editingEntry) {
        await timetableApi.update(editingEntry.id, data);
      } else {
        await timetableApi.create(data);
      }
      setStatus('Timetable entry saved successfully!');
      setFormData({
        class_name: '',
        subject_name: '',
        teacher_name: '',
        classroom_name: '',
        start_time: '',
        end_time: '',
        day_of_week: 'Monday',
        is_temporary: false,
        temporary_date: '',
      });
      setEditingEntry(null);
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setStatus('Timetable entries loaded successfully.'), 2000);
    } catch (err: any) {
      setStatus(`Error: ${err.response?.data?.error || 'Failed to save'}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      setStatus('Deleting timetable entry...');
      await timetableApi.delete(id);
      setStatus('Timetable entry deleted successfully.');
      loadData();
      if (editingEntry?.id === id) {
        setEditingEntry(null);
        setIsModalOpen(false);
      }
      setTimeout(() => setStatus('Timetable entries loaded successfully.'), 2000);
    } catch (err: any) {
      setStatus(`Error: ${err.response?.data?.error || 'Failed to delete'}`);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL timetable entries? This cannot be undone!')) return;
    if (!window.confirm('This will permanently delete every single entry. Are you absolutely sure?')) return;

    try {
      setLoading(true);
      setStatus('Deleting all timetable entries...');
      const res = await timetableApi.deleteAll();
      const count = res.data?.data?.deletedCount || res.data?.message || 'all';
      setStatus(`Successfully deleted ${count} timetable entries.`);
      loadData();
    } catch (err: any) {
      setStatus(`Error: ${err.response?.data?.error || 'Failed to delete all entries'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      class_name: '',
      subject_name: '',
      teacher_name: '',
      classroom_name: '',
      start_time: '',
      end_time: '',
      day_of_week: 'Monday',
      is_temporary: false,
      temporary_date: '',
    });
    setEditingEntry(null);
    setIsModalOpen(false);
    setStatus('Cancelled');
  };

  const handleImport = async () => {
    if (!importFile) {
      setStatus('Please select a file to import');
      return;
    }

    try {
      setImporting(true);
      setStatus('Importing timetable data...');
      const response = await timetableApi.batchImport(importFile);
      setStatus(`Import completed: ${response.data.data.imported} entries imported${response.data.data.errors > 0 ? ` with ${response.data.data.errors} errors` : ''}`);
      setImportFile(null);
      setIsImportModalOpen(false);
      loadData();
      setTimeout(() => setStatus('Timetable entries loaded successfully.'), 3000);
    } catch (err: any) {
      setStatus(`Error: ${err.response?.data?.error || 'Failed to import'}`);
    } finally {
      setImporting(false);
    }
  };

  // Get unique class levels for grouping
  const getClassLevel = (className: string) => {
    const match = className.match(/^(L\d|S\d)/);
    return match ? match[1] : 'Other';
  };

  const groupedClasses = referenceData?.classes.reduce((acc, cls) => {
    const level = getClassLevel(cls.name);
    if (!acc[level]) acc[level] = [];
    acc[level].push(cls);
    return acc;
  }, {} as Record<string, Class[]>) || {};

  // Filter entries based on search query
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.class_name.toLowerCase().includes(query) ||
      entry.subject_name.toLowerCase().includes(query) ||
      entry.teacher_name.toLowerCase().includes(query) ||
      entry.classroom_name.toLowerCase().includes(query) ||
      daysOfWeek.find(d => d.value === entry.day_of_week)?.label.toLowerCase().includes(query) ||
      entry.start_time.includes(query) ||
      entry.end_time.includes(query)
    );
  });

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="timetable-manager">
      <div className="timetable-manager-header">
        <h2>Timetable Entry Management</h2>
        <p className="status">{status}</p>
      </div>

      <div className="timetable-manager-content">
        <div className="timetable-list">
          <div className="list-header">
            <h3>Timetable Entries ({filteredEntries.length})</h3>
            <input
              type="text"
              className="search-input"
              placeholder="Search by class, subject, teacher, room, day, or time..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '300px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <select
              className="form-control"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
              style={{ width: '180px' }}
            >
              <option value="">All Classes</option>
              {Object.entries(groupedClasses).map(([level, classes]) => (
                <optgroup key={level} label={level}>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button onClick={openAddModal}>
              + Add Entry
            </button>
            <button onClick={() => setIsImportModalOpen(true)}>
              📥 Import Excel
            </button>
            {entries.length > 0 && (
              <button onClick={handleDeleteAll} className="delete" style={{ marginLeft: '8px' }}>
                🗑️ Delete All
              </button>
            )}
          </div>

          <div className="timetable-grid">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="timetable-card">
                <div className="timetable-info">
                  <h4>{entry.class_name} - {entry.subject_name}</h4>
                  <p>{daysOfWeek.find(d => d.value === entry.day_of_week)?.label}</p>
                  <p>{entry.start_time} - {entry.end_time}</p>
                  <p>Teacher: {entry.teacher_name}</p>
                  <p>Room: {entry.classroom_name}</p>
                  {entry.is_temporary ? (
                    <span className="badge badge-warning">Temporary</span>
                  ) : (
                    <span className="badge badge-success">Regular</span>
                  )}
                </div>
                <div className="timetable-actions">
                  <button onClick={() => openEditModal(entry)}>Edit</button>
                  <button onClick={() => handleDelete(entry.id)} className="delete">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredEntries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              {searchQuery ? 'No entries match your search.' : 'No timetable entries found. Click "Add Entry" to create one.'}
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="timetable-form">
            <h3>{editingEntry ? 'Edit Timetable Entry' : 'Add New Timetable Entry'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Class *</label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  placeholder="e.g., L1A"
                  required
                />
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  placeholder="e.g., Mathematics"
                  required
                />
              </div>

              <div className="form-group">
                <label>Teacher *</label>
                <input
                  type="text"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>

              <div className="form-group">
                <label>Classroom *</label>
                <input
                  type="text"
                  value={formData.classroom_name}
                  onChange={(e) => setFormData({ ...formData, classroom_name: e.target.value })}
                  placeholder="e.g., Room 101"
                  required
                />
              </div>

              <div className="form-group">
                <label>Day of Week *</label>
                <input
                  type="text"
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                  placeholder="e.g., Monday"
                  list="days-list"
                  required
                />
                <datalist id="days-list">
                  {daysOfWeek.map((day) => (
                    <option key={day.value} value={day.label}>{day.label}</option>
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_temporary}
                    onChange={(e) => setFormData({ ...formData, is_temporary: e.target.checked })}
                  />
                  Temporary
                </label>
              </div>

              {formData.is_temporary && (
                <div className="form-group">
                  <label>Temporary Date</label>
                  <input
                    type="date"
                    value={formData.temporary_date}
                    onChange={(e) => setFormData({ ...formData, temporary_date: e.target.value })}
                  />
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="cancel">
                  Cancel
                </button>
                <button type="submit" disabled={!formData.class_name}>
                  {editingEntry ? 'Update' : 'Create'} Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {isImportModalOpen && (
          <div className="timetable-form">
            <h3>Import Timetable from Excel</h3>
            <div className="form-group">
              <label>Excel File *</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                required
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                File should have columns: Class, Subject, Teacher, Classroom, Start Time, End Time, Day
              </p>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setIsImportModalOpen(false)} className="cancel">
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleImport} 
                disabled={!importFile || importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableManager;
