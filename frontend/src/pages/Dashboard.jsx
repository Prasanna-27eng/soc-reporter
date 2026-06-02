import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, FolderOpen, ShieldAlert, Activity, Plus } from 'lucide-react';
import api from '../api/client';

const SEV_COLORS = {
  Critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  High: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Low: 'text-green-400 bg-green-400/10 border-green-400/20',
};

const STATUS_COLORS = {
  Open: 'text-red-400',
  'In Progress': 'text-yellow-400',
  Closed: 'text-green-400',
};

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/cases').then(r => setCases(r.data)).finally(() => setLoading(false));
  }, []);

  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'Open').length,
    inProgress: cases.filter(c => c.status === 'In Progress').length,
    closed: cases.filter(c => c.status === 'Closed').length,
    critical: cases.filter(c => c.severity === 'Critical').length,
    high: cases.filter(c => c.severity === 'High').length,
    totalIOCs: cases.reduce((acc, c) => acc + (Array.isArray(c.iocs) ? c.iocs.length : 0), 0),
    aiGenerated: cases.filter(c => c.ai_executive_summary).length,
  };

  const recentCases = cases.slice(0, 8);

  const typeCounts = cases.reduce((acc, c) => {
    acc[c.incident_type] = (acc[c.incident_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analyst Dashboard</h1>
          <p className="text-soc-muted text-sm mt-1">Overview of all incidents and IOCs</p>
        </div>
        <button
          onClick={() => navigate('/cases')}
          className="flex items-center gap-2 bg-soc-cyan text-soc-bg px-4 py-2 rounded-lg text-sm font-semibold hover:bg-soc-cyan-dim transition-colors"
        >
          <Plus size={16} /> New Case
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Cases', value: stats.total, icon: FolderOpen, color: 'text-soc-cyan', bg: 'bg-soc-cyan/10' },
          { label: 'Open', value: stats.open, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
          { label: 'Closed', value: stats.closed, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Critical', value: stats.critical, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'High Severity', value: stats.high, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Total IOCs', value: stats.totalIOCs, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'AI Reports', value: stats.aiGenerated, icon: TrendingUp, color: 'text-soc-cyan', bg: 'bg-soc-cyan/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-soc-card border border-soc-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-soc-muted">{label}</span>
              <div className={`${bg} p-1.5 rounded-lg`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 bg-soc-card border border-soc-border rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-soc-border">
            <h2 className="text-sm font-semibold text-white">Recent Cases</h2>
            <button onClick={() => navigate('/cases')} className="text-xs text-soc-cyan hover:underline">View all</button>
          </div>
          <div className="divide-y divide-soc-border">
            {loading ? (
              <div className="p-8 text-center text-soc-muted text-sm">Loading...</div>
            ) : recentCases.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="mx-auto mb-3 text-soc-muted" size={32} />
                <p className="text-soc-muted text-sm">No cases yet.</p>
                <button onClick={() => navigate('/cases')} className="mt-3 text-soc-cyan text-sm hover:underline">Create your first case →</button>
              </div>
            ) : recentCases.map(c => (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-soc-surface cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{c.title}</p>
                  <p className="text-xs text-soc-muted mt-0.5">{c.case_number} · {c.incident_type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SEV_COLORS[c.severity] || SEV_COLORS.Low}`}>
                  {c.severity}
                </span>
                <span className={`text-xs font-medium ${STATUS_COLORS[c.status] || 'text-soc-muted'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Types */}
        <div className="bg-soc-card border border-soc-border rounded-xl">
          <div className="p-4 border-b border-soc-border">
            <h2 className="text-sm font-semibold text-white">Incidents by Type</h2>
          </div>
          <div className="p-4 space-y-3">
            {Object.keys(typeCounts).length === 0 ? (
              <p className="text-soc-muted text-sm text-center py-4">No data yet</p>
            ) : Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-soc-text">{type}</span>
                  <span className="text-soc-muted">{count}</span>
                </div>
                <div className="h-1.5 bg-soc-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-soc-cyan rounded-full"
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Severity Breakdown */}
          <div className="p-4 border-t border-soc-border">
            <h3 className="text-xs text-soc-muted mb-3 uppercase tracking-wider">Severity Breakdown</h3>
            <div className="space-y-2">
              {['Critical', 'High', 'Medium', 'Low'].map(sev => {
                const count = cases.filter(c => c.severity === sev).length;
                return (
                  <div key={sev} className="flex items-center gap-3">
                    <span className={`text-xs w-14 font-medium ${SEV_COLORS[sev]?.split(' ')[0]}`}>{sev}</span>
                    <div className="flex-1 h-1.5 bg-soc-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sev === 'Critical' ? 'bg-red-400' :
                          sev === 'High' ? 'bg-orange-400' :
                          sev === 'Medium' ? 'bg-yellow-400' : 'bg-green-400'
                        }`}
                        style={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-soc-muted w-4 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
