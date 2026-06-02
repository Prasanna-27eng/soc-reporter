import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Shield, AlertTriangle, CheckCircle, Clock, Activity, ChevronRight, Zap } from 'lucide-react';
import api from '../api/client';

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) clearInterval(ref.current);
    const start = Date.now();
    const end = start + duration;
    ref.current = setInterval(() => {
      const now = Date.now();
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress >= 1) clearInterval(ref.current);
    }, 16);
    return () => clearInterval(ref.current);
  }, [value, duration]);
  return <span>{display}</span>;
}

const SEV_MAP = {
  Critical: { color: '#FF4D6D', bg: 'rgba(255,77,109,0.1)', border: 'rgba(255,77,109,0.25)' },
  High:     { color: '#FF8C42', bg: 'rgba(255,140,66,0.1)', border: 'rgba(255,140,66,0.25)' },
  Medium:   { color: '#FFD166', bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.25)' },
  Low:      { color: '#06D6A0', bg: 'rgba(6,214,160,0.1)', border: 'rgba(6,214,160,0.25)' },
};

const STATUS_COLOR = { Open: '#FF4D6D', 'In Progress': '#FFD166', Closed: '#06D6A0' };

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
    totalIOCs: cases.reduce((a, c) => a + (Array.isArray(c.iocs) ? c.iocs.length : 0), 0),
    aiDone: cases.filter(c => c.ai_executive_summary).length,
  };

  const typeCounts = cases.reduce((acc, c) => { acc[c.incident_type] = (acc[c.incident_type] || 0) + 1; return acc; }, {});

  const statCards = [
    { label: 'Total Cases',    value: stats.total,     icon: Shield,        color: '#00D4FF', delay: 0 },
    { label: 'Open',           value: stats.open,      icon: AlertTriangle, color: '#FF4D6D', delay: 0.05 },
    { label: 'In Progress',    value: stats.inProgress, icon: Clock,        color: '#FFD166', delay: 0.1 },
    { label: 'Closed',         value: stats.closed,    icon: CheckCircle,   color: '#06D6A0', delay: 0.15 },
    { label: 'Critical',       value: stats.critical,  icon: Zap,           color: '#FF4D6D', delay: 0.2 },
    { label: 'Total IOCs',     value: stats.totalIOCs, icon: Activity,      color: '#6366F1', delay: 0.25 },
    { label: 'AI Reports',     value: stats.aiDone,    icon: TrendingUp,    color: '#00D4FF', delay: 0.3 },
    { label: 'Types',          value: Object.keys(typeCounts).length, icon: Shield, color: '#FF8C42', delay: 0.35 },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }} className="cyber-grid">
      {/* Header */}
      <div className="stagger-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.2 }}>
            Analyst Dashboard
          </h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/cases')}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          <Plus size={15} /> New Case
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon: Icon, color, delay }) => (
          <div
            key={label}
            className="stat-card"
            style={{
              background: 'rgba(15,29,53,0.8)', border: '1px solid rgba(0,212,255,0.08)',
              borderRadius: 14, padding: '18px 20px',
              opacity: 0, animation: `fadeUp 0.4s ease ${delay}s forwards`,
              cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
              {loading ? '—' : <AnimatedNumber value={value} />}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

        {/* Recent Cases */}
        <div className="stagger-2" style={{ background: 'rgba(15,29,53,0.8)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,212,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>Recent Incidents</span>
            <button onClick={() => navigate('/cases')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00D4FF', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
          ) : cases.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Shield size={36} style={{ color: '#1A2F50', margin: '0 auto 12px' }} />
              <p style={{ color: '#475569', fontSize: 13, marginBottom: 12 }}>No cases yet.</p>
              <button onClick={() => navigate('/cases')} style={{ color: '#00D4FF', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                Create your first case →
              </button>
            </div>
          ) : (
            <div>
              {cases.slice(0, 8).map((c, i) => {
                const sev = SEV_MAP[c.severity] || SEV_MAP.Low;
                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 20px', cursor: 'pointer',
                      borderBottom: i < 7 ? '1px solid rgba(0,212,255,0.04)' : 'none',
                      transition: 'background 0.15s',
                      opacity: 0, animation: `fadeIn 0.3s ease ${i * 0.04}s forwards`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sev.color, flexShrink: 0, boxShadow: `0 0 6px ${sev.color}` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#CBD5E1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{c.case_number} · {c.incident_type}</p>
                    </div>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, border: `1px solid ${sev.border}`, background: sev.bg, color: sev.color, fontWeight: 600, flexShrink: 0 }}>
                      {c.severity}
                    </span>
                    <span style={{ fontSize: 11, color: STATUS_COLOR[c.status] || '#64748B', fontWeight: 500, flexShrink: 0, width: 72, textAlign: 'right' }}>
                      {c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Severity breakdown */}
          <div className="stagger-3" style={{ background: 'rgba(15,29,53,0.8)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginBottom: 14 }}>Severity Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Critical', color: '#FF4D6D' },
                { label: 'High',     color: '#FF8C42' },
                { label: 'Medium',   color: '#FFD166' },
                { label: 'Low',      color: '#06D6A0' },
              ].map(({ label, color }) => {
                const count = cases.filter(c => c.severity === label).length;
                const pct = stats.total ? (count / stats.total) * 100 : 0;
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
                      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div className="progress-bar" style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}66` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident types */}
          <div className="stagger-4" style={{ background: 'rgba(15,29,53,0.8)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 16, padding: '16px 20px', flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', marginBottom: 14 }}>Incident Types</p>
            {Object.keys(typeCounts).length === 0 ? (
              <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>No data yet</p>
            ) : Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#94A3B8', flex: 1 }}>{type}</span>
                <div style={{ height: 4, width: 80, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / stats.total) * 100}%`, background: '#00D4FF', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: '#00D4FF', width: 16, textAlign: 'right', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
