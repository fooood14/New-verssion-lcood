import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';

const PermanentExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserAndExams = async () => {
      const { data } = await supabase.auth.getUser();
      if (data && data.user) {
        await fetchPermanentExams();
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
      .select('*')
      .eq('is_permanent', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ في تحميل الاختبارات', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setExams(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center text-white mt-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-lg">جاري تحميل الاختبارات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {exams.length === 0 ? (
        <p className="text-center text-white text-lg">لا توجد اختبارات ثابتة.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className="p-4 bg-slate-800 rounded text-white">
              <h3 className="text-lg font-bold">{exam.title}</h3>
              {/* عرض المزيد من بيانات الاختبار إذا احتجت */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermanentExamsPage;
