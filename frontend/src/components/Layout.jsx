import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Search, Bug, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cases',     icon: FolderOpen,      label: 'Cases' },
  { to: '/vt-lookup', icon: Search,          label: 'VT Lookup' },
  { to: '/malware',   icon: Bug,             label: 'Malware Tools' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentNav = NAV.find(n => location.pathname.startsWith(n.to));

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0C0C0E', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 210,
        background: '#111114',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={16} color="#A78BFA" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ color: '#F4F4F5', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', margin: 0 }}>SOC Reporter</p>
              <p style={{ color: '#8B5CF6', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', margin: 0 }}>AI PLATFORM</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: collapsed ? '10px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8, textDecoration: 'none',
              background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent',
              color: isActive ? '#A78BFA' : '#71717A',
              transition: 'all 0.15s',
              fontSize: 13, fontWeight: isActive ? 500 : 400,
            })}>
              {({ isActive }) => (
                <>
                  <Icon size={16} style={{ flexShrink: 0, color: isActive ? '#A78BFA' : '#52525B' }} />
                  {!collapsed && <span style={{ color: isActive ? '#E4E4E7' : '#A1A1AA' }}>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Collapse */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, padding: '8px 10px', borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer', color: '#52525B',
            fontSize: 12, transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#A1A1AA'}
            onMouseLeave={e => e.currentTarget.style.color = '#52525B'}
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          height: 52, padding: '0 20px',
          background: 'rgba(17,17,20,0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, backdropFilter: 'blur(10px)',
        }}>
          <span style={{ color: '#A1A1AA', fontSize: 13, fontWeight: 500 }}>
            {currentNav?.label || 'SOC Reporter'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#52525B', fontSize: 12 }}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#A78BFA', fontSize: 11, fontWeight: 500 }}>
              SOC ANALYST
            </span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
