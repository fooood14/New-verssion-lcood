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
        videoRef.current.pause();
        videoRef.current.src = current.video_url;
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
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

  if (loading || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        جاري التحميل...
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswers = answers[currentQuestion.id] || [];

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {!isFinished && (
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
                  controls={false}
                  autoPlay
                  muted={false}
                  playsInline
                  className="w-full h-full"
                >
                  <source src={currentQuestion.video_url} type="video/mp4" />
                  متصفحك لا يدعم تشغيل الفيديو.
                </video>
              </div>
            )}

            {/* ... الباقي يبقى كما هو ... */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
