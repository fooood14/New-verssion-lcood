import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ExamStep = ({ exam, studentInfo, timeLeft, answers, setAnswers, onSubmit, viewOnly = false }) => {
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
    if (viewOnly) return; // لا مؤقت سؤال في وضع viewOnly

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
  }, [questionTimeLeft, currentQuestionIndex, viewOnly]);

  const nextQuestion = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      if (!viewOnly) {
        onSubmit();
      } else {
        // في viewOnly نعيد الحلقة من البداية
        setCurrentQuestionIndex(0);
      }
    }
  };

  const currentAnswers = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : [];

  return (
    <motion.div
      key="exam"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl w-full mx-auto"
    >
      {/* العنوان والمؤقت العام - لا يظهر في viewOnly */}
      {!viewOnly && (
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
      )}

      <Card className="p-4 md:p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm mb-6">
        {/* عرض الفيديو فقط */}
        {currentQuestion.video_url ? (
          <div className="mb-6">
            <video
              key={currentQuestion.video_url}
              src={currentQuestion.video_url}
              autoPlay
              controls={false}
              muted={false}
              onEnded={nextQuestion}
              className="w-full rounded-lg"
            >
              المتصفح لا يدعم تشغيل الفيديو.
            </video>
          </div>
        ) : viewOnly ? (
          <p className="text-center text-gray-400">لا يوجد فيديو للسؤال الحالي.</p>
        ) : null}

        {/* مؤقت السؤال - فقط في الوضع العادي */}
        {!viewOnly && currentQuestion.time_limit_seconds && (
          <div className="flex items-center gap-2 text-orange-400 font-mono text-lg justify-end mb-2">
            <Clock className="w-5 h-5" />
            <span>{formatTime(questionTimeLeft)}</span>
          </div>
        )}

        {/* عرض السؤال والاختيارات - فقط في الوضع العادي */}
        {!viewOnly && (
          <>
            <h3 className="text-xl font-semibold text-white text-right mb-4">{currentQuestion.question}</h3>
            {currentQuestion.question_type === 'compound' ? (
              <div className="flex flex-col gap-6">
                {currentQuestion.parts.map((part, partIdx) => {
                  const partAnswers = (answers[currentQuestion.id] && answers[currentQuestion.id][partIdx]) ? [answers[currentQuestion.id][partIdx]] : [];
                  return (
                    <div key={partIdx}>
                      <h4 className="text-lg font-semibold text-white mb-2">{part.part_text}</h4>
                      <div className="flex flex-col gap-2">
                        {part.options.map((option, idx) => {
                          const selected = partAnswers.includes(option);
                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`text-right p-3 rounded-md border 
                                ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                              onClick={() => {
                                setAnswers(prev => {
                                  const prevAnswersForQuestion = prev[currentQuestion.id] ? [...prev[currentQuestion.id]] : [];
                                  if (selected) {
                                    // تعيين نص فارغ بدل null
                                    prevAnswersForQuestion[partIdx] = '';
                                  } else {
                                    prevAnswersForQuestion[partIdx] = option;
                                  }
                                  return { ...prev, [currentQuestion.id]: prevAnswersForQuestion };
                                });
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const selected = currentAnswers.includes(option);
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`text-right p-3 rounded-md border 
                        ${selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
                      onClick={() => {
                        if (selected) {
                          setAnswers(prev => {
                            const newAns = prev[currentQuestion.id]?.filter(o => o !== option) || [];
                            return { ...prev, [currentQuestion.id]: newAns };
                          });
                        } else {
                          setAnswers(prev => {
                            const newAns = prev[currentQuestion.id] ? [...prev[currentQuestion.id], option] : [option];
                            return { ...prev, [currentQuestion.id]: newAns };
                          });
                        }
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>

      {/* أزرار التنقل - فقط في الوضع العادي */}
      {!viewOnly && (
        <div className="flex justify-between items-center">
          <Button
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4 ml-2" /> السابق
          </Button>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: [] }))}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
              disabled={currentAnswers.length === 0}
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              إلغاء
            </Button>

            {currentQuestionIndex === exam.questions.length - 1 ? (
              <Button
                onClick={onSubmit}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
              >
                إنهاء الاختبار <CheckCircle className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                التالي <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ExamStep;
