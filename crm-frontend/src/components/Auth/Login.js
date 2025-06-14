import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Removed the auto-redirect useEffect

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login with email:', email);
      const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:808';
      const response = await axios.post(`${API_URL}/api/accounts/auth/login/`, { email, password });
      console.log('Login successful. Response:', response.data);
    
      const tenantSetupComplete = response.data.tenantSetupComplete !== undefined 
        ? response.data.tenantSetupComplete 
        : true;
    
      const expiry = new Date(Date.now() + 3600 * 1000).toISOString();
    
      login(response.data.access, response.data.refresh, expiry, response.data.activeTenant);
    
      // ✅ Log tenant industry/info here (safe scope)
      console.log('Tenant Info:', response.data.activeTenant);
    
      if (tenantSetupComplete) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/settings/team', { replace: true });
      }
    
    } catch (err) {
      console.error('Login error:', err.response || err.message);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Invalid email or password.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container login-container">
      <div className="auth-header">
        <h2>Welcome Back!</h2>
        <p>Sign in to manage your leads, properties, and team.</p>
      </div>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Logging In...' : 'Login'}
        </button>
      </form>

      <p>
        <a href="/forgot-password">Forgot Password?</a>
      </p>
      <p>
        Don't have an account? <a href="/signup">Sign Up</a>
      </p>
    </div>
  );
};

export default Login;