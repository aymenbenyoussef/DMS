// src/components/Profile.js
import React from 'react';
import NavBar from './NavBar';

const Profile = ({ user }) => {
  return (
    <div className="app-container">
      <NavBar user={user} />
      <div className="main-content">
        <div className="document-archive">
          <div className="archive-header">
            <h1 className="archive-title">User Profile</h1>
          </div>
          <div className="profile-container">
            {/* Add your profile content here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;