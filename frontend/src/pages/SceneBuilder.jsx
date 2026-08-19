import React, { useState, useEffect } from 'react';
import { fetchEntities, updateEntity } from '../api';

const SceneBuilder = ({ productionId }) => {
  const [activeTab, setActiveTab] = useState('characters');
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productionId) {
      loadEntities();
    }
  }, [productionId]);

  const loadEntities = async () => {
    setLoading(true);
    try {
      const res = await fetchEntities(productionId);
      setEntities(res.data || []);
    } catch (error) {
      console.error("Failed to load entities", error);
    }
    setLoading(false);
  };

  const handleVerifyToggle = async (entity) => {
    try {
      const res = await updateEntity(entity.id, { isUserVerified: !entity.isUserVerified });
      setEntities(entities.map(e => e.id === entity.id ? res.data : e));
    } catch (err) {
      console.error(err);
    }
  };

  const typeMap = {
    'characters': 'Character',
    'props': 'Prop',
    'locations': 'Location',
    'costume': 'Costume',
    'equipment': 'Equipment'
  };

  const currentType = typeMap[activeTab];
  const activeEntities = entities.filter(e => e.type === currentType || (currentType === 'Costume' && e.type === 'Wardrobe'));

  const countEntities = (type) => entities.filter(e => e.type === type || (type === 'Costume' && e.type === 'Wardrobe')).length;

  return (
    <div className="screen active" id="entitybuilder">
      <div className="page-head">
        <div>
          <div className="page-title">Scene Builder</div>
          <div className="page-sub">Review and edit entities extracted from script.txt, grouped by type</div>
        </div>
        <button className="btn primary">+ Add Entity</button>
      </div>

      <div className="sb-launcher">
        <div className="sb-launcher-head">
          <h3>Entity Types</h3>
          <span>
            {countEntities('Character')} characters · {countEntities('Prop')} props · {countEntities('Location')} locations · {countEntities('Costume')} costumes · {countEntities('Equipment')} equipment
          </span>
        </div>
        <div className="sb-grid">
          <div 
            className={`sb-card ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            <div className="sb-card-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.6"/>
                <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6"/>
              </svg>
            </div>
            <div className="sb-card-label">Characters</div>
            <div className="sb-card-count">{countEntities('Character')} entities</div>
          </div>
          <div 
            className={`sb-card ${activeTab === 'props' ? 'active' : ''}`}
            onClick={() => setActiveTab('props')}
          >
            <div className="sb-card-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                <rect x="3.5" y="3.5" width="9" height="9" rx="2"/>
                <rect x="11.5" y="11.5" width="9" height="9" rx="2"/>
              </svg>
            </div>
            <div className="sb-card-label">Props</div>
            <div className="sb-card-count">{countEntities('Prop')} entities</div>
          </div>
          <div 
            className={`sb-card ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            <div className="sb-card-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8.5"/>
                <path d="M3.5 12h17M12 3.5c2.6 2.4 4 5.3 4 8.5s-1.4 6.1-4 8.5c-2.6-2.4-4-5.3-4-8.5s1.4-6.1 4-8.5z"/>
              </svg>
            </div>
            <div className="sb-card-label">Locations</div>
            <div className="sb-card-count">{countEntities('Location')} entities</div>
          </div>
          <div 
            className={`sb-card ${activeTab === 'costume' ? 'active' : ''}`}
            onClick={() => setActiveTab('costume')}
          >
            <div className="sb-card-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                <path d="M8 4L4 7v3.5l2.5-1V20h11V9.5L20 10.5V7l-4-3-1.5 1.8a3 3 0 0 1-5 0z"/>
              </svg>
            </div>
            <div className="sb-card-label">Costume</div>
            <div className="sb-card-count">{countEntities('Costume')} entities</div>
          </div>
          <div 
            className={`sb-card ${activeTab === 'equipment' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipment')}
          >
            <div className="sb-card-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                <rect x="2.5" y="7" width="14" height="10" rx="2"/>
                <path d="M16.5 10l5-2.5v9L16.5 14"/>
                <circle cx="8.5" cy="12" r="2.3"/>
              </svg>
            </div>
            <div className="sb-card-label">Equipment</div>
            <div className="sb-card-count">{countEntities('Equipment')} entities</div>
          </div>
        </div>
      </div>

      <div className="entity-panel active">
        <div className="panel" style={{flex: 1}}>
          <div className="panel-head">
            <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
            <span className="hint">{activeEntities.length} entities</span>
          </div>
          <div className="panel-body">
            {loading ? <p>Loading...</p> : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Sub Category</th>
                    <th className="num">Mentions</th>
                    <th className="num">Est. Days</th>
                    <th>AI Source</th>
                    <th>Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEntities.map(entity => (
                    <tr key={entity.id}>
                      <td>{entity.name}</td>
                      <td>{entity.subCategory || '-'}</td>
                      <td className="num">{entity.mentions}</td>
                      <td className="num">{entity.estimatedDays}</td>
                      <td>
                        {entity.isAiExtracted ? 
                          <span className="badge signed">AI Extracted</span> : 
                          <span className="badge">Manual</span>}
                      </td>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={entity.isUserVerified} 
                          onChange={() => handleVerifyToggle(entity)} 
                        />
                      </td>
                    </tr>
                  ))}
                  {activeEntities.length === 0 && (
                    <tr><td colSpan="6" style={{textAlign:'center'}}>No entities found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SceneBuilder;
