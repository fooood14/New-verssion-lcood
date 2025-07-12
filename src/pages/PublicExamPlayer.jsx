import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock } from 'lucide-react';
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
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);

  const videoRef = useRef(null);

  const isCorrect = (userAnswers = [], correctAnswers = [], type = 'single') => {
    if (type === 'compound') {
      return userAnswers.every((ans, idx) => ans === correctAnswers[idx]);
    }
    if (userAnswers.length !== correctAnswers.length) return false;
    return [...userAnswers].sort().every((val, i) => val === [...correctAnswers].sort()[i]);
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
        const correct = (q.parts || []).map((p) => p.correct_answer);
        if (user.length === correct.length && user.every((u, i) => u === correct[i])) {
          total++;
        }
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
    if (!exam || !exam.questions.length || !autoplayEnabled) return;
    const current = exam.questions[currentQuestionIndex];
    if (current?.time_limit_seconds) {
      setQuestionTimeLeft(current.time_limit_seconds);
    } else {
      setQuestionTimeLeft(null);
    }

    if (videoRef.current && current.video_url) {
      videoRef.current.load();
      videoRef.current.play().catch((e) => {
        console.warn('Autoplay failed', e);
      });
    }
  }, [currentQuestionIndex, exam, autoplayEnabled]);

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

  if (loading || !exam) {
    return <div className="min-h-screen flex items-center justify-center text-white">جاري التحميل...</div>;
  }

  if (!autoplayEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6">
        <h2 className="text-2xl font-bold text-white">{exam.title}</h2>
        <Button
          className="text-lg px-6 py-3 bg-green-600 hover:bg-green-700"
          onClick={() => setAutoplayEnabled(true)}
        >
          إبدأ الاختبار
        </Button>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswers = answers[currentQuestion.id] || [];

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {!isFinished ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl"
          >
            <h2 className="text-2xl font-bold text-white text-center mb-4">{exam.title}</h2>

            {currentQuestion.video_url && (
              <div className="mb-6 aspect-video bg-black border border-slate-700 rounded overflow-hidden">
                <video
                  ref={videoRef}
                  width="100%"
                  height="100%"
                  controls
                  autoPlay
                  onEnded={nextQuestion}
                >
                  <source src={currentQuestion.video_url} type="video/mp4" />
                  المتصفح لا يدعم تشغيل الفيديو.
                </video>
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
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl text-center"
          >
            <Card className="p-8 bg-slate-800/80 border-slate-700 mb-6">
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl text-white font-bold mb-2">أكملت الاختبار</h2>
              <p className="text-xl text-yellow-400">
                النتيجة: {exam.questions.length} / {score} (
                {Math.round((score / exam.questions.length) * 100)}%)
              </p>
            </Card>
            <Button onClick={() => navigate('/')}>الرجوع للرئيسية</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
