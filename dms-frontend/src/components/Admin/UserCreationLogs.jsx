import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api'; 

const UserCreationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      // Use the API method we just created
      const response = await api.admin.getUserCreationLogs();
      setLogs(response.data.logs);
    } catch (err) {
      setError('Failed to fetch logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

    const parseLogEntry = (log) => {
        try {
            // More flexible parsing
            const parts = log.split(' - ');
            if (parts.length < 3) return null;
            
            // Extract user data part
            const userPart = parts.slice(2).join(' - ').replace('Create new user: ', '');
            const userData = userPart.split(', ');
            
            // Handle different data lengths
            if (userData.length < 4) {
            console.warn('Incomplete log entry:', log);
            return {
                timestamp: parts[0],
                admin: parts[1],
                userId: userData[0] || 'N/A',
                username: userData[1] || 'N/A',
                email: userData[2] || 'N/A',
                status: userData[3] || 'N/A'
            };
            }
            
            return {
            timestamp: parts[0],
            admin: parts[1],
            userId: userData[0],
            username: userData[1],
            email: userData[2],
            status: userData[3]
            };
        } catch (e) {
            console.error('Error parsing log entry:', e);
            return null;
        }
    };

  return (
    <div className="container">
      <h2>User Creation Logs</h2>
      <button 
        className="refresh-btn"
        onClick={fetchLogs} 
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh Logs'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {logs.length === 0 ? (
        <p>{loading ? 'Loading logs...' : 'No logs available'}</p>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Admin</th>
              <th>User ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => {
              const entry = parseLogEntry(log);
              return entry ? (
                <tr key={index}>
                  <td>{entry.timestamp}</td>
                  <td>{entry.admin}</td>
                  <td>{entry.userId}</td>
                  <td>{entry.username}</td>
                  <td>{entry.email}</td>
                  <td>{entry.status}</td>
                </tr>
              ) : (
                <tr key={index}>
                  <td colSpan="6" className="invalid-log">Invalid log format</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserCreationLogs;