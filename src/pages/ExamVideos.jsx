import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, video_url')
        .eq('test_id', examId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ خطأ في تحميل الأسئلة:', error.message);
      } else {
        setQuestions(data);
      }
      setLoading(false);
      setCurrentVideoIndex(0); // ابدأ من أول فيديو
    };

    fetchQuestions();
  }, [examId]);

  // تحديث الوقت المتبقي أثناء تشغيل الفيديو
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTimeLeft = () => {
      setTimeLeft(Math.ceil(video.duration - video.currentTime));
    };

    // إذا انتهى الفيديو ننتقل للفيديو التالي
    const handleEnded = () => {
      if (currentVideoIndex < questions.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else {
        // انتهينا من كل الفيديوهات
        setTimeLeft(0);
      }
    };

    video.addEventListener('timeupdate', updateTimeLeft);
    video.addEventListener('ended', handleEnded);

    // عند تغيير الفيديو، شغل الفيديو تلقائياً
    video.play().catch(() => {});

    return () => {
      video.removeEventListener('timeupdate', updateTimeLeft);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentVideoIndex, questions.length]);

  if (loading) return <p className="text-white text-center mt-10">جاري تحميل الفيديوهات...</p>;
  if (questions.length === 0) return <p className="text-white text-center mt-10">لا توجد فيديوهات متاحة.</p>;

  const currentQuestion = questions[currentVideoIndex];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-3xl text-white mb-6">فيديوهات الأسئلة</h1>

      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-xl text-yellow-400 mb-2">
          {currentVideoIndex + 1}. {currentQuestion.question_text}
        </h2>

        {currentQuestion.video_url ? (
          <>
            <video
              ref={videoRef}
              src={currentQuestion.video_url}
              controls
              className="w-full rounded-md"
            />
            <p className="text-white mt-2">
              الوقت المتبقي: {timeLeft} ثانية
            </p>
          </>
        ) : (
          <p className="text-slate-400">لا يوجد فيديو لهذا السؤال.</p>
        )}
      </div>
    </div>
  );
};

export default ExamVideos;
