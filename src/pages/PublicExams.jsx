import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import PublicExamCard from '@/components/PublicExamCard';
import Header from '@/components/Header';
import Logo from '@/components/Logo';

const PublicExams = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const getSessionAndExams = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        fetchExams();
    };
    getSessionAndExams();

     const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tests')
      .select(`id, title, duration, description, questions(id)`)
      .eq('is_permanent', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setExams(data);
    }
    setLoading(false);
  };

  return (
    <>
    <Header session={session} />
    <div className="min-h-screen p-6 pt-24">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <Logo />
        <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">اختبارات السياقة وفق التحديث الجديد</h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">تحدى نفسك مع مجموعتنا من الاختبارات الثابتة في مختلف المجالات.</p>
      </motion.div>

      {loading ? (
         <div className="text-center text-white mt-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-3"></div><p>جاري تحميل الاختبارات...</p></div>
      ) : exams.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center text-gray-400 mt-10">
          <Eye className="w-16 h-16 mx-auto mb-4 text-slate-600" /><h3 className="text-2xl font-semibold text-slate-500">لا توجد اختبارات متاحة حالياً</h3><p className="text-slate-600">يرجى العودة لاحقاً.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          <AnimatePresence>
            {exams.map((exam, index) => (
              <PublicExamCard key={exam.id} exam={exam} index={index} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
    </>
  );
};

export default PublicExams;