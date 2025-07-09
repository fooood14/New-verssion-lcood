import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/supabaseClient';

import Dashboard from '@/pages/Dashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import ExamSession from '@/pages/ExamSession';
import PublicExamPlayer from '@/pages/PublicExamPlayer';
import LoginPage from '@/pages/LoginPage';
import SessionResults from '@/pages/SessionResults';
import SiteAdminPage from '@/pages/SiteAdminPage';
import PermanentExamsPage from '@/pages/PermanentExamsPage';
import ExamVideos from '@/pages/ExamVideos';
import { Toaster } from '@/components/ui/toaster';

// ** استيراد المكون الجديد لعرض الفيديوهات بشكل سينمائي **
import CinematicExamView from '@/components/exam/CinematicExamView';

// المسارات المحمية وأدوار المستخدم
const AdminRoute = ({ children, session }) => {
  const isAdmin = sessionStorage.getItem('isAdminAccess') === 'true';
  if (!session) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const ProtectedRoute = ({ children, session }) => {
  if (!session) {
    return <Navigate to="/login" />;
  }
  return children;
};

const SiteAdminRoute = ({ children }) => {
  const isSiteAdmin = sessionStorage.getItem('isSiteAdminAccess') === 'true';
  if (!isSiteAdmin) {
    return <Navigate to="/login" />;
  }
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
          {/* صفحات الدخول */}
          <Route path="/login" element={session ? <Navigate to="/permanent-exams" /> : <LoginPage />} />
          <Route path="/" element={session ? <Navigate to="/permanent-exams" /> : <Navigate to="/login" />} />

          {/* صفحات المستخدم */}
          <Route path="/permanent-exams" element={<ProtectedRoute session={session}><PermanentExamsPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute session={session}><Dashboard /></ProtectedRoute>} />
          <Route path="/results/:testId" element={<ProtectedRoute session={session}><SessionResults /></ProtectedRoute>} />

          {/* صفحات المشرف */}
          <Route path="/admin" element={<AdminRoute session={session}><AdminDashboard /></AdminRoute>} />
          <Route path="/site-admin" element={<SiteAdminRoute><SiteAdminPage /></SiteAdminRoute>} />

          {/* صفحات الامتحان */}
          <Route path="/session/:examId" element={<ExamSession />} />
          <Route path="/exam/:examId" element={<PublicExamPlayer />} />
          <Route path="/exam-videos/:examId" element={<ExamVideos />} />

          {/* صفحة عرض الفيديوهات السينمائية */}
          <Route path="/exam/:examId/cinematic" element={<CinematicExamView />} />
        </Routes>

        <Toaster />
      </div>
    </>
  );
}

export default App;
