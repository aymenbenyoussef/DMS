import React, { useState, useEffect } from 'react';
import API from '../../api';
import './AdminUsers.css';
import { useNavigate } from 'react-router-dom';

const AdminCompanies = ({user}) => {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
      name: '',
      address: '',
      email: '',
      phone: '',
    });
  const navigate = useNavigate();
 
  const fetchCompanies = async () => {
        try {
          const response = await API.companies.getAll();
          const data = response.data;
          if (Array.isArray(data)) setCompanies(data);
          else if (data.companies) setCompanies(data.companies);
        } catch (err) {
          setError('Error loading companies');
          console.error(err);
        }
      };
  useEffect(() => {
      fetchCompanies();
    }, []);

    const handleEdit = (company) => {
  setEditingCompany(company); // You'll need to add this state: const [editingCompany, setEditingCompany] = useState(null);
  setFormData({
    name: company.name,
    address: company.address,
    email: company.email,
    phone: company.phone,
    // Add any other company fields you need to edit
  });
  
};
  const handleDelete = async (company_id) => {
  if (window.confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ?')) {
    try {
      await API.companies.delete(company_id); // Make sure your API has this endpoint
      setSuccess('Entreprise supprimée avec succès');
      fetchCompanies(); // You'll need to call this to refresh the list
    } catch (err) {
      setError('Erreur lors de la suppression de l\'entreprise');
      console.error('Error deleting company:', err);
    }
    window.dispatchEvent(new Event('companyDeleted'));
    navigate('/companies');
  }
};
  

  return (
    <div className="admin-users">
      <div className="admin-header">

      <h1>Companies management</h1></div>
      {/* Show loading */}
      {loading && <p>Loading companies...</p>}

      {/* Show error */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      
        <div className="users-list">
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company Name</th>
                  <th>Address</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Creation date</th>
                 
                </tr>
              </thead>
              <tbody>
                {companies.map(company => (
                  <React.Fragment key={company.id}>
                  <tr key={company.id}>
                    <td>{company.id}</td>
                    <td>{company.name}</td>
                    <td>{company.address}</td>
                    <td>{company.email}</td>
                    <td>{company.phone}</td>
                    <td>{company.created_at}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(company)}
                        >
                          Modify
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(company.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      

      
    </div>
  );
 
};
 



export default AdminCompanies;

