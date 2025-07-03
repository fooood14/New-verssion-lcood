import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

const PermanentExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserAndExams = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await fetchPermanentExams();
      } else {
        navigate('/login');
      }
    };

    getUserAndExams();
  }, [navigate]);

  const fetchPermanentExams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_permanent', true)
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      } else {
        setExams(data || []);
      }
    } catch (error) {
      toast({ title: 'حدث خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 bg-slate-900">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-white mb-6"
      >
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">الاختبارات الثابتة</h1>
        <p className="text-sm sm:text-base text-slate-400">قائمة بجميع الاختبارات المتاحة دائما</p>
      </motion.div>

      {loading ? (
        <div className="text-center text-white mt-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-lg">جاري التحميل...</p>
        </div>
      ) : exams.length === 0 ? (
        <p className="text-center text-slate-300 text-lg">لا توجد اختبارات حاليا</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam, idx) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="bg-slate-800 text-white p-4 rounded-xl shadow hover:shadow-lg transition">
                <h3 className="text-lg font-semibold mb-2">{exam.title}</h3>
                <p className="text-sm text-slate-400">
                  {exam.description || 'لا توجد تفاصيل'}
                </p>
                {/* زيد زر لاحقاً لبدء الاختبار */}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermanentExamsPage;
