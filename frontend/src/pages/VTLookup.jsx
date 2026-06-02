import React, { useState, useEffect } from 'react';
import { Search, Copy, Send, AlertTriangle, CheckCircle, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const VT_BADGE = {
  malicious: 'text-red-400 bg-red-400/10 border-red-400/30',
  suspicious: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  clean: 'text-green-400 bg-green-400/10 border-green-400/30',
  not_found: 'text-soc-muted bg-soc-surface border-soc-border',
  unknown: 'text-soc-muted bg-soc-surface border-soc-border',
  error: 'text-red-400 bg-red-400/10 border-red-400/30',
};

export default function VTLookup() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [cases, setCases] = useState([]);
  const [showPush, setShowPush] = useState(false);
  const [pushCase, setPushCase] = useState('');
  const [pushNote, setPushNote] = useState('');
  const [pushing, setPushing] = useState(false);
  const [expanded, setExpanded] = useState({});

  // Bulk extractor
  const [rawText, setRawText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [bulkResults, setBulkResults] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('single');

  useEffect(() => {
    api.get('/api/cases').then(r => setCases(r.data)).catch(() => {});
  }, []);

  const lookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/api/ioc/lookup', { ioc: query.trim() });
      const data = res.data.virustotal || res.data;
      setResult(data);
      setHistory(h => [{ ioc: query.trim(), result: data, ts: new Date().toLocaleTimeString() }, ...h.slice(0, 9)]);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lookup failed');
    } finally { setLoading(false); }
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

  const pushToCase = async () => {
    if (!pushCase) return toast.error('Select a case');
    setPushing(true);
    try {
      await api.post('/api/ioc/push-to-case', {
        case_id: parseInt(pushCase),
        ioc: result?.ioc || query,
        vt_result: result,
        push_as_ioc: true,
        note: pushNote || `VT: ${result?.verdict?.toUpperCase()} — ${result?.malicious_count || 0}/${result?.total_engines || 0} engines`,
      });
      toast.success('Finding pushed to case');
      setShowPush(false);
      setPushNote('');
    } catch { toast.error('Push failed'); }
    finally { setPushing(false); }
  };

  const toggle = key => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const ResultCard = ({ data, showPushBtn = false }) => {
    if (!data) return null;
    const verdict = data.verdict || 'unknown';
    return (
      <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className={`px-5 py-4 border-b border-soc-border flex items-start gap-4 ${
          verdict === 'malicious' ? 'bg-red-400/5' :
          verdict === 'suspicious' ? 'bg-orange-400/5' :
          verdict === 'clean' ? 'bg-green-400/5' : ''
        }`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-sm px-3 py-1 rounded-full border font-bold ${VT_BADGE[verdict] || VT_BADGE.unknown}`}>
                {verdict.toUpperCase()}
              </span>
              <span className="text-xs text-soc-muted bg-soc-surface px-2 py-1 rounded">{data.type?.toUpperCase()}</span>
            </div>
            <p className="font-mono text-sm text-white mt-2 break-all">{data.ioc}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(data, null, 2)); toast.success('JSON copied'); }}
              className="text-soc-muted hover:text-soc-text p-1.5 rounded hover:bg-soc-surface transition-colors"><Copy size={14} /></button>
            {showPushBtn && (
              <button onClick={() => setShowPush(true)}
                className="flex items-center gap-1.5 bg-soc-cyan/10 text-soc-cyan border border-soc-cyan/20 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-soc-cyan/20 transition-colors">
                <Send size={12} /> Push to Case
              </button>
            )}
          </div>
        </div>

        {/* Detection stats */}
        {data.total_engines && (
          <div className="px-5 py-4 border-b border-soc-border">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <p className={`text-3xl font-bold ${data.malicious_count > 0 ? 'text-red-400' : 'text-green-400'}`}>{data.malicious_count}</p>
                <p className="text-xs text-soc-muted">Malicious</p>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-soc-surface rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${data.malicious_count > 0 ? 'bg-red-400' : 'bg-green-400'}`}
                    style={{ width: `${(data.malicious_count / data.total_engines) * 100}%` }} />
                </div>
                <p className="text-xs text-soc-muted mt-1">{data.total_engines} engines total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">{data.total_engines - (data.malicious_count || 0)}</p>
                <p className="text-xs text-soc-muted">Clean</p>
              </div>
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm border-b border-soc-border">
          {data.country && <Detail label="Country" value={data.country} />}
          {data.as_owner && <Detail label="ASN Owner" value={data.as_owner} />}
          {data.asn && <Detail label="ASN" value={data.asn} />}
          {data.network && <Detail label="Network" value={data.network} />}
          {data.reputation !== undefined && <Detail label="Reputation" value={data.reputation} />}
          {data.registrar && <Detail label="Registrar" value={data.registrar} />}
          {data.creation_date && <Detail label="Created" value={new Date(data.creation_date * 1000).toLocaleDateString()} />}
          {data.file_name && <Detail label="File Name" value={data.file_name} />}
          {data.file_type && <Detail label="File Type" value={data.file_type} />}
          {data.file_size && <Detail label="File Size" value={`${(data.file_size / 1024).toFixed(1)} KB`} />}
          {data.magic && <Detail label="Magic" value={data.magic} />}
          {data.first_seen && <Detail label="First Seen" value={new Date(data.first_seen * 1000).toLocaleDateString()} />}
        </div>

        {/* Hashes */}
        {(data.md5 || data.sha1 || data.sha256) && (
          <div className="px-5 py-4 border-b border-soc-border space-y-2">
            {data.md5 && <HashRow label="MD5" value={data.md5} />}
            {data.sha1 && <HashRow label="SHA1" value={data.sha1} />}
            {data.sha256 && <HashRow label="SHA256" value={data.sha256} />}
          </div>
        )}

        {/* Tags */}
        {data.tags?.length > 0 && (
          <div className="px-5 py-3 border-b border-soc-border flex flex-wrap gap-2">
            {data.tags.map(t => (
              <span key={t} className="text-xs bg-soc-purple/10 text-purple-300 border border-purple-400/20 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        )}

        {/* Flagged engines */}
        {Object.keys(data.last_analysis_results || {}).length > 0 && (
          <div className="px-5 py-4 border-b border-soc-border">
            <button onClick={() => toggle('engines')} className="flex items-center gap-2 text-xs text-soc-muted hover:text-soc-text w-full">
              {expanded.engines ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Flagged by {Object.keys(data.last_analysis_results).length} engine(s)
            </button>
            {expanded.engines && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(data.last_analysis_results).map(([eng, r]) => (
                  <span key={eng} className="text-xs bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-1 rounded">
                    {eng}: {r.result || r.category}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resolutions (IP) */}
        {data.resolutions?.length > 0 && (
          <div className="px-5 py-4">
            <button onClick={() => toggle('res')} className="flex items-center gap-2 text-xs text-soc-muted hover:text-soc-text mb-2">
              {expanded.res ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              DNS Resolutions ({data.resolutions.length})
            </button>
            {expanded.res && (
              <div className="space-y-1">
                {data.resolutions.map((r, i) => (
                  <div key={i} className="text-xs font-mono text-soc-text bg-soc-surface px-3 py-2 rounded">
                    {r.host_name || r.ip_address || JSON.stringify(r)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const Detail = ({ label, value }) => (
    <div>
      <p className="text-xs text-soc-muted">{label}</p>
      <p className="text-sm text-soc-text mt-0.5">{String(value)}</p>
    </div>
  );

  const HashRow = ({ label, value }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-soc-muted w-12">{label}</span>
      <span className="font-mono text-xs text-soc-text flex-1 break-all">{value}</span>
      <button onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); }}
        className="text-soc-muted hover:text-soc-text shrink-0"><Copy size={12} /></button>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">VirusTotal Lookup</h1>
        <p className="text-soc-muted text-sm mt-1">Search IPs, file hashes (MD5/SHA1/SHA256), domains, and URLs</p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 bg-soc-card border border-soc-border rounded-xl p-1 w-fit mb-6">
        {['single', 'bulk'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === t ? 'bg-soc-cyan text-soc-bg' : 'text-soc-muted hover:text-soc-text'
            }`}>{t === 'single' ? 'Single Lookup' : 'IOC Extractor + Bulk'}</button>
        ))}
      </div>

      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Search bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-soc-muted" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookup()}
                  placeholder="Enter IP, MD5/SHA1/SHA256, domain, or URL..."
                  className="w-full bg-soc-card border border-soc-border rounded-xl pl-9 pr-4 py-3 text-sm text-soc-text font-mono placeholder-soc-muted focus:outline-none focus:border-soc-cyan"
                />
              </div>
              <button onClick={lookup} disabled={loading}
                className="bg-soc-cyan text-soc-bg px-5 py-3 rounded-xl text-sm font-semibold hover:bg-soc-cyan-dim disabled:opacity-50 transition-colors">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {result && <ResultCard data={result} showPushBtn />}
          </div>

          {/* History sidebar */}
          <div>
            <h3 className="text-xs text-soc-muted uppercase tracking-wider mb-3">Recent Lookups</h3>
            <div className="space-y-2">
              {history.length === 0 && <p className="text-xs text-soc-muted">No recent lookups</p>}
              {history.map((h, i) => (
                <div key={i} onClick={() => { setQuery(h.ioc); setResult(h.result); }}
                  className="bg-soc-card border border-soc-border rounded-lg px-3 py-2 cursor-pointer hover:border-soc-cyan/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${VT_BADGE[h.result?.verdict] || VT_BADGE.unknown}`}>
                      {h.result?.verdict?.toUpperCase() || '?'}
                    </span>
                    <span className="text-xs text-soc-muted">{h.ts}</span>
                  </div>
                  <p className="font-mono text-xs text-soc-text truncate">{h.ioc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs text-soc-muted mb-2">Paste raw text — email body, log output, alert data, anything</label>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={8}
              placeholder={"Paste any raw text here — emails, logs, alert outputs, SIEM data...\nThe extractor will find all IPs, hashes, domains, URLs, CVEs automatically."}
              className="w-full bg-soc-card border border-soc-border rounded-xl px-4 py-3 text-sm text-soc-text font-mono focus:outline-none focus:border-soc-cyan resize-none" />
            <button onClick={extractIOCs}
              className="mt-2 bg-soc-cyan text-soc-bg px-4 py-2 rounded-lg text-sm font-semibold hover:bg-soc-cyan-dim transition-colors">
              Extract IOCs
            </button>
          </div>

          {extracted && (
            <div className="bg-soc-card border border-soc-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Extracted IOCs</h3>
                <button onClick={bulkLookup} disabled={bulkLoading || !extracted.all_for_lookup?.length}
                  className="bg-soc-cyan text-soc-bg px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-soc-cyan-dim disabled:opacity-50 transition-colors">
                  {bulkLoading ? 'Looking up...' : `VT Lookup All (${extracted.all_for_lookup?.length || 0})`}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <div key={label} className="bg-soc-surface border border-soc-border rounded-lg p-3">
                    <p className="text-xs text-soc-muted mb-2">{label} ({arr.length})</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {arr.map((v, i) => {
                        const vtR = bulkResults[v]?.virustotal || bulkResults[v];
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-mono text-xs text-soc-text truncate flex-1">{v}</span>
                            {vtR?.verdict && (
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${VT_BADGE[vtR.verdict] || VT_BADGE.unknown}`}>
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

      {/* Push to Case Modal */}
      {showPush && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-soc-card border border-soc-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Push to Case</h3>
              <button onClick={() => setShowPush(false)} className="text-soc-muted hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Select Case</label>
                <select value={pushCase} onChange={e => setPushCase(e.target.value)}
                  className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan">
                  <option value="">Select a case...</option>
                  {cases.filter(c => c.status !== 'Closed').map(c => (
                    <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-soc-muted mb-1.5">Note (optional)</label>
                <input value={pushNote} onChange={e => setPushNote(e.target.value)}
                  placeholder="e.g. C2 server, malware hash, phishing domain"
                  className="w-full bg-soc-surface border border-soc-border rounded-lg px-3 py-2 text-sm text-soc-text focus:outline-none focus:border-soc-cyan" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPush(false)}
                  className="flex-1 bg-soc-surface border border-soc-border text-soc-text py-2.5 rounded-lg text-sm hover:bg-soc-card transition-colors">
                  Cancel
                </button>
                <button onClick={pushToCase} disabled={pushing || !pushCase}
                  className="flex-1 bg-soc-cyan text-soc-bg font-semibold py-2.5 rounded-lg text-sm hover:bg-soc-cyan-dim disabled:opacity-50 transition-colors">
                  {pushing ? 'Pushing...' : 'Push Finding'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
