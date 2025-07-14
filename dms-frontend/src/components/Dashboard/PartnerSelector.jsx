import React, { useState, useEffect } from 'react';
import API from '../../api';
import './PartnerSelector.css';

const PartnerSelector = ({ 
  selectedPartnerId, 
  onPartnerChange, 
  placeholder = "Sélectionner un partenaire",
  disabled = false 
}) => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await API.partner.getAll();
      setPartners(response.data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setError('Erreur lors du chargement des partenaires');
      setPartners([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePartnerChange = (e) => {
    const partnerId = e.target.value;
    const partner = partners.find(p => p.id === parseInt(partnerId));
    onPartnerChange(partnerId, partner);
  };

  if (isLoading) {
    return (
      <div className="partner-selector loading">
        <select disabled>
          <option>Chargement des partenaires...</option>
        </select>
      </div>
    );
  }

  if (error) {
    return (
      <div className="partner-selector error">
        <select disabled>
          <option>{error}</option>
        </select>
        <button 
          className="retry-btn" 
          onClick={loadPartners}
          title="Réessayer"
        >
          🔄
        </button>
      </div>
    );
  }

  return (
    <div className="partner-selector">
      <select
        value={selectedPartnerId || ''}
        onChange={handlePartnerChange}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {partners.map(partner => (
          <option key={partner.id} value={partner.id}>
            {partner.company_name}
            {partner.partnertypes && partner.partnertypes.length > 0 && (
              ` (${partner.partnertypes.map(pt => pt.name).join(', ')})`
            )}
          </option>
        ))}
      </select>
      
      {partners.length === 0 && (
        <div className="no-partners-message">
          Aucun partenaire disponible
        </div>
      )}
    </div>
  );
};

export default PartnerSelector;

