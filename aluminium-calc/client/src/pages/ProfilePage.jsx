import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Auth.css';

export default function ProfilePage() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <h2>User Profile</h2>
        <p>Your account details</p>
        
        <div style={{ marginTop: '24px' }}>
          <div className="form-group">
            <label>Name</label>
            <div style={{ padding: '10px', background: 'var(--surface-dark)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              {user.name}
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Email</label>
            <div style={{ padding: '10px', background: 'var(--surface-dark)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              {user.email}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Account Created</label>
            <div style={{ padding: '10px', background: 'var(--surface-dark)', borderRadius: '4px', border: '1px solid var(--border)' }}>
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
