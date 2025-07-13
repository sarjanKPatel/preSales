'use client';

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import HomePage from '@/pages/Home';
import ProposalsPage from '@/pages/Proposals';
import ProposalDetailPage from '@/pages/ProposalDetail';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/proposals/:id" element={<ProposalDetailPage />} />
          
          {/* Redirects for common routes */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/proposals" replace />} />
          
          {/* Placeholder routes */}
          <Route path="/analytics" element={<div className="p-8 text-center"><h1 className="text-2xl">Analytics Coming Soon</h1></div>} />
          <Route path="/templates" element={<div className="p-8 text-center"><h1 className="text-2xl">Templates Coming Soon</h1></div>} />
          <Route path="/profile" element={<div className="p-8 text-center"><h1 className="text-2xl">Profile Coming Soon</h1></div>} />
          <Route path="/settings" element={<div className="p-8 text-center"><h1 className="text-2xl">Settings Coming Soon</h1></div>} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}