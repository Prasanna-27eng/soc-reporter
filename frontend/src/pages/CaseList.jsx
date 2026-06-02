import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, ExternalLink, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const SEV = {
  Critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  High: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Low: 'text-green-400 bg-green-400/10 border-green-400/20',
};

const TEMPLATES = {
  Ransomware: { severity: 'Critical', description: 'Ransomware infection detected. Files encrypted and ransom note found.', commands_run: '', findings: '' },
  Phishing: { severity: 'High', description: 'Phishing email campaign targeting organisation users.', commands_run: '', findings: '' },
  BEC: { severity: 'High', description: 'Business Email Compromise — suspicious email activity detected from compromised account.', commands_run: '', findings: '' },
  'Insider Threat': { severity: 'High', description: 'Suspected insider threat — unusual data access or exfiltration by internal user.', commands_run: '', findings: '' },
  Malware: { severity: 'High', description: 'Malware infection detected on endpoint.', commands_run: '', findings: '' },
  'Data Breach': { severity: 'Critical', description: 'Potential data breach — unauthorised access to sensitive data detected.', commands_run: '', findings: '' },
  Other: { severity: 'Medium', description: '', commands_run: '', findings: '' },
};

const BLANK = {
  title: '', severity: 'High', incident_type: 'Phishing',
  affected_systems: '', analyst_name: '', customer_name: '',
  classification: 'TLP:AMBER', description: '', commands_run: '', findings: '',
  iocs: [], timeline_events: [],
};

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
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.case_number.toLowerCase().includes(search.toLowerCase());
    const matchSev = filterSev === 'All' || c.severity === filterSev;
    return matchSearch && matchSev;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cases</h1>
          <p className="text-soc-muted text-sm mt-1">{cases.length} total incidents</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-soc-cyan text-soc-bg px-4 py-2 rounded-lg text-sm font-semibold hover:bg-soc-cyan-dim transition-colors"
        >
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="w-full bg-soc-card border border-soc-border rounded-lg pl-8 pr-4 py-2 text-sm text-soc-text placeholder-soc-muted focus:outline-none focus:border-soc-cyan"
          />
        </div>
        <select
          value={filterSev} onChange={e => setFilterSev(e.target.value)}
          className="bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan"
        >
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Cases Table */}
      <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-soc-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FolderOpen className="mx-auto mb-3 text-soc-muted" size={40} />
            <p className="text-soc-muted">No cases found.</p>
            <button onClick={() => setShowNew(true)} className="mt-3 text-soc-cyan text-sm hover:underline">Create one →</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-soc-border bg-soc-surface">
                {['Case #', 'Title', 'Type', 'Severity', 'Status', 'IOCs', 'AI', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-soc-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border">
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="hover:bg-soc-surface cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-mono text-soc-cyan">{c.case_number}</td>
                  <td className="px-4 py-3 text-sm text-white max-w-xs">
                    <p className="truncate">{c.title}</p>
                    {c.customer_name && <p className="text-xs text-soc-muted truncate">{c.customer_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-soc-muted">{c.incident_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEV[c.severity] || SEV.Low}`}>
                      {c.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      c.status === 'Open' ? 'text-red-400' :
                      c.status === 'In Progress' ? 'text-yellow-400' : 'text-green-400'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-soc-muted">{Array.isArray(c.iocs) ? c.iocs.length : 0}</td>
                  <td className="px-4 py-3">
                    {c.ai_executive_summary ? (
                      <span className="text-xs text-soc-cyan bg-soc-cyan/10 px-2 py-0.5 rounded-full">AI ✓</span>
                    ) : (
                      <span className="text-xs text-soc-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/cases/${c.id}`)} className="text-soc-muted hover:text-soc-cyan transition-colors"><ExternalLink size={14} /></button>
                      <button onClick={e => deleteCase(e, c.id)} className="text-soc-muted hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Case Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-soc-card border-b border-soc-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">New Case</h2>
              <button onClick={() => setShowNew(false)} className="text-soc-muted hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              {/* Templates */}
              <div>
                <label className="block text-xs text-soc-muted mb-2">Quick Template</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(TEMPLATES).map(t => (
                    <button type="button" key={t} onClick={() => applyTemplate(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        form.incident_type === t
                          ? 'bg-soc-cyan/20 text-soc-cyan border-soc-cyan/40'
                          : 'border-soc-border text-soc-muted hover:text-soc-text hover:border-soc-border'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-soc-muted mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan"
                    placeholder="e.g. Phishing attack targeting finance team" required />
                </div>
                <div>
                  <label className="block text-xs text-soc-muted mb-1.5">Severity</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                    className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan">
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-soc-muted mb-1.5">Classification</label>
                  <select value={form.classification} onChange={e => setForm(f => ({ ...f, classification: e.target.value }))}
                    className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan">
                    {['TLP:RED', 'TLP:AMBER', 'TLP:GREEN', 'TLP:WHITE'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-soc-muted mb-1.5">Analyst Name</label>
                  <input value={form.analyst_name} onChange={e => setForm(f => ({ ...f, analyst_name: e.target.value }))}
                    className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan"
                    placeholder="Prasanna Kumar" />
                </div>
                <div>
                  <label className="block text-xs text-soc-muted mb-1.5">Customer Name</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                    className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan"
                    placeholder="Acme Corp" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-soc-muted mb-1.5">Affected Systems</label>
                  <input value={form.affected_systems} onChange={e => setForm(f => ({ ...f, affected_systems: e.target.value }))}
                    className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan"
                    placeholder="e.g. WORKSTATION-01, email gateway, finance-server" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-soc-muted mb-1.5">Initial Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan resize-none"
                    placeholder="Describe what happened..." />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 bg-soc-surface border border-soc-border text-soc-text py-2.5 rounded-lg text-sm hover:bg-soc-card transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-soc-cyan text-soc-bg font-semibold py-2.5 rounded-lg text-sm hover:bg-soc-cyan-dim transition-colors disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
