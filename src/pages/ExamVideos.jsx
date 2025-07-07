import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, title, video_url')
        .eq('test_id', examId)
        .order('order', { ascending: true });

      if (error) {
        console.error('خطأ في تحميل الأسئلة:', error.message);
      } else {
        setQuestions(data);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [examId]);

  if (loading) return <p className="text-white text-center mt-10">جاري تحميل الفيديوهات...</p>;
  if (questions.length === 0) return <p className="text-white text-center mt-10">لا توجد فيديوهات متاحة.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-3xl text-white mb-6">فيديوهات الأسئلة</h1>
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-xl text-yellow-400 mb-2">{idx + 1}. {q.title}</h2>
          {q.video_url ? (
            <video
              src={q.video_url}
              controls
              className="w-full rounded-md"
            />
          ) : (
            <p className="text-slate-400">لا يوجد فيديو لهذا السؤال.</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ExamVideos;
