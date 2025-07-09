import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

const ExamStep = ({
  exam,
  studentInfo,
  timeLeft,
  answers,
  setAnswers,
  onSubmit,
  viewOnly = false
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = exam.questions[currentQuestionIndex];
  const [questionTimeLeft, setQuestionTimeLeft] = useState(currentQuestion?.time_limit_seconds || 30);
  const videoRef = useRef(null);

  const [tempAnswers, setTempAnswers] = useState(() =>
    currentQuestion.question_type === 'compound'
      ? new Array(currentQuestion.parts.length).fill('')
      : []
  );

  useEffect(() => {
    if (!currentQuestion) return;
    if (currentQuestion.question_type === 'compound') {
      setTempAnswers(answers[currentQuestion.id] || new Array(currentQuestion.parts.length).fill(''));
    } else {
      setTempAnswers(answers[currentQuestion.id] || []);
    }
  }, [currentQuestionIndex, currentQuestion, answers]);

  useEffect(() => {
    setQuestionTimeLeft(currentQuestion?.time_limit_seconds || 30);
  }, [currentQuestionIndex, currentQuestion]);

  useEffect(() => {
    if (!currentQuestion || !currentQuestion.time_limit_seconds) return;
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          confirmAndNext(); // حفظ تلقائي عند انتهاء الوقت
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex, currentQuestion]);

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

  const handleOptionSelect = (partIndex, option) => {
    if (viewOnly) return;

    if (currentQuestion.question_type === 'compound') {
      const updated = [...tempAnswers];
      updated[partIndex] = option;
      setTempAnswers(updated);
    } else {
      if (currentQuestion.question_type === 'multiple') {
        const exists = tempAnswers.includes(option);
        const updated = exists
          ? tempAnswers.filter((a) => a !== option)
          : [...tempAnswers, option];
        setTempAnswers(updated);
      } else {
        setTempAnswers([option]);
      }
    }
  };

  const confirmAndNext = () => {
    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: tempAnswers,
    };
    setAnswers(updatedAnswers);

    setTimeout(() => {
      if (currentQuestionIndex < exam.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (!viewOnly) {
        onSubmit(updatedAnswers); // إرسال الإجابات عند نهاية الاختبار
      }
    }, 0);
  };

  const cancelAnswer = () => {
    if (currentQuestion.question_type === 'compound') {
      setTempAnswers(answers[currentQuestion.id] || new Array(currentQuestion.parts.length).fill(''));
    } else {
      setTempAnswers(answers[currentQuestion.id] || []);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
              controls={false}
              muted={false}
              className="w-full rounded-lg"
              playsInline
            >
              المتصفح لا يدعم تشغيل الفيديو.
            </video>
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold text-white text-right flex-1">
            {currentQuestion.question}
          </h3>
          {currentQuestion.time_limit_seconds && (
            <div className="flex items-center gap-2 text-orange-400 font-mono text-lg mr-4">
              <Clock className="w-5 h-5" />
              <span>{formatTime(questionTimeLeft)}</span>
            </div>
          )}
        </div>

        {currentQuestion.question_type === 'compound' ? (
          <div className="space-y-6">
            {currentQuestion.parts.map((part, partIndex) => (
              <div key={partIndex}>
                <p className="text-white font-semibold mb-2">{part.prompt}</p>
                <div className="space-y-2">
                  {part.options?.map((option, optIndex) => {
                    const selected = tempAnswers[partIndex] === option;
                    return viewOnly ? (
                      <div
                        key={optIndex}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          selected
                            ? 'bg-green-700 border-green-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-gray-300'
                        }`}
                      >
                        {option}
                      </div>
                    ) : (
                      <button
                        key={optIndex}
                        onClick={() => handleOptionSelect(partIndex, option)}
                        className={`block w-full text-right px-4 py-2 rounded-lg border transition-all duration-150 ${
                          selected
                            ? 'bg-green-700 border-green-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-gray-200 hover:bg-slate-600'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = tempAnswers.includes(option);
              return viewOnly ? (
                <div
                  key={index}
                  className={`block w-full text-right px-4 py-3 rounded-lg border ${
                    isSelected
                      ? 'bg-green-700 border-green-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-gray-200'
                  }`}
                >
                  {option}
                </div>
              ) : (
                <button
                  key={index}
                  onClick={() => handleOptionSelect(null, option)}
                  className={`block w-full text-right px-4 py-3 rounded-lg border transition-all duration-150 ${
                    isSelected
                      ? 'bg-green-700 border-green-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-gray-200 hover:bg-slate-600'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {!viewOnly && (
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={cancelAnswer}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded"
            >
              إلغاء
            </button>
            <button
              onClick={confirmAndNext}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded"
            >
              تأكيد وحفظ
            </button>
          </div>
        )}
      </Card>

      {viewOnly && currentQuestionIndex === exam.questions.length - 1 && (
        <div className="text-center text-white mt-6">
          تم عرض جميع الفيديوهات ✅
        </div>
      )}
    </motion.div>
  );
};

export default ExamStep;
