import React, { useState, useEffect } from 'react';
import api from '../../api';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawResponse, setRawResponse] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      // Use the new activity logs endpoint
      const response = await api.admin.getActivityLogs();
      
      // Debug: Save raw response
      setRawResponse(response);
      
      if (response.data && Array.isArray(response.data.logs)) {
        setLogs(response.data.logs);
      } else {
        setError('Unexpected response format');
      }
    } catch (err) {
      setError('Failed to fetch activity logs');
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Parse all types of log entries (user, company, document)
  const parseLogEntry = (log) => {
    try {
      const parts = log.split(' - ');
      if (parts.length < 3) return null;
      
      const actionPart = parts[2];
      const colonIndex = actionPart.indexOf(':');
      
      if (colonIndex === -1) return null;
      
      const actionType = actionPart.substring(0, colonIndex).trim();
      const data = actionPart.substring(colonIndex + 1).trim();
      
      // Extract action and resource type
      const [action, resource] = actionType.split(' ');
      
      return {
        timestamp: parts[0],
        admin: parts[1],
        action,
        resource,
        data
      };
    } catch (e) {
      console.error('Error parsing log entry:', e);
      return null;
    }
  };

  return (
    <div className="container">
      <h2>Activity Logs</h2>
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
        <p>{loading ? 'Loading logs...' : 'No activity logs available'}</p>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => {
              const entry = parseLogEntry(log);
              return entry ? (
                <tr key={index}>
                  <td>{entry.timestamp}</td>
                  <td>{entry.admin}</td>
                  <td>{entry.action}</td>
                  <td>{entry.resource}</td>
                  <td>{entry.data}</td>
                </tr>
              ) : (
                <tr key={index}>
                  <td colSpan="5" className="invalid-log">
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

export default ActivityLogs;