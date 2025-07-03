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
  const [reviewDialogIndex, setReviewDialogIndex] = useState(null);
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

            <div className="grid grid-cols-6 md:grid-cols-8 gap-3 mb-8">
              {exam.questions.map((q, index) => {
                const user = answers[q.id] || [];
                const correct =
                  q.question_type === 'compound'
                    ? (q.parts || []).map((p) => p.correct_answer)
                    : q.correct_answers;
                const success =
                  q.question_type === 'compound'
                    ? user.length === correct.length &&
                      user.every((u, i) => u === correct[i])
                    : isCorrect(user, correct, q.question_type);
                return (
                  <button
                    key={q.id}
                    onClick={() => setReviewDialogIndex(index)}
                    className={`w-10 h-10 rounded font-bold text-white ${
                      success ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Dialog مراجعة السؤال */}
            <Dialog open={reviewDialogIndex !== null} onOpenChange={() => setReviewDialogIndex(null)}>
              <DialogContent className="max-w-3xl bg-slate-900 border border-slate-700">
                {reviewDialogIndex !== null && (
                  <>
                    {exam.questions[reviewDialogIndex].explanation && (
  <div className="mt-6 pt-4 border-t border-slate-700">
    <p className="text-yellow-300 font-bold mb-1 flex items-center gap-2">
      <Info size={16} /> شرح:
    </p>
    <p className="text-white text-sm whitespace-pre-wrap mb-3">
      {exam.questions[reviewDialogIndex].explanation}
    </p>
    {exam.questions[reviewDialogIndex].explanation_video_url && (
      <iframe
        className="w-full h-64 rounded border border-slate-700"
        src={exam.questions[reviewDialogIndex].explanation_video_url.replace('watch?v=', 'embed/')}
        allowFullScreen
      ></iframe>
    )}
  </div>
)}

                    <h3 className="text-white font-bold mb-4 text-lg">
                      {reviewDialogIndex + 1}. {exam.questions[reviewDialogIndex].question}
                    </h3>
                    {(() => {
                      const q = exam.questions[reviewDialogIndex];
                      const user = answers[q.id] || [];
                      return q.question_type === 'compound' ? (
                        <div className="space-y-4">
                          {q.parts.map((part, idx) => {
                            const u = user[idx];
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded border text-white ${
                                  u === part.correct_answer
                                    ? 'border-green-500/50 bg-green-500/10'
                                    : 'border-red-500/50 bg-red-500/10'
                                }`}
                              >
                                <p className="mb-2 font-medium">{part.text}</p>
                                <div className="space-y-1">
                                  {part.options.map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className={`flex items-center justify-end gap-3 p-2 rounded text-white ${
                                        part.correct_answer === optIdx
                                          ? 'bg-green-500/20'
                                          : u === optIdx
                                          ? 'bg-red-500/20'
                                          : ''
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      {part.correct_answer === optIdx && (
                                        <Check className="w-4 h-4 text-green-400" />
                                      )}
                                      {u === optIdx && optIdx !== part.correct_answer && (
                                        <IconX className="w-4 h-4 text-red-400" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const isCorrectAnswer = q.correct_answers.includes(i);
                            const isUserAnswer = user.includes(i);
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
                                {isCorrectAnswer && (
                                  <Check className="text-green-400 w-4 h-4" />
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <IconX className="text-red-400 w-4 h-4" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </DialogContent>
            </Dialog>

            <div className="text-center">
              <Button onClick={() => navigate('/')}>الرجوع للرئيسية</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-4">{exam.title}</h2>

            {currentQuestion.video_url && (
              <div className="mb-6 aspect-video bg-black border border-slate-700 rounded overflow-hidden">
                <iframe
                  ref={videoRef}
                  width="100%"
                  height="100%"
                  src={currentQuestion.video_url.replace('watch?v=', 'embed/') + '?autoplay=1'}
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <Card className="p-6 bg-slate-800/80 border-slate-700 mb-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {currentQuestionIndex + 1}. {currentQuestion.question}
                </h3>
                {questionTimeLeft !== null && (
                  <div className="flex items-center gap-2 text-orange-400 font-mono text-lg">
                    <Clock className="w-5 h-5" />
                    <span>{formatTime(questionTimeLeft)}</span>
                  </div>
                )}
              </div>

              {currentQuestion.question_type === 'compound' ? (
                <div className="space-y-4">
                  {currentQuestion.parts.map((part, partIdx) => (
                    <div
                      key={partIdx}
                      className="p-3 border border-slate-600 rounded bg-slate-700/40"
                    >
                      <p className="text-white font-medium mb-2">{part.text}</p>
                      <div className="space-y-2">
                        {part.options.map((opt, i) => (
                          <motion.div key={i} whileHover={{ scale: 1.01 }}>
                            <button
                              onClick={() =>
                                handleAnswerSelect(currentQuestion.id, i, partIdx)
                              }
                              className={`w-full text-right p-3 rounded border-2 ${
                                currentAnswers[partIdx] === i
                                  ? 'border-yellow-500 bg-yellow-500/20'
                                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                              }`}
                            >
                              <span className="text-white">{opt}</span>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentQuestion.options.map((opt, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.01 }}>
                      <button
                        onClick={() => handleAnswerSelect(currentQuestion.id, i)}
                        className={`w-full text-right p-3 rounded border-2 ${
                          currentAnswers.includes(i)
                            ? 'border-yellow-500 bg-yellow-500/20'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-white">{opt}</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex justify-between mt-4">
              <Button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                السابق
              </Button>
              <div className="flex gap-4">
                <Button
                  onClick={() => clearAnswer(currentQuestion.id)}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500/20"
                >
                  إلغاء
                </Button>
                {currentQuestionIndex === exam.questions.length - 1 ? (
                  <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    إنهاء
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>التالي</Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
