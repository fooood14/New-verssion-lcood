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
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
      }
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
    try {
      const { data: userTests, error: userTestsError } = await supabase
        .from('tests')
        .select('*, questions(id)')
        .eq('user_id', userId)
        .neq('is_permanent', true);

      if (userTestsError) throw userTestsError;

      const { data: permanentTests, error: permanentTestsError } = await supabase
        .from('tests')
        .select('*, questions(id)')
        .eq('is_permanent', true);

      if (permanentTestsError) throw permanentTestsError;

      const allExams = [...(userTests || []), ...(permanentTests || [])];
      setExams(allExams);
      console.log('Exams loaded:', allExams);
    } catch (error) {
      toast({ title: 'خطأ في تحميل الاختبارات', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId) => {
    if (!user) return;
    const { error } = await supabase.from('tests').delete().eq('id', examId);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف الاختبار بنجاح.' });
      fetchExams(user.id);
    }
  };

  const handleViewLiveSession = (exam) => {
    navigate(`/session/${exam.id}`, { state: { skipRegistration: true, exam } });
  };

  // ✅ دالة إنشاء جلسة مباشرة (بالفيديو أو بدون)
  const handleCreateSessionOrCopyLink = async (exam) => {
    const choice = window.confirm("هل ترغب في بدء جلسة بالفيديو؟\nاضغط 'موافق' للفيديو، أو 'إلغاء' بدون فيديو.");
    const isVideo = choice;

    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .insert([
          {
            original_test_id: exam.id,
            type: isVideo ? 'video' : 'no-video',
            created_at: new Date(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      navigate(`/session/${data.id}`, {
        state: {
          skipRegistration: true,
          exam,
        },
      });
    } catch (err) {
      console.error('خطأ في إنشاء الجلسة:', err.message);
      toast({
        title: 'خطأ في إنشاء الجلسة',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleViewResults = (examId) => {
    navigate(`/results/${examId}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-sm sm:text-base text-slate-400">مرحباً بعودتك، {user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowAdminLogin(true)} className="text-slate-300 hover:bg-slate-700 hover:text-yellow-400">
            <Shield className="h-6 w-6" />
          </Button>
          <Button onClick={handleSignOut} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <Logo />

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <DashboardStats stats={stats} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 mt-10 gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">اختباراتك</h2>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 ml-2" />
            إنشاء اختبار جديد
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-white mt-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3"></div>
            <p>جاري تحميل الاختبارات...</p>
          </div>
        ) : exams.length === 0 ? (
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
                onViewLiveSession={handleViewLiveSession}
              />
            ))}
          </div>
        )}
      </motion.main>

      <AnimatePresence>
        {showCreateDialog && (
          <ExamForm onExamCreated={() => { setShowCreateDialog(false); if (user) fetchExams(user.id); }} onCancel={() => setShowCreateDialog(false)} userId={user?.id} />
        )}
      </AnimatePresence>

      <AdminLoginDialog open={showAdminLogin} onOpenChange={setShowAdminLogin} />
    </div>
  );
};

export default Dashboard;
