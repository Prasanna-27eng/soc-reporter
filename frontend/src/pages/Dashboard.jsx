import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Shield, AlertTriangle, CheckCircle, Clock, Activity, ChevronRight, Zap, TrendingUp } from 'lucide-react';
import api from '../api/client';

const SEV = {
  Critical: { dot: '#EF4444', badge: 'rgba(239,68,68,0.12)', text: '#FCA5A5', border: 'rgba(239,68,68,0.2)' },
  High:     { dot: '#F97316', badge: 'rgba(249,115,22,0.12)', text: '#FDBA74', border: 'rgba(249,115,22,0.2)' },
  Medium:   { dot: '#EAB308', badge: 'rgba(234,179,8,0.12)',  text: '#FDE047', border: 'rgba(234,179,8,0.2)' },
  Low:      { dot: '#22C55E', badge: 'rgba(34,197,94,0.12)',  text: '#86EFAC', border: 'rgba(34,197,94,0.2)' },
};
const STATUS = { Open: '#EF4444', 'In Progress': '#EAB308', Closed: '#22C55E' };

const Card = ({ children, style = {} }) => (
  <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, ...style }}>
    {children}
  </div>
);

export default function Dashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/cases').then(r => setCases(r.data)).finally(() => setLoading(false));
  }, []);

  const s = {
    total:      cases.length,
    open:       cases.filter(c => c.status === 'Open').length,
    inProgress: cases.filter(c => c.status === 'In Progress').length,
    closed:     cases.filter(c => c.status === 'Closed').length,
    critical:   cases.filter(c => c.severity === 'Critical').length,
    iocs:       cases.reduce((a, c) => a + (Array.isArray(c.iocs) ? c.iocs.length : 0), 0),
    ai:         cases.filter(c => c.ai_executive_summary).length,
  };
  const typeCounts = cases.reduce((acc, c) => { acc[c.incident_type] = (acc[c.incident_type] || 0) + 1; return acc; }, {});

  const stats = [
    { label: 'Total Cases',  value: s.total,      icon: Shield,        color: '#A78BFA' },
    { label: 'Open',         value: s.open,       icon: AlertTriangle, color: '#EF4444' },
    { label: 'In Progress',  value: s.inProgress, icon: Clock,         color: '#EAB308' },
    { label: 'Closed',       value: s.closed,     icon: CheckCircle,   color: '#22C55E' },
    { label: 'Critical',     value: s.critical,   icon: Zap,           color: '#F97316' },
    { label: 'Total IOCs',   value: s.iocs,       icon: Activity,      color: '#38BDF8' },
    { label: 'AI Reports',   value: s.ai,         icon: TrendingUp,    color: '#A78BFA' },
    { label: 'Inc. Types',   value: Object.keys(typeCounts).length, icon: Shield, color: '#34D399' },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1240, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#F4F4F5', margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => navigate('/cases')} style={{
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

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>{label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
              {loading ? '—' : value}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Recent cases */}
        <Card>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>Recent Incidents</span>
            <button onClick={() => navigate('/cases')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A78BFA', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#52525B', fontSize: 13 }}>Loading...</div>
          ) : cases.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Shield size={32} style={{ color: '#27272A', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: '#52525B', fontSize: 13, marginBottom: 10 }}>No cases yet</p>
              <button onClick={() => navigate('/cases')} style={{ color: '#A78BFA', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                Create your first case →
              </button>
            </div>
          ) : (
            <div>
              {cases.slice(0, 8).map((c, i) => {
                const sev = SEV[c.severity] || SEV.Low;
                return (
                  <div key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 18px', cursor: 'pointer',
                    borderBottom: i < Math.min(7, cases.length - 1) ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: sev.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#D4D4D8', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: '#52525B', margin: '2px 0 0' }}>{c.case_number} · {c.incident_type}</p>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, border: `1px solid ${sev.border}`, background: sev.badge, color: sev.text, fontWeight: 600 }}>
                      {c.severity}
                    </span>
                    <span style={{ fontSize: 11, color: STATUS[c.status] || '#71717A', fontWeight: 500, flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                      {c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Severity breakdown */}
          <Card style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7', marginBottom: 14, marginTop: 0 }}>Severity Breakdown</p>
            {[
              { label: 'Critical', color: '#EF4444' },
              { label: 'High',     color: '#F97316' },
              { label: 'Medium',   color: '#EAB308' },
              { label: 'Low',      color: '#22C55E' },
            ].map(({ label, color }) => {
              const count = cases.filter(c => c.severity === label).length;
              const pct = s.total ? (count / s.total) * 100 : 0;
              return (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#A1A1AA' }}>{label}</span>
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Incident types */}
          <Card style={{ padding: '14px 18px', flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7', marginBottom: 14, marginTop: 0 }}>Incident Types</p>
            {Object.keys(typeCounts).length === 0 ? (
              <p style={{ color: '#52525B', fontSize: 12, textAlign: 'center', padding: '12px 0', margin: 0 }}>No data yet</p>
            ) : Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#A1A1AA', flex: 1 }}>{type}</span>
                <div style={{ height: 3, width: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / s.total) * 100}%`, background: '#A78BFA', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: '#A78BFA', width: 16, textAlign: 'right', fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
