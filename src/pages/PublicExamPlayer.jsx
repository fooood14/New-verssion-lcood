// الاستيرادات كما هي
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Info, Check, X as IconX, Clock, CheckCircle } from 'lucide-react';
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
      return false;
    }
    if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();
    return sortedUser.every((val, i) => val === sortedCorrect[i]);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    let total = 0;
    exam.questions.forEach((q) => {
      const user = answers[q.id] || [];
      if (q.question_type === 'compound') {
        const correct = q.parts.map(p => p.correct_answer);
        const isAllCorrect = correct.length === user.length && user.every((u, i) => u === correct[i]);
        if (isAllCorrect) total += 1;
      } else if (isCorrect(user, q.correct_answers, q.question_type)) {
        total += 1;
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
    const current = exam?.questions[currentQuestionIndex];
    if (current?.time_limit_seconds) setQuestionTimeLeft(current.time_limit_seconds);
    else setQuestionTimeLeft(null);
    if (videoRef.current && current?.video_url) {
      videoRef.current.src = current.video_url.replace("watch?v=", "embed/") + "?autoplay=1";
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

            {/* ✅ مراجعة الإجابات */}
            <div className="space-y-6">
              {exam.questions.map((q, idx) => {
                const user = answers[q.id] || [];
                const correct = q.question_type === 'compound' ? q.parts.map(p => p.correct_answer) : q.correct_answers;

                return (
                  <Card key={q.id} className="p-4 bg-slate-800/50 border border-slate-700">
                    <h4 className="text-white font-semibold mb-3">{idx + 1}. {q.question}</h4>

                    {q.question_type === 'compound' ? q.parts.map((part, partIdx) => {
                      const u = user[partIdx];
                      const isCorrectPart = u === part.correct_answer;
                      return (
                        <div key={partIdx} className={`p-3 mb-2 rounded border ${isCorrectPart ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                          <p className="text-white mb-2 font-medium">{part.text}</p>
                          {part.options.map((opt, i) => (
                            <div key={i} className={`flex items-center justify-end gap-3 px-3 py-1 rounded text-white
                              ${i === part.correct_answer ? 'bg-green-500/20' : ''}
                              ${i === u && i !== part.correct_answer ? 'bg-red-500/20' : ''}`}>
                              <span>{opt}</span>
                              {i === part.correct_answer && <Check className="text-green-400 w-4 h-4" />}
                              {i === u && i !== part.correct_answer && <IconX className="text-red-400 w-4 h-4" />}
                            </div>
                          ))}
                        </div>
                      );
                    }) : (
                      <div className="space-y-2">
                        {q.options.map((opt, i) => {
                          const isCorrectAnswer = q.correct_answers.includes(i);
                          const isUserAnswer = user.includes(i);
                          return (
                            <div key={i} className={`flex items-center justify-end gap-3 px-3 py-1 rounded text-white
                              ${isCorrectAnswer ? 'bg-green-500/20' : ''}
                              ${isUserAnswer && !isCorrectAnswer ? 'bg-red-500/20' : ''}`}>
                              <span>{opt}</span>
                              {isCorrectAnswer && <Check className="text-green-400 w-4 h-4" />}
                              {isUserAnswer && !isCorrectAnswer && <IconX className="text-red-400 w-4 h-4" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-yellow-300 font-bold mb-1 flex items-center gap-2"><Info size={16}/> شرح:</p>
                        <p className="text-white text-sm whitespace-pre-wrap">{q.explanation}</p>
                        {q.explanation_video_url && (
                          <div className="mt-4 aspect-video border border-slate-700 rounded overflow-hidden">
                            <iframe width="100%" height="100%" src={q.explanation_video_url.replace("watch?v=", "embed/")} allowFullScreen></iframe>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ) : (
          // ✅ عرض الأسئلة قبل الإنهاء (تم دمجه سابقًا)
          // ⬅ سبق وأرسلته في الرد السابق بالكامل، إن أردت دمجه هنا أخبرني
          <></>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
