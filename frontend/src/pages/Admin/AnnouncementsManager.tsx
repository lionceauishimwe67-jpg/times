import React, { useState, useEffect } from 'react';
import { announcementApi } from '../../services/api';
import { Announcement } from '../../types';
import {
  ANNOUNCEMENT_FILE_ACCEPT,
  fileKindFromFile,
  fileKindFromAnnouncement,
  hasAnnouncementAttachment,
  type AnnouncementFileKind,
} from '../../utils/announcementFiles';
import axios from 'axios';

interface AvailableImage {
  filename: string;
  path: string;
  url: string;
  size: number;
}

interface DeliveryStatus {
  id: number;
  announcement_id: number;
  teacher_id: number;
  status: 'sent' | 'delivered' | 'read';
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  teacher_name: string;
  teacher_email: string;
}

interface DeliveryMeta {
  total_teachers: number;
  sent: number;
  delivered: number;
  read: number;
  pending: number;
}

const AnnouncementsManager: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageBrowserOpen, setIsImageBrowserOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [previewFileKind, setPreviewFileKind] = useState<AnnouncementFileKind>('none');
  const [availableImages, setAvailableImages] = useState<AvailableImage[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus[]>([]);
  const [deliveryMeta, setDeliveryMeta] = useState<DeliveryMeta | null>(null);
  const [selectedAnnouncementForStatus, setSelectedAnnouncementForStatus] = useState<Announcement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    text_content: '',
    image: null as File | null,
    display_order: 0,
    expires_at: '',
  });

  useEffect(() => {
    loadAnnouncements();
    loadAvailableImages();
  }, []);

  // Image compression function
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions (max 800x600)
          const maxWidth = 800;
          const maxHeight = 600;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (maxHeight / height) * width;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG with 0.7 quality
            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.7);
          } else {
            resolve(file);
          }
        };
      };
    });
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementApi.getAllAdmin();
      setAnnouncements(response.data.data || []);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setError('Session expired or not admin. Log in again at /admin/login');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load announcements');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      text_content: '',
      image: null,
      display_order: 0,
      expires_at: '',
    });
    setPreviewImage(null);
    setPreviewFileName(null);
    setPreviewFileKind('none');
    setSelectedImageUrl(null);
    setIsModalOpen(true);
  };

  const loadAvailableImages = async () => {
    try {
      const response = await announcementApi.getAvailableImages();
      setAvailableImages(response.data.data || []);
    } catch (err) {
      console.error('Failed to load available images:', err);
    }
  };

  const openImageBrowser = () => {
    loadAvailableImages();
    setIsImageBrowserOpen(true);
  };

  const selectImageFromBrowser = (image: AvailableImage) => {
    setSelectedImageUrl(image.url);
    setPreviewImage(image.url);
    setFormData({ ...formData, image: null });
    setIsImageBrowserOpen(false);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    
    // Format expires_at for datetime-local input (yyyy-MM-ddThh:mm)
    let formattedExpiresAt = '';
    if (announcement.expires_at) {
      try {
        const date = new Date(announcement.expires_at);
        // Format to yyyy-MM-ddThh:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        formattedExpiresAt = `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch (e) {
        formattedExpiresAt = '';
      }
    }
    
    setFormData({
      title: announcement.title,
      text_content: (announcement as any).text_content || '',
      image: null,
      display_order: announcement.display_order,
      expires_at: formattedExpiresAt,
    });
    setPreviewImage(announcement.image_url);
    setPreviewFileName(announcement.image_path?.split('/').pop() || announcement.title);
    setPreviewFileKind(fileKindFromAnnouncement(announcement));
    setIsModalOpen(true);
  };

  const applySelectedFile = async (file: File) => {
    const kind = fileKindFromFile(file);
    setPreviewFileName(file.name);
    setPreviewFileKind(kind);

    if (kind === 'image') {
      try {
        const compressedFile = await compressImage(file);
        setFormData({ ...formData, image: compressedFile });
        setPreviewImage(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error('Compression failed:', err);
        setFormData({ ...formData, image: file });
        setPreviewImage(URL.createObjectURL(file));
      }
    } else if (kind === 'pdf') {
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, image: file });
      setPreviewImage(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) await applySelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) await applySelectedFile(file);
  };

  const clearAttachment = () => {
    setFormData({ ...formData, image: null });
    setPreviewImage(null);
    setPreviewFileName(null);
    setPreviewFileKind('none');
    setSelectedImageUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = new FormData();
    data.append('title', formData.title);
    if (formData.text_content) data.append('text_content', formData.text_content);
    data.append('display_order', String(formData.display_order));
    if (formData.expires_at) data.append('expires_at', formData.expires_at);
    if (formData.image) data.append('image', formData.image);
    if (selectedImageUrl && !formData.image) data.append('image_url', selectedImageUrl);

    try {
      if (editingAnnouncement) {
        await announcementApi.update(editingAnnouncement.id, data);
      } else {
        // Allow announcements with just text, just image, or both
        if (!formData.image && !selectedImageUrl && !formData.text_content) {
          alert('Shyiramo inyandiko, ifoto, PDF, cyangwa indi dosiye');
          return;
        }
        await announcementApi.create(data);
      }
      setIsModalOpen(false);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await announcementApi.delete(id);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    const data = new FormData();
    data.append('is_active', String(!announcement.is_active));
    
    try {
      await announcementApi.update(announcement.id, data);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleToggleApproval = async (announcement: Announcement) => {
    const data = new FormData();
    data.append('is_approved_for_display', String(!announcement.is_approved_for_display));
    
    try {
      await announcementApi.update(announcement.id, data);
      loadAnnouncements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const openDeliveryStatusModal = async (announcement: Announcement) => {
    setSelectedAnnouncementForStatus(announcement);
    setIsDeliveryModalOpen(true);
    
    try {
      const response = await axios.get(`/api/announcements/${announcement.id}/delivery-status`);
      setDeliveryStatus(response.data.data || []);
      setDeliveryMeta(response.data.meta || null);
    } catch (err) {
      console.error('Error fetching delivery status:', err);
      setDeliveryStatus([]);
      setDeliveryMeta(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'read': return '#10b981';
      case 'delivered': return '#3b82f6';
      case 'sent': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'read': return '✓ Read';
      case 'delivered': return '📬 Delivered';
      case 'sent': return '📤 Sent';
      default: return status;
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div className="admin-header">
        <h1 className="page-title">Manage Announcements</h1>
        <div className="header-actions">
          <button onClick={openAddModal} className="btn btn-primary">
            <span>➕</span> Upload Announcement
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 16, background: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              style={{
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#fff',
                opacity: announcement.is_active && !announcement.is_expired ? 1 : 0.6,
              }}
            >
              <div style={{ height: '180px', overflow: 'hidden', background: '#f3f4f6' }}>
                {fileKindFromAnnouncement(announcement) === 'pdf' && announcement.image_url ? (
                  <iframe
                    title={announcement.title}
                    src={announcement.image_url}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : fileKindFromAnnouncement(announcement) === 'image' && announcement.image_url ? (
                  <img
                    src={announcement.image_url}
                    alt={announcement.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:3rem;">📷</div>';
                      }
                    }}
                  />
                ) : hasAnnouncementAttachment(announcement) ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8, color: '#475569' }}>
                    <span style={{ fontSize: '2.5rem' }}>📄</span>
                    <span style={{ fontSize: '0.85rem', padding: '0 12px', textAlign: 'center' }}>
                      {(announcement.image_path || '').split('/').pop() || 'Document'}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '2rem' }}>📝</div>
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
                  {announcement.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span className={`badge ${announcement.is_active && !announcement.is_expired ? 'badge-success' : 'badge-warning'}`}>
                    {announcement.is_expired ? 'Expired' : announcement.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="badge badge-info">Order: {announcement.display_order}</span>
                  {((announcement as any).has_image_data || announcement.image_data || announcement.image_path) && (
                    <span className={`badge ${announcement.is_approved_for_display ? 'badge-success' : 'badge-warning'}`}>
                      {announcement.is_approved_for_display ? '✓ Approved' : '⏳ Pending'}
                    </span>
                  )}
                  {(announcement as any).has_image_data && (
                    <span className="badge badge-info">DB ✓</span>
                  )}
                </div>
                {announcement.expires_at && (
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>
                    Expires: {new Date(announcement.expires_at).toLocaleString()}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => openDeliveryStatusModal(announcement)} className="btn btn-secondary btn-sm" title="View Delivery Status">
                    📊
                  </button>
                  <button onClick={() => handleToggleActive(announcement)} className="btn btn-secondary btn-sm" title={announcement.is_active ? 'Deactivate' : 'Activate'}>
                    {announcement.is_active ? '⏸' : '▶'}
                  </button>
                  {((announcement as any).has_image_data || announcement.image_data || announcement.image_path) && (
                    <button 
                      onClick={() => handleToggleApproval(announcement)} 
                      className="btn btn-secondary btn-sm" 
                      title={announcement.is_approved_for_display ? 'Disapprove for Display' : 'Approve for Display'}
                    >
                      {announcement.is_approved_for_display ? '🚫' : '✓'}
                    </button>
                  )}
                  <button onClick={() => openEditModal(announcement)} className="btn btn-secondary btn-sm" title="Edit">
                    ✏
                  </button>
                  <button 
                    onClick={() => handleDelete(announcement.id)} 
                    className="btn btn-danger btn-sm" 
                    title="Delete"
                    style={{ minWidth: '40px' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {announcements.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            No announcements. Click &quot;Upload Announcement&quot; to add PDF, image, or document.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingAnnouncement ? 'Edit Announcement' : 'Upload Announcement'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter announcement title"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Text Content (Optional)</label>
                  <textarea
                    className="form-control"
                    value={formData.text_content}
                    onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                    placeholder="Enter announcement text content (leave empty for image-only announcements)"
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dosiye (PDF, ifoto, Word, Excel…) — Optional</label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragging ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="file"
                      className="form-control"
                      accept={ANNOUNCEMENT_FILE_ACCEPT}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="announcement-file-upload"
                    />
                    {previewFileKind === 'none' && !previewImage && !formData.image ? (
                      <label htmlFor="announcement-file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📎</div>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                          Kanda cyangwa kurura dosiye hano
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                          PDF, PNG, JPG, DOC, DOCX, TXT, XLS, PPT…
                        </div>
                      </label>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        {previewFileKind === 'pdf' && (previewImage || editingAnnouncement?.image_url) ? (
                          <iframe
                            title="PDF preview"
                            src={previewImage || editingAnnouncement?.image_url || ''}
                            style={{ width: '100%', height: '220px', border: 'none', borderRadius: '6px' }}
                          />
                        ) : previewFileKind === 'image' && previewImage ? (
                          <img
                            src={previewImage}
                            alt="Preview"
                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        ) : (
                          <div style={{ padding: '24px', background: '#fff', borderRadius: '6px' }}>
                            <div style={{ fontSize: '2.5rem' }}>📄</div>
                            <div style={{ marginTop: '8px', fontWeight: 600 }}>{previewFileName}</div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Dosiye izashyirwa mu matangazo</div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={clearAttachment}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '16px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Display Order</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      min="0"
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Expires At (Optional)</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAnnouncement ? '💾 Save Changes' : '📤 Upload Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Browser Modal */}
      {isImageBrowserOpen && (
        <div className="modal-overlay" onClick={() => setIsImageBrowserOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">📁 Choose Image from Gallery</h3>
              <button onClick={() => setIsImageBrowserOpen(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {availableImages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📂</div>
                  <p>No images found in uploads folder.</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Upload images first to see them here.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                  {availableImages.map((image) => (
                    <div
                      key={image.filename}
                      onClick={() => selectImageFromBrowser(image)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: selectedImageUrl === image.url ? '3px solid #e94560' : '2px solid #e5e7eb',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedImageUrl === image.url ? '0 4px 20px rgba(233, 69, 96, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = selectedImageUrl === image.url ? '0 4px 20px rgba(233, 69, 96, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.filename}
                        style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:120px;color:#9ca3af;font-size:2rem;">📷</div>';
                          }
                        }}
                      />
                      <div style={{ padding: '8px', background: '#fff', fontSize: '0.8rem' }}>
                        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {image.filename}
                        </p>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.75rem' }}>
                          {(image.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setIsImageBrowserOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsImageBrowserOpen(false)}
                className="btn btn-primary"
                disabled={!selectedImageUrl}
              >
                Select Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Status Modal */}
      {isDeliveryModalOpen && selectedAnnouncementForStatus && (
        <div className="modal-overlay" onClick={() => setIsDeliveryModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">📊 Delivery Status - {selectedAnnouncementForStatus.title}</h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {deliveryMeta && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '24px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#667eea' }}>
                      {deliveryMeta.total_teachers}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                      Total Teachers
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>
                      {deliveryMeta.read}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                      ✓ Read
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>
                      {deliveryMeta.delivered}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                      📬 Delivered
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                      {deliveryMeta.sent}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                      📤 Sent
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6b7280' }}>
                      {deliveryMeta.pending}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                      ⏳ Pending
                    </div>
                  </div>
                </div>
              )}

              {deliveryStatus.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                  <p>No delivery status records found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {deliveryStatus.map((status) => (
                    <div
                      key={status.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        background: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: getStatusColor(status.status) + '20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                      }}>
                        {status.status === 'read' ? '✓' : status.status === 'delivered' ? '📬' : '📤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '4px' }}>
                          {status.teacher_name || `Teacher #${status.teacher_id}`}
                        </div>
                        {status.teacher_email && (
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {status.teacher_email}
                          </div>
                        )}
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'white',
                        background: getStatusColor(status.status)
                      }}>
                        {getStatusLabel(status.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setIsDeliveryModalOpen(false)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsManager;
