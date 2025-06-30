
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

  const isCorrect = (userAnswers = [], correctAnswers = []) => {
    if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
    if (userAnswers.length !== correctAnswers.length) return false;
    return [...userAnswers].sort().every((val, i) => val === [...correctAnswers].sort()[i]);
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  useEffect(() => {
    const fetchExam = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select('id, title, questions:questions(*)')
        .eq('id', examId)
        .single();

      if (error || !data) {
        toast({ title: "خطأ", description: "فشل في تحميل الاختبار", variant: "destructive" });
        navigate('/');
        return;
      }

      setExam({
        ...data,
        questions: data.questions.sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      });

      setQuestionTimeLeft(data.questions[0]?.time_limit_seconds || 30);
      setLoading(false);
    };

    if (examId) fetchExam();
  }, [examId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (isFinished || prev === null) return prev;
        if (prev <= 1) {
          handleNext();
          return exam.questions[currentQuestionIndex + 1]?.time_limit_seconds || 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [questionTimeLeft, currentQuestionIndex, isFinished, exam]);

  const currentQuestion = exam?.questions[currentQuestionIndex];

  const handleOptionChange = (qId, index, multi = false) => {
    setAnswers(prev => {
      const existing = prev[qId] || [];
      if (multi) {
        if (existing.includes(index)) {
          return { ...prev, [qId]: existing.filter(i => i !== index) };
        }
        return { ...prev, [qId]: [...existing, index] };
      }
      return { ...prev, [qId]: [index] };
    });
  };

  const handleCompoundChange = (qId, partIndex, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [partIndex]: optionIndex
      }
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setQuestionTimeLeft(exam.questions[currentQuestionIndex + 1]?.time_limit_seconds || 30);
    } else {
      const total = exam.questions.length;
      let correct = 0;

      exam.questions.forEach(q => {
        const userAnswer = answers[q.id];
        if (q.question_type === 'compound') {
          const correctParts = q.parts?.every((part, i) =>
            userAnswer?.[i] === part.correct_answer
          );
          if (correctParts) correct++;
        } else {
          if (isCorrect(userAnswer, q.correct_answers)) correct++;
        }
      });

      setScore(correct);
      setIsFinished(true);
    }
  };

  const resetExam = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuestionTimeLeft(exam.questions[0]?.time_limit_seconds || 30);
    setScore(0);
    setIsFinished(false);
  };
  if (loading || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p>جاري تحميل الاختبار...</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 bg-slate-800 text-white space-y-4 text-center">
          <h2 className="text-2xl font-bold">تم إنهاء الاختبار 🎉</h2>
          <p>حصلت على {score} من {exam.questions.length} سؤال</p>
          <Button onClick={resetExam} className="mt-4 bg-blue-600 hover:bg-blue-700">إعادة الاختبار</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-900 text-white p-4">
      <Card className="w-full max-w-3xl p-6 space-y-6 bg-slate-800 border border-slate-600">

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">السؤال {currentQuestionIndex + 1} من {exam.questions.length}</h2>
          <div className="text-yellow-400 font-mono">
            ⏱ {questionTimeLeft}s
          </div>
        </div>

        <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>

        {currentQuestion.video_url && (
          <div className="aspect-video mb-4">
            <iframe
              src={currentQuestion.video_url}
              title="شرح الفيديو"
              className="w-full h-full rounded"
              allowFullScreen
            />
          </div>
        )}

        {currentQuestion.question_type === 'compound' ? (
          <div className="space-y-4">
            {currentQuestion.parts?.map((part, pIdx) => (
              <div key={pIdx} className="bg-slate-700 p-4 rounded border border-slate-600">
                <p className="mb-2 font-medium">شطر {pIdx + 1}: {part.text}</p>
                {part.options.map((opt, oIdx) => (
                  <label key={oIdx} className="block mb-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`compound-${currentQuestion.id}-${pIdx}`}
                      checked={answers[currentQuestion.id]?.[pIdx] === oIdx}
                      onChange={() => handleCompoundChange(currentQuestion.id, pIdx, oIdx)}
                      className="mr-2"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {currentQuestion.options.map((opt, i) => (
              <label key={i} className="block cursor-pointer">
                <input
                  type={currentQuestion.question_type === 'multiple' ? 'checkbox' : 'radio'}
                  name={`question-${currentQuestion.id}`}
                  checked={answers[currentQuestion.id]?.includes(i)}
                  onChange={() =>
                    handleOptionChange(currentQuestion.id, i, currentQuestion.question_type === 'multiple')
                  }
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        )}

        {currentQuestion.explanation && (
          <div className="bg-slate-700 p-3 rounded border border-slate-600 mt-4">
            <p className="font-semibold mb-2">💡 شرح الجواب:</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{currentQuestion.explanation}</p>
          </div>
        )}

        {currentQuestion.explanation_video_url && (
          <div className="mt-4">
            <p className="mb-2">🎬 فيديو الشرح:</p>
            <div className="aspect-video">
              <iframe
                src={currentQuestion.explanation_video_url}
                title="فيديو الشرح"
                className="w-full h-full rounded"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div className="text-end">
          <Button onClick={handleNext} className="bg-green-600 hover:bg-green-700">التالي</Button>
        </div>
      </Card>
    </div>
  );
};

export default PublicExamPlayer;
