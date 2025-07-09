import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const CinematicExamView = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);

  useEffect(() => {
    const fetchExamAndQuestions = async () => {
      setLoading(true);
      setError(null);

      // جلب بيانات الاختبار
      const { data: examData, error: examError } = await supabase
        .from('tests')
        .select('title, original_test_id, with_video')
        .eq('id', examId)
        .single();

      if (examError || !examData) {
        setError('فشل في تحميل بيانات الاختبار.');
        setLoading(false);
        return;
      }

      setExamTitle(examData.title);

      // تحديد مصدر الأسئلة
      const testId = examData.original_test_id || examId;

      // جلب أسئلة الفيديو فقط المرتبطة بالاختبار
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, video_url, time_limit_seconds')
        .eq('test_id', testId)
        .not('video_url', 'is', null)
        .order('id', { ascending: true });

      if (questionsError) {
        setError('فشل في تحميل أسئلة الاختبار.');
        setLoading(false);
        return;
      }

      if (!questionsData || questionsData.length === 0) {
        setError('لا توجد فيديوهات للاختبار.');
        setLoading(false);
        return;
      }

      setQuestions(questionsData);
      setLoading(false);
    };

    fetchExamAndQuestions();
  }, [examId]);

  // تشغيل الفيديو تلقائيًا مع الصوت عند تغير السؤال
  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.muted = false;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn('فشل تشغيل الفيديو تلقائياً:', error);
      });
    }
  }, [currentIndex]);

  // مؤقت كل سؤال: بعد انتهاء الوقت ينتقل للسؤال التالي أو ينهي العرض
  useEffect(() => {
    if (questions.length === 0) return;

    const currentQuestion = questions[currentIndex];
    const duration = currentQuestion.time_limit_seconds || 30; // افتراضي 30 ثانية

    const timer = setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // نهاية الفيديوهات، رجوع للوحة التحكم أو الصفحة الرئيسية
        navigate('/dashboard');
      }
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, questions, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>جاري تحميل الفيديوهات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-500">
        <p>{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-gray-700 rounded text-white"
          onClick={() => navigate('/dashboard')}
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  const currentVideo = questions[currentIndex];

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <h1 className="text-white text-3xl mb-6">{examTitle}</h1>
      <video
        ref={videoRef}
        key={currentVideo.id}
        src={currentVideo.video_url}
        controls={false}
        autoPlay
        muted={false}
        className="max-w-full max-h-screen"
        playsInline
      >
        متصفحك لا يدعم تشغيل الفيديو.
      </video>
      <p className="text-white mt-4 text-center text-lg">
        عرض الفيديو {currentIndex + 1} من {questions.length}
      </p>
    </div>
  );
};

export default CinematicExamView;
