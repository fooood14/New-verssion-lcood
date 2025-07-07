import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { sessionId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(0);
  const [started, setStarted] = useState(false); // ⬅️ بداية المشاهدة
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  // جلب الأسئلة
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('original_test_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('❌ جلسة غير صالحة:', sessionError?.message);
        setLoading(false);
        return;
      }

      const testId = sessionData.original_test_id;
      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, question_text, video_url, time_limit_seconds')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);
      setLoading(false);
      setCurrentVideoIndex(0);
    };

    fetchData();
  }, [sessionId]);

  // بدء تشغيل الفيديو ومتابعة المؤقت
  useEffect(() => {
    if (!questions.length || !started) return;

    const currentQuestion = questions[currentVideoIndex];
    const video = videoRef.current;
    const customLimit = currentQuestion?.time_limit_seconds || 15;

    if (intervalRef.current) clearInterval(intervalRef.current);

    setDuration(customLimit);
    setTimeLeft(customLimit);

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          if (currentVideoIndex < questions.length - 1) {
            setCurrentVideoIndex(prevIndex => prevIndex + 1);
          } else {
            console.log('✅ انتهت كل الفيديوهات');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (video) {
      video.load();
      video.play().catch(err => {
        console.warn('⚠️ تعذر التشغيل التلقائي:', err);
      });
    }

    return () => clearInterval(intervalRef.current);
  }, [currentVideoIndex, questions, started]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p>جاري تحميل الفيديوهات...</p>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>لا توجد أسئلة للفيديو في هذه الجلسة.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentVideoIndex];

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center justify-center text-white max-w-3xl mx-auto">
      {!started ? (
        <button
          onClick={() => setStarted(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg text-lg font-semibold"
        >
          ▶️ ابدأ المشاهدة
        </button>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4">{currentQuestion.question_text}</h2>

          {currentQuestion.video_url ? (
            <video
              ref={videoRef}
              key={currentQuestion.id}
              className="w-full rounded-lg bg-black"
              src={currentQuestion.video_url}
              autoPlay
              controls
            />
          ) : (
            <p>لا يوجد فيديو لهذا السؤال.</p>
          )}

          <div className="mt-4 text-center">
            <p>الوقت المتبقي: {timeLeft} ثانية من {duration} ثانية</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ExamVideos;
