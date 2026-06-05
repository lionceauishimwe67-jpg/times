import React, { useState, useEffect } from 'react';
import { teachersApi } from '../../services/api';
import './TeacherProfile.css';

interface Teacher {
  id: number;
  name: string;
  email: string;
  phone: string;
  school: string;
  teaching_schedule: string;
  subjects: string;
  level: string;
  specific_competences: string;
  general_competences: string;
  complementary_competences: string;
  sms_notification_enabled: number;
  created_at: string;
  assignedSubjects?: { id: number; name: string; code: string }[];
  assignedClasses?: { id: number; name: string; level: string }[];
  assignedRooms?: { id: number; name: string; location?: string }[];
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface ClassItem {
  id: number;
  name: string;
  level: string;
}

interface RoomItem {
  id: number;
  name: string;
  location?: string;
}

type ManageMode = 'subjects' | 'classes' | 'rooms' | null;

const TeacherProfile: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [allRooms, setAllRooms] = useState<RoomItem[]>([]);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', school: '', level: '', sms_notification_enabled: 1
  });
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; teacherId: number | null }>({ show: false, teacherId: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [managingTeacher, setManagingTeacher] = useState<number | null>(null);
  const [manageMode, setManageMode] = useState<ManageMode>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
    fetchRooms();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await teachersApi.getAll();
      setTeachers(response.data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await teachersApi.getSubjects();
      setAllSubjects(response.data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await teachersApi.getClasses();
      setAllClasses(response.data.classes || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await teachersApi.getRooms();
      setAllRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus('Saving teacher profile...');
      const response = selectedTeacher 
        ? await teachersApi.update(selectedTeacher.id, formData)
        : await teachersApi.create(formData);
      if (response.status === 200 || response.status === 201) {
        setStatus('Teacher profile saved successfully!');
        setFormData({ name: '', email: '', phone: '', school: '', level: '', sms_notification_enabled: 1 });
        setSelectedTeacher(null);
        setIsEditing(false);
        fetchTeachers();
        setTimeout(() => setStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error saving teacher:', error);
      setStatus('Error saving teacher profile.');
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.name, email: teacher.email || '', phone: teacher.phone || '',
      school: teacher.school || '', level: teacher.level || '', sms_notification_enabled: teacher.sms_notification_enabled
    });
    setIsEditing(true);
  };

  const handleDelete = async (teacherId: number) => {
    setDeleteConfirm({ show: true, teacherId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.teacherId) return;
    try {
      await teachersApi.delete(deleteConfirm.teacherId);
      setStatus('Teacher deleted successfully.');
      fetchTeachers();
      if (selectedTeacher?.id === deleteConfirm.teacherId) {
        setSelectedTeacher(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
      setStatus('Error deleting teacher.');
    } finally {
      setDeleteConfirm({ show: false, teacherId: null });
    }
  };

  const toggleSMS = async (teacher: Teacher) => {
    try {
      const updated = { ...teacher, sms_notification_enabled: teacher.sms_notification_enabled ? 0 : 1 };
      await teachersApi.update(teacher.id, updated);
      fetchTeachers();
    } catch (error) {
      console.error('Error toggling SMS:', error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', phone: '', school: '', level: '', sms_notification_enabled: 1 });
    setSelectedTeacher(null);
    setIsEditing(false);
  };

  // Subject/Class management
  const openManager = async (teacher: Teacher, mode: ManageMode) => {
    setManagingTeacher(teacher.id);
    setManageMode(mode);
    setItemSearch('');
    try {
      const res = mode === 'subjects'
        ? await teachersApi.getTeacherSubjects(teacher.id)
        : mode === 'classes'
          ? await teachersApi.getTeacherClasses(teacher.id)
          : await teachersApi.getTeacherRooms(teacher.id);
      const key = mode === 'subjects' ? 'subjects' : mode === 'classes' ? 'classes' : 'rooms';
      setSelectedItemIds((res.data[key] || []).map((item: any) => item.id));
    } catch {
      setSelectedItemIds([]);
    }
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const saveAssignments = async () => {
    if (!managingTeacher || !manageMode) return;
    try {
      if (manageMode === 'subjects') {
        await teachersApi.assignSubjects(managingTeacher, selectedItemIds);
      } else if (manageMode === 'classes') {
        await teachersApi.assignClasses(managingTeacher, selectedItemIds);
      } else {
        await teachersApi.assignRooms(managingTeacher, selectedItemIds);
      }
      setStatus(`${manageMode === 'subjects' ? 'Subjects' : manageMode === 'classes' ? 'Classes' : 'Rooms'} updated successfully!`);
      setManagingTeacher(null);
      setManageMode(null);
      fetchTeachers();
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      console.error('Error saving assignments:', error);
      setStatus('Error updating assignments.');
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const subjectNames = (teacher.assignedSubjects || []).map(s => s.name.toLowerCase()).join(' ');
    const classNames = (teacher.assignedClasses || []).map(c => c.name.toLowerCase()).join(' ');
    const roomNames = (teacher.assignedRooms || []).map(r => r.name.toLowerCase()).join(' ');
    return (
      teacher.name.toLowerCase().includes(q) ||
      (teacher.email && teacher.email.toLowerCase().includes(q)) ||
      (teacher.phone && teacher.phone.includes(q)) ||
      (teacher.school && teacher.school.toLowerCase().includes(q)) ||
      subjectNames.includes(q) || classNames.includes(q) || roomNames.includes(q)
    );
  });

  const allItems: { id: number; name: string; code?: string; level?: string }[] = manageMode === 'subjects' ? allSubjects : allClasses;
  const filteredItems = allItems.filter(item =>
    !itemSearch || item.name.toLowerCase().includes(itemSearch.toLowerCase()) || (item.code || item.level || '').toLowerCase().includes(itemSearch.toLowerCase())
  );

  const modalTitle = manageMode === 'subjects' ? '📚 Manage Subjects' : '🏫 Manage Classes';
  const selectedLabel = manageMode === 'subjects' ? 'subjects' : 'classes';

  return (
    <div className="teacher-profile">
      <div className="teacher-profile-header">
        <h2>Teacher Profile Management</h2>
        <p className="status">{status}</p>
      </div>

      <div className="teacher-profile-content">
        <div className="teacher-list">
          <div className="list-header">
            <h3>Teachers ({filteredTeachers.length})</h3>
            <input
              type="text" className="search-input" placeholder="Search teachers..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => { setIsEditing(true); }}>+ Add Teacher</button>
          </div>

          <div className="teachers-grid">
            {filteredTeachers.map((teacher) => (
              <div key={teacher.id} className="teacher-card">
                <div className="teacher-info">
                  <h4>{teacher.name}</h4>
                  {teacher.phone && <p>📱 {teacher.phone}</p>}
                  {teacher.school && <p>🏫 {teacher.school}</p>}
                  {teacher.level && <p><strong>Level:</strong> {teacher.level}</p>}
                  
                  <div className="teacher-assignments">
                    <div className="assignment-section">
                      <strong>Subjects ({(teacher.assignedSubjects || []).length}):</strong>
                      {(teacher.assignedSubjects || []).length > 0 ? (
                        <div className="subject-tags">
                          {(teacher.assignedSubjects || []).map(s => (
                            <span key={s.id} className="subject-tag">{s.code || s.name}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-assignments">None assigned</span>
                      )}
                    </div>
                    <div className="assignment-section">
                      <strong>Classes ({(teacher.assignedClasses || []).length}):</strong>
                      {(teacher.assignedClasses || []).length > 0 ? (
                        <div className="class-tags">
                          {(teacher.assignedClasses || []).map(c => (
                            <span key={c.id} className="class-tag">{c.name}{c.level ? ` (${c.level})` : ''}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-assignments">None assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: teacher.sms_notification_enabled ? '#4caf50' : '#999' }}>
                    SMS: {teacher.sms_notification_enabled ? '✓ Enabled' : '✗ Disabled'}
                  </p>
                </div>
                <div className="teacher-actions">
                  <button onClick={() => handleEdit(teacher)}>Edit</button>
                  <button onClick={() => openManager(teacher, 'subjects')} className="manage-subjects">
                    📚 Subjects
                  </button>
                  <button onClick={() => openManager(teacher, 'classes')} className="manage-classes">
                    🏫 Classes
                  </button>
                  <button 
                    onClick={() => toggleSMS(teacher)}
                    style={{ backgroundColor: teacher.sms_notification_enabled ? '#4caf50' : '#ff9800', color: 'white' }}
                  >
                    {teacher.sms_notification_enabled ? 'SMS On' : 'SMS Off'}
                  </button>
                  <button onClick={() => teacher.id && handleDelete(teacher.id)} className="delete">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(isEditing || selectedTeacher) && (
          <div className="teacher-form">
            <h3>{selectedTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>School</label>
                <input type="text" name="school" value={formData.school || ''} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Level</label>
                <select name="level" value={formData.level || ''} onChange={handleInputChange}>
                  <option value="">Select Level</option>
                  <option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option>
                  <option value="S4">S4</option><option value="S5">S5</option><option value="S6">S6</option>
                  <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
                  <option value="L4">L4</option><option value="L5">L5</option><option value="L6">L6</option>
                  <option value="All">All Levels</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input type="checkbox" name="sms_notification_enabled" checked={formData.sms_notification_enabled === 1}
                    onChange={(e) => setFormData({ ...formData, sms_notification_enabled: e.target.checked ? 1 : 0 })} />
                  Enable SMS Notifications
                </label>
              </div>
              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="cancel">Cancel</button>
                <button type="submit" disabled={!formData.name}>{selectedTeacher ? 'Update' : 'Create'} Teacher</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Subject/Class Management Modal */}
      {managingTeacher !== null && manageMode !== null && (
        <div className="modal-overlay">
          <div className="modal-content assignment-modal">
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <p>{teachers.find(t => t.id === managingTeacher)?.name}</p>
              <button className="modal-close" onClick={() => { setManagingTeacher(null); setManageMode(null); }}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text" className="subject-search" placeholder={`Search ${selectedLabel}...`}
                value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
              />
              <div className="subject-list">
                {filteredItems.map(item => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`subject-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <input type="checkbox" checked={isSelected} onChange={() => {}} />
                      <span className="subject-name">{item.name}</span>
                      {(item.code || item.level) && (
                        <span className="subject-code">{item.code || item.level}</span>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="modal-footer">
                <span className="selected-count">{selectedItemIds.length} {selectedLabel} selected</span>
                <div className="modal-actions">
                  <button className="cancel" onClick={() => { setManagingTeacher(null); setManageMode(null); }}>Cancel</button>
                  <button className="save" onClick={saveAssignments}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm.show && (
        <div className="delete-confirm-dialog">
          <div className="delete-confirm-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this teacher? This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button onClick={() => setDeleteConfirm({ show: false, teacherId: null })} className="cancel">Cancel</button>
              <button onClick={confirmDelete} className="delete">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProfile;
