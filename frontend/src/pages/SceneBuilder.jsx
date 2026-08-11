import React, { useState } from 'react';

const SceneBuilder = ({ productionId }) => {
  const [activeTab, setActiveTab] = useState('characters');

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
          <span>7 characters · 12 props · 6 locations · 5 costumes · 4 equipment</span>
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
            <div className="sb-card-count">7 entities</div>
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
            <div className="sb-card-count">12 entities</div>
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
            <div className="sb-card-count">6 entities</div>
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
            <div className="sb-card-count">5 entities</div>
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
            <div className="sb-card-count">4 entities</div>
          </div>
        </div>
      </div>

      {/* Characters */}
      <div className={`entity-panel ${activeTab === 'characters' ? 'active' : ''}`}>
        <div className="panel">
          <div className="panel-head"><h3>Characters</h3><span className="hint">7 entities</span></div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Actor</th><th>Scenes</th><th className="num">Mentions</th><th className="num">Shoot Days</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Kabir</td><td>Vikrant Bose</td><td className="mono">SC 01–04</td><td className="num">37</td><td className="num">18</td></tr>
                <tr><td>Nadia</td><td>Ira Kapoor</td><td className="mono">SC 01, 03</td><td className="num">22</td><td className="num">9</td></tr>
                <tr><td>Inspector Rane</td><td>Unassigned</td><td className="mono">SC 03</td><td className="num">9</td><td className="num">3</td></tr>
                <tr><td>Warehouse Guard</td><td>Unassigned</td><td className="mono">SC 03</td><td className="num">4</td><td className="num">2</td></tr>
                <tr><td>Cafe Owner</td><td>Unassigned</td><td className="mono">SC 01</td><td className="num">3</td><td className="num">1</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Add Character</h3></div>
          <div className="panel-body">
            <div className="form-row"><label>Character Name</label><input type="text" placeholder="Inspector Rane" /></div>
            <div className="form-row"><label>Actor</label><input type="text" placeholder="Cast pending" /></div>
            <div className="form-row"><label>Scenes</label><input type="text" placeholder="SC 03" /></div>
            <div className="form-row"><label>Rate Card Tier</label><select><option>Lead</option><option>Supporting</option><option>Junior Artist</option></select></div>
            <button className="btn primary" style={{width: '100%', justifyContent: 'center'}}>Save Character</button>
          </div>
        </div>
      </div>

      {/* Props */}
      <div className={`entity-panel ${activeTab === 'props' ? 'active' : ''}`}>
        <div className="panel">
          <div className="panel-head"><h3>Props</h3><span className="hint">12 entities</span></div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Prop</th><th>Category</th><th>Scenes</th><th className="num">Mentions</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Vintage Revolver</td><td>Weapon</td><td className="mono">SC 03</td><td className="num">11</td></tr>
                <tr><td>Leather Briefcase</td><td>Set Dressing</td><td className="mono">SC 02, 03</td><td className="num">6</td></tr>
                <tr><td>Kabir's Wristwatch</td><td>Personal</td><td className="mono">SC 01–04</td><td className="num">5</td></tr>
                <tr><td>Coffee Shop Menu Board</td><td>Set Dressing</td><td className="mono">SC 01</td><td className="num">2</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Add Prop</h3></div>
          <div className="panel-body">
            <div className="form-row"><label>Prop Name</label><input type="text" placeholder="Vintage Revolver" /></div>
            <div className="form-row"><label>Category</label><select><option>Weapon</option><option>Set Dressing</option><option>Personal</option></select></div>
            <div className="form-row"><label>Scenes</label><input type="text" placeholder="SC 03" /></div>
            <button className="btn primary" style={{width: '100%', justifyContent: 'center'}}>Save Prop</button>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className={`entity-panel ${activeTab === 'locations' ? 'active' : ''}`}>
        <div className="panel">
          <div className="panel-head"><h3>Locations</h3><span className="hint">6 entities</span></div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Location</th><th>Int/Ext</th><th>Scenes</th><th>Permit</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Coffee Shop</td><td className="mono">INT</td><td className="mono">SC 01</td><td><span className="badge signed">Confirmed</span></td></tr>
                <tr><td>Marine Drive</td><td className="mono">EXT</td><td className="mono">SC 02</td><td><span className="badge negotiating">Pending</span></td></tr>
                <tr><td>Warehouse</td><td className="mono">INT</td><td className="mono">SC 03</td><td><span className="badge signed">Confirmed</span></td></tr>
                <tr><td>Highway Bypass</td><td className="mono">EXT</td><td className="mono">SC 04</td><td><span className="badge negotiating">Pending</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Add Location</h3></div>
          <div className="panel-body">
            <div className="form-row"><label>Location Name</label><input type="text" placeholder="Marine Drive" /></div>
            <div className="form-row"><label>Int / Ext</label><select><option>Interior</option><option>Exterior</option></select></div>
            <div className="form-row"><label>Scenes</label><input type="text" placeholder="SC 02" /></div>
            <button className="btn primary" style={{width: '100%', justifyContent: 'center'}}>Save Location</button>
          </div>
        </div>
      </div>

      {/* Costume */}
      <div className={`entity-panel ${activeTab === 'costume' ? 'active' : ''}`}>
        <div className="panel">
          <div className="panel-head"><h3>Costume</h3><span className="hint">5 entities</span></div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Item</th><th>Character</th><th>Scenes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Trench Coat</td><td>Kabir</td><td className="mono">SC 02, 04</td></tr>
                <tr><td>Red Evening Dress</td><td>Nadia</td><td className="mono">SC 03</td></tr>
                <tr><td>Police Uniform</td><td>Inspector Rane</td><td className="mono">SC 03</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Add Costume</h3></div>
          <div className="panel-body">
            <div className="form-row"><label>Item Name</label><input type="text" placeholder="Trench Coat" /></div>
            <div className="form-row"><label>Character</label><input type="text" placeholder="Kabir" /></div>
            <div className="form-row"><label>Scenes</label><input type="text" placeholder="SC 02, 04" /></div>
            <button className="btn primary" style={{width: '100%', justifyContent: 'center'}}>Save Costume</button>
          </div>
        </div>
      </div>

      {/* Equipment */}
      <div className={`entity-panel ${activeTab === 'equipment' ? 'active' : ''}`}>
        <div className="panel">
          <div className="panel-head"><h3>Equipment</h3><span className="hint">4 entities</span></div>
          <div className="panel-body">
            <table>
              <thead>
                <tr>
                  <th>Equipment</th><th>Type</th><th>Scenes</th><th className="num">Rental Days</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Steadicam Rig</td><td>Camera</td><td className="mono">SC 02</td><td className="num">2</td></tr>
                <tr><td>LED Panel Kit</td><td>Lighting</td><td className="mono">SC 01, 03</td><td className="num">4</td></tr>
                <tr><td>Drone (DJI)</td><td>Aerial</td><td className="mono">SC 04</td><td className="num">1</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>Add Equipment</h3></div>
          <div className="panel-body">
            <div className="form-row"><label>Equipment Name</label><input type="text" placeholder="Steadicam Rig" /></div>
            <div className="form-row"><label>Type</label><select><option>Camera</option><option>Lighting</option><option>Sound</option><option>Aerial</option></select></div>
            <div className="form-row"><label>Rental Days</label><input type="text" placeholder="2" /></div>
            <button className="btn primary" style={{width: '100%', justifyContent: 'center'}}>Save Equipment</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SceneBuilder;
