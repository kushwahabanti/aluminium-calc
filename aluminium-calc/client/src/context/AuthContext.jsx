import { API_BASE_URL } from '../config';
import React, { createContext, useState, useEffect } from 'react';
import { initStore, getFullConfig } from '../services/dataStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserAndSettings();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setSettings(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUserAndSettings = async () => {
    try {
      const [userRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      } else {
        setToken(null);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        // Initialize the in-memory data store with the configuration from backend
        initStore(settingsData.configuration || {}, handleStoreUpdate);
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreUpdate = async (newConfig) => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ configuration: newConfig })
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to save settings to database', err);
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      }
    } catch (err) {
      console.error('Failed to update user', err);
    }
    return false;
  };

  const uploadAvatar = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`${API_BASE_URL}/auth/me/avatar`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      }
    } catch (err) {
      console.error('Failed to upload avatar', err);
    }
    return false;
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      return true;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const register = async (name, email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      setToken(data.token);
      return true;
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, settings, token, loading, login, register, logout, updateUserProfile, uploadAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};
