import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ExamStep = ({ exam, studentInfo, timeLeft, answers, setAnswers, onSubmit, viewOnly = false }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = exam.questions[currentQuestionIndex];
  const [questionTimeLeft, setQuestionTimeLeft] = useState(currentQuestion?.time_limit_seconds || 30);
  const videoRef = useRef(null);
  const hasMovedNextRef = useRef(false); // لمنع تكرار الانتقال للسؤال التالي

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // إعادة تهيئة وقت السؤال وإعادة تعيين علامة الانتقال عند تغير السؤال
  useEffect(() => {
    setQuestionTimeLeft(currentQuestion?.time_limit_seconds || 30);
    hasMovedNextRef.current = false;
  }, [currentQuestionIndex, currentQuestion]);

  // مؤقت تنازلي لوقت السؤال، عند انتهاء الوقت ينتقل للسؤال التالي مرة واحدة فقط
  useEffect(() => {
    if (!currentQuestion || !currentQuestion.time_limit_seconds) return;

    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          if (!hasMovedNextRef.current) {
            hasMovedNextRef.current = true;
            nextQuestion();
          }
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, currentQuestion]);

  // تشغيل الفيديو تلقائيًا مع الصوت عند تغير السؤال
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('فشل تشغيل الفيديو تلقائيًا:', error);
        });
      }
    }
  }, [currentQuestionIndex]);

  // الانتقال للسؤال التالي أو إنهاء الاختبار
  const nextQuestion = () => {
    if (hasMovedNextRef.current) return; // منع التكرار
    hasMovedNextRef.current = true;

    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (!viewOnly) {
      onSubmit();
    }
  };

  return (
    <motion.div
      key="exam"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl w-full mx-auto"
    >
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-slate-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">{exam.title}</h2>
            <p className="text-gray-300">مرحباً {studentInfo.name}</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{formatTime(timeLeft)}</div>
            <p className="text-gray-300 text-sm">الوقت المتبقي</p>
          </div>
        </div>
      </div>

      <Card className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm mb-6">
        {currentQuestion.video_url && (
          <div className="mb-6">
            <video
              key={currentQuestion.video_url}
              ref={videoRef}
              src={currentQuestion.video_url}
              autoPlay
              controls={false}  // لا تظهر أدوات التحكم
              muted={false}      // تشغيل الفيديو بالصوت
              className="w-full rounded-lg"
              onEnded={() => {
                if (!hasMovedNextRef.current) {
                  nextQuestion();
                }
              }}
              playsInline        // تحسين عرض الفيديو على الموبايل
            >
              المتصفح لا يدعم تشغيل الفيديو.
            </video>
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          {!viewOnly && (
            <h3 className="text-xl font-semibold text-white text-right flex-1">{currentQuestion.question}</h3>
          )}
          {currentQuestion.time_limit_seconds && (
            <div className="flex items-center gap-2 text-orange-400 font-mono text-lg mr-4">
              <Clock className="w-5 h-5" />
              <span>{formatTime(questionTimeLeft)}</span>
            </div>
          )}
        </div>

        {!viewOnly && (
          <>
            {/* يمكنك إضافة خيارات السؤال هنا إذا أردت */}
          </>
        )}
      </Card>

      {viewOnly && currentQuestionIndex === exam.questions.length - 1 && (
        <div className="text-center text-white mt-6">تم عرض جميع الفيديوهات ✅</div>
      )}
    </motion.div>
  );
};

export default ExamStep;
