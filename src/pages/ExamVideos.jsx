import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  // تحميل الأسئلة
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, question_text, video_url, time_limit_seconds')
        .eq('test_id', examId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ خطأ في تحميل الأسئلة:', error.message);
      } else {
        setQuestions(data);
      }

      setLoading(false);
      setCurrentVideoIndex(0);
    };

    fetchQuestions();
  }, [examId]);

  // تشغيل الفيديو الحالي وضبط التوقيت
  useEffect(() => {
    if (!questions.length || !videoRef.current) return;

    const video = videoRef.current;
    const currentQuestion = questions[currentVideoIndex];
    const customLimit = currentQuestion?.time_limit_seconds;

    // لما نحصل على مدة الفيديو، نحدد الوقت
    const handleLoadedMetadata = () => {
      const videoDuration = video.duration;
      const usedDuration = customLimit && customLimit > 0 ? customLimit : Math.floor(videoDuration);

      setDuration(usedDuration);
      setTimeLeft(usedDuration);

      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            goToNextVideo();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // تشغيل الفيديو تلقائيًا عند التغيير
    video.play().catch(() => {});
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', goToNextVideo);

    return () => {
      clearInterval(intervalRef.current);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', goToNextVideo);
    };
  }, [currentVideoIndex, questions]);

  const goToNextVideo = () => {
    if (currentVideoIndex < questions.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else {
      console.log("✅ انتهت كل الفيديوهات");
    }
  };

  if (loading) return <p className="text-white text-center mt-10">جاري تحميل الفيديوهات...</p>;
  if (questions.length === 0) return <p className="text-white text-center mt-10">لا توجد فيديوهات متاحة.</p>;

  const currentQuestion = questions[currentVideoIndex];
  const progressPercent = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <h1 className="text-3xl text-white mb-6 text-center">
        السؤال {currentVideoIndex + 1} من {questions.length}
      </h1>

      <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
        <h2 className="text-xl text-yellow-400 mb-2">{currentQuestion.question_text}</h2>

        {currentQuestion.video_url ? (
          <>
            <video
              ref={videoRef}
              src={currentQuestion.video_url}
              controls
              className="w-full rounded-md"
            />

            {/* شريط التقدم */}
            <div className="w-full bg-gray-600 h-2 rounded mt-2">
              <div
                className="bg-green-400 h-2 rounded"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* الوقت المتبقي وزر التخطي */}
            <div className="flex justify-between items-center mt-3">
              <p className="text-white">⏱️ الوقت المتبقي: {timeLeft} ثانية</p>
              {currentVideoIndex < questions.length - 1 && (
                <button
                  onClick={goToNextVideo}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded"
                >
                  تخطّي للسؤال التالي ⏭️
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-400">لا يوجد فيديو لهذا السؤال.</p>
        )}
      </div>
    </div>
  );
};

export default ExamVideos;
