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
      .select(`
        *,
        questions (
          id,
          question_text,
          options,
          correct_answers,
          question_type,
          video_url,
          time_limit_seconds,
          explanation,
          explanation_video_url,
          compound_parts
        )
      `)
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
    <div className="min-h-screen p-6 bg-gray-900">
      {exams.length === 0 ? (
        <p className="text-center text-white text-lg">لا توجد اختبارات ثابتة.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className="p-6 bg-slate-800 rounded-lg text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-4">{exam.title}</h2>
              {exam.questions && exam.questions.length > 0 ? (
                <ul className="space-y-4">
                  {exam.questions.map(q => (
                    <li key={q.id} className="bg-gray-700 p-4 rounded">
                      <p className="font-semibold mb-2">{q.question_text}</p>
                      {q.options && q.options.length > 0 && (
                        <ul className="list-decimal ml-6 space-y-1 text-sm">
                          {q.options.map((option, idx) => (
                            <li key={idx}>{option}</li>
                          ))}
                        </ul>
                      )}
                      {q.video_url && (
                        <video controls className="mt-2 rounded max-w-full">
                          <source src={q.video_url} type="video/mp4" />
                          متصفحك لا يدعم تشغيل الفيديو.
                        </video>
                      )}
                      {q.explanation && (
                        <p className="mt-2 text-gray-300 text-sm italic">توضيح: {q.explanation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">لا توجد أسئلة لهذا الاختبار.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermanentExamsPage;
