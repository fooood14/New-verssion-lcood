import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { examId } = useParams(); // قراءة examId من رابط الصفحة
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      console.log("📌 examId المستلم من الرابط:", examId); // التحقق من وصول examId

      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, video_url, test_id') // أضف test_id لعرضه للتأكيد
        // .eq('test_id', examId) // 🔧 علّق هذا السطر مؤقتًا لاختبار ظهور البيانات
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ خطأ في تحميل الأسئلة:', error.message);
      } else {
        console.log("✅ عدد الأسئلة المحمّلة:", data.length);
        console.table(data);
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
          <h2 className="text-xl text-yellow-400 mb-2">{idx + 1}. {q.question_text}</h2>
          <p className="text-xs text-slate-400 mb-2">🔗 test_id: {q.test_id}</p>
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
