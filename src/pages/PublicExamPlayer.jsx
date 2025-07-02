import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, Check, X as IconX, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  const [reviewIndex, setReviewIndex] = useState(null);
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

  const nextQuestion = () => {
    if (exam && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((prev) => prev - 1);
  };

  const handleSubmit = () => {
    if (!exam) return;
    let total = 0;
    exam.questions.forEach((q) => {
      const user = answers[q.id] || [];
      if (q.question_type === 'compound') {
        const correct = (q.parts || []).map((p) => p.correct_answer);
        const isAllCorrect =
          correct.length &&
          user.length === correct.length &&
          user.every((u, i) => u === correct[i]);
        if (isAllCorrect) total += 1;
      } else {
        if (isCorrect(user, q.correct_answers, q.question_type)) total++;
      }
    });
    setScore(total);
    setIsFinished(true);
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
        .select('*, questions(*)')
        .eq('id', examId)
        .eq('is_permanent', true)
        .single();

      if (error || !data) {
        toast({
          title: 'خطأ',
          description: 'الاختبار غير موجود.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      const formatted = {
        id: data.id,
        title: data.title,
        duration: data.duration,
        questions: (data.questions || []).map((q) => ({
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
          })(),
        })),
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
        videoRef.current.src =
          current.video_url.replace('watch?v=', 'embed/') + '?autoplay=1';
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
      setQuestionTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [questionTimeLeft, isFinished]);

  if (loading || !exam)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        جاري التحميل...
      </div>
    );

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswers = answers[currentQuestion.id] || [];
  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {isFinished ? (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
          >
            <Card className="p-8 bg-slate-800/80 border-slate-700 text-center mb-6">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl text-white font-bold mb-2">أكملت الاختبار</h2>
              <p className="text-xl text-yellow-400">
                النتيجة: {exam.questions.length} / {score} (
                {Math.round((score / exam.questions.length) * 100)}%)
              </p>
            </Card>

            {/* مربعات الأسئلة للمراجعة */}
            <div className="grid grid-cols-6 md:grid-cols-8 gap-3 mb-6">
              {exam.questions.map((q, index) => {
                const user = answers[q.id] || [];
                const isCompound = q.question_type === 'compound';
                const correct = isCompound
                  ? q.parts.map((p) => p.correct_answer)
                  : q.correct_answers;
                const isCorrectAnswer = isCompound
                  ? user.length === correct.length &&
                    correct.every((c, i) => c === user[i])
                  : isCorrect(user, correct, q.question_type);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 flex items-center justify-center rounded font-bold ${
                      isCorrectAnswer
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* مراجعة السؤال المحدد */}
            <Card className="p-6 bg-slate-800/70 border border-slate-600 mb-8">
              <h3 className="text-white font-bold mb-4 text-lg">
                {currentQuestionIndex + 1}. {currentQuestion.question}
              </h3>

              {currentQuestion.question_type === 'compound' ? (
                <div className="space-y-4">
                  {currentQuestion.parts.map((part, partIdx) => {
                    const u = currentAnswers[partIdx];
                    return (
                      <div
                        key={partIdx}
                        className={`p-3 rounded border text-white ${
                          u === part.correct_answer
                            ? 'border-green-500/50 bg-green-500/10'
                            : 'border-red-500/50 bg-red-500/10'
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
                                  isCorrectAnswer
                                    ? 'bg-green-500/20'
                                    : isSelected
                                    ? 'bg-red-500/20'
                                    : ''
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrectAnswer && (
                                  <Check className="w-4 h-4 text-green-400" />
                                )}
                                {isSelected && !isCorrectAnswer && (
                                  <IconX className="w-4 h-4 text-red-400" />
                                )}
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
                  {currentQuestion.options.map((opt, i) => {
                    const isCorrectAnswer = currentQuestion.correct_answers.includes(i);
                    const isUserAnswer = currentAnswers.includes(i);
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-end gap-3 p-2 rounded text-right text-white ${
                          isUserAnswer && !isCorrectAnswer
                            ? 'bg-red-500/20'
                            : isCorrectAnswer
                            ? 'bg-green-500/20'
                            : ''
                        }`}
                      >
                        <span>{opt}</span>
                        {isCorrectAnswer && <Check className="text-green-400 w-4 h-4" />}
                        {isUserAnswer && !isCorrectAnswer && (
                          <IconX className="text-red-400 w-4 h-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQuestion.explanation && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <p className="text-yellow-300 font-bold mb-1 flex items-center gap-2">
                    <Info size={16} /> شرح:
                  </p>
                  <p className="text-white text-sm whitespace-pre-wrap mb-3">
                    {currentQuestion.explanation}
                  </p>
                  {currentQuestion.explanation_video_url && (
                    <iframe
                      className="w-full h-64 rounded border border-slate-700"
                      src={currentQuestion.explanation_video_url.replace(
                        'watch?v=',
                        'embed/'
                      )}
                      allowFullScreen
                    ></iframe>
                  )}
                </div>
              )}
            </Card>

            <div className="text-center">
              <Button onClick={() => navigate('/')}>الرجوع للرئيسية</Button>
            </div>
          </motion.div>
        ) : (
          // 👇 يمكنك وضع هنا واجهة الامتحان قبل الإنهاء
          <div className="text-white">واجهة الأسئلة أثناء الامتحان...</div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
