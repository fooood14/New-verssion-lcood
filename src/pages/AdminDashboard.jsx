import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, Trash2, LogOut, Edit, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import PermanentExamForm from '@/components/admin/PermanentExamForm';
import AllowedEmailsDialog from '@/components/admin/AllowedEmailsDialog';
import { Card } from '@/components/ui/card';
import Logo from '@/components/Logo';

const AdminDashboard = () => {
  const [exams, setExams] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [examToEdit, setExamToEdit] = useState(null);
  const [examForEmails, setExamForEmails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserAndExams = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        fetchPermanentExams(user.id);
      } else {
        navigate('/login');
      }
    };
    getUserAndExams();
  }, [navigate]);

  const fetchPermanentExams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tests')
      .select(`*, questions(*)`)
      .eq('is_permanent', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setExams(data.map(exam => ({
        ...exam,
        questions: exam.questions.map(q => ({
          id: q.id,
          question: q.question_text,
          options: q.options,
          correct_answers: q.correct_answers,
          question_type: q.question_type,
          video_url: q.video_url,
          time_limit_seconds: q.time_limit_seconds,
          explanation: q.explanation,
          explanation_video_url: q.explanation_video_url,
        })),
      })));
    }
    setLoading(false);
  };
  
  const handleFormSuccess = () => {
    if(currentUser) fetchPermanentExams();
    setShowCreateDialog(false);
    setExamToEdit(null);
    setExamForEmails(null);
  };
  
  const handleEdit = (exam) => {
      setExamToEdit(exam);
      setShowCreateDialog(true);
  }

  const handleDelete = async (examId) => {
      const { error } = await supabase.from('tests').delete().eq('id', examId);
      if(error) {
          toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
          toast({ title: "تم الحذف", description: "تم حذف الاختبار بنجاح."});
          if(currentUser) fetchPermanentExams();
      }
  }
  
  const handleLogout = () => {
    sessionStorage.removeItem('isAdminAccess');
    navigate('/dashboard');
    toast({ title: "تم الخروج من وضع المسؤول" });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="absolute top-6 left-6">
        <Button onClick={handleLogout} variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-700"><LogOut className="w-5 h-5 ml-2" />العودة للوحة التحكم</Button>
      </div>
      <Logo />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">إدارة الاختبارات الثابتة</h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">إضافة وتعديل الاختبارات التي تظهر بشكل دائم لجميع زوار الموقع</p>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="flex justify-center mb-8">
        <Button onClick={() => { setExamToEdit(null); setShowCreateDialog(true); }} disabled={loading} className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-8 py-4 text-lg font-semibold rounded-xl"><Plus className="w-6 h-6 ml-2" /> إنشاء اختبار ثابت</Button>
      </motion.div>

      {loading ? (
          <div className="text-center text-white mt-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div><p>جاري التحميل...</p></div>
      ) : exams.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center text-gray-400 mt-10"><Eye className="w-16 h-16 mx-auto mb-4 text-slate-600" /><h3 className="text-2xl font-semibold text-slate-500">لا توجد اختبارات ثابتة</h3><p className="text-slate-600">ابدأ بإنشاء أول اختبار ثابت!</p></motion.div>
      ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam, index) => (
                   <motion.div key={exam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -5 }}>
                       <Card className="p-4 bg-slate-800/50 border-slate-700 text-white flex flex-col h-full">
                           <h3 className="text-lg font-bold mb-2 flex-grow">{exam.title}</h3>
                           <div className="flex justify-end gap-2">
                                <Button onClick={() => setExamForEmails(exam)} variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/20"><UserCheck className="w-4 h-4"/></Button>
                                <Button onClick={() => handleEdit(exam)} variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20"><Edit className="w-4 h-4"/></Button>
                                <Button onClick={() => handleDelete(exam.id)} variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4"/></Button>
                           </div>
                       </Card>
                   </motion.div>
              ))}
          </motion.div>
      )}

      <AnimatePresence>
        {showCreateDialog && (
          <PermanentExamForm onExamCreated={handleFormSuccess} onCancel={() => { setShowCreateDialog(false); setExamToEdit(null);}} userId={currentUser?.id} examToEdit={examToEdit} />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
         {examForEmails && (
             <AllowedEmailsDialog 
                 exam={examForEmails}
                 onClose={() => setExamForEmails(null)}
                 onSuccess={() => {
                     setExamForEmails(null);
                     if(currentUser) fetchPermanentExams();
                 }}
             />
         )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDashboard;