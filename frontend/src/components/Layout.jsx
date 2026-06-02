import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Search, Bug,
  Shield, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Overview' },
  { to: '/cases',     icon: FolderOpen,      label: 'Cases',     desc: 'Incidents' },
  { to: '/vt-lookup', icon: Search,          label: 'VT Lookup', desc: 'Threat Intel' },
  { to: '/malware',   icon: Bug,             label: 'Malware',   desc: 'Analysis' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050A14' }}>

      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? '72px' : '220px',
          background: 'rgba(11,20,38,0.95)',
          borderRight: '1px solid rgba(0,212,255,0.08)',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
          position: 'relative', zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(0,212,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #00D4FF22, #00D4FF44)',
            border: '1px solid rgba(0,212,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} style={{ color: '#00D4FF' }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 13, lineHeight: 1.2, whiteSpace: 'nowrap' }}>SOC Reporter</p>
              <p style={{ color: '#00D4FF', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em' }}>AI PLATFORM</p>
            </div>
          )}
        </div>

        {/* Status pill */}
        {!collapsed && (
          <div style={{ padding: '10px 16px' }}>
            <div style={{
              background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.2)',
              borderRadius: 20, padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06D6A0', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#06D6A0', fontSize: 11, fontWeight: 500 }}>System Online</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon: Icon, label, desc }) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10, textDecoration: 'none', overflow: 'hidden',
                background: isActive ? 'rgba(0,212,255,0.07)' : 'transparent',
                border: isActive ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent',
                color: isActive ? '#00D4FF' : '#64748B',
                transition: 'all 0.2s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} style={{ flexShrink: 0, color: isActive ? '#00D4FF' : '#64748B' }} />
                  {!collapsed && (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, color: isActive ? '#E2E8F0' : '#94A3B8' }}>{label}</p>
                      <p style={{ fontSize: 10, color: isActive ? '#00D4FF' : '#475569', lineHeight: 1 }}>{desc}</p>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse btn */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(0,212,255,0.06)' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, padding: '8px 12px', borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#475569', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          >
            {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span style={{ fontSize: 12 }}>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          height: 56, padding: '0 24px',
          background: 'rgba(11,20,38,0.8)',
          borderBottom: '1px solid rgba(0,212,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backdropFilter: 'blur(12px)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} style={{ color: '#00D4FF' }} />
            <span style={{ color: '#64748B', fontSize: 12 }}>
              {NAV.find(n => location.pathname.startsWith(n.to))?.label || 'SOC Reporter'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
              color: '#00D4FF', fontSize: 11, fontWeight: 600,
            }}>SOC L1 ANALYST</div>
          </div>
        </header>

        {/* Page */}
        <main key={location.pathname} style={{ flex: 1, overflowY: 'auto' }} className="page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
