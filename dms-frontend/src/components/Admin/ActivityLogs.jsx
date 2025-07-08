import React, { useState, useEffect } from 'react';
import api from '../../api';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    action: '',
    resource: ''
  });
  const [uniqueValues, setUniqueValues] = useState({
    roles: new Set(),
    actions: new Set(),
    resources: new Set()
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.admin.getActivityLogs();
      
      if (response.data && Array.isArray(response.data.logs)) {
        const parsedLogs = response.data.logs.map(log => parseLogEntry(log)).filter(Boolean);
        setLogs(parsedLogs);
        setFilteredLogs(parsedLogs);
        
        // Extract unique values for filters
        const roles = new Set();
        const actions = new Set();
        const resources = new Set();
        
        parsedLogs.forEach(log => {
          roles.add(log.admin);
          actions.add(log.action);
          resources.add(log.resource);
        });
        
        setUniqueValues({
          roles,
          actions,
          resources
        });
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

  useEffect(() => {
    applyFilters();
  }, [filters, logs]);

  const parseLogEntry = (log) => {
    try {
      const parts = log.split(' - ');
      if (parts.length < 3) return null;
      
      const actionPart = parts[2];
      const colonIndex = actionPart.indexOf(':');
      
      if (colonIndex === -1) return null;
      
      const actionType = actionPart.substring(0, colonIndex).trim();
      const data = actionPart.substring(colonIndex + 1).trim();
      
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    const filtered = logs.filter(log => {
      return (
        (filters.role === '' || log.admin === filters.role) &&
        (filters.action === '' || log.action === filters.action) &&
        (filters.resource === '' || log.resource === filters.resource)
      );
    });
    setFilteredLogs(filtered);
  };

  const resetFilters = () => {
    setFilters({
      role: '',
      action: '',
      resource: ''
    });
    setFilteredLogs(logs);
  };

  return (
    <div className="activity-logs">
      <div className="header">
        <h2>Activity Logs</h2>
        <button 
          className="refresh-button"
          onClick={fetchLogs} 
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Refreshing...
            </>
          ) : (
            <>
              <span className="refresh-icon">↻</span>
              Refresh Logs
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
          <button className="close-button" onClick={() => setError('')}>×</button>
        </div>
      )}
      
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="role-filter">Role</label>
          <select 
            id="role-filter" 
            name="role" 
            value={filters.role}
            onChange={handleFilterChange}
          >
            <option value="">All Roles</option>
            {Array.from(uniqueValues.roles).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="action-filter">Action</label>
          <select 
            id="action-filter" 
            name="action" 
            value={filters.action}
            onChange={handleFilterChange}
          >
            <option value="">All Actions</option>
            {Array.from(uniqueValues.actions).map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="resource-filter">Resource</label>
          <select 
            id="resource-filter" 
            name="resource" 
            value={filters.resource}
            onChange={handleFilterChange}
          >
            <option value="">All Resources</option>
            {Array.from(uniqueValues.resources).map(resource => (
              <option key={resource} value={resource}>{resource}</option>
            ))}
          </select>
        </div>
        
        <button 
          className="reset-button"
          onClick={resetFilters}
          disabled={filters.role === '' && filters.action === '' && filters.resource === ''}
        >
          Reset Filters
        </button>
      </div>
      
      {loading && filteredLogs.length === 0 ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="no-results">
          <p>No activity logs match your filters</p>
        </div>
      ) : (
        <div className="logs-table">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={index}>
                  <td className="timestamp">{log.timestamp}</td>
                  <td><span className="badge role">{log.admin}</span></td>
                  <td><span className="badge action">{log.action}</span></td>
                  <td><span className="badge resource">{log.resource}</span></td>
                  <td className="details">{log.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;