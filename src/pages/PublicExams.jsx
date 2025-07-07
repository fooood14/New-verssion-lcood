import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, video_url')
        .eq('test_id', examId)
        .order('order', { ascending: true }); // تأكد أن عندك عمود "order" أو استعمل created_at

      if (error) {
        console.error('خطأ في تحميل الأسئلة:', error);
      } else {
        setQuestions(data || []);
      }

      setLoading(false);
    };

    fetchQuestions();
  }, [examId]);

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-6 text-center">فيديوهات الأسئلة</h1>
      {loading ? (
        <p className="text-center">جارٍ التحميل...</p>
      ) : questions.length === 0 ? (
        <p className="text-center">لا توجد أسئلة بهذا الاختبار.</p>
      ) : (
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id}>
              <h2 className="text-lg font-semibold mb-2">السؤال {idx + 1}</h2>
              <div className="aspect-video">
                <video
                  src={q.video_url}
                  controls
                  className="w-full h-full rounded shadow"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamVideos;
