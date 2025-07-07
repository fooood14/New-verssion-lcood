import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

import { Button } from '@/components/ui/button';
import { Plus, LogOut, Shield } from 'lucide-react';

import ExamCard from '@/components/dashboard/ExamCard';
import ExamForm from '@/components/dashboard/ExamForm';
import DashboardStats from '@/components/dashboard/DashboardStats';
import AdminLoginDialog from '@/components/dashboard/AdminLoginDialog';
import Logo from '@/components/Logo';

const Dashboard = () => {
  const [exams, setExams] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalTests: 0, totalParticipants: 0, averageScore: 0 });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserAndExams = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchExams(user.id);
      } else {
        navigate('/login');
      }
    };
    getUserAndExams();
  }, [navigate]);

  const fetchExams = async (userId) => {
    setLoading(true);
    // ... (الكود نفسه لجلب الاختبارات)
    // لم أغير هذا الجزء للحفاظ على الكود نظيف
  };

  // ... (الكود الخاص بحساب الإحصائيات، تسجيل الخروج، الدخول كمسؤول)

  // تعديل دالة عرض الجلسة المباشرة:
  const handleViewLiveSession = (exam) => {
    navigate(`/session/${exam.id}`, { state: { skipRegistration: true, exam } });
  };

  // دوال أخرى...

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ... رأس الصفحة */}
      <Logo />

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <DashboardStats stats={stats} />

        {/* ... العنوان وزر إنشاء اختبار */}

        {loading ? (
          // ... تحميل
          <div className="text-center text-white mt-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3"></div>
            <p>جاري تحميل الاختبارات...</p>
          </div>
        ) : exams.length === 0 ? (
          // ... لا توجد اختبارات
          <div className="text-center py-12 sm:py-16 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
            <h3 className="text-lg sm:text-xl font-semibold text-white">لم تقم بإنشاء أي اختبارات بعد</h3>
            <p className="text-slate-400 mt-2 mb-4">انقر على "إنشاء اختبار جديد" للبدء.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                index={index}
                isOwner={exam.user_id === user?.id}
                onDelete={handleDelete}
                onCopyLink={handleCreateSessionOrCopyLink}
                onViewResults={handleViewResults}
                onStartSession={handleCreateSessionOrCopyLink}
                onViewLiveSession={handleViewLiveSession} // تمرير الدالة المعدلة هنا
              />
            ))}
          </div>
        )}
      </motion.main>

      <AnimatePresence>
        {showCreateDialog && (
          <ExamForm onExamCreated={handleExamCreated} onCancel={() => setShowCreateDialog(false)} userId={user?.id} />
        )}
      </AnimatePresence>

      <AdminLoginDialog open={showAdminLogin} onOpenChange={setShowAdminLogin} />
    </div>
  );
};

export default Dashboard;
