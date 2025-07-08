import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamSession = () => {
  const { sessionId } = useParams();
  const [videoList, setVideoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', sessionId);

      if (error) {
        setError('فشل في تحميل الأسئلة');
        setLoading(false);
      } else {
        const questionsWithVideo = data.filter(q => q.video_url);
        setVideoList(questionsWithVideo);
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId]);

  const handleNextVideo = () => {
    if (currentIndex < videoList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const currentVideoUrl = videoList[currentIndex]?.video_url;

  if (loading) return <div className="text-white text-center mt-10">جاري التحميل...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">{error}</div>;

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-6 text-center">جلسة الامتحان</h1>

      {currentVideoUrl ? (
        <video
          key={currentVideoUrl}
          src={currentVideoUrl}
          autoPlay
          controls
          muted={false}
          onEnded={handleNextVideo}
          className="w-full rounded-lg shadow-lg"
        />
      ) : (
        <p className="text-center text-slate-400">لا يوجد فيديو متاح لهذا السؤال.</p>
      )}

      <div className="mt-4 text-center text-slate-400">
        السؤال {currentIndex + 1} من {videoList.length}
      </div>
    </div>
  );
};

export default ExamSession;
