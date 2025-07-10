import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  ArrowRight, Check, X, BarChart2, User, Phone, Info, RotateCw,
  Trash2, Copy, FileDown
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

    const sourceId = testData.original_test_id || testData.id;
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', sourceId);

    const sortedQuestions = (questionsData || []).sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    setTest({ ...testData, questions: sortedQuestions });

    const { data: resultsData } = await supabase
      .from('test_results')
      .select('*, session_participants(name, phone_number)')
      .eq('test_id', testId)
      .order('submitted_at', { ascending: false });

    setResults(resultsData || []);

    // الاشتراك للتحديثات الحية
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
    if (!resultsContainer) return;
    html2canvas(resultsContainer, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
    }).then((canvas) => {
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
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/session/${testId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'تم النسخ!', description: 'تم نسخ رابط الجلسة إلى الحافظة.' });
  };

  const handleDeleteResult = async (resultId, participantId) => {
    await supabase.from('test_results').delete().eq('id', resultId);
    await supabase.from('session_participants').delete().eq('id', participantId);
    setResults(prev => prev.filter(r => r.id !== resultId));
    toast({ title: 'تم الحذف', description: 'تم حذف النتيجة بنجاح.' });
  };

  if (loading || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin h-10 w-10 border-b-2 border-yellow-400 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pt-12 md:pt-24">
      {/* العنوان والرابط */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="absolute top-4 right-4">
          <ArrowRight className="w-4 h-4 ml-2" /> العودة
        </Button>
        <h1 className="text-3xl font-bold text-white mb-2">{test.title}</h1>
        <p className="text-gray-300">نتائج المشاركين</p>
      </motion.div>

      <div className="max-w-6xl mx-auto">
        {/* أدوات التحكم */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={handleCopyLink} variant="outline" className="text-green-400 border-green-500">
            <Copy className="w-4 h-4 ml-2" /> نسخ رابط الجلسة
          </Button>
          <Button onClick={handleExportToPDF} variant="outline" disabled={isExporting}>
            {isExporting ? 'جارٍ التصدير...' : <><FileDown className="w-4 h-4 ml-2" /> تصدير PDF</>}
          </Button>
        </div>

        {/* النتائج */}
        <div id="results-container">
          {results.length === 0 ? (
            <Card className="p-6 text-center text-white">لا يوجد مشاركون بعد.</Card>
          ) : (
            results.map((result, idx) => {
              const score = result.score;
              const total = result.total_questions;
              const percentage = result.percentage;
              const participant = result.session_participants;

              return (
                <Card key={result.id} className="mb-4 text-white bg-slate-800/60 border border-slate-600">
                  <CardContent className="flex justify-between items-center p-4 flex-wrap gap-4">
                    <div>
                      <p className="font-bold text-lg flex items-center gap-2">
                        <User className="w-4 h-4" /> {participant?.name || 'بدون اسم'}
                      </p>
                      <p className="text-sm text-slate-400 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> {participant?.phone_number || '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 font-bold text-xl">{score}/{total}</p>
                      <p className="text-sm text-slate-400">النتيجة</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 font-bold text-xl">{percentage}%</p>
                      <p className="text-sm text-slate-400">النسبة</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل تريد حذف نتيجة هذا المشارك؟ لا يمكن التراجع.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteResult(result.id, result.participant_id)} className="bg-red-600 hover:bg-red-700">
                            تأكيد
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionResults;
