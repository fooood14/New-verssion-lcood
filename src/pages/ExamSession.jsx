import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

import RegistrationStep from '@/components/exam/RegistrationStep';
import ExamStep from '@/components/exam/ExamStep';
import CompletionStep from '@/components/exam/CompletionStep';

// ✅ تصحيح دالة التقييم
const normalize = (val) =>
  typeof val === 'string' ? val.trim().toLowerCase() : val;

const isCorrect = (userAnswers, correctAnswers, question) => {
  if (!question) return false;

  if (question.question_type === 'compound') {
    if (!Array.isArray(question.parts) || !Array.isArray(userAnswers)) return false;
    return question.parts.every((part, idx) =>
      normalize(userAnswers[idx]) === normalize(part.correct_answer)
    );
  }

  if (!userAnswers || !correctAnswers) return false;

  const sortedUser = (userAnswers || []).map(normalize).sort();
  const sortedCorrect = (correctAnswers || []).map(normalize).sort();

  return sortedUser.length === sortedCorrect.length &&
         sortedUser.every((val, index) => val === sortedCorrect[index]);
};

const ExamSession = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [exam, setExam] = useState(null);
  const [currentStep, setCurrentStep] = useState('registration');
  const [studentInfo, setStudentInfo] = useState({ name: '', phone: '', email: '' });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState(null);
  const [examStartTime, setExamStartTime] = useState(null);
  const [sessionUserId, setSessionUserId] = useState(null);

  const isLiveView = location.state?.skipRegistration === true;

  useEffect(() => {
    const fetchExamDetails = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('tests')
        .select(`id, title, duration, user_id, original_test_id, is_restricted_by_email, allowed_emails, with_video`)
        .eq('id', examId)
        .single();

      if (error || !data) {
        toast({ title: "خطأ", description: "جلسة الاختبار غير موجودة أو فشل في التحميل", variant: "destructive" });
        navigate('/');
        return;
      }

      setSessionUserId(data.user_id);
      const questionSourceId = data.original_test_id || data.id;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answers, question_type, time_limit_seconds, parts, video_url, explanation, explanation_video_url')
        .eq('test_id', questionSourceId);

      if (questionsError) {
        toast({ title: "خطأ", description: "فشل في تحميل الأسئلة.", variant: "destructive" });
        navigate('/');
        return;
      }

      const formattedExam = {
        ...data,
        questions: (questionsData || []).map(q => ({
          id: q.id,
          question: q.question_text,
          options: q.options || [],
          correct_answers: q.correct_answers || [],
          question_type: q.question_type || 'single',
          time_limit_seconds: q.time_limit_seconds || 30,
          video_url: isLiveView ? (q.video_url || null) : (data.with_video ? (q.video_url || null) : null),
          explanation: q.explanation || '',
          explanation_video_url: q.explanation_video_url || '',
          parts: q.parts || []
        })).sort((a, b) => (a.id || '').localeCompare(b.id || ''))
      };

      setExam(formattedExam);
      setTimeLeft(formattedExam.duration * 60);
      setLoading(false);

      if (isLiveView) {
        const tempInfo = { name: 'عرض الجلسة', phone: '', email: '' };
        setStudentInfo(tempInfo);
        setExamStartTime(Date.now());
        setCurrentStep('exam');
        return;
      }
    };

    if (examId) fetchExamDetails();
    else {
      toast({ title: "خطأ", description: "معرف الجلسة مفقود", variant: "destructive" });
      navigate('/');
    }
  }, [examId, navigate, isLiveView]);

  useEffect(() => {
    let timer;
    if (currentStep === 'exam' && timeLeft > 0 && examStartTime) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStep, timeLeft, examStartTime]);

  const handleRegistrationSubmit = async (info) => {
    setStudentInfo(info);

    if (exam.is_restricted_by_email) {
      const userEmail = info.email?.trim().toLowerCase();
      if (!userEmail) {
        toast({ title: "خطأ", description: "يرجى إدخال البريد الإلكتروني.", variant: "destructive" });
        return;
      }
      if (!exam.allowed_emails || !exam.allowed_emails.includes(userEmail)) {
        toast({ title: "خطأ", description: "هذا البريد الإلكتروني غير مسموح له بالمشاركة.", variant: "destructive" });
        return;
      }
    } else {
      if (!info.name.trim() || !info.phone.trim()) {
        toast({ title: "خطأ", description: "يرجى إدخال الاسم ورقم الهاتف", variant: "destructive" });
        return;
      }
    }

    const participantData = exam.is_restricted_by_email
      ? { session_id: examId, email: info.email.trim().toLowerCase(), session_user_id: sessionUserId }
      : { session_id: examId, name: info.name, phone_number: info.phone, session_user_id: sessionUserId };

    const { data, error } = await supabase
      .from('session_participants')
      .insert([participantData])
      .select('id').single();

    if (error || !data) {
      toast({ title: "خطأ", description: `فشل في تسجيل المشارك: ${error.message}`, variant: "destructive" });
      return;
    }

    setParticipantId(data.id);
    setExamStartTime(Date.now());
    setCurrentStep('start');
    toast({ title: "جاهز!", description: "اضغط على 'ابدأ الاختبار' لتشغيل الفيديوهات تلقائيًا." });
  };

  const submitExam = async () => {
    if (currentStep !== 'exam' || !exam || !exam.questions) return;

    const score = exam.questions.reduce((total, question) => {
      const userAnswers = answers[question.id] || [];
      return total + (isCorrect(userAnswers, question.correct_answers, question) ? 1 : 0);
    }, 0);

    const percentage = exam.questions.length > 0 ? Math.round((score / exam.questions.length) * 100) : 0;
    const timeSpent = exam.duration * 60 - timeLeft;

    if (participantId) {
      const { error } = await supabase.from('test_results').insert([{
        test_id: examId,
        participant_id: participantId,
        score,
        total_questions: exam.questions.length,
        percentage,
        time_spent: timeSpent,
        answers,
        test_title: exam.title,
        submitted_at: new Date().toISOString()
      }]);
      if (error) {
        toast({ title: "خطأ", description: `فشل في حفظ النتيجة: ${error.message}`, variant: "destructive" });
      }
    }

    setCurrentStep('completed');
    toast({ title: "انتهى الاختبار!", description: `النتيجة: ${score}/${exam.questions.length}` });
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p>جاري تحميل الجلسة...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {!isLiveView && currentStep === 'registration' && (
          <RegistrationStep key="registration" exam={exam} onSubmit={handleRegistrationSubmit} />
        )}
        {!isLiveView && currentStep === 'start' && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full mx-auto text-center"
          >
            <Card className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-4">هل أنت مستعد؟</h2>
              <p className="text-gray-300 mb-6">اضغط على الزر لبدء الاختبار وتشغيل الفيديوهات تلقائيًا.</p>
              <Button
                onClick={() => {
                  setExamStartTime(Date.now());
                  setCurrentStep('exam');
                  toast({ title: "تم البدء", description: "بالتوفيق!" });
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ابدأ الاختبار
              </Button>
            </Card>
          </motion.div>
        )}
        {currentStep === 'exam' && exam.questions.length > 0 && (
          <ExamStep
            key="exam"
            exam={exam}
            studentInfo={studentInfo}
            timeLeft={timeLeft}
            answers={answers}
            setAnswers={setAnswers}
            onSubmit={submitExam}
            viewOnly={isLiveView}
          />
        )}
        {currentStep === 'completed' && (
          <CompletionStep key="completed" studentInfo={studentInfo} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamSession;
