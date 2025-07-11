import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ExamStep = ({
  exam,
  studentInfo,
  timeLeft,
  answers,
  setAnswers,
  onSubmit,
  viewOnly = false, // ✅ استلام viewOnly
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = exam.questions[currentQuestionIndex];
  const [questionTimeLeft, setQuestionTimeLeft] = useState(currentQuestion?.time_limit_seconds || 30);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetQuestionTimer = () => {
    const newQuestion = exam.questions[currentQuestionIndex];
    setQuestionTimeLeft(newQuestion?.time_limit_seconds || 30);
  };

  useEffect(() => {
    resetQuestionTimer();
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!currentQuestion || !currentQuestion.time_limit_seconds) return;
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          nextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [questionTimeLeft, currentQuestionIndex]);

  if (!currentQuestion) return null;

  const nextQuestion = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (!viewOnly) {
      onSubmit();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const currentAnswers = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : [];

  const handleAnswerSelect = (questionId, answerIndex, partIndex = null) => {
    if (viewOnly) return; // ✅ منع التفاعل في وضع العرض فقط
    const question = exam.questions.find((q) => q.id === questionId);
    setAnswers((prev) => {
      const newAnswers = { ...prev };

      if (question.question_type === 'compound') {
        const current = Array.isArray(newAnswers[questionId]) ? [...newAnswers[questionId]] : [];
        current[partIndex] = answerIndex;
        newAnswers[questionId] = current;
      } else if (question.question_type === 'single') {
        newAnswers[questionId] = [answerIndex];
      } else {
        const current = newAnswers[questionId] || [];
        const i = current.indexOf(answerIndex);
        if (i === -1) current.push(answerIndex);
        else current.splice(i, 1);
        newAnswers[questionId] = [...current];
      }

      return newAnswers;
    });
  };

  const clearAnswer = (questionId) => {
    if (viewOnly) return; // ✅ لا يمكن إلغاء في العرض فقط
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  let parts = [];
  if (currentQuestion.question_type === 'compound') {
    if (Array.isArray(currentQuestion.parts)) {
      parts = currentQuestion.parts;
    } else if (typeof currentQuestion.parts === 'string') {
      try {
        parts = JSON.parse(currentQuestion.parts);
      } catch {
        parts = [];
      }
    }
  }

  return (
    <motion.div
      key="exam"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl w-full mx-auto"
    >
      <Card className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm mb-6">
        {currentQuestion.video_url && (
          <div className="mb-6">
            <video
              key={currentQuestion.video_url}
              controls
              autoPlay
              className="w-full rounded-lg"
            >
              <source src={currentQuestion.video_url} type="video/mp4" />
              المتصفح لا يدعم تشغيل الفيديو.
            </video>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div className="text-white font-semibold text-xl">{exam.title}</div>
          <div className="flex items-center gap-2 text-orange-400 font-mono text-lg">
            <Clock className="w-5 h-5" />
            <span>{formatTime(questionTimeLeft)}</span>
          </div>
        </div>

        {/* ✅ في وضع العرض فقط: لا نعرض السؤال أو الاختيارات */}
        {!viewOnly && (
          <>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-white text-right flex-1">{currentQuestion.question}</h3>
            </div>

            {currentQuestion.question_type === 'compound' && parts.length > 0 ? (
              <div className="space-y-6">
                {parts.map((part, partIdx) => (
                  <div key={partIdx} className="p-4 bg-slate-700/50 border border-slate-600 rounded-xl">
                    <p className="text-white font-medium mb-3">{part.text}</p>
                    <div className="space-y-3">
                      {part.options.map((option, index) => (
                        <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <button
                            onClick={() => handleAnswerSelect(currentQuestion.id, index, partIdx)}
                            className={`w-full p-4 text-right rounded-lg border-2 transition-all duration-300 ${
                              currentAnswers[partIdx] === index
                                ? 'border-yellow-500 bg-yellow-500/20 text-white'
                                : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-lg">{option}</span>
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                currentAnswers[partIdx] === index
                                  ? 'border-yellow-500 bg-yellow-500'
                                  : 'border-slate-500'
                              }`} />
                            </div>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <motion.div key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <button
                      onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                      className={`w-full p-4 text-right rounded-lg border-2 transition-all duration-300 ${
                        currentAnswers.includes(index)
                          ? 'border-yellow-500 bg-yellow-500/20 text-white'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-lg">{option}</span>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          currentAnswers.includes(index)
                            ? 'border-yellow-500 bg-yellow-500'
                            : 'border-slate-500'
                        }`} />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ✅ إخفاء أزرار التنقل في وضع العرض فقط */}
      {!viewOnly && (
        <div className="flex justify-between items-center">
          <Button onClick={prevQuestion} disabled={currentQuestionIndex === 0} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50">
            <ArrowRight className="w-4 h-4 ml-2" /> السؤال السابق
          </Button>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => clearAnswer(currentQuestion.id)}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              disabled={currentAnswers.length === 0}
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              إلغاء
            </Button>

            {currentQuestionIndex === exam.questions.length - 1 ? (
              <Button onClick={onSubmit} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white">
                إنهاء الاختبار <CheckCircle className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button onClick={nextQuestion} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                السؤال التالي <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ExamStep;
