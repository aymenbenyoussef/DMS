import React, { useState, useEffect } from 'react';
import api from '../../api';

const UserCreationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawResponse, setRawResponse] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.admin.getUserCreationLogs();
      
      // Debug: Save raw response
      setRawResponse(response);
      console.log('Logs API Response:', response);
      
      if (response.data && Array.isArray(response.data.logs)) {
        setLogs(response.data.logs);
      } else {
        setError('Unexpected response format');
        console.error('Unexpected response format:', response);
      }
    } catch (err) {
      setError('Failed to fetch logs');
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        config: err.config
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const parseLogEntry = (log) => {
    try {
      const parts = log.split(' - ');
      if (parts.length < 3) return null;
      
      const userPart = parts[2].replace('Create new user: ', '');
      const userData = userPart.split(', ');
      
      return {
        timestamp: parts[0],
        admin: parts[1],
        userId: userData[0] || 'N/A',
        username: userData[1] || 'N/A',
        email: userData[2] || 'N/A',
        status: userData[3] || 'N/A'
      };
    } catch (e) {
      console.error('Error parsing log entry:', e, log);
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
      
      {/* Debug information panel */}
      {rawResponse && (
        <div className="debug-panel">
          <h3>Debug Information</h3>
          <p><strong>Status:</strong> {rawResponse.status}</p>
          <p><strong>Data Preview:</strong> {JSON.stringify(rawResponse.data.logs?.slice(0, 2))}...</p>
        </div>
      )}
      
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
                  <td colSpan="6" className="invalid-log">
                    {log || 'Empty log entry'}
                  </td>
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