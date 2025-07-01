import React, { useState, useEffect, useMemo } from 'react';
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

  // السؤال المركب
  if (question.question_type === 'compound') {
    if (!Array.isArray(question.parts) || !Array.isArray(userAnswers)) return false;
    // نتحقق أن جميع الأشطر أُجابت بشكل صحيح
    return question.parts.every((part, idx) => userAnswers[idx] === part.correct_answer);
  }

  // الأسئلة العادية (إجابة واحدة أو متعددة)
  if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
  if (userAnswers.length !== correctAnswers.length) return false;
  const sortedUser = [...userAnswers].sort();
  const sortedCorrect = [...correctAnswers].sort();
  return sortedUser.every((val, i) => val === sortedCorrect[i]);
};


  const questionsMap = useMemo(() => {
    if (!test || !test.questions) return new Map();
    return new Map(test.questions.map(q => [q.id, q]));
  }, [test]);
  const fetchAndSetData = async () => {
    setLoading(true);

    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*, questions(*)')
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على الاختبار.', variant: 'destructive' });
      navigate('/dashboard');
      return;
    }

    const questionSourceId = testData.original_test_id || testData.id;
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', questionSourceId);

    if (questionsError) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على أسئلة الاختبار.', variant: 'destructive' });
      setTest({ ...testData, questions: [] });
    } else {
      const sortedQuestions = (questionsData || []).sort((a, b) =>
        (a.id || '').localeCompare(b.id || '')
      );
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
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4',
        });
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
        toast({
          title: 'تم التصدير',
          description: 'تم إنشاء ملف PDF بنجاح.',
        });
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
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-2">
          {test.title}
        </h1>
        <p className="text-lg md:text-xl text-gray-300">
          مراقبة مباشرة لنتائج المشاركين
        </p>
      </motion.div>

      <div className="max-w-6xl mx-auto">
        <Card className="mb-6 bg-slate-800/30 border-slate-700">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
            <div>
              <CardTitle className="text-white">إدارة الجلسة</CardTitle>
              <CardDescription className="text-slate-400">
                المشاركون: {results.length}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-green-400 border-green-500 hover:bg-green-500/20"
                onClick={handleCopyLink}
              >
                <Copy className="w-4 h-4 ml-2" /> نسخ الرابط
              </Button>
              <Button
                variant="outline"
                className="text-blue-400 border-blue-500 hover:bg-blue-500/20"
                onClick={handleExportToPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  'جاري التصدير...'
                ) : (
                  <>
                    <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                  >
                    <RotateCw className="w-5 h-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع نتائج المشاركين في هذه الجلسة بشكل نهائي.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetSession}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      تأكيد
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
        </Card>
        <div id="results-container">
          {results.length === 0 ? (
            <Card className="text-center p-8 bg-slate-800/50 border-slate-700">
              <BarChart2 className="w-16 h-16 mx-auto text-slate-500 mb-4" />
              <CardTitle className="text-2xl text-white">في انتظار المشاركين...</CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                شارك رابط الاختبار أعلاه وانتظر وصول النتائج.
              </CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {results.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                  >
                    <Card className="bg-slate-800/50 border-slate-700 text-white">
                      <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-bold text-lg flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />{' '}
                            {result.session_participants?.name || 'مشارك غير معروف'}
                          </p>
                          <p className="text-sm text-slate-400 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />{' '}
                            {result.session_participants?.phone_number || 'غير متوفر'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-center">
                          <div>
                            <p className="font-bold text-xl text-green-400">
                              {result.score}/{result.total_questions}
                            </p>
                            <p className="text-xs text-slate-400">النتيجة</p>
                          </div>
                          <div>
                            <p className="font-bold text-xl text-blue-400">
                              {result.percentage}%
                            </p>
                            <p className="text-xs text-slate-400">متوسط النجاح</p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="text-yellow-400 border-yellow-500 hover:bg-yellow-500/20"
                              >
                                مراجعة
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  إجابات: {result.session_participants?.name}
                                </DialogTitle>
                                <DialogDescription>
                                  مراجعة تفصيلية لإجابات المشارك.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                {test.questions.map((q, i) => {
                                  const question = questionsMap.get(q.id);
                                  if (!question) return null;

                                  const userAnswers = result.answers[q.id] || [];
                                  const correct = isCorrect(userAnswers, question.correct_answers, question);

                                  const isCompound = question.question_type === 'compound';

                                  let parts = [];
                                  if (isCompound) {
                                    try {
                                      parts = Array.isArray(question.parts)
                                        ? question.parts
                                        : JSON.parse(question.parts || '[]');
                                    } catch {
                                      parts = [];
                                    }
                                  }

                                  return (
                                    <div
                                      key={q.id}
                                      className={`p-4 rounded-lg border-2 ${
                                        correct
                                          ? 'border-green-500/50 bg-green-500/10'
                                          : 'border-red-500/50 bg-red-500/10'
                                      }`}
                                    >
                                      <p className="font-semibold mb-2">
                                        {i + 1}. {question.question_text}
                                      </p>

                                      {isCompound && parts.length > 0 ? (
                                        <div className="space-y-4 mb-4">
                                          {parts.map((part, partIdx) => {
                                            const selected = userAnswers[partIdx];
                                            return (
                                              <div key={partIdx}>
                                                <p className="text-yellow-400 mb-1">
                                                  شطر {partIdx + 1}: {part.text}
                                                </p>
                                                {part.options.map((opt, oIndex) => {
                                                  const isCorrectAnswer = part.correct_answer === oIndex;
                                                  const isUserAnswer = selected === oIndex;
                                                  return (
                                                    <div
                                                      key={oIndex}
                                                      className={`flex items-center justify-end gap-3 p-2 rounded text-right ${
                                                        isUserAnswer && !isCorrectAnswer
                                                          ? 'bg-red-500/20'
                                                          : ''
                                                      } ${
                                                        isCorrectAnswer
                                                          ? 'bg-green-500/20'
                                                          : ''
                                                      }`}
                                                    >
                                                      <span
                                                        className={`${
                                                          isCorrectAnswer
                                                            ? 'text-green-300 font-semibold'
                                                            : ''
                                                        }`}
                                                      >
                                                        {opt}
                                                      </span>
                                                      {isCorrectAnswer ? (
                                                        <Check className="w-5 h-5 text-green-400" />
                                                      ) : (
                                                        <div className="w-5 h-5" />
                                                      )}
                                                      {isUserAnswer &&
                                                        !isCorrectAnswer && (
                                                          <X className="w-5 h-5 text-red-400" />
                                                        )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="space-y-2 mb-4">
                                          {question.options.map((opt, oIndex) => {
                                            const isUserAnswer = userAnswers.includes(oIndex);
                                            const isCorrectAnswer =
                                              question.correct_answers.includes(oIndex);
                                            return (
                                              <div
                                                key={oIndex}
                                                className={`flex items-center justify-end gap-3 p-2 rounded text-right ${
                                                  isUserAnswer && !isCorrectAnswer
                                                    ? 'bg-red-500/20'
                                                    : ''
                                                } ${
                                                  isCorrectAnswer
                                                    ? 'bg-green-500/20'
                                                    : ''
                                                }`}
                                              >
                                                <span
                                                  className={`${
                                                    isCorrectAnswer
                                                      ? 'text-green-300 font-semibold'
                                                      : ''
                                                  }`}
                                                >
                                                  {opt}
                                                </span>
                                                {isCorrectAnswer ? (
                                                  <Check className="w-5 h-5 text-green-400" />
                                                ) : (
                                                  <div className="w-5 h-5" />
                                                )}
                                                {isUserAnswer && !isCorrectAnswer && (
                                                  <X className="w-5 h-5 text-red-400" />
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {question.explanation && (
                                        <div className="mt-4 pt-4 border-t border-slate-600">
                                          <p className="font-bold text-yellow-300 flex items-center gap-2 mb-2">
                                            <Info size={16} /> شرح الإجابة:
                                          </p>
                                          <p className="text-slate-300 whitespace-pre-wrap">
                                            {question.explanation}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف نتيجة هذا المشارك؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteResult(result.id, result.participant_id)
                                  }
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionResults;
