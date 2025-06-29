import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/supabaseClient';

import Dashboard from '@/pages/Dashboard';
import PermanentExamsPage from '@/pages/PermanentExamsPage';
import LoginPage from '@/pages/LoginPage';
// بقية الاستيرادات...

const AdminRoute = ({ children, session }) => {
  const isAdmin = sessionStorage.getItem('isAdminAccess') === 'true';
  if (session === null) return null; // انتظار التحميل
  if (!session) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const ProtectedRoute = ({ children, session }) => {
  if (session === null) return null; // انتظار التحميل
  if (!session) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        sessionStorage.removeItem('isAdminAccess');
        sessionStorage.removeItem('isSiteAdminAccess');
        sessionStorage.removeItem('siteAdminPin');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>منصة الاختبارات التفاعلية</title>
        <meta name="description" content="نظام متطور لإنشاء وإدارة الاختبارات الثابتة والجلسات المباشرة مع تجميع النتائج." />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          <Route path="/permanent-exams" element={<ProtectedRoute session={session}><PermanentExamsPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute session={session}><Dashboard /></ProtectedRoute>} />
          {/* بقية المسارات */}
        </Routes>
      </div>
    </>
  );
}

export default App;
