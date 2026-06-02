import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Sparkles, Download, MessageSquare,
  Shield, Clock, FileText, Bot, CheckSquare,
  Trash2, Copy, AlertTriangle, RefreshCw, Check, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg:        '#0C0C0E',
  surface:   '#18181B',
  elevated:  '#1C1C1F',
  border:    'rgba(255,255,255,0.07)',
  borderHov: 'rgba(255,255,255,0.13)',
  textPri:   '#F4F4F5',
  textSec:   '#A1A1AA',
  textMut:   '#52525B',
  accent:    '#A78BFA',
  accentBg:  'rgba(139,92,246,0.1)',
  accentBor: 'rgba(139,92,246,0.25)',
};

const SEV = {
  Critical: { color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
  High:     { color: '#FDBA74', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  Medium:   { color: '#FDE047', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.2)' },
  Low:      { color: '#86EFAC', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)' },
};

const VT_VERDICT = {
  malicious:  { color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
  suspicious: { color: '#FDBA74', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  clean:      { color: '#86EFAC', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)' },
  not_found:  { color: '#71717A', bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.2)' },
  error:      { color: '#71717A', bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.2)' },
};

const PLAYBOOKS = {
  Ransomware:      ['Isolate affected systems from network immediately','Identify patient zero — first infected machine','Determine ransomware family and variant','Check backup integrity and offsite copies','Identify lateral movement to other hosts','Collect memory dump and disk image','Analyse ransom note for IOCs','Check for data exfiltration before encryption','Notify management and legal team','Begin recovery from clean backups','Patch initial entry point'],
  Phishing:        ['Collect phishing email headers and body','Extract all IOCs (URLs, IPs, attachments, sender)','Check if any users clicked links or opened attachments','Block sender domain and IPs at email gateway','Search email logs for other recipients','Check affected accounts for compromise','Reset credentials for users who interacted','Submit malicious URLs to filtering providers','Notify all users of phishing campaign'],
  BEC:             ['Identify compromised email account(s)','Review forwarding rules for suspicious rules','Check for inbox rules hiding replies','Review sent items and deleted items','Identify external parties contacted by attacker','Check for fraudulent payment requests','Reset compromised account password and MFA','Revoke all active sessions','Enable MFA if not already enabled','Notify finance team of suspicious payment requests'],
  'Insider Threat':['Identify the user and access level','Collect DLP alerts and data access logs','Review recent file access and USB activity','Check for large data transfers or cloud uploads','Review email activity for data sent externally','Preserve evidence with chain of custody','Disable account access pending investigation','Escalate to HR and Legal'],
  Malware:         ['Isolate infected endpoint from network','Collect memory dump and process list','Extract malware sample for analysis','Submit hash to VirusTotal','Analyse persistence mechanisms','Check for C2 communications in network logs','Identify all affected systems','Remove malware and persistence mechanisms','Patch exploited vulnerability'],
  Other:           ['Document initial alert details','Triage and assess severity','Identify affected systems','Collect relevant logs','Analyse findings','Contain the threat','Remediate','Document and close'],
};

const TABS = [
  { id: 'overview',      label: 'Overview',     icon: FileText },
  { id: 'investigation', label: 'Investigation', icon: Shield },
  { id: 'iocs',          label: 'IOCs',          icon: AlertTriangle },
  { id: 'timeline',      label: 'Timeline',      icon: Clock },
  { id: 'playbook',      label: 'Playbook',      icon: CheckSquare },
  { id: 'ai',            label: 'AI Analysis',   icon: Sparkles },
  { id: 'chat',          label: 'AI Chat',       icon: MessageSquare },
  { id: 'report',        label: 'Report',        icon: Download },
];

function copyText(text) {
  const doFallback = () => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(el);
    el.focus(); el.select();
    try { document.execCommand('copy'); toast.success('Copied'); }
    catch { toast.error('Copy failed — please select manually'); }
    document.body.removeChild(el);
  };
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast.success('Copied')).catch(doFallback);
    } else { doFallback(); }
  } catch { doFallback(); }
}

const inp = (mono) => ({
  width: '100%', padding: '9px 12px',
  background: C.elevated, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPri, fontSize: 13,
  fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : 'inherit',
  outline: 'none', boxSizing: 'border-box', resize: 'vertical',
  transition: 'border-color 0.15s',
});

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [newIOC, setNewIOC] = useState('');
  const [vtLoading, setVtLoading] = useState({});
  const [newEvent, setNewEvent] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [playbook, setPlaybook] = useState({});
  const [correlations, setCorrelations] = useState({});
  const autoSaveTimer = useRef(null);
  const caseRef = useRef(null);
  const chatEndRef = useRef(null);

  const load = useCallback(() =>
    api.get(`/api/cases/${id}`).then(r => { setC(r.data); caseRef.current = r.data; }),
    [id]
  );

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (c) {
      const steps = PLAYBOOKS[c.incident_type] || PLAYBOOKS.Other;
      setPlaybook(pb => {
        const fresh = {};
        steps.forEach((_, i) => { fresh[i] = pb[i] ?? false; });
        return fresh;
      });
    }
  }, [c?.incident_type]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const scheduleAutoSave = useCallback(() => {
    setDirty(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!caseRef.current) return;
      try {
        const cur = caseRef.current;
        await api.put(`/api/cases/${id}`, {
          title: cur.title, severity: cur.severity, status: cur.status,
          incident_type: cur.incident_type, affected_systems: cur.affected_systems,
          analyst_name: cur.analyst_name, customer_name: cur.customer_name,
          classification: cur.classification, description: cur.description,
          commands_run: cur.commands_run, findings: cur.findings,
          recommendations: cur.recommendations,
          iocs: Array.isArray(cur.iocs) ? cur.iocs : [],
          timeline_events: Array.isArray(cur.timeline_events) ? cur.timeline_events : [],
        });
        setDirty(false);
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2500);
      } catch { /* silent */ }
    }, 2000);
  }, [id]);

  if (!c) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMut, fontSize: 14 }}>
      Loading case...
    </div>
  );

  const update = field => e => {
    const val = e.target.value;
    setC(prev => { const next = { ...prev, [field]: val }; caseRef.current = next; return next; });
    scheduleAutoSave();
  };

  const save = async (silent = false) => {
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
      setC(res.data); caseRef.current = res.data;
      setDirty(false);
      if (!silent) toast.success('Saved');
    } catch { if (!silent) toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const generateAI = async () => {
    setAiLoading(true);
    setAiError('');
    const tid = toast.loading('Generating AI analysis — 45–90 seconds…', { duration: 120000 });
    try {
      await save(true);
      const res = await api.post(`/api/cases/${id}/generate-ai`);
      setC(res.data); caseRef.current = res.data;
      toast.success('AI analysis complete', { id: tid });
      setTab('ai');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'AI generation failed';
      setAiError(msg);
      toast.error(msg, { id: tid });
    } finally { setAiLoading(false); }
  };

  const addIOC = async () => {
    if (!newIOC.trim()) return;
    const ioc = newIOC.trim();
    const updated = [...(c.iocs || []), ioc];
    setC(prev => { const next = { ...prev, iocs: updated }; caseRef.current = next; return next; });
    setNewIOC('');
    scheduleAutoSave();
    vtLookup(ioc);
    try {
      const r = await api.get(`/api/ioc/correlate/${encodeURIComponent(ioc)}`);
      if (r.data.found_in_cases.length > 1)
        setCorrelations(prev => ({ ...prev, [ioc]: r.data.found_in_cases }));
    } catch {}
  };

  const removeIOC = ioc => {
    setC(prev => { const next = { ...prev, iocs: prev.iocs.filter(i => i !== ioc) }; caseRef.current = next; return next; });
    scheduleAutoSave();
  };

  const vtLookup = async ioc => {
    setVtLoading(prev => ({ ...prev, [ioc]: true }));
    try {
      const res = await api.post('/api/ioc/lookup', { ioc, case_id: parseInt(id) });
      setC(prev => {
        const next = { ...prev, vt_results: { ...(prev.vt_results || {}), [ioc]: res.data } };
        caseRef.current = next; return next;
      });
    } catch { toast.error(`VT lookup failed for ${ioc}`); }
    finally { setVtLoading(prev => ({ ...prev, [ioc]: false })); }
  };

  const defangAll = async () => {
    try {
      const res = await api.post('/api/malware/defang', { text: (c.iocs || []).join('\n'), defang: true });
      copyText(res.data.result);
    } catch { copyText((c.iocs || []).join('\n')); }
  };

  const addTimelineEvent = () => {
    if (!newEvent.trim()) return;
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    setC(prev => {
      const next = { ...prev, timeline_events: [...(prev.timeline_events || []), `[${ts}] ${newEvent.trim()}`] };
      caseRef.current = next; return next;
    });
    setNewEvent('');
    scheduleAutoSave();
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
    } catch (err) {
      const detail = err.response?.data?.detail || 'AI Chat failed — check GROQ_API_KEY in Render env vars';
      toast.error(detail);
      setChatMessages([...msgs, { role: 'assistant', content: `⚠ ${detail}` }]);
    } finally { setChatLoading(false); }
  };

  const downloadReport = async fmt => {
    if (!c.ai_executive_summary) {
      const tid = toast.loading('Generating AI summary first…', { duration: 120000 });
      try {
        await save(true);
        const res = await api.post(`/api/cases/${id}/generate-ai`);
        setC(res.data); caseRef.current = res.data;
        toast.success('AI ready — downloading…', { id: tid });
      } catch { toast.error('AI generation failed. Downloading with available data.', { id: tid }); }
    }
    window.open(`/api/reports/${id}/${fmt}`, '_blank');
  };

  const sev = SEV[c.severity] || SEV.Low;
  const vtResults = c.vt_results || {};
  const playSteps = PLAYBOOKS[c.incident_type] || PLAYBOOKS.Other;
  const completedSteps = Object.values(playbook).filter(Boolean).length;

  const Field = ({ label, field, type = 'input', rows, placeholder, mono }) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: C.textMut, marginBottom: 6, fontWeight: 500, letterSpacing: '0.03em' }}>{label}</label>
      {type === 'input'
        ? <input value={c[field] || ''} onChange={update(field)} placeholder={placeholder} style={inp(mono)}
            onFocus={e => e.target.style.borderColor = C.accentBor}
            onBlur={e => e.target.style.borderColor = C.border} />
        : <textarea value={c[field] || ''} onChange={update(field)} rows={rows || 5} placeholder={placeholder}
            style={{ ...inp(mono), resize: 'vertical' }}
            onFocus={e => e.target.style.borderColor = C.accentBor}
            onBlur={e => e.target.style.borderColor = C.border} />
      }
    </div>
  );

  const Sel = ({ label, field, options }) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: C.textMut, marginBottom: 6, fontWeight: 500 }}>{label}</label>
      <select value={c[field] || ''} onChange={update(field)}
        style={{ ...inp(), resize: 'none', cursor: 'pointer' }}>
        {options.map(o => <option key={o} style={{ background: '#1C1C1F' }}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{ background: '#111114', borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => { save(true); navigate('/cases'); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = C.textPri}
          onMouseLeave={e => e.currentTarget.style.color = C.textMut}>
          <ArrowLeft size={17} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.accent }}>{c.case_number}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, border: `1px solid ${sev.border}`, background: sev.bg, color: sev.color }}>{c.severity}</span>
            <select value={c.status} onChange={update('status')} style={{
              fontSize: 11, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', fontWeight: 500,
              color: c.status === 'Open' ? '#EF4444' : c.status === 'In Progress' ? '#EAB308' : '#22C55E',
            }}>
              {['Open','In Progress','Closed'].map(s => <option key={s} style={{ background: '#1C1C1F', color: '#F4F4F5' }}>{s}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.textPri, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {autoSaved && <span style={{ fontSize: 11, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Saved</span>}
          {dirty && !autoSaved && <span style={{ fontSize: 11, color: '#EAB308' }}>Unsaved</span>}
          <button onClick={generateAI} disabled={aiLoading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: `1px solid ${C.accentBor}`, background: C.accentBg, color: C.accent,
            fontSize: 12, fontWeight: 500, cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.7 : 1, transition: 'opacity 0.15s',
          }}>
            {aiLoading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            {aiLoading ? 'Generating…' : 'Generate AI'}
          </button>
          <button onClick={() => save(false)} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
            border: `1px solid rgba(255,255,255,0.1)`, background: 'rgba(255,255,255,0.04)', color: C.textSec,
            fontSize: 12, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            <Save size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ background: '#111114', borderBottom: `1px solid ${C.border}`, padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 12, fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: tab === tid ? `2px solid ${C.accent}` : '2px solid transparent',
            color: tab === tid ? C.accent : C.textMut, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (tab !== tid) e.currentTarget.style.color = C.textSec; }}
            onMouseLeave={e => { if (tab !== tid) e.currentTarget.style.color = C.textMut; }}
          >
            <Icon size={13} />
            {label}
            {tid === 'iocs' && c.iocs?.length > 0 && (
              <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, padding: '1px 6px', borderRadius: 10, border: `1px solid ${C.accentBor}` }}>{c.iocs.length}</span>
            )}
            {tid === 'playbook' && (
              <span style={{ fontSize: 10, background: C.accentBg, color: C.accent, padding: '1px 6px', borderRadius: 10, border: `1px solid ${C.accentBor}` }}>{completedSteps}/{playSteps.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ maxWidth: 760, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}><Field label="TITLE" field="title" placeholder="e.g. Phishing attack targeting finance team" /></div>
            <Sel label="SEVERITY" field="severity" options={['Critical','High','Medium','Low']} />
            <Sel label="INCIDENT TYPE" field="incident_type" options={['Ransomware','Phishing','BEC','Insider Threat','Malware','Data Breach','Other']} />
            <Sel label="CLASSIFICATION" field="classification" options={['TLP:RED','TLP:AMBER','TLP:GREEN','TLP:WHITE']} />
            <Sel label="STATUS" field="status" options={['Open','In Progress','Closed']} />
            <Field label="ANALYST NAME" field="analyst_name" placeholder="Prasanna Kumar" />
            <Field label="CUSTOMER NAME" field="customer_name" placeholder="Acme Corp" />
            <div style={{ gridColumn: '1 / -1' }}><Field label="AFFECTED SYSTEMS" field="affected_systems" placeholder="WORKSTATION-01, email gateway, DC01" /></div>
            <div style={{ gridColumn: '1 / -1' }}><Field label="DESCRIPTION" field="description" type="textarea" rows={5} placeholder="Describe what happened, when detected, and initial observations…" /></div>
          </div>
        )}

        {/* INVESTIGATION */}
        {tab === 'investigation' && (
          <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="COMMANDS RUN" field="commands_run" type="textarea" rows={8} mono
              placeholder={'nmap -sV 185.220.101.45\nGet-Process | Where-Object {$_.CPU -gt 100}\nnetstat -an | grep ESTABLISHED'} />
            <Field label="ANALYST FINDINGS" field="findings" type="textarea" rows={14}
              placeholder={'Document everything you found:\n\n- Malicious process cmd.exe spawned by excel.exe at 14:23 UTC\n- C2 beacon observed every 5 minutes\n- Scheduled task created for persistence'} />
          </div>
        )}

        {/* IOCs */}
        {tab === 'iocs' && (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textPri, margin: 0 }}>Indicators of Compromise</h2>
              <button onClick={defangAll} style={{ fontSize: 11, color: C.textMut, background: C.elevated, border: `1px solid ${C.border}`, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = C.textSec}
                onMouseLeave={e => e.currentTarget.style.color = C.textMut}>Defang All (Copy)</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={newIOC} onChange={e => setNewIOC(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIOC()}
                placeholder="Paste IP, hash (MD5/SHA256), domain, or URL…"
                style={{ ...inp(true), flex: 1, resize: 'none' }}
                onFocus={e => e.target.style.borderColor = C.accentBor}
                onBlur={e => e.target.style.borderColor = C.border} />
              <button onClick={addIOC} style={{
                padding: '9px 18px', borderRadius: 8, background: C.accent, color: '#fff',
                fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Add + Lookup</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(!c.iocs || c.iocs.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.textMut, fontSize: 13, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  No IOCs added yet.
                </div>
              ) : c.iocs.map(ioc => {
                const vt = vtResults[ioc] || {};
                const lv = vtLoading[ioc];
                const vc = VT_VERDICT[vt.verdict] || VT_VERDICT.not_found;
                const corr = correlations[ioc];
                return (
                  <div key={ioc} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#D4D4D8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ioc}</span>
                      {lv ? <span style={{ fontSize: 11, color: C.textMut }}>Looking up…</span>
                        : vt.verdict
                          ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, border: `1px solid ${vc.border}`, background: vc.bg, color: vc.color, fontWeight: 700 }}>{vt.verdict.toUpperCase()}</span>
                          : <button onClick={() => vtLookup(ioc)} style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>VT Lookup</button>}
                      <button onClick={() => copyText(ioc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = C.textSec}
                        onMouseLeave={e => e.currentTarget.style.color = C.textMut}><Copy size={13} /></button>
                      <button onClick={() => removeIOC(ioc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={e => e.currentTarget.style.color = C.textMut}><Trash2 size={13} /></button>
                    </div>
                    {corr && corr.length > 1 && (
                      <div style={{ padding: '6px 14px', background: 'rgba(234,179,8,0.05)', borderTop: '1px solid rgba(234,179,8,0.15)', fontSize: 11, color: '#FDE047' }}>
                        ⚠ Also seen in: {corr.filter(cc => cc.case_id !== parseInt(id)).map(cc => cc.case_number).join(', ')}
                      </div>
                    )}
                    {vt.verdict && !lv && (
                      <div style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.25)', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMut, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                        {vt.total_engines && <span>Detections: <span style={{ color: vt.malicious_count > 0 ? '#EF4444' : '#22C55E', fontWeight: 600 }}>{vt.malicious_count}/{vt.total_engines}</span></span>}
                        {vt.country && <span>Country: <span style={{ color: C.textSec }}>{vt.country}</span></span>}
                        {vt.as_owner && <span>ASN: <span style={{ color: C.textSec }}>{vt.as_owner}</span></span>}
                        {vt.sha256 && <span style={{ fontFamily: 'monospace', fontSize: 10, width: '100%' }}>SHA256: <span style={{ color: C.textSec }}>{vt.sha256}</span></span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {tab === 'timeline' && (
          <div style={{ maxWidth: 760 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textPri, marginBottom: 16 }}>Attack Timeline</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input value={newEvent} onChange={e => setNewEvent(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTimelineEvent()}
                placeholder="Describe what happened — timestamp added automatically…"
                style={{ ...inp(), flex: 1, resize: 'none' }}
                onFocus={e => e.target.style.borderColor = C.accentBor}
                onBlur={e => e.target.style.borderColor = C.border} />
              <button onClick={addTimelineEvent} style={{ padding: '9px 18px', borderRadius: 8, background: C.accent, color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(!c.timeline_events || c.timeline_events.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 40, color: C.textMut, fontSize: 13, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>No events yet.</div>
              ) : c.timeline_events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ fontSize: 13, color: C.textSec, flex: 1 }}>{ev}</span>
                  <button onClick={() => {
                    setC(prev => { const next = { ...prev, timeline_events: prev.timeline_events.filter((_, idx) => idx !== i) }; caseRef.current = next; return next; });
                    scheduleAutoSave();
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = C.textMut}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAYBOOK */}
        {tab === 'playbook' && (
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textPri, margin: 0 }}>{c.incident_type} Playbook</h2>
              <span style={{ fontSize: 12, color: C.textMut }}>{completedSteps}/{playSteps.length} steps</span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: C.accent, width: `${(completedSteps / playSteps.length) * 100}%`, transition: 'width 0.4s ease', borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {playSteps.map((step, i) => (
                <div key={i} onClick={() => setPlaybook(pb => ({ ...pb, [i]: !pb[i] }))} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${playbook[i] ? C.accentBor : C.border}`,
                  background: playbook[i] ? C.accentBg : C.surface,
                  transition: 'all 0.15s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `1.5px solid ${playbook[i] ? C.accent : C.textMut}`,
                    background: playbook[i] ? C.accent : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {playbook[i] && <Check size={11} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: playbook[i] ? C.textMut : C.textSec, textDecoration: playbook[i] ? 'line-through' : 'none' }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI ANALYSIS */}
        {tab === 'ai' && (
          <div style={{ maxWidth: 840 }}>
            {aiError && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12 }}>
                <p style={{ color: '#FCA5A5', fontWeight: 600, margin: '0 0 6px', fontSize: 13 }}>AI Generation Failed</p>
                <p style={{ color: C.textSec, margin: '0 0 8px', fontSize: 12 }}>{aiError}</p>
                <p style={{ color: C.textMut, margin: 0, fontSize: 12 }}>
                  Go to <strong style={{ color: C.textSec }}>Render Dashboard → Your Service → Environment</strong> and add <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>GROQ_API_KEY</code> — get a free key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>console.groq.com</a>.
                </p>
              </div>
            )}

            {!c.ai_executive_summary && !aiLoading && (
              <div style={{ textAlign: 'center', padding: 56, background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <Sparkles size={36} style={{ color: C.accent, margin: '0 auto 14px', display: 'block' }} />
                <p style={{ color: C.textPri, fontWeight: 600, margin: '0 0 6px' }}>No AI analysis yet</p>
                <p style={{ color: C.textMut, fontSize: 12, margin: '0 0 20px' }}>Fill in findings and IOCs first for best results.</p>
                <button onClick={generateAI} style={{
                  padding: '10px 24px', borderRadius: 9, border: `1px solid ${C.accentBor}`,
                  background: C.accentBg, color: C.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>Generate AI Analysis</button>
              </div>
            )}

            {c.ai_severity_score > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: c.ai_severity_score >= 75 ? '#EF4444' : c.ai_severity_score >= 50 ? '#F97316' : c.ai_severity_score >= 25 ? '#EAB308' : '#22C55E' }}>
                    {c.ai_severity_score}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>/ 100 RISK</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: C.textMut, margin: '0 0 4px' }}>AI SEVERITY REASONING</p>
                  <p style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6, margin: 0 }}>{c.ai_severity_reasoning}</p>
                </div>
              </div>
            )}

            {[
              { label: 'Executive Summary', field: 'ai_executive_summary' },
              { label: 'Technical Analysis', field: 'ai_technical_summary' },
              { label: 'Recommendations',   field: 'recommendations' },
            ].map(({ label, field }) => c[field] && (
              <div key={field} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{label}</span>
                  <button onClick={() => copyText(c[field])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = C.textSec}
                    onMouseLeave={e => e.currentTarget.style.color = C.textMut}><Copy size={14} /></button>
                </div>
                <div style={{ padding: 16, fontSize: 13, color: C.textSec, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{c[field]}</div>
              </div>
            ))}

            {Array.isArray(c.mitre_techniques) && c.mitre_techniques.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>MITRE ATT&CK Mapping</span>
                </div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {c.mitre_techniques.map((t, i) => (
                    <div key={i} style={{ background: C.elevated, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, background: C.accentBg, color: C.accent, padding: '3px 8px', borderRadius: 5, flexShrink: 0, border: `1px solid ${C.accentBor}` }}>{t.technique_id}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.textPri, margin: 0 }}>{t.technique_name} <span style={{ color: C.textMut, fontWeight: 400 }}>· {t.tactic}</span></p>
                        <p style={{ fontSize: 11, color: C.textMut, margin: '3px 0 0' }}>{t.evidence}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI CHAT */}
        {tab === 'chat' && (
          <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: 60 }}>
                  <Bot size={40} style={{ color: C.textMut, margin: '0 auto 14px', display: 'block' }} />
                  <p style={{ color: C.textPri, fontWeight: 600, margin: '0 0 6px' }}>AI Case Assistant</p>
                  <p style={{ color: C.textMut, fontSize: 12, margin: '0 0 4px' }}>Ask anything about this incident.</p>
                  <p style={{ color: C.textMut, fontSize: 11, margin: '0 0 24px' }}>Requires <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>GROQ_API_KEY</code> in Render env vars.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {['What should I investigate next?','Is this a false positive?','Write containment steps','Which MITRE techniques match?'].map(q => (
                      <button key={q} onClick={() => setChatInput(q)} style={{
                        fontSize: 12, padding: '7px 14px', borderRadius: 8,
                        border: `1px solid ${C.border}`, background: C.surface, color: C.textMut, cursor: 'pointer', transition: 'all 0.12s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accentBor; e.currentTarget.style.color = C.accent; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMut; }}
                      >{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.7,
                    background: m.role === 'user' ? '#7C3AED' : C.surface,
                    color: m.role === 'user' ? '#fff' : C.textSec,
                    border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
                  }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{m.content}</pre>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ padding: '10px 16px', borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, color: C.textMut, fontSize: 13 }}>Thinking…</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask anything about this case…" style={{ ...inp(), flex: 1, resize: 'none' }}
                onFocus={e => e.target.style.borderColor = C.accentBor}
                onBlur={e => e.target.style.borderColor = C.border} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{
                padding: '10px 20px', borderRadius: 10, background: '#7C3AED', color: '#fff',
                fontWeight: 600, fontSize: 13, border: 'none',
                cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}>Send</button>
            </div>
          </div>
        )}

        {/* REPORT */}
        {tab === 'report' && (
          <div style={{ maxWidth: 540 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: C.textPri, marginBottom: 16 }}>Download Report</h2>
            {!c.ai_executive_summary && (
              <div style={{ padding: '12px 16px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10, fontSize: 12, color: '#FDE047', marginBottom: 16 }}>
                ⚡ No AI analysis yet — clicking download will generate it first.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { fmt: 'pdf',  label: 'PDF Report',  desc: 'Professional, customer-ready', color: '#EF4444' },
                { fmt: 'docx', label: 'Word Report', desc: 'Editable DOCX format',          color: C.accent },
              ].map(({ fmt, label, desc, color }) => (
                <button key={fmt} onClick={() => downloadReport(fmt)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 24,
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHov; e.currentTarget.style.background = C.elevated; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>
                  <Download size={28} style={{ color }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.textPri, margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 11, color: C.textMut, margin: '3px 0 0' }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
              {[
                ['Case', c.case_number],
                ['Classification', c.classification],
                ['Analyst', c.analyst_name || '—'],
                ['Customer', c.customer_name || '—'],
                ['IOCs', String(c.iocs?.length || 0)],
                ['AI Summary', c.ai_executive_summary ? '✓ Ready' : '⚠ Will auto-generate'],
                ['MITRE Techniques', String(Array.isArray(c.mitre_techniques) ? c.mitre_techniques.length : 0)],
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: i < 6 ? 8 : 0 }}>
                  <span style={{ color: C.textMut }}>{k}</span>
                  <span style={{ color: C.textSec }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
