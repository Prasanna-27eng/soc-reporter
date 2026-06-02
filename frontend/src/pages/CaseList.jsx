import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, ExternalLink, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const SEV = {
  Critical: { text: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
  High:     { text: '#FDBA74', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  Medium:   { text: '#FDE047', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.2)' },
  Low:      { text: '#86EFAC', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)' },
};
const STATUS = { Open: '#EF4444', 'In Progress': '#EAB308', Closed: '#22C55E' };

const TEMPLATES = {
  Ransomware:      { severity: 'Critical', description: 'Ransomware infection detected. Files encrypted and ransom note found.' },
  Phishing:        { severity: 'High',     description: 'Phishing email campaign targeting organisation users.' },
  BEC:             { severity: 'High',     description: 'Business Email Compromise — suspicious email activity from compromised account.' },
  'Insider Threat':{ severity: 'High',     description: 'Suspected insider threat — unusual data access or exfiltration.' },
  Malware:         { severity: 'High',     description: 'Malware infection detected on endpoint.' },
  'Data Breach':   { severity: 'Critical', description: 'Potential data breach — unauthorised access to sensitive data detected.' },
  Other:           { severity: 'Medium',   description: '' },
};
const BLANK = { title: '', severity: 'High', incident_type: 'Phishing', affected_systems: '', analyst_name: '', customer_name: '', classification: 'TLP:AMBER', description: '', iocs: [], timeline_events: [] };

const inp = { width: '100%', padding: '8px 12px', background: '#0C0C0E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F4F4F5', fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: 11, color: '#71717A', marginBottom: 6, fontWeight: 500 };

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState('All');
  const navigate = useNavigate();

  const load = () => api.get('/api/cases').then(r => setCases(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const applyTemplate = type => {
    const tmpl = TEMPLATES[type] || TEMPLATES.Other;
    setForm(f => ({ ...f, incident_type: type, ...tmpl }));
  };

  const create = async e => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setCreating(true);
    try {
      const res = await api.post('/api/cases', form);
      toast.success(`Case ${res.data.case_number} created`);
      setShowNew(false);
      setForm(BLANK);
      navigate(`/cases/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create case');
    } finally { setCreating(false); }
  };

  const deleteCase = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this case?')) return;
    await api.delete(`/api/cases/${id}`);
    toast.success('Case deleted');
    load();
  };

  const filtered = cases.filter(c => {
    const q = search.toLowerCase();
    return (c.title.toLowerCase().includes(q) || c.case_number.toLowerCase().includes(q)) &&
      (filterSev === 'All' || c.severity === filterSev);
  });

  return (
    <div style={{ padding: 24, maxWidth: 1240, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F4F4F5', margin: 0 }}>Cases</h1>
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 4, marginBottom: 0 }}>{cases.length} total incidents</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 16px', borderRadius: 9,
          background: '#7C3AED', border: 'none', color: '#fff',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
          onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
        >
          <Plus size={15} /> New Case
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#52525B' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..."
            style={{ ...inp, paddingLeft: 32, maxWidth: '100%' }} />
        </div>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          style={{ ...inp, width: 'auto', paddingRight: 32 }}>
          {['All','Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#52525B', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <FolderOpen size={36} style={{ color: '#27272A', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#52525B', fontSize: 13, margin: '0 0 10px' }}>No cases found.</p>
            <button onClick={() => setShowNew(true)} style={{ color: '#A78BFA', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Create one →</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#1C1C1F' }}>
                {['Case #','Title','Type','Severity','Status','IOCs','AI',''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#71717A', fontWeight: 500, letterSpacing: '0.02em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const sev = SEV[c.severity] || SEV.Low;
                return (
                  <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{
                    cursor: 'pointer',
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#A78BFA', whiteSpace: 'nowrap' }}>{c.case_number}</td>
                    <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                      <p style={{ fontSize: 13, color: '#E4E4E7', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      {c.customer_name && <p style={{ fontSize: 11, color: '#52525B', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customer_name}</p>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#71717A', whiteSpace: 'nowrap' }}>{c.incident_type}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${sev.border}`, background: sev.bg, color: sev.text, fontWeight: 600 }}>
                        {c.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: STATUS[c.status] || '#71717A', whiteSpace: 'nowrap' }}>{c.status}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#71717A' }}>{Array.isArray(c.iocs) ? c.iocs.length : 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.ai_executive_summary
                        ? <span style={{ fontSize: 10, color: '#A78BFA', background: 'rgba(139,92,246,0.1)', padding: '2px 8px', borderRadius: 20 }}>AI ✓</span>
                        : <span style={{ color: '#3F3F46', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate(`/cases/${c.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: 4 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#A78BFA'}
                          onMouseLeave={e => e.currentTarget.style.color = '#52525B'}><ExternalLink size={14} /></button>
                        <button onClick={e => deleteCase(e, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: 4 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#52525B'}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Case Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto' }}>
            {/* Modal header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#18181B' }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F4F4F5', margin: 0 }}>New Incident Case</h2>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <form onSubmit={create} style={{ padding: 22 }}>
              {/* Templates */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl}>Quick Template</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.keys(TEMPLATES).map(t => (
                    <button type="button" key={t} onClick={() => applyTemplate(t)} style={{
                      fontSize: 12, padding: '5px 12px', borderRadius: 8,
                      border: `1px solid ${form.incident_type === t ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      background: form.incident_type === t ? 'rgba(139,92,246,0.12)' : 'transparent',
                      color: form.incident_type === t ? '#A78BFA' : '#71717A',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    style={inp} placeholder="e.g. Phishing attack targeting finance team" required />
                </div>
                <div>
                  <label style={lbl}>Severity</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                    style={{ ...inp, paddingRight: 32 }}>
                    {['Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Classification</label>
                  <select value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value }))}
                    style={{ ...inp, paddingRight: 32 }}>
                    {['TLP:RED','TLP:AMBER','TLP:GREEN','TLP:WHITE'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Analyst Name</label>
                  <input value={form.analyst_name} onChange={e => setForm(f => ({ ...f, analyst_name: e.target.value }))}
                    style={inp} placeholder="Prasanna Kumar" />
                </div>
                <div>
                  <label style={lbl}>Customer Name</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                    style={inp} placeholder="Acme Corp" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Affected Systems</label>
                  <input value={form.affected_systems} onChange={e => setForm(f => ({ ...f, affected_systems: e.target.value }))}
                    style={inp} placeholder="WORKSTATION-01, email gateway, DC01" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Initial Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Describe what happened..." />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowNew(false)} style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#A1A1AA', fontSize: 13, cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" disabled={creating} style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                  background: creating ? '#5B21B6' : '#7C3AED', color: '#fff',
                  fontSize: 13, fontWeight: 500, cursor: creating ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}>{creating ? 'Creating...' : 'Create Case'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
