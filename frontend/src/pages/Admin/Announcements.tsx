import React, { useState, useEffect } from 'react';
import { announcementApi } from '../../services/api';
import { Announcement } from '../../types';
import './Announcements.css';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    text_content: '',
    image_url: '',
    local_path: '',
    display_order: 0
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await announcementApi.getAllAdmin();
      setAnnouncements(response.data.data);
    } catch (err) {
      setError('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const data = new FormData();
    data.append('title', formData.title);
    data.append('text_content', formData.text_content);
    data.append('display_order', formData.display_order.toString());
    
    if (imageFile) {
      data.append('image', imageFile);
    } else if (formData.image_url) {
      data.append('image_url', formData.image_url);
    }

    try {
      if (editingId) {
        await announcementApi.update(editingId, data);
        setSuccess('Announcement updated successfully');
      } else {
        await announcementApi.create(data);
        setSuccess('Announcement created successfully');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ title: '', text_content: '', image_url: '', local_path: '', display_order: 0 });
      setImageFile(null);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      text_content: announcement.text_content || '',
      image_url: announcement.image_url,
      local_path: '',
      display_order: announcement.display_order
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await announcementApi.delete(id);
      setSuccess('Announcement deleted successfully');
      fetchAnnouncements();
    } catch (err) {
      setError('Failed to delete announcement');
    }
  };

  const handleReorder = async (orders: { id: number; display_order: number }[]) => {
    try {
      await announcementApi.reorder(orders);
      setSuccess('Announcements reordered successfully');
      fetchAnnouncements();
    } catch (err) {
      setError('Failed to reorder announcements');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newAnnouncements = [...announcements];
    [newAnnouncements[index], newAnnouncements[index - 1]] = [newAnnouncements[index - 1], newAnnouncements[index]];
    
    const orders = newAnnouncements.map((a, i) => ({ id: a.id, display_order: i }));
    handleReorder(orders);
  };

  const moveDown = (index: number) => {
    if (index === announcements.length - 1) return;
    const newAnnouncements = [...announcements];
    [newAnnouncements[index], newAnnouncements[index + 1]] = [newAnnouncements[index + 1], newAnnouncements[index]];
    
    const orders = newAnnouncements.map((a, i) => ({ id: a.id, display_order: i }));
    handleReorder(orders);
  };

  if (loading) {
    return <div className="loading">Loading announcements...</div>;
  }

  return (
    <div className="announcements-page">
      <div className="page-header">
        <h1 className="page-title">Manage Announcements</h1>
        <button 
          onClick={() => setShowForm(true)} 
          className="btn btn-primary"
        >
          Add New Announcement
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowForm(false)} className="modal-close">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="announcement-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Announcement Text (optional)</label>
                <textarea
                  value={formData.text_content}
                  onChange={(e) => setFormData({...formData, text_content: e.target.value})}
                  placeholder="Enter announcement text content..."
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label>Image URL (optional)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="form-group">
                <label>Or Local File Path (optional)</label>
                <input
                  type="text"
                  value={formData.local_path}
                  onChange={(e) => setFormData({...formData, local_path: e.target.value})}
                  placeholder="C:\path\to\image.jpg"
                />
                <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  Paste local file path (works if backend and frontend are on same machine)
                </small>
              </div>

              <div className="form-group">
                <label>Or Upload File (optional)</label>
                <input
                  type="file"
                  accept="*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                  Leave all image fields empty for text-only announcements
                </small>
              </div>

              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                  min="0"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <p>No announcements yet. Create your first announcement!</p>
          </div>
        ) : (
          announcements.map((announcement, index) => (
            <div key={announcement.id} className="announcement-item">
              <div className="announcement-preview">
                {announcement.image_url ? (
                  <img 
                    src={announcement.image_url} 
                    alt={announcement.title}
                    className="announcement-thumbnail"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('image-error');
                    }}
                  />
                ) : (
                  <div className="announcement-no-image">📄</div>
                )}
                {announcement.image_url && (
                  <span className="image-badge" title="Has image">🖼️</span>
                )}
                <div className="announcement-info">
                  <h3>{announcement.title}</h3>
                  {announcement.text_content && (
                    <p className="announcement-text-preview">{announcement.text_content}</p>
                  )}
                  <p>Order: {announcement.display_order}</p>
                </div>
              </div>
              
              <div className="announcement-actions">
                <div className="reorder-buttons">
                  <button 
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="btn btn-sm"
                  >
                    Up
                  </button>
                  <button 
                    onClick={() => moveDown(index)}
                    disabled={index === announcements.length - 1}
                    className="btn btn-sm"
                  >
                    Down
                  </button>
                </div>
                
                <button 
                  onClick={() => handleEdit(announcement)}
                  className="btn btn-sm btn-secondary"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(announcement.id)}
                  className="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Announcements;
