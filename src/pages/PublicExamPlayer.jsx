// الاستيرادات كما هي
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, RotateCcw, Info, Check, X as IconX, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const PublicExamPlayer = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const videoRef = useRef(null);

  const isCorrect = (userAnswers = [], correctAnswers = [], type = 'single') => {
    if (type === 'compound') {
      if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
      return userAnswers.every((ans, idx) => ans === correctAnswers[idx]);
    }
    if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
    if (userAnswers.length !== correctAnswers.length) return false;
    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();
    return sortedUser.every((val, i) => val === sortedCorrect[i]);
  };

  const nextQuestion = () => {
    if (exam && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!exam) return;
    let total = 0;
    exam.questions.forEach((q) => {
      const user = answers[q.id] || [];
      if (q.question_type === 'compound') {
        const correct = (q.parts || []).map(p => p.correct_answer);
        const isAllCorrect = correct.length && user.length === correct.length && user.every((u, i) => u === correct[i]);
        if (isAllCorrect) total += 1;
      } else {
        if (isCorrect(user, q.correct_answers, q.question_type)) total++;
      }
    });
    setScore(total);
    setIsFinished(true);
  };

  const handleAnswerSelect = (questionId, answerIndex, partIndex = null) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      const question = exam.questions.find((q) => q.id === questionId);

      if (question.question_type === 'compound') {
        const current = updated[questionId] || [];
        current[partIndex] = answerIndex;
        updated[questionId] = [...current];
      } else if (question.question_type === 'single') {
        updated[questionId] = [answerIndex];
      } else {
        const current = updated[questionId] || [];
        const i = current.indexOf(answerIndex);
        if (i === -1) current.push(answerIndex);
        else current.splice(i, 1);
        updated[questionId] = [...current];
      }
      return updated;
    });
  };

  const clearAnswer = (questionId) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((prev) => prev - 1);
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const fetchExam = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select(`*, questions(*)`)
        .eq('id', examId)
        .eq('is_permanent', true)
        .single();

      if (error || !data) {
        toast({ title: "خطأ", description: "الاختبار غير موجود.", variant: "destructive" });
        navigate('/');
        return;
      }

      const formatted = {
        id: data.id,
        title: data.title,
        duration: data.duration,
        questions: (data.questions || []).map(q => ({
          id: q.id,
          question: q.question_text,
          question_type: q.question_type,
          video_url: q.video_url,
          options: q.options,
          correct_answers: q.correct_answers,
          explanation: q.explanation,
          explanation_video_url: q.explanation_video_url,
          time_limit_seconds: q.time_limit_seconds,
          parts: (() => {
            try {
              return typeof q.parts === 'string' ? JSON.parse(q.parts) : (q.parts || []);
            } catch {
              return [];
            }
          })()
        }))
      };
      setExam(formatted);
      setLoading(false);
    };
    fetchExam();
  }, [examId, navigate]);

  useEffect(() => {
    if (exam && exam.questions.length > 0) {
      const current = exam.questions[currentQuestionIndex];
      if (current?.time_limit_seconds) {
        setQuestionTimeLeft(current.time_limit_seconds);
      } else {
        setQuestionTimeLeft(null);
      }
      if (videoRef.current && current.video_url) {
        videoRef.current.src = current.video_url.replace("watch?v=", "embed/") + "?autoplay=1";
      }
    }
  }, [currentQuestionIndex, exam]);

  useEffect(() => {
    if (questionTimeLeft === null || isFinished) return;
    if (questionTimeLeft <= 0) {
      nextQuestion();
      return;
    }
    const timer = setInterval(() => {
      setQuestionTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [questionTimeLeft, isFinished]);

  if (loading || !exam) return <div className="min-h-screen flex items-center justify-center text-white">جاري التحميل...</div>;

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswers = answers[currentQuestion.id] || [];

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {isFinished ? (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl">
            <Card className="p-8 bg-slate-800/80 border-slate-700 text-center mb-8">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl text-white font-bold mb-2">أكملت الاختبار</h2>
              <p className="text-xl text-yellow-400">النتيجة: {exam.questions.length} / {score}</p>
            </Card>

            {/* ✅ مراجعة الأسئلة بتنسيق موحد */}
            <div className="mt-8">
              <h3 className="text-2xl font-bold text-white text-center mb-4">مراجعة الإجابات</h3>
              <div className="space-y-4">
                {exam.questions.map((q, i) => {
                  const userAnswers = answers[q.id] || [];
                  const isCompound = q.question_type === 'compound';

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-lg border-2 ${
                        isCompound
                          ? (userAnswers.length === (q.parts?.length || 0) && q.parts.every((p, idx) => userAnswers[idx] === p.correct_answer)
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-red-500/50 bg-red-500/10')
                          : (isCorrect(userAnswers, q.correct_answers)
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-red-500/50 bg-red-500/10')
                      }`}
                    >
                      <p className="font-semibold mb-2 text-white">{i + 1}. {q.question}</p>

                      {isCompound ? (
                        <div className="space-y-4">
                          {q.parts.map((part, partIdx) => {
                            const u = userAnswers[partIdx];
                            const isCorrectPart = u === part.correct_answer;
                            return (
                              <div
                                key={partIdx}
                                className={`p-3 rounded border text-white ${
                                  isCorrectPart ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'
                                }`}
                              >
                                <p className="mb-2 font-medium">{part.text}</p>
                                <div className="space-y-1">
                                  {part.options.map((opt, optIdx) => {
                                    const isSelected = u === optIdx;
                                    const isCorrectAnswer = part.correct_answer === optIdx;
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`flex items-center justify-end gap-3 p-2 rounded text-white ${
                                          isCorrectAnswer ? 'bg-green-500/20' : ''
                                        } ${isSelected && !isCorrectAnswer ? 'bg-red-500/20' : ''}`}
                                      >
                                        <span>{opt}</span>
                                        {isCorrectAnswer && <Check className="w-5 h-5 text-green-400" />}
                                        {isSelected && !isCorrectAnswer && <IconX className="w-5 h-5 text-red-400" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, oIndex) => {
                            const isUserAnswer = userAnswers.includes(oIndex);
                            const isCorrectAnswer = q.correct_answers.includes(oIndex);
                            return (
                              <div
                                key={oIndex}
                                className={`flex items-center justify-end gap-3 p-2 rounded text-right text-white ${
                                  isUserAnswer && !isCorrectAnswer ? 'bg-red-500/20' : ''
                                } ${isCorrectAnswer ? 'bg-green-500/20' : ''}`}
                              >
                                <span>{opt}</span>
                                {isCorrectAnswer && <Check className="w-5 h-5 text-green-400" />}
                                {isUserAnswer && !isCorrectAnswer && <IconX className="w-5 h-5 text-red-400" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.explanation && (
                        <div className="mt-4 pt-4 border-t border-slate-600">
                          <p className="font-bold text-yellow-300 flex items-center gap-2 mb-2">
                            <Info size={16} />
                            شرح الإجابة:
                          </p>
                          <p className="text-slate-300 whitespace-pre-wrap">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          // ... محتوى الامتحان قبل الإنهاء
          <></>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
