import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import RegistrationStep from '@/components/exam/RegistrationStep';
import ExamStep from '@/components/exam/ExamStep';
import CompletionStep from '@/components/exam/CompletionStep';

const ExamSession = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const viewOnly = queryParams.get('viewOnly') === 'true';
  const skipRegistration = location.state?.skipRegistration || viewOnly;

  const [exam, setExam] = useState(null);
  const [currentStep, setCurrentStep] = useState('registration');
  const [studentInfo, setStudentInfo] = useState({ name: '', phone: '', email: '' });
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState(null);
  const [examStartTime, setExamStartTime] = useState(null);
  const [sessionUserId, setSessionUserId] = useState(null);

  const isCorrect = (userAnswers, correctAnswers, question) => {
    if (!question) return false;
    if (question.question_type === 'compound') {
      return question.parts.every((part, idx) => userAnswers[idx] === part.correct_answer);
    }
    if (!userAnswers || !correctAnswers) return false;
    if (userAnswers.length !== correctAnswers.length) return false;
    return [...userAnswers].sort().every((val, idx) => val === [...correctAnswers].sort()[idx]);
  };

  useEffect(() => {
    async function fetchExamDetails() {
      setLoading(true);
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('id, title, duration, user_id, original_test_id, is_restricted_by_email, allowed_emails, with_video')
        .eq('id', examId)
        .single();

      if (testError || !testData) {
        toast({ title: "خطأ", description: "جلسة الاختبار غير موجودة أو فشل في التحميل", variant: "destructive" });
        return navigate('/');
      }

      setSessionUserId(testData.user_id);
      const sourceId = testData.original_test_id || testData.id;

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answers, question_type, time_limit_seconds, parts, video_url, explanation, explanation_video_url')
        .eq('test_id', sourceId);

      if (questionsError) {
        toast({ title: "خطأ", description: "فشل في تحميل الأسئلة.", variant: "destructive" });
        return navigate('/');
      }

      const formatted = {
        ...testData,
        questions: (questionsData || []).map(q => ({
          id: q.id,
          question: q.question_text,
          options: q.options || [],
          correct_answers: q.correct_answers || [],
          question_type: q.question_type || 'single',
          time_limit_seconds: q.time_limit_seconds,
          video_url: q.video_url || null,
          explanation: q.explanation || '',
          explanation_video_url: q.explanation_video_url || '',
          parts: q.parts || []
        }))
      };

      setExam(formatted);
      setTimeLeft(formatted.duration * 60);
      setLoading(false);

      if (skipRegistration) {
        await startSessionAsGuest(testData);
      }
    }

    async function startSessionAsGuest(testData) {
      const temp = { name: 'مشارك مباشر', phone: '', email: '' };
      setStudentInfo(temp);

      const participantData = testData.is_restricted_by_email
        ? { session_id: examId, email: temp.email.trim().toLowerCase(), session_user_id: testData.user_id }
        : { session_id: examId, name: temp.name, phone_number: temp.phone, session_user_id: testData.user_id };

      const { data: part, error: partErr } = await supabase
        .from('session_participants')
        .insert([participantData])
        .select('id')
        .single();

      if (partErr || !part) {
        toast({ title: "خطأ", description: `فشل في تسجيل المشارك: ${partErr?.message}`, variant: "destructive" });
        return navigate('/');
      }

      setParticipantId(part.id);
      setExamStartTime(Date.now());
      setCurrentStep('exam');
      if (!viewOnly) {
        toast({ title: "بدء الاختبار! 🚀", description: "حظاً موفقاً في الاختبار" });
      }
    }

    fetchExamDetails();
  }, [examId, skipRegistration, navigate]);

  useEffect(() => {
    if (currentStep === 'exam' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentStep, timeLeft]);

  const handleRegistrationSubmit = async (info) => {
    setStudentInfo(info);
    if (!exam) return;

    if (exam.is_restricted_by_email) {
      const email = info.email?.trim().toLowerCase();
      if (!email || !exam.allowed_emails?.includes(email)) {
        return toast({ title: "خطأ", description: "البريد الإلكتروني غير مسموح", variant: "destructive" });
      }
    } else {
      if (!info.name.trim() || !info.phone.trim()) {
        return toast({ title: "خطأ", description: "يرجى ملء الاسم ورقم الهاتف", variant: "destructive" });
      }
    }

    const participantData = exam.is_restricted_by_email
      ? { session_id: examId, email: info.email.trim().toLowerCase(), session_user_id: sessionUserId }
      : { session_id: examId, name: info.name, phone_number: info.phone, session_user_id: sessionUserId };

    const { data: part, error } = await supabase
      .from('session_participants')
      .insert([participantData])
      .select('id').single();

    if (error || !part) {
      return toast({ title: "خطأ", description: `فشل تسجيل المشارك: ${error?.message}`, variant: "destructive" });
    }

    setParticipantId(part.id);
    setExamStartTime(Date.now());
    setCurrentStep('exam');
    toast({ title: "بدء الاختبار! 🚀", description: "حظاً موفقاً" });
  };

  const handleSubmit = async () => {
    if (!exam || currentStep !== 'exam') return;

    if (!participantId) {
      toast({ title: "خطأ", description: "معرف المشارك غير موجود، لا يمكن حفظ النتيجة", variant: "destructive" });
      return;
    }

    const total = exam.questions.length;
    let correctCount = 0;

    exam.questions.forEach(q => {
      if (isCorrect(answers[q.id] || [], q.correct_answers, q)) correctCount++;
    });

    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    try {
      const { error } = await supabase.from('test_results').insert([{
        test_id: examId,
        participant_id: participantId,
        score: correctCount,
        total_questions: total,
        percentage: percent,
        time_spent: exam.duration * 60 - timeLeft,
        answers,
        test_title: exam.title,
        submitted_at: new Date().toISOString()
      }]);

      if (error) {
        toast({ title: "خطأ", description: `فشل حفظ النتيجة: ${error.message}`, variant: "destructive" });
        return;
      }

      setCurrentStep('completed');
      toast({ title: "تم إنهاء الاختبار", description: `نتيجتك: ${correctCount}/${total} (${percent}%)` });
    } catch (err) {
      toast({ title: "خطأ غير متوقع", description: err.message, variant: "destructive" });
    }
  };

  if (loading || !exam) return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      <p>جاري التحميل...</p>
    </div>
  );

  return (
    <div className="min-h-screen p-4 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {currentStep === 'registration' && (
          <RegistrationStep key="registration" exam={exam} onSubmit={handleRegistrationSubmit} />
        )}
        {currentStep === 'exam' && (
          <ExamStep
            key="exam"
            exam={exam}
            studentInfo={studentInfo}
            timeLeft={timeLeft}
            answers={answers}
            setAnswers={setAnswers}
            onSubmit={handleSubmit}
            viewOnly={viewOnly}
          />
        )}
        {currentStep === 'completed' && <CompletionStep key="completed" studentInfo={studentInfo} />}
      </AnimatePresence>
    </div>
  );
};

export default ExamSession;
