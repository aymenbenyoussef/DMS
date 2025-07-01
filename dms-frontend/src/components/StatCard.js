import React from 'react';

const StatCard = ({ title, value, status }) => {
  return (
    <div className="stat-card">
      <h3 className="text-base font-medium text-gray-700 mb-1">{title}</h3>
      <div className="flex justify-between items-end">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-green-600">{status}</span>
      </div>
    </div>
  );
};

export default StatCard;