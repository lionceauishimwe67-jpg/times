import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, error: authError } = useAuthContext();
  
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register(username.trim(), password.trim());
      } else {
        await login(username.trim(), password.trim());
      }
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || (isRegister ? 'Registration failed. Please try again.' : 'Login failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-icon">🔐</span>
          </div>
          <h1 className="login-title">{isRegister ? 'Create Account' : 'Admin Login'}</h1>
          <p className="login-subtitle">School Timetable Management System</p>
        </div>

        <div className="login-toggle">
          <button 
            type="button" 
            className={`toggle-button ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
          >
            Login
          </button>
          <button 
            type="button" 
            className={`toggle-button ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Enter your username"
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Enter your password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              disabled={isLoading}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          )}

          {(error || authError) && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error || authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {isRegister ? 'Registering...' : 'Logging in...'}
              </>
            ) : (
              <>
                <span>{isRegister ? '📝' : '🔓'}</span>
                {isRegister ? 'Register' : 'Login'}
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Default credentials:</p>
          <p><strong>Username:</strong> admin | <strong>Password:</strong> admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
