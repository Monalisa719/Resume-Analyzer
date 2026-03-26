import React, { useState } from 'react';
import './Templates.css';

const Professional = ({ data }) => (
  <div className="resume-canvas professional">
    <header className="prof-header">
      <h1>{data.basics.name}</h1>
      <p>{[data.basics.location, data.basics.phone, data.basics.email].filter(Boolean).join(' | ')}</p>
    </header>
    
    <div className="prof-section">
      <h3 className="prof-title">SKILLS</h3>
      <div className="prof-content skills">
        <p><strong>Frontend:</strong> {data.skills?.frontend?.join(', ')}</p>
        <p><strong>Backend:</strong> {data.skills?.backend?.join(', ')}</p>
        <p><strong>Databases:</strong> {data.skills?.databases?.join(', ')}</p>
        <p><strong>Tools:</strong> {data.skills?.tools?.join(', ')}</p>
      </div>
    </div>

    <div className="prof-section">
      <h3 className="prof-title">PROJECTS</h3>
      <div className="prof-content">
        {data.projects?.map((item, i) => (
          <div key={i} className="prof-item">
            <div className="prof-item-header">
              <h4>{item.name}</h4>
              <span>{item.startDate && `${item.startDate} - ${item.endDate || 'Present'}`}</span>
            </div>
            <p className="tech-stack"><em>{item.technologies?.join(' | ')}</em></p>
            <ul>
              {item.highlights?.map((h, j) => <li key={j}>{h}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>

    <div className="prof-section">
      <h3 className="prof-title">EDUCATION & ACHIEVEMENTS</h3>
      <div className="prof-content">
        {data.education?.map((item, i) => (
          <div key={`edu-${i}`} className="prof-item-header">
            <h4>{item.institution} - {item.studyType} in {item.area}</h4>
            <span>{item.score}</span>
          </div>
        ))}
        <ul style={{ marginTop: '10px' }}>
          {data.achievements?.map((ach, i) => <li key={`ach-${i}`}>{ach}</li>)}
        </ul>
      </div>
    </div>
  </div>
);

const Creative = ({ data }) => (
  <div className="resume-canvas creative">
    <div className="creative-sidebar">
      <div className="creative-avatar">{data.basics.name?.charAt(0)}</div>
      <h2 className="creative-name">{data.basics.name}</h2>
      <div className="creative-contact">
         <p>{data.basics.email}</p>
         <p>{data.basics.phone}</p>
         <p>{data.basics.location}</p>
      </div>
      
      <h3 className="creative-title">SKILLS</h3>
      <div className="creative-skills">
        {['frontend', 'backend', 'databases', 'tools'].map(cat => (
          data.skills?.[cat]?.length > 0 && (
            <div key={cat}>
              <h4>{cat.toUpperCase()}</h4>
              <p>{data.skills[cat].join(', ')}</p>
            </div>
          )
        ))}
      </div>
    </div>
    
    <div className="creative-main">
      <h3 className="creative-title">EXPERIENCE & PROJECTS</h3>
      {data.projects?.map((item, i) => (
        <div key={i} className="creative-card">
          <h4>{item.name} <span className="creative-dates">{item.startDate}</span></h4>
          <p className="creative-tech">{item.technologies?.join(' • ')}</p>
          <ul>
            {item.highlights?.map((h, j) => <li key={j}>{h}</li>)}
          </ul>
        </div>
      ))}
      
      <h3 className="creative-title" style={{ marginTop: '20px' }}>EDUCATION & MILESTONES</h3>
      {data.education?.map((item, i) => (
        <div key={`edu-${i}`} className="creative-card">
          <h4>{item.institution}</h4>
          <p>{item.studyType} - {item.area} | <strong>{item.score}</strong></p>
        </div>
      ))}
      <div className="creative-card" style={{marginTop: '10px'}}>
        <ul>
          {data.achievements?.map((ach, i) => <li key={`ach-${i}`}>{ach}</li>)}
        </ul>
      </div>
    </div>
  </div>
);

const Minimal = ({ data }) => (
  <div className="resume-canvas minimal">
    <header className="minimal-header">
      <h1>{data.basics.name}</h1>
      <p>{data.basics.email} &nbsp;•&nbsp; {data.basics.phone} &nbsp;•&nbsp; {data.basics.location}</p>
    </header>

    <div className="minimal-grid">
      <div className="minimal-column">
         <section>
           <h3>Technologies</h3>
           <p className="minimal-paragraph">
             {data.skills?.frontend?.concat(data.skills?.backend, data.skills?.databases).filter(Boolean).join(', ')}
           </p>
         </section>
         <section>
           <h3>Education</h3>
           {data.education?.map((item, i) => (
             <p key={i} className="minimal-paragraph"><strong>{item.institution}</strong><br/>{item.studyType} in {item.area} ({item.score})</p>
           ))}
         </section>
      </div>

      <div className="minimal-column" style={{ flex: 2 }}>
         <section>
           <h3>Key Projects</h3>
           {data.projects?.map((item, i) => (
            <div key={i} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{item.name}</h4>
              </div>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', color: '#666' }}>{item.technologies?.join(' / ')}</p>
              <ul style={{ margin: 0, paddingLeft: '15px' }}>
                {item.highlights?.slice(0,2).map((h, j) => <li key={j} style={{ fontSize: '0.9em', color: '#444' }}>{h}</li>)}
              </ul>
            </div>
          ))}
         </section>
      </div>
    </div>
  </div>
);

export default function TemplateViewer({ jsonData }) {
  const [active, setActive] = useState('professional');

  const downloadPDF = () => {
    window.print();
  };

  // Verify basic structure exists
  const hasData = jsonData && jsonData.basics;
  if (!hasData) {
    return <div className="template-viewer-error">Insufficient JSON data parsed by the AI to build templates.</div>;
  }

  return (
    <div className="template-viewer">
      <div className="template-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <p><strong>🎨 Select a Canva-style Template:</strong></p>
          <div className="template-buttons">
            <button className={active === 'professional' ? 'active ui-btn' : 'ui-btn'} onClick={() => setActive('professional')}>Classic Professional</button>
            <button className={active === 'creative' ? 'active ui-btn' : 'ui-btn'} onClick={() => setActive('creative')}>Modern Creative</button>
            <button className={active === 'minimal' ? 'active ui-btn' : 'ui-btn'} onClick={() => setActive('minimal')}>Sleek Minimalist</button>
          </div>
        </div>
        <button className="ui-btn" style={{ background: '#ff006e', color: 'white', padding: '12px 25px', fontSize: '1rem', marginTop: '15px' }} onClick={downloadPDF}>📥 Download as PDF</button>
      </div>
      
      <div className="template-render-wrapper">
         <div id="resume-capture-area" style={{ background: 'white' }}>
           {active === 'professional' && <Professional data={jsonData} />}
           {active === 'creative' && <Creative data={jsonData} />}
           {active === 'minimal' && <Minimal data={jsonData} />}
         </div>
      </div>
    </div>
  );
}
