import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard, FolderOpen, Search, Bug, LogOut,
  Shield, ChevronLeft, ChevronRight, Menu
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cases', icon: FolderOpen, label: 'Cases' },
  { to: '/vt-lookup', icon: Search, label: 'VT Lookup' },
  { to: '/malware', icon: Bug, label: 'Malware Tools' },
];

export default function Layout() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-soc-bg overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-soc-surface border-r border-soc-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-soc-border">
          <Shield className="text-soc-cyan shrink-0" size={22} />
          {!collapsed && <span className="font-bold text-white text-sm tracking-wide">SOC Reporter</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-soc-cyan/10 text-soc-cyan border border-soc-cyan/20'
                    : 'text-soc-muted hover:text-soc-text hover:bg-soc-card'
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-soc-border p-3 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1">
              <p className="text-xs text-soc-muted">Signed in as</p>
              <p className="text-sm text-soc-text font-medium truncate">{username}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-soc-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && 'Logout'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-soc-muted hover:text-soc-text hover:bg-soc-card transition-all"
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
