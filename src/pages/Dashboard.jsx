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
    const { data: userTests, error: userTestsError } = await supabase
      .from('tests')
      .select('*, questions(id)')
      .eq('user_id', userId)
      .neq('is_permanent', true);

    if (userTestsError) {
      toast({ title: 'خطأ في تحميل اختباراتك', description: userTestsError.message, variant: 'destructive' });
    }

    const { data: permanentTests, error: permanentTestsError } = await supabase
      .from('tests')
      .select('*, questions(id)')
      .eq('is_permanent', true);

    if (permanentTestsError) {
      toast({ title: 'خطأ في تحميل الاختبارات الثابتة', description: permanentTestsError.message, variant: 'destructive' });
    }

    const allExams = [...(userTests || []), ...(permanentTests || [])];
    const uniqueExams = Array.from(new Map(allExams.map(exam => [exam.id, exam])).values());

    const examsWithParticipants = await Promise.all(uniqueExams.map(async (exam) => {
      let participantsCount = 0;

      if (exam.is_permanent) {
        const { data: sessionTests } = await supabase
          .from('tests')
          .select('id')
          .eq('original_test_id', exam.id);

        if (sessionTests && sessionTests.length > 0) {
          const sessionIds = sessionTests.map(t => t.id);
          const { data: results } = await supabase
            .from('test_results')
            .select('participant_id')
            .in('test_id', sessionIds);

          participantsCount = results ? new Set(results.map(r => r.participant_id)).size : 0;
        }
      } else {
        const { data: results } = await supabase
          .from('test_results')
          .select('participant_id')
          .eq('test_id', exam.id);

        participantsCount = results ? new Set(results.map(r => r.participant_id)).size : 0;
      }

      return { ...exam, participantsCount };
    }));

    const sortedExams = examsWithParticipants.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setExams(sortedExams);
    await calculateStats(sortedExams, userId);
    setLoading(false);
  };

  const calculateStats = async (allExams, userId) => {
    const userExamIds = allExams.filter(e => e.user_id === userId && !e.is_permanent).map(e => e.id);
    const permanentTestIds = allExams.filter(e => e.is_permanent).map(e => e.id);

    let allSessionTestIds = [];
    if (permanentTestIds.length > 0) {
      const { data: sessionTests } = await supabase.from('tests').select('id').in('original_test_id', permanentTestIds).eq('user_id', userId);
      if (sessionTests) {
        allSessionTestIds = sessionTests.map(t => t.id);
      }
    }

    const relevantTestIds = [...new Set([...userExamIds, ...allSessionTestIds])];

    if (relevantTestIds.length === 0) {
      setStats({ totalTests: allExams.length, totalParticipants: 0, averageScore: 0 });
      return;
    }

    const { data: results, error } = await supabase
      .from('test_results')
      .select('percentage, participant_id')
      .in('test_id', relevantTestIds);

    if (error) {
      console.error("Error fetching results for stats:", error);
      setStats({ totalTests: allExams.length, totalParticipants: 0, averageScore: 0 });
      return;
    }

    const totalParticipants = results ? new Set(results.map(r => r.participant_id)).size : 0;
    const totalScore = results ? results.reduce((acc, r) => acc + r.percentage, 0) : 0;
    const averageScore = results && results.length > 0 ? Math.round(totalScore / results.length) : 0;

    setStats({ totalTests: allExams.length, totalParticipants, averageScore });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('isAdminAccess');
    navigate('/login');
  };

  const handleAdminAccess = () => {
    setShowAdminLogin(true);
  };

  const handleExamCreated = () => {
    setShowCreateDialog(false);
    if (user) fetchExams(user.id);
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

  const handleCreateSessionOrCopyLink = async (exam, withVideo = false) => {
    if (!user) return;

    if (exam.is_permanent) {
      const { data: newSessionTest, error } = await supabase
        .from('tests')
        .insert({
          title: `${exam.title} - جلسة مباشرة`,
          duration: exam.duration,
          user_id: user.id,
          is_permanent: false,
          original_test_id: exam.id,
          with_video: withVideo
        })
        .select('id')
        .single();

      if (error) {
        toast({ title: 'خطأ في إنشاء الجلسة', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'تم إنشاء الجلسة!', description: 'سيتم توجيهك الآن لشاشة المراقبة.' });
      navigate(`/results/${newSessionTest.id}`);
    } else {
      const link = `${window.location.origin}/session/${exam.id}`;
      navigator.clipboard.writeText(link);
      toast({ title: 'تم النسخ!', description: 'تم نسخ رابط الجلسة إلى الحافظة.' });
    }
  };

  const handleViewResults = (examId) => {
    navigate(`/results/${examId}`);
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 text-sm md:text-base">مرحباً بعودتك، {user?.email}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleAdminAccess} className="text-slate-300 hover:bg-slate-700 hover:text-yellow-400">
            <Shield className="h-6 w-6" />
          </Button>
          <Button onClick={handleSignOut} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <div className="flex justify-center mb-6">
        <Logo />
      </div>

      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <DashboardStats stats={stats} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 mt-10 gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">اختباراتك</h2>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
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
          <div className="text-center py-16 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
            <h3 className="text-xl font-semibold text-white">لم تقم بإنشاء أي اختبارات بعد</h3>
            <p className="text-slate-400 mt-2 mb-4">انقر على "إنشاء اختبار جديد" للبدء.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              />
            ))}
          </div>
        )}
      </motion.main>

      <AnimatePresence>
        {showCreateDialog && (
          <ExamForm onExamCreated={handleExamCreated} onCancel={() => setShowCreateDialog(false)} userId={user.id} />
        )}
      </AnimatePresence>

      <AdminLoginDialog open={showAdminLogin} onOpenChange={setShowAdminLogin} />
    </div>
  );
};

export default Dashboard;
