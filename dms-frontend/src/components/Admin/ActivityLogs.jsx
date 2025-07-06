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
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Activity Logs</h2>
        <button 
          className="btn btn-primary d-flex align-items-center"
          onClick={fetchLogs} 
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Refreshing...
            </>
          ) : (
            <>
              <i className="bi bi-arrow-repeat me-2"></i>
              Refresh Logs
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      
      {/* Debug information panel */}
      {rawResponse && (
        <div className="card border-info mb-4">
          <div className="card-header bg-info text-white">
            <h3 className="h5 mb-0">Debug Information</h3>
          </div>
          <div className="card-body">
            <p className="mb-1"><strong>Status:</strong> {rawResponse.status}</p>
            <p className="mb-0"><strong>Data Preview:</strong> {JSON.stringify(rawResponse.data.logs?.slice(0, 2))}...</p>
          </div>
        </div>
      )}
      
      {logs.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bi bi-journal-x fs-1 text-muted mb-3"></i>
            <p className="fs-5 mb-0">{loading ? 'Loading activity logs...' : 'No activity logs available'}</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th scope="col">Date & Time</th>
                <th scope="col">Admin</th>
                <th scope="col">Action</th>
                <th scope="col">Resource</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => {
                const entry = parseLogEntry(log);
                return entry ? (
                  <tr key={index}>
                    <td className="font-monospace">{entry.timestamp}</td>
                    <td><span className="badge bg-secondary">{entry.admin}</span></td>
                    <td><span className="badge bg-primary">{entry.action}</span></td>
                    <td><span className="badge bg-success">{entry.resource}</span></td>
                    <td className="text-break">{entry.data}</td>
                  </tr>
                ) : (
                  <tr key={index} className="table-warning">
                    <td colSpan="5" className="text-center">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {log || 'Empty log entry'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;