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
        const allCorrect = correct.every((c, i) => user[i] === c);
        if (allCorrect) total += 1;
      } else {
        if (isCorrect(user, q.correct_answers, q.question_type)) total += 1;
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
          parts: q.parts || [],
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
              <p className="text-xl text-yellow-400">النتيجة: {score} / {exam.questions.length}</p>
            </Card>

            {/* مراجعة الإجابات (كما كانت دون تغيير) */}
            {/* ... */}
          </motion.div>
        ) : (
          // عرض الأسئلة (كما هو، بدون تغيير)
          // ...
          null
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;
