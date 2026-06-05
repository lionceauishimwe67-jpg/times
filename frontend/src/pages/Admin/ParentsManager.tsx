import React, { useState, useEffect } from 'react';
import { parentApi, studentApi } from '../../services/api';
import './ParentsManager.css';

interface Parent {
  id: number;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  relationship?: string;
  students?: any[];
  created_at?: string;
}

const ParentsManager: React.FC = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [linkMode, setLinkMode] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', relationship: 'guardian'
  });

  useEffect(() => {
    loadParents();
    loadStudents();
  }, []);

  const loadParents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await parentApi.getAll(params);
      setParents(res.data.parents || []);
    } catch (err) {
      console.error('Failed to load parents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await studentApi.getAll();
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const openForm = (parent?: Parent) => {
    if (parent) {
      setEditingId(parent.id);
      setFormData({
        name: parent.name, email: parent.email || '', phone: parent.phone,
        address: parent.address || '', relationship: parent.relationship || 'guardian'
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', phone: '', address: '', relationship: 'guardian' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await parentApi.update(editingId, formData);
      } else {
        await parentApi.create(formData);
      }
      setShowForm(false);
      loadParents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save parent');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this parent?')) return;
    try {
      await parentApi.delete(id);
      loadParents();
    } catch (err) {
      alert('Failed to delete parent');
    }
  };

  const linkStudent = async (parentId: number, studentId: number) => {
    try {
      await parentApi.linkToStudent({ parentId, studentId, isPrimary: false });
      setLinkMode(null);
      loadParents();
    } catch (err) {
      alert('Failed to link student');
    }
  };

  const unlinkStudent = async (parentId: number, studentId: number) => {
    try {
      await parentApi.unlinkFromStudent({ parentId, studentId });
      loadParents();
    } catch (err) {
      alert('Failed to unlink student');
    }
  };

  return (
    <div className="parents-manager">
      <div className="page-header">
        <h1><span>👨‍👩‍👧</span> Parent Management</h1>
        <button className="btn-primary" onClick={() => openForm()}><span>+</span> Add Parent</button>
      </div>

      <div className="filters-bar">
        <input className="search-input" type="text" placeholder="Search parents..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadParents()} />
        <button className="btn-secondary" onClick={loadParents}>Search</button>
      </div>

      {loading ? (
        <div className="loading">Loading parents...</div>
      ) : (
        <div className="parents-grid">
          {parents.map((p) => (
            <div key={p.id} className="parent-card">
              <div className="parent-header">
                <h3 className="parent-name">{p.name}</h3>
                <div className="parent-actions">
                  <button className="btn-icon" onClick={() => openForm(p)} title="Edit">✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(p.id)} title="Delete">🗑️</button>
                </div>
              </div>
              <div className="parent-details">
                <div className="detail-row">📞 {p.phone}</div>
                {p.email && <div className="detail-row">📧 {p.email}</div>}
                {p.address && <div className="detail-row">📍 {p.address}</div>}
                <div className="detail-row">📝 {p.relationship || 'guardian'}</div>
              </div>
              <div className="parent-students">
                <div className="students-header">
                  <strong>Linked Students</strong>
                  <button className="btn-link" onClick={() => setLinkMode(linkMode === p.id ? null : p.id)}>
                    {linkMode === p.id ? 'Cancel' : '+ Link'}
                  </button>
                </div>
                {linkMode === p.id && (
                  <div className="link-student-select">
                    <select onChange={(e) => { if (e.target.value) { linkStudent(p.id, parseInt(e.target.value)); e.target.value = ''; } }}>
                      <option value="">Select student to link...</option>
                      {students.filter((s: any) => !p.students?.some((ps: any) => ps.id === s.id)).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
                      ))}
                    </select>
                  </div>
                )}
                {p.students && p.students.length > 0 ? (
                  <div className="linked-students-list">
                    {p.students.map((s: any) => (
                      <div key={s.id} className="linked-student">
                        <span>{s.name} {s.is_primary ? '⭐' : ''}</span>
                        <button className="btn-unlink" onClick={() => unlinkStudent(p.id, s.id)} title="Unlink">✕</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-students">No linked students</div>
                )}
              </div>
            </div>
          ))}
          {parents.length === 0 && <div className="no-data">No parents found</div>}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit Parent' : 'Add Parent'}</h2>
            <form onSubmit={handleSubmit} className="parent-form">
              <div className="form-grid">
                <div className="form-group"><label>Name *</label><input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="form-group"><label>Phone *</label><input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                <div className="form-group"><label>Relationship</label><input value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} /></div>
                <div className="form-group full-width"><label>Address</label><input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentsManager;
