import React, { useState, useEffect } from 'react';
import { Search, Copy, Send, ChevronDown, ChevronUp, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

function copyText(text) {
  const doFallback = () => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(el);
    el.focus(); el.select();
    try { document.execCommand('copy'); toast.success('Copied'); }
    catch { toast.error('Copy failed'); }
    document.body.removeChild(el);
  };
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast.success('Copied')).catch(doFallback);
    } else { doFallback(); }
  } catch { doFallback(); }
}

const C = {
  bg:        '#0C0C0E',
  surface:   '#18181B',
  elevated:  '#1C1C1F',
  border:    'rgba(255,255,255,0.07)',
  textPri:   '#F4F4F5',
  textSec:   '#A1A1AA',
  textMut:   '#52525B',
  accent:    '#A78BFA',
  accentBg:  'rgba(139,92,246,0.1)',
  accentBor: 'rgba(139,92,246,0.25)',
};

const inp = (mono) => ({
  width: '100%', padding: '9px 12px',
  background: C.elevated, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.textPri, fontSize: 13,
  fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
  outline: 'none', boxSizing: 'border-box', resize: 'vertical',
  transition: 'border-color 0.15s',
});

const lbl = { display: 'block', fontSize: 11, color: C.textMut, marginBottom: 6, fontWeight: 500 };

const VERDICT = {
  malicious:  { color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  rowBg: 'rgba(239,68,68,0.04)' },
  suspicious: { color: '#FDBA74', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', rowBg: 'rgba(249,115,22,0.04)' },
  clean:      { color: '#86EFAC', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  rowBg: 'rgba(34,197,94,0.04)' },
  not_found:  { color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.2)', rowBg: 'transparent' },
  unknown:    { color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.2)', rowBg: 'transparent' },
  error:      { color: '#FCA5A5', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  rowBg: 'transparent' },
};

// Push to case modal
function PushModal({ ioc, result, cases, onClose }) {
  const [caseId, setCaseId] = useState('');
  const [note, setNote] = useState('');
  const [pushing, setPushing] = useState(false);

  const push = async () => {
    if (!caseId) return toast.error('Select a case');
    setPushing(true);
    try {
      await api.post('/api/ioc/push-to-case', {
        case_id: parseInt(caseId), ioc: result?.ioc || ioc, vt_result: result,
        push_as_ioc: true,
        note: note || `VT: ${result?.verdict?.toUpperCase() || 'UNKNOWN'} — ${result?.malicious_count || 0}/${result?.total_engines || 0} engines`,
      });
      toast.success('Finding pushed to case');
      onClose();
    } catch { toast.error('Push failed'); }
    finally { setPushing(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 460, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPri, margin: 0 }}>Push to Case</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Select Case</label>
            <select value={caseId} onChange={e => setCaseId(e.target.value)} style={{ ...inp(), resize: 'none', cursor: 'pointer' }}>
              <option value="">Choose a case…</option>
              {cases.filter(c => c.status !== 'Closed').map(c => (
                <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. C2 server, malware hash, phishing domain"
              style={{ ...inp(), resize: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSec, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={push} disabled={pushing || !caseId} style={{
              flex: 1, padding: '10px', borderRadius: 9, border: 'none',
              background: pushing || !caseId ? '#5B21B6' : '#7C3AED', color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: pushing || !caseId ? 'not-allowed' : 'pointer',
            }}>{pushing ? 'Pushing…' : 'Push Finding'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ data, showPushBtn, cases }) {
  const [showPush, setShowPush] = useState(false);
  const [expanded, setExpanded] = useState({});
  const toggle = k => setExpanded(e => ({ ...e, [k]: !e[k] }));
  if (!data) return null;
  const verdict = data.verdict || 'unknown';
  const vc = VERDICT[verdict] || VERDICT.unknown;

  return (
    <>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, background: vc.rowBg, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${vc.border}`, background: vc.bg, color: vc.color, fontWeight: 700 }}>
                {verdict.toUpperCase()}
              </span>
              {data.type && <span style={{ fontSize: 11, color: C.textMut, background: C.elevated, padding: '2px 8px', borderRadius: 6 }}>{data.type.toUpperCase()}</span>}
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: 13, color: C.textPri, margin: 0, wordBreak: 'break-all' }}>{data.ioc}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => copyText(JSON.stringify(data, null, 2))} style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textMut,
              background: C.elevated, border: `1px solid ${C.border}`, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
            }}><Copy size={12} /> Copy JSON</button>
            {showPushBtn && cases.length > 0 && (
              <button onClick={() => setShowPush(true)} style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.accent,
                background: C.accentBg, border: `1px solid ${C.accentBor}`, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
              }}><Send size={12} /> Push to Case</button>
            )}
          </div>
        </div>

        {/* Detection stats */}
        {data.total_engines && (
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: data.malicious_count > 0 ? '#EF4444' : '#22C55E' }}>{data.malicious_count}</div>
                <div style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>Malicious</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: data.malicious_count > 0 ? '#EF4444' : '#22C55E', width: `${(data.malicious_count / data.total_engines) * 100}%`, borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
                <p style={{ fontSize: 11, color: C.textMut, margin: '5px 0 0' }}>{data.total_engines} engines scanned</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: '#22C55E' }}>{data.total_engines - (data.malicious_count || 0)}</div>
                <div style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>Clean</div>
              </div>
            </div>
          </div>
        )}

        {/* Details grid */}
        <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', borderBottom: `1px solid ${C.border}` }}>
          {[
            ['Country', data.country],
            ['ASN Owner', data.as_owner],
            ['ASN', data.asn],
            ['Network', data.network],
            ['Reputation', data.reputation],
            ['Registrar', data.registrar],
            ['File Name', data.file_name],
            ['File Type', data.file_type],
            ['File Size', data.file_size ? `${(data.file_size / 1024).toFixed(1)} KB` : null],
            ['First Seen', data.first_seen ? new Date(data.first_seen * 1000).toLocaleDateString() : null],
            ['Created', data.creation_date ? new Date(data.creation_date * 1000).toLocaleDateString() : null],
          ].filter(([, v]) => v != null).map(([k, v]) => (
            <div key={k}>
              <p style={{ fontSize: 11, color: C.textMut, margin: 0 }}>{k}</p>
              <p style={{ fontSize: 12, color: C.textSec, margin: '2px 0 0' }}>{String(v)}</p>
            </div>
          ))}
        </div>

        {/* Hashes */}
        {(data.md5 || data.sha1 || data.sha256) && (
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['MD5', data.md5], ['SHA1', data.sha1], ['SHA256', data.sha256]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: C.textMut, width: 48, flexShrink: 0 }}>{k}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.textSec, flex: 1, wordBreak: 'break-all' }}>{v}</span>
                <button onClick={() => copyText(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 4, flexShrink: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = C.textSec}
                  onMouseLeave={e => e.currentTarget.style.color = C.textMut}><Copy size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {data.tags?.length > 0 && (
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.tags.map(t => (
              <span key={t} style={{ fontSize: 11, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBor}`, padding: '2px 8px', borderRadius: 6 }}>{t}</span>
            ))}
          </div>
        )}

        {/* Flagged engines */}
        {Object.keys(data.last_analysis_results || {}).length > 0 && (
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => toggle('engines')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMut, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = C.textSec}
              onMouseLeave={e => e.currentTarget.style.color = C.textMut}
            >
              {expanded.engines ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Flagged by {Object.keys(data.last_analysis_results).length} engine(s)
            </button>
            {expanded.engines && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(data.last_analysis_results).map(([eng, r]) => (
                  <span key={eng} style={{ fontSize: 11, background: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: 6 }}>
                    {eng}: {r.result || r.category}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DNS resolutions */}
        {data.resolutions?.length > 0 && (
          <div style={{ padding: '10px 18px' }}>
            <button onClick={() => toggle('res')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMut, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}>
              {expanded.res ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              DNS Resolutions ({data.resolutions.length})
            </button>
            {expanded.res && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.resolutions.map((r, i) => (
                  <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, color: C.textSec, background: C.elevated, padding: '6px 10px', borderRadius: 6 }}>
                    {r.host_name || r.ip_address || JSON.stringify(r)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showPush && <PushModal ioc={data.ioc} result={data} cases={cases} onClose={() => setShowPush(false)} />}
    </>
  );
}

export default function VTLookup() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [cases, setCases] = useState([]);
  const [activeTab, setActiveTab] = useState('single');

  // Bulk
  const [rawText, setRawText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [bulkResults, setBulkResults] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    api.get('/api/cases').then(r => setCases(r.data)).catch(() => {});
  }, []);

  const lookup = async () => {
    if (!query.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await api.post('/api/ioc/lookup', { ioc: query.trim() });
      const data = res.data.virustotal || res.data;
      setResult(data);
      setHistory(h => [{ ioc: query.trim(), result: data, ts: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
    } catch (err) { toast.error(err.response?.data?.detail || 'Lookup failed'); }
    finally { setLoading(false); }
  };

  const extractIOCs = async () => {
    if (!rawText.trim()) return;
    try {
      const res = await api.post('/api/ioc/extract', { text: rawText });
      setExtracted(res.data);
    } catch { toast.error('Extraction failed'); }
  };

  const bulkLookup = async () => {
    if (!extracted?.all_for_lookup?.length) return;
    setBulkLoading(true);
    try {
      const res = await api.post('/api/ioc/bulk-lookup', { iocs: extracted.all_for_lookup });
      setBulkResults(res.data);
    } catch { toast.error('Bulk lookup failed'); }
    finally { setBulkLoading(false); }
  };

  const vc = (v) => (VERDICT[v] || VERDICT.unknown);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: C.textPri, margin: 0 }}>VirusTotal Lookup</h1>
        <p style={{ color: C.textMut, fontSize: 13, marginTop: 4, marginBottom: 0 }}>Search IPs, file hashes (MD5/SHA1/SHA256), domains, and URLs</p>
      </div>

      {/* Tab switch */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {[['single', 'Single Lookup'], ['bulk', 'IOC Extractor + Bulk']].map(([t, label]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500,
            border: `1px solid ${activeTab === t ? C.accentBor : C.border}`,
            background: activeTab === t ? C.accentBg : C.surface,
            color: activeTab === t ? C.accent : C.textMut,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {activeTab === 'single' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Search */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMut }} />
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()}
                  placeholder="Enter IP, MD5/SHA1/SHA256, domain, or URL…"
                  style={{ ...inp(true), paddingLeft: 36, resize: 'none' }}
                  onFocus={e => e.target.style.borderColor = C.accentBor}
                  onBlur={e => e.target.style.borderColor = C.border} />
              </div>
              <button onClick={lookup} disabled={loading} style={{
                padding: '9px 20px', borderRadius: 9, border: 'none',
                background: loading ? '#5B21B6' : '#7C3AED', color: '#fff',
                fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}>{loading ? 'Searching…' : 'Search'}</button>
            </div>
            {result && <ResultCard data={result} showPushBtn cases={cases} />}
          </div>

          {/* History */}
          <div>
            <p style={{ fontSize: 11, color: C.textMut, marginBottom: 10, fontWeight: 500, letterSpacing: '0.04em' }}>RECENT LOOKUPS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.length === 0 && <p style={{ fontSize: 12, color: C.textMut }}>No recent lookups</p>}
              {history.map((h, i) => {
                const v = h.result?.verdict;
                const hvc = vc(v);
                return (
                  <div key={i} onClick={() => { setQuery(h.ioc); setResult(h.result); }} style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: '10px 12px', cursor: 'pointer', transition: 'border-color 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.accentBor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, border: `1px solid ${hvc.border}`, background: hvc.bg, color: hvc.color, fontWeight: 700 }}>
                        {v?.toUpperCase() || '?'}
                      </span>
                      <span style={{ fontSize: 10, color: C.textMut }}>{h.ts}</span>
                    </div>
                    <p style={{ fontFamily: 'monospace', fontSize: 11, color: C.textSec, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.ioc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <label style={lbl}>Paste raw text — email body, log output, alert data, anything</label>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={8}
              placeholder={"Paste any raw text here — emails, logs, SIEM data…\nThe extractor will find all IPs, hashes, domains, URLs, CVEs automatically."}
              style={{ ...inp(true), resize: 'vertical', marginBottom: 12 }}
              onFocus={e => e.target.style.borderColor = C.accentBor}
              onBlur={e => e.target.style.borderColor = C.border} />
            <button onClick={extractIOCs} style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>Extract IOCs</button>
          </div>

          {extracted && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.textPri, margin: 0 }}>Extracted IOCs</h3>
                <button onClick={bulkLookup} disabled={bulkLoading || !extracted.all_for_lookup?.length} style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: bulkLoading || !extracted.all_for_lookup?.length ? '#5B21B6' : '#7C3AED',
                  color: '#fff', fontSize: 12, fontWeight: 500, cursor: bulkLoading ? 'not-allowed' : 'pointer',
                }}>
                  {bulkLoading ? 'Looking up…' : `VT Lookup All (${extracted.all_for_lookup?.length || 0})`}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  ['IPs', extracted.ips],
                  ['MD5 Hashes', extracted.hashes_md5],
                  ['SHA1 Hashes', extracted.hashes_sha1],
                  ['SHA256 Hashes', extracted.hashes_sha256],
                  ['Domains', extracted.domains],
                  ['URLs', extracted.urls],
                  ['CVEs', extracted.cves],
                  ['Emails', extracted.emails],
                ].filter(([, arr]) => arr?.length > 0).map(([label, arr]) => (
                  <div key={label} style={{ background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
                    <p style={{ fontSize: 11, color: C.textMut, margin: '0 0 8px', fontWeight: 500 }}>{label} ({arr.length})</p>
                    <div style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {arr.map((v, i) => {
                        const vtR = bulkResults[v]?.virustotal || bulkResults[v];
                        const bvc = vc(vtR?.verdict);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                            <button onClick={() => copyText(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMut, padding: 2, flexShrink: 0 }}><Copy size={11} /></button>
                            {vtR?.verdict && (
                              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, border: `1px solid ${bvc.border}`, background: bvc.bg, color: bvc.color, fontWeight: 700, flexShrink: 0 }}>
                                {vtR.verdict.slice(0, 3).toUpperCase()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
