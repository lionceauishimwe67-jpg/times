import React, { useState } from 'react';
import { authApi } from '../../services/api';
import './SecretLogin.css';

interface SecretLoginProps {
  onLogin: (token: string) => void;
}

const SecretLogin: React.FC<SecretLoginProps> = ({ onLogin }) => {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.loginWithSecret(secret);
      if (response.data.success) {
        onLogin(response.data.data.token);
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secret-login-container">
      <div className="secret-login-card">
        <h1 className="secret-login-title">Admin Access</h1>
        <p className="secret-login-subtitle">Enter secret key to access dashboard</p>
        
        <form onSubmit={handleSubmit} className="secret-login-form">
          <div className="secret-input-group">
            <label htmlFor="secret">Secret Key</label>
            <input
              type="password"
              id="secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter admin secret key"
              required
            />
          </div>
          
          {error && <div className="secret-error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="secret-login-button">
            {loading ? 'Accessing...' : 'Access Dashboard'}
          </button>
        </form>
        
        <div className="secret-login-footer">
          <p>Default: school_admin_2024_secure_key</p>
        </div>
      </div>
    </div>
  );
};

export default SecretLogin;
