// ... جميع الاستيرادات تبقى كما هي
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  ArrowRight,
  Check,
  X,
  BarChart2,
  User,
  Phone,
  Info,
  RotateCw,
  Trash2,
  Copy,
  FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SessionResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribedChannel, setSubscribedChannel] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const isCorrect = (userAnswers = [], correctAnswers = [], question) => {
    if (!question) return false;
    if (question.question_type === 'compound') {
      if (!Array.isArray(question.parts) || !Array.isArray(userAnswers)) return false;
      return question.parts.every((part, idx) => userAnswers[idx] === part.correct_answer);
    }
    if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
    if (userAnswers.length !== correctAnswers.length) return false;
    const sortedUser = [...userAnswers].sort();
    const sortedCorrect = [...correctAnswers].sort();
    return sortedUser.every((val, i) => val === sortedCorrect[i]);
  };

  const getIncorrectAnswersByQuestion = () => {
    const incorrectMap = {};

    test?.questions.forEach((question) => {
      incorrectMap[question.id] = [];
      results.forEach((result) => {
        const userAnswers = result.answers?.[question.id] || [];
        if (!isCorrect(userAnswers, question.correct_answers, question)) {
          incorrectMap[question.id].push({
            participant: result.session_participants,
            userAnswers,
          });
        }
      });
    });

    return incorrectMap;
  };

  const fetchAndSetData = async () => {
    setLoading(true);
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*, questions(*)')
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على الاختبار.',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }

    const questionSourceId = testData.original_test_id || testData.id;
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', questionSourceId);

    if (questionsError) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على أسئلة الاختبار.',
        variant: 'destructive'
      });
      setTest({ ...testData, questions: [] });
    } else {
      const sortedQuestions = (questionsData || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      setTest({ ...testData, questions: sortedQuestions });
    }

    const { data: resultsData, error: resultsError } = await supabase
      .from('test_results')
      .select('*, session_participants(name, phone_number)')
      .in('test_id', [testId])
      .order('submitted_at', { ascending: false });

    if (resultsError) {
      toast({
        title: 'خطأ',
        description: `فشل في تحميل النتائج: ${resultsError.message}`,
        variant: 'destructive',
      });
    } else {
      setResults(resultsData || []);
    }

    if (subscribedChannel) supabase.removeChannel(subscribedChannel);

    const channel = supabase
      .channel(`session_results_channel_for_${testId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'test_results',
          filter: `test_id=eq.${testId}`,
        },
        async (payload) => {
          const { data: participantData } = await supabase
            .from('session_participants')
            .select('name, phone_number')
            .eq('id', payload.new.participant_id)
            .single();

          const newResult = {
            ...payload.new,
            session_participants: participantData,
          };

          setResults((currentResults) =>
            [newResult, ...currentResults].sort(
              (a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)
            )
          );

          if (participantData) {
            toast({
              title: 'نتيجة جديدة!',
              description: `المشارك ${participantData.name} أنهى الاختبار.`,
            });
          }
        }
      )
      .subscribe();

    setSubscribedChannel(channel);
    setLoading(false);
  };

  useEffect(() => {
    fetchAndSetData();
    return () => {
      if (subscribedChannel) supabase.removeChannel(subscribedChannel);
    };
  }, [testId, navigate]);

  const handleExportToPDF = () => {
    if (isExporting) return;
    setIsExporting(true);

    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على حاوية النتائج.',
        variant: 'destructive',
      });
      setIsExporting(false);
      return;
    }

    toast({
      title: 'جاري التصدير...',
      description: 'قد تستغرق العملية بضع لحظات.',
    });

    html2canvas(resultsContainer, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`نتائج-${test.title}.pdf`);
        setIsExporting(false);
        toast({ title: 'تم التصدير', description: 'تم إنشاء ملف PDF بنجاح.' });
      })
      .catch((err) => {
        console.error('Error exporting to PDF:', err);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تصدير النتائج.',
          variant: 'destructive',
        });
        setIsExporting(false);
      });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/session/${testId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'تم النسخ!',
      description: 'تم نسخ رابط الجلسة إلى الحافظة.',
    });
  };

  const handleResetSession = async () => {
    const { error: resultsError } = await supabase
      .from('test_results')
      .delete()
      .eq('test_id', testId);

    const { error: participantsError } = await supabase
      .from('session_participants')
      .delete()
      .eq('session_id', testId);

    if (resultsError || participantsError) {
      toast({
        title: 'خطأ',
        description: 'فشل في إعادة تعيين الجلسة.',
        variant: 'destructive',
      });
    } else {
      setResults([]);
      toast({
        title: 'تم بنجاح',
        description: 'تم مسح جميع نتائج هذه الجلسة.',
      });
    }
  };

  const handleDeleteResult = async (resultId, participantId) => {
    const { error: resultError } = await supabase
      .from('test_results')
      .delete()
      .eq('id', resultId);

    const { error: participantError } = await supabase
      .from('session_participants')
      .delete()
      .eq('id', participantId);

    if (resultError || participantError) {
      toast({
        title: 'خطأ',
        description: 'فشل في حذف النتيجة.',
        variant: 'destructive',
      });
    } else {
      setResults((prev) => prev.filter((r) => r.id !== resultId));
      toast({
        title: 'تم الحذف',
        description: 'تم حذف نتيجة المشارك.',
      });
    }
  };

  if (loading || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pt-12 md:pt-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative text-center mb-8"
      >
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="absolute top-0 right-0 text-slate-300 border-slate-600 hover:bg-slate-700"
        >
          <ArrowRight className="w-4 h-4 ml-2" /> العودة
        </Button>
        <Button
          onClick={() => navigate(`/public-exam-player/${testId}`)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <ArrowRight className="w-4 h-4 ml-2" /> عرض الجلسة
        </Button>
      </motion.div>

      {/* 🔴 هنا يتم إدراج زر تحليل الأخطاء */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="text-red-400 border-red-500 hover:bg-red-500/20">
            تحليل الأخطاء
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تحليل الأسئلة التي أُجيبت بشكل خاطئ</DialogTitle>
            <DialogDescription>عرض تفصيلي للأسئلة التي أخطأ فيها مشاركون.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {Object.entries(getIncorrectAnswersByQuestion()).map(([questionId, wrongList]) => {
              const question = test.questions.find((q) => q.id.toString() === questionId);
              if (!question || wrongList.length === 0) return null;

              return (
                <div key={questionId} className="p-4 border border-red-500 bg-red-500/10 rounded">
                  <p className="font-bold text-white mb-2">{question.question_text}</p>
                  <ul className="space-y-2 text-sm">
                    {wrongList.map((item, idx) => (
                      <li key={idx} className="p-2 border border-slate-600 rounded bg-slate-800/50">
                        <p>
                          👤 <span className="font-bold text-yellow-300">{item.participant?.name || 'مجهول'}</span>
                        </p>
                        <p>
                          📞 <span className="text-slate-400">{item.participant?.phone_number || 'غير متوفر'}</span>
                        </p>
                        <p>
                          ❌ إجابته:{" "}
                          <span className="text-red-400">
                            {Array.isArray(item.userAnswers)
                              ? item.userAnswers.map((i) => question.options?.[i]).join(", ")
                              : 'غير متوفرة'}
                          </span>
                        </p>
                        <p>
                          ✅ الإجابة الصحيحة:{" "}
                          <span className="text-green-400">
                            {question.question_type === "compound"
                              ? (Array.isArray(question.parts)
                                  ? question.parts.map((part) => part.options?.[part.correct_answer]).join(" / ")
                                  : '')
                              : (question.correct_answers || []).map((i) => question.options?.[i]).join(", ")}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ... تكملة الكود */}
    </div>
  );
};

export default SessionResults;
