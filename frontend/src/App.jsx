import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import CaseList from './pages/CaseList';
import CaseDetail from './pages/CaseDetail';
import VTLookup from './pages/VTLookup';
import MalwareTools from './pages/MalwareTools';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F1D35',
            color: '#E2E8F0',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: '12px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#00D4FF', secondary: '#050A14' } },
          error:   { iconTheme: { primary: '#FF4D6D', secondary: '#050A14' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="cases"      element={<CaseList />} />
          <Route path="cases/:id"  element={<CaseDetail />} />
          <Route path="vt-lookup"  element={<VTLookup />} />
          <Route path="malware"    element={<MalwareTools />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
