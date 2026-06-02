import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Sparkles, Download, MessageSquare,
  Shield, Clock, List, FileText, Bot, CheckSquare,
  Plus, Trash2, Copy, AlertTriangle, RefreshCw, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const SEV = {
  Critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  High: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Low: 'text-green-400 bg-green-400/10 border-green-400/20',
};

const VT_VERDICT = {
  malicious: 'text-red-400 bg-red-400/10 border-red-400/20',
  suspicious: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  clean: 'text-green-400 bg-green-400/10 border-green-400/20',
  not_found: 'text-soc-muted bg-soc-surface border-soc-border',
  error: 'text-soc-muted bg-soc-surface border-soc-border',
};

const PLAYBOOKS = {
  Ransomware: [
    'Isolate affected systems from network immediately',
    'Identify patient zero — first infected machine',
    'Determine ransomware family and variant',
    'Check for backup integrity and offsite copies',
    'Identify lateral movement — other infected hosts',
    'Collect memory dump and disk image from infected host',
    'Analyse ransom note for IOCs (wallet address, contact email)',
    'Check for data exfiltration before encryption',
    'Notify management and legal team',
    'Contact law enforcement if required',
    'Begin recovery from clean backups',
    'Patch initial entry point',
  ],
  Phishing: [
    'Collect the phishing email headers and body',
    'Extract all IOCs (URLs, IPs, attachments, sender domain)',
    'Check if any users clicked links or opened attachments',
    'Block sender domain and IPs at email gateway',
    'Search email logs for other recipients',
    'Check affected user accounts for signs of compromise',
    'Reset credentials for users who interacted with email',
    'Submit malicious URLs to URL filtering providers',
    'Notify all users of phishing campaign',
    'Document findings and close case',
  ],
  BEC: [
    'Identify compromised email account(s)',
    'Review email forwarding rules for suspicious rules',
    'Check for inbox rule hiding replies from user',
    'Review sent items and deleted items folders',
    'Identify all external parties contacted by attacker',
    'Check for fraudulent payment requests or wire transfers',
    'Reset compromised account password and MFA',
    'Revoke all active sessions on compromised account',
    'Enable MFA if not already enabled',
    'Review email gateway for auto-forwarding blocks',
    'Notify finance team of any suspicious payment requests',
    'File incident report with relevant authorities',
  ],
  'Insider Threat': [
    'Identify the user and their access level',
    'Collect DLP alerts and data access logs',
    'Review recent file access, downloads, and USB activity',
    'Check for large data transfers or cloud uploads',
    'Review email activity for data sent externally',
    'Collect HR information and recent employment changes',
    'Preserve evidence with chain of custody',
    'Disable account access pending investigation',
    'Interview manager and relevant parties',
    'Escalate to HR and Legal',
  ],
  Malware: [
    'Isolate infected endpoint from network',
    'Collect memory dump and process list',
    'Extract malware sample for analysis',
    'Submit hash to VirusTotal',
    'Analyse persistence mechanisms (registry, scheduled tasks)',
    'Check for C2 communications in network logs',
    'Identify all affected systems',
    'Check for lateral movement',
    'Remove malware and persistence mechanisms',
    'Patch exploited vulnerability',
    'Verify clean state with AV scan',
  ],
  Other: [
    'Document initial alert details',
    'Triage and assess severity',
    'Identify affected systems',
    'Collect relevant logs',
    'Analyse findings',
    'Contain the threat',
    'Remediate',
    'Document and close',
  ],
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'investigation', label: 'Investigation', icon: Shield },
  { id: 'iocs', label: 'IOCs', icon: AlertTriangle },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'playbook', label: 'Playbook', icon: CheckSquare },
  { id: 'ai', label: 'AI Analysis', icon: Sparkles },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'report', label: 'Report', icon: Download },
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [newIOC, setNewIOC] = useState('');
  const [vtLoading, setVtLoading] = useState({});
  const [newEvent, setNewEvent] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [playbook, setPlaybook] = useState({});
  const [correlations, setCorrelations] = useState({});

  const load = useCallback(() =>
    api.get(`/api/cases/${id}`).then(r => setC(r.data)),
    [id]
  );

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (c) {
      const steps = PLAYBOOKS[c.incident_type] || PLAYBOOKS.Other;
      setPlaybook(pb => {
        const fresh = {};
        steps.forEach((s, i) => { fresh[i] = pb[i] ?? false; });
        return fresh;
      });
    }
  }, [c?.incident_type]);

  if (!c) return (
    <div className="flex items-center justify-center h-screen text-soc-muted">Loading case...</div>
  );

  const update = field => e => setC(prev => ({ ...prev, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/api/cases/${id}`, {
        title: c.title, severity: c.severity, status: c.status,
        incident_type: c.incident_type, affected_systems: c.affected_systems,
        analyst_name: c.analyst_name, customer_name: c.customer_name,
        classification: c.classification, description: c.description,
        commands_run: c.commands_run, findings: c.findings,
        recommendations: c.recommendations,
        iocs: Array.isArray(c.iocs) ? c.iocs : [],
        timeline_events: Array.isArray(c.timeline_events) ? c.timeline_events : [],
      });
      setC(res.data);
      toast.success('Case saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const generateAI = async () => {
    setAiLoading(true);
    toast.loading('Generating detailed AI analysis — this takes 30-60 seconds...', { id: 'ai-gen', duration: 90000 });
    try {
      await save();
      const res = await api.post(`/api/cases/${id}/generate-ai`);
      setC(res.data);
      toast.success('AI analysis complete', { id: 'ai-gen' });
      setTab('ai');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI generation failed', { id: 'ai-gen' });
    } finally { setAiLoading(false); }
  };

  const addIOC = async () => {
    if (!newIOC.trim()) return;
    const ioc = newIOC.trim();
    const updated = [...(c.iocs || []), ioc];
    setC(prev => ({ ...prev, iocs: updated }));
    setNewIOC('');
    // Auto VT lookup
    vtLookup(ioc);
    // Check correlation
    try {
      const r = await api.get(`/api/ioc/correlate/${encodeURIComponent(ioc)}`);
      if (r.data.found_in_cases.length > 1) {
        setCorrelations(prev => ({ ...prev, [ioc]: r.data.found_in_cases }));
      }
    } catch {}
  };

  const removeIOC = ioc => setC(prev => ({ ...prev, iocs: prev.iocs.filter(i => i !== ioc) }));

  const vtLookup = async ioc => {
    setVtLoading(prev => ({ ...prev, [ioc]: true }));
    try {
      const res = await api.post('/api/ioc/lookup', { ioc, case_id: parseInt(id) });
      setC(prev => ({
        ...prev,
        vt_results: { ...(prev.vt_results || {}), [ioc]: res.data }
      }));
    } catch { toast.error(`VT lookup failed for ${ioc}`); }
    finally { setVtLoading(prev => ({ ...prev, [ioc]: false })); }
  };

  const defangAll = async () => {
    const allIOCs = (c.iocs || []).join('\n');
    try {
      const res = await api.post('/api/malware/defang', { text: allIOCs, defang: true });
      toast.success('IOCs defanged — copied to clipboard');
      navigator.clipboard.writeText(res.data.result);
    } catch { toast.error('Defang failed'); }
  };

  const addTimelineEvent = () => {
    if (!newEvent.trim()) return;
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    setC(prev => ({ ...prev, timeline_events: [...(prev.timeline_events || []), `[${ts}] ${newEvent.trim()}`] }));
    setNewEvent('');
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput };
    const msgs = [...chatMessages, userMsg];
    setChatMessages(msgs);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.post('/api/chat/case', { case_id: parseInt(id), messages: msgs });
      setChatMessages([...msgs, { role: 'assistant', content: res.data.reply }]);
    } catch { toast.error('AI chat failed'); }
    finally { setChatLoading(false); }
  };

  const vtResults = c.vt_results || {};
  const playSteps = PLAYBOOKS[c.incident_type] || PLAYBOOKS.Other;
  const completedSteps = Object.values(playbook).filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-soc-bg">
      {/* Top bar */}
      <div className="bg-soc-surface border-b border-soc-border px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/cases')} className="text-soc-muted hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-soc-cyan">{c.case_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEV[c.severity] || SEV.Low}`}>{c.severity}</span>
            <select value={c.status} onChange={update('status')}
              className="text-xs bg-transparent border-none text-soc-muted focus:outline-none cursor-pointer">
              {['Open', 'In Progress', 'Closed'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <h1 className="text-base font-bold text-white truncate mt-0.5">{c.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateAI} disabled={aiLoading}
            className="flex items-center gap-1.5 bg-soc-purple/20 text-purple-400 border border-purple-400/30 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-soc-purple/30 transition-colors disabled:opacity-50">
            {aiLoading ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {aiLoading ? 'Generating...' : 'Generate AI'}
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 bg-soc-cyan/20 text-soc-cyan border border-soc-cyan/30 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-soc-cyan/30 transition-colors disabled:opacity-50">
            <Save size={13} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-soc-surface border-b border-soc-border px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button key={tid} onClick={() => setTab(tid)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === tid
                  ? 'border-soc-cyan text-soc-cyan'
                  : 'border-transparent text-soc-muted hover:text-soc-text'
              }`}>
              <Icon size={13} /> {label}
              {tid === 'iocs' && c.iocs?.length > 0 && (
                <span className="bg-soc-cyan/20 text-soc-cyan text-xs px-1.5 rounded-full">{c.iocs.length}</span>
              )}
              {tid === 'playbook' && (
                <span className="bg-soc-cyan/20 text-soc-cyan text-xs px-1.5 rounded-full">{completedSteps}/{playSteps.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="max-w-3xl space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Title</label>
                <input value={c.title} onChange={update('title')}
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-soc-cyan" />
              </div>
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Incident Type</label>
                <select value={c.incident_type} onChange={update('incident_type')}
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan">
                  {['Ransomware', 'Phishing', 'BEC', 'Insider Threat', 'Malware', 'Data Breach', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Severity</label>
                <select value={c.severity} onChange={update('severity')}
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan">
                  {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Classification</label>
                <select value={c.classification} onChange={update('classification')}
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan">
                  {['TLP:RED', 'TLP:AMBER', 'TLP:GREEN', 'TLP:WHITE'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Analyst Name</label>
                <input value={c.analyst_name || ''} onChange={update('analyst_name')}
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan" />
              </div>
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Customer Name</label>
                <input value={c.customer_name || ''} onChange={update('customer_name')}
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-soc-muted mb-1.5">Affected Systems</label>
                <input value={c.affected_systems || ''} onChange={update('affected_systems')}
                  placeholder="e.g. WORKSTATION-01, email gateway"
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-soc-muted mb-1.5">Description</label>
                <textarea value={c.description || ''} onChange={update('description')} rows={5}
                  placeholder="Describe what happened, when it was detected, and initial observations..."
                  className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan resize-none" />
              </div>
            </div>
          </div>
        )}

        {/* ── INVESTIGATION ── */}
        {tab === 'investigation' && (
          <div className="max-w-3xl space-y-5">
            <div>
              <label className="block text-xs text-soc-muted mb-1.5">Commands Run During Investigation</label>
              <p className="text-xs text-soc-muted mb-2">Document every command you ran — tools used, queries, scripts. Be specific.</p>
              <textarea value={c.commands_run || ''} onChange={update('commands_run')} rows={8}
                placeholder={'e.g.\nGet-Process | Where-Object {$_.CPU -gt 100}\nnetstat -an | grep ESTABLISHED\ncat /var/log/auth.log | grep "Failed password"\nvirustotal --file malware.exe'}
                className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text font-mono focus:outline-none focus:border-soc-cyan resize-none" />
            </div>
            <div>
              <label className="block text-xs text-soc-muted mb-1.5">Analyst Findings</label>
              <p className="text-xs text-soc-muted mb-2">Document everything you found — be detailed. This is the core of your report.</p>
              <textarea value={c.findings || ''} onChange={update('findings')} rows={10}
                placeholder={'e.g.\n- Malicious process cmd.exe spawned by excel.exe at 14:23 UTC\n- C2 beacon observed to 185.220.101.45 every 5 minutes\n- Scheduled task "WindowsUpdate" created for persistence\n- Lateral movement detected to FILESERVER-02\n- 2.3GB data exfiltrated to external FTP server'}
                className="w-full bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan resize-none" />
            </div>
          </div>
        )}

        {/* ── IOCs ── */}
        {tab === 'iocs' && (
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Indicators of Compromise</h2>
              <button onClick={defangAll} className="text-xs text-soc-muted hover:text-soc-cyan border border-soc-border px-3 py-1.5 rounded-lg transition-colors">
                Defang All (Copy)
              </button>
            </div>

            <div className="flex gap-2">
              <input value={newIOC} onChange={e => setNewIOC(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIOC()}
                placeholder="Paste IP, hash, domain, or URL — press Enter"
                className="flex-1 bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text font-mono focus:outline-none focus:border-soc-cyan" />
              <button onClick={addIOC} className="bg-soc-cyan text-soc-bg px-4 py-2 rounded-lg text-sm font-semibold hover:bg-soc-cyan-dim">
                Add + Lookup
              </button>
            </div>

            <div className="space-y-3">
              {(!c.iocs || c.iocs.length === 0) ? (
                <div className="text-center py-8 text-soc-muted text-sm bg-soc-card border border-soc-border rounded-xl">
                  No IOCs added yet. Add them above.
                </div>
              ) : c.iocs.map(ioc => {
                const vt = vtResults[ioc] || {};
                const loading = vtLoading[ioc];
                const corr = correlations[ioc];
                return (
                  <div key={ioc} className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="font-mono text-sm text-white flex-1 truncate">{ioc}</span>
                      {loading ? (
                        <span className="text-xs text-soc-muted animate-pulse">Looking up...</span>
                      ) : vt.verdict ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${VT_VERDICT[vt.verdict] || VT_VERDICT.error}`}>
                          {vt.verdict.toUpperCase()}
                        </span>
                      ) : (
                        <button onClick={() => vtLookup(ioc)} className="text-xs text-soc-cyan hover:underline">VT Lookup</button>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText(ioc); toast.success('Copied'); }}
                        className="text-soc-muted hover:text-soc-text"><Copy size={13} /></button>
                      <button onClick={() => removeIOC(ioc)} className="text-soc-muted hover:text-red-400"><Trash2 size={13} /></button>
                    </div>

                    {corr && corr.length > 1 && (
                      <div className="px-4 py-2 bg-yellow-400/5 border-t border-yellow-400/20 text-xs text-yellow-400">
                        ⚠ Seen in {corr.length - 1} other case(s): {corr.filter(cc => cc.case_id !== parseInt(id)).map(cc => cc.case_number).join(', ')}
                      </div>
                    )}

                    {vt.verdict && !loading && (
                      <div className="px-4 py-3 bg-soc-surface border-t border-soc-border text-xs text-soc-muted space-y-1">
                        {vt.type && <span className="mr-4">Type: <span className="text-soc-text">{vt.type}</span></span>}
                        {vt.total_engines && <span className="mr-4">Detections: <span className={vt.malicious_count > 0 ? 'text-red-400' : 'text-green-400'}>{vt.malicious_count}/{vt.total_engines}</span></span>}
                        {vt.country && <span className="mr-4">Country: <span className="text-soc-text">{vt.country}</span></span>}
                        {vt.as_owner && <span className="mr-4">ASN: <span className="text-soc-text">{vt.as_owner}</span></span>}
                        {vt.file_name && <span className="mr-4">File: <span className="text-soc-text">{vt.file_name}</span></span>}
                        {vt.file_type && <span className="mr-4">Type: <span className="text-soc-text">{vt.file_type}</span></span>}
                        {vt.sha256 && <div className="font-mono mt-1">SHA256: <span className="text-soc-text break-all">{vt.sha256}</span></div>}
                        {vt.registrar && <span className="mr-4">Registrar: <span className="text-soc-text">{vt.registrar}</span></span>}
                        {Object.keys(vt.last_analysis_results || {}).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-soc-muted mb-1">Flagged by:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(vt.last_analysis_results).slice(0, 8).map(([engine, r]) => (
                                <span key={engine} className="text-xs bg-red-400/10 text-red-400 px-2 py-0.5 rounded">
                                  {engine}: {r.result || r.category}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TIMELINE ── */}
        {tab === 'timeline' && (
          <div className="max-w-3xl space-y-4">
            <h2 className="text-sm font-semibold text-white">Attack Timeline</h2>
            <div className="flex gap-2">
              <input value={newEvent} onChange={e => setNewEvent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTimelineEvent()}
                placeholder="Describe what happened (timestamp auto-added)..."
                className="flex-1 bg-soc-card border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan" />
              <button onClick={addTimelineEvent} className="bg-soc-cyan text-soc-bg px-4 py-2 rounded-lg text-sm font-semibold hover:bg-soc-cyan-dim">Add</button>
            </div>
            <div className="space-y-2">
              {(!c.timeline_events || c.timeline_events.length === 0) ? (
                <div className="text-center py-8 text-soc-muted text-sm bg-soc-card border border-soc-border rounded-xl">No events yet.</div>
              ) : c.timeline_events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 bg-soc-card border border-soc-border rounded-lg px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-soc-cyan mt-1.5 shrink-0" />
                  <span className="text-sm text-soc-text flex-1">{ev}</span>
                  <button onClick={() => setC(prev => ({ ...prev, timeline_events: prev.timeline_events.filter((_, idx) => idx !== i) }))}
                    className="text-soc-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAYBOOK ── */}
        {tab === 'playbook' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">{c.incident_type} Investigation Playbook</h2>
              <span className="text-xs text-soc-muted">{completedSteps}/{playSteps.length} completed</span>
            </div>
            <div className="h-1.5 bg-soc-card rounded-full mb-5 overflow-hidden">
              <div className="h-full bg-soc-cyan rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps / playSteps.length) * 100}%` }} />
            </div>
            <div className="space-y-2">
              {playSteps.map((step, i) => (
                <div key={i}
                  onClick={() => setPlaybook(pb => ({ ...pb, [i]: !pb[i] }))}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    playbook[i]
                      ? 'bg-soc-cyan/5 border-soc-cyan/30 opacity-60'
                      : 'bg-soc-card border-soc-border hover:border-soc-cyan/30'
                  }`}>
                  <div className={`w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    playbook[i] ? 'bg-soc-cyan border-soc-cyan' : 'border-soc-border'
                  }`}>
                    {playbook[i] && <span className="text-soc-bg text-xs font-bold">✓</span>}
                  </div>
                  <span className={`text-sm ${playbook[i] ? 'line-through text-soc-muted' : 'text-soc-text'}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI ANALYSIS ── */}
        {tab === 'ai' && (
          <div className="max-w-4xl space-y-6">
            {!c.ai_executive_summary && !aiLoading && (
              <div className="bg-soc-card border border-soc-border rounded-xl p-8 text-center">
                <Sparkles className="mx-auto mb-3 text-purple-400" size={36} />
                <p className="text-white font-medium mb-1">No AI analysis yet</p>
                <p className="text-soc-muted text-sm mb-4">Fill in the description, findings, and IOCs first, then generate.</p>
                <button onClick={generateAI} className="bg-soc-purple/20 text-purple-400 border border-purple-400/30 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-soc-purple/30 transition-colors">
                  Generate AI Analysis
                </button>
              </div>
            )}

            {c.ai_severity_score > 0 && (
              <div className="bg-soc-card border border-soc-border rounded-xl p-5">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      c.ai_severity_score >= 75 ? 'text-red-400' :
                      c.ai_severity_score >= 50 ? 'text-orange-400' :
                      c.ai_severity_score >= 25 ? 'text-yellow-400' : 'text-green-400'
                    }`}>{c.ai_severity_score}</div>
                    <div className="text-xs text-soc-muted">/ 100 Risk Score</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-soc-muted mb-1">AI Severity Reasoning</p>
                    <p className="text-sm text-soc-text">{c.ai_severity_reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            {c.ai_executive_summary && (
              <div className="bg-soc-card border border-soc-border rounded-xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-soc-border">
                  <h3 className="text-sm font-semibold text-white">Executive Summary</h3>
                  <button onClick={() => { navigator.clipboard.writeText(c.ai_executive_summary); toast.success('Copied'); }}
                    className="text-soc-muted hover:text-soc-text"><Copy size={14} /></button>
                </div>
                <div className="p-5 prose-dark text-sm text-soc-text leading-relaxed whitespace-pre-wrap">{c.ai_executive_summary}</div>
              </div>
            )}

            {c.ai_technical_summary && (
              <div className="bg-soc-card border border-soc-border rounded-xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-soc-border">
                  <h3 className="text-sm font-semibold text-white">Technical Analysis</h3>
                  <button onClick={() => { navigator.clipboard.writeText(c.ai_technical_summary); toast.success('Copied'); }}
                    className="text-soc-muted hover:text-soc-text"><Copy size={14} /></button>
                </div>
                <div className="p-5 prose-dark text-sm text-soc-text leading-relaxed whitespace-pre-wrap">{c.ai_technical_summary}</div>
              </div>
            )}

            {Array.isArray(c.mitre_techniques) && c.mitre_techniques.length > 0 && (
              <div className="bg-soc-card border border-soc-border rounded-xl">
                <div className="px-5 py-3 border-b border-soc-border">
                  <h3 className="text-sm font-semibold text-white">MITRE ATT&CK Mapping</h3>
                </div>
                <div className="p-5 space-y-3">
                  {c.mitre_techniques.map((t, i) => (
                    <div key={i} className="bg-soc-surface border border-soc-border rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="font-mono text-xs bg-soc-cyan/10 text-soc-cyan px-2 py-1 rounded">{t.technique_id}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{t.technique_name}</p>
                          <p className="text-xs text-soc-muted">{t.tactic}</p>
                        </div>
                      </div>
                      <p className="text-xs text-soc-text ml-16">{t.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {c.recommendations && (
              <div className="bg-soc-card border border-soc-border rounded-xl">
                <div className="px-5 py-3 border-b border-soc-border">
                  <h3 className="text-sm font-semibold text-white">Recommendations</h3>
                </div>
                <div className="p-5 text-sm text-soc-text leading-relaxed whitespace-pre-wrap">{c.recommendations}</div>
              </div>
            )}
          </div>
        )}

        {/* ── AI CHAT ── */}
        {tab === 'chat' && (
          <div className="max-w-3xl flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="mx-auto mb-3 text-soc-muted" size={40} />
                  <p className="text-white font-medium mb-1">AI Case Assistant</p>
                  <p className="text-soc-muted text-sm">Ask me anything about this case.</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {['What should I investigate next?', 'Is this a false positive?', 'Write a containment step', 'What MITRE techniques match?'].map(q => (
                      <button key={q} onClick={() => setChatInput(q)}
                        className="text-xs border border-soc-border text-soc-muted hover:text-soc-cyan hover:border-soc-cyan/30 px-3 py-1.5 rounded-lg transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === 'user'
                      ? 'bg-soc-cyan text-soc-bg font-medium'
                      : 'bg-soc-card border border-soc-border text-soc-text'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-soc-card border border-soc-border rounded-2xl px-4 py-3 text-sm text-soc-muted animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask anything about this case..."
                className="flex-1 bg-soc-card border border-soc-border rounded-xl px-4 py-3 text-sm text-soc-text focus:outline-none focus:border-soc-cyan" />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                className="bg-soc-cyan text-soc-bg px-5 py-3 rounded-xl text-sm font-semibold hover:bg-soc-cyan-dim disabled:opacity-50 transition-colors">
                Send
              </button>
            </div>
          </div>
        )}

        {/* ── REPORT ── */}
        {tab === 'report' && (
          <div className="max-w-xl space-y-4">
            <h2 className="text-sm font-semibold text-white">Download Report</h2>
            {!c.ai_executive_summary && (
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 text-sm text-yellow-400">
                ⚠ Generate AI analysis first for a complete, detailed report.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <a href={`/api/reports/${id}/pdf`} target="_blank" rel="noreferrer"
                className="flex flex-col items-center justify-center gap-3 bg-soc-card border border-soc-border rounded-xl p-6 hover:border-soc-cyan/30 hover:bg-soc-cyan/5 transition-all group">
                <Download size={28} className="text-red-400 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">PDF Report</p>
                  <p className="text-xs text-soc-muted mt-1">Professional, customer-ready</p>
                </div>
              </a>
              <a href={`/api/reports/${id}/docx`} target="_blank" rel="noreferrer"
                className="flex flex-col items-center justify-center gap-3 bg-soc-card border border-soc-border rounded-xl p-6 hover:border-soc-cyan/30 hover:bg-soc-cyan/5 transition-all group">
                <Download size={28} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Word Report</p>
                  <p className="text-xs text-soc-muted mt-1">Editable DOCX format</p>
                </div>
              </a>
            </div>
            <div className="bg-soc-card border border-soc-border rounded-xl p-4 text-xs text-soc-muted space-y-1">
              <p>Case: <span className="text-soc-text">{c.case_number}</span></p>
              <p>Classification: <span className="text-soc-text">{c.classification}</span></p>
              <p>Analyst: <span className="text-soc-text">{c.analyst_name || '—'}</span></p>
              <p>Customer: <span className="text-soc-text">{c.customer_name || '—'}</span></p>
              <p>IOCs in report: <span className="text-soc-text">{c.iocs?.length || 0}</span></p>
              <p>AI Summary: <span className={c.ai_executive_summary ? 'text-green-400' : 'text-red-400'}>{c.ai_executive_summary ? 'Included' : 'Not generated'}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
