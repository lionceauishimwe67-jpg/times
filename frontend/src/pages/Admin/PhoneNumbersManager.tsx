import React, { useState, useEffect } from 'react';
import { phoneNumbersApi } from '../../services/api';

interface PhoneNumber {
  id: number;
  phone_number: string;
  name: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const PhoneNumbersManager: React.FC = () => {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    phone_number: '',
    name: '',
  });

  useEffect(() => {
    loadPhoneNumbers();
  }, []);

  const loadPhoneNumbers = async () => {
    try {
      setLoading(true);
      const response = await phoneNumbersApi.getAll();
      setPhoneNumbers(response.data.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone_number) {
      setError('Phone number is required');
      return;
    }

    try {
      await phoneNumbersApi.add(formData);
      setFormData({ phone_number: '', name: '' });
      setIsModalOpen(false);
      loadPhoneNumbers();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add phone number');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this phone number?')) {
      return;
    }

    try {
      await phoneNumbersApi.delete(id);
      loadPhoneNumbers();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete phone number');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await phoneNumbersApi.toggle(id);
      loadPhoneNumbers();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle phone number status');
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>Phone Numbers (SMS Notifications)</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          + Add Phone Number
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fcc',
        }}>
          {error}
        </div>
      )}

      {phoneNumbers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📱</div>
          <p>No phone numbers added yet</p>
          <p style={{ fontSize: '0.9rem' }}>Click "Add Phone Number" to start managing SMS notifications</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '12px',
        }}>
          {phoneNumbers.map((phone) => (
            <div
              key={phone.id}
              style={{
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: phone.is_active ? '2px solid #4caf50' : '2px solid #ff9800',
              }}
            >
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>
                  {phone.phone_number}
                </div>
                {phone.name && (
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    {phone.name}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                  Added: {new Date(phone.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggle(phone.id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: phone.is_active ? '#4caf50' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {phone.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(phone.id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', margin: 0 }}>
              Add Phone Number
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+250 788 123 456"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#999',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneNumbersManager;
