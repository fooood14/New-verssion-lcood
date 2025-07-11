import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

import {
  BarChart2,
  Copy,
  FileDown,
  Play,
  RotateCw,
  ArrowRight,
} from 'lucide-react';

const SessionResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError || !testData) {
        toast({ title: 'خطأ', description: 'لم يتم العثور على الاختبار.', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      setTest(testData);

      const { data: resultsData, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', testId);

      if (resultsError) {
        toast({ title: 'خطأ', description: 'فشل جلب النتائج.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      setResults(resultsData || []);

      // جلب الأسئلة لعرض المراجعة
      const sourceId = testData.original_test_id || testData.id;
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, options, correct_answers, question_type, parts, explanation')
        .eq('test_id', sourceId);

      if (questionsError) {
        toast({ title: 'خطأ', description: 'فشل جلب الأسئلة.', variant: 'destructive' });
      } else {
        setQuestions(questionsData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [testId, navigate]);

  // دالة لمقارنة إجابات المشارك مع الصحيحة
  const isAnswerCorrect = (userAnswers, question) => {
    if (!question) return false;
    if (question.question_type === 'compound') {
      return question.parts.every((part, idx) => userAnswers?.[idx] === part.correct_answer);
    }
    if (!userAnswers) return false;
    if (userAnswers.length !== question.correct_answers.length) return false;
    return [...userAnswers].sort().every((val, idx) => val === [...question.correct_answers].sort()[idx]);
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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center mb-8">
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
        <p className="text-lg md:text-xl text-gray-300">مراقبة مباشرة لنتائج المشاركين</p>
      </motion.div>

      <div className="max-w-6xl mx-auto">
        {/* إدارة الجلسة والازرار */}
        <Card className="mb-6 bg-slate-800/30 border-slate-700">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
            <div>
              <CardTitle className="text-white">إدارة الجلسة</CardTitle>
              <CardDescription className="text-slate-400">المشاركون: {results.length}</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                className="text-green-400 border-green-500 hover:bg-green-500/20"
                onClick={() => {
                  const link = `${window.location.origin}/session/${testId}`;
                  navigator.clipboard.writeText(link);
                  toast({ title: 'تم النسخ!', description: 'تم نسخ رابط الجلسة إلى الحافظة.' });
                }}
              >
                <Copy className="w-4 h-4 ml-2" /> نسخ الرابط
              </Button>

              <Button
                variant="outline"
                className="text-blue-400 border-blue-500 hover:bg-blue-500/20"
                onClick={() => toast({ title: 'الميزة تحت التطوير', description: 'قريباً!' })}
              >
                <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
              </Button>

              <Button
                variant="outline"
                className="text-yellow-400 border-yellow-500 hover:bg-yellow-500/20"
                onClick={() => navigate(`/session/${testId}?viewOnly=true`)}
              >
                <Play className="w-4 h-4 ml-2" /> عرض الجلسة
              </Button>

              {/* زر مراجعة الأجوبة */}
              <Button
                variant="outline"
                className="text-purple-400 border-purple-500 hover:bg-purple-500/20"
                onClick={() => setReviewOpen(true)}
              >
                مراجعة الأجوبة مع الشرح
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* قائمة النتائج */}
        <div id="results-container">
          {results.length === 0 ? (
            <Card className="text-center p-8 bg-slate-800/50 border-slate-700">
              <BarChart2 className="w-16 h-16 mx-auto text-slate-500 mb-4" />
              <CardTitle className="text-2xl text-white">في انتظار المشاركين...</CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                شارك رابط الجلسة وانتظر ظهور النتائج هنا.
              </CardDescription>
            </Card>
          ) : (
            results.map((res) => (
              <Card key={res.id} className="mb-4 bg-slate-800/50 border-slate-700 p-4">
                <h3 className="text-white font-semibold mb-1">
                  اسم: {res.participant_name || 'مشارك مجهول'}
                </h3>
                <p className="text-slate-300 mb-1">هاتف: {res.participant_phone || '-'}</p>
                <p className="text-slate-300 mb-1">البريد: {res.participant_email || '-'}</p>
                <p className="text-white mb-1">
                  النتيجة: {res.score} / {res.total_questions} ({res.percentage}%)
                </p>
                <p className="text-slate-400 text-sm">الوقت المستغرق: {res.time_spent} ثانية</p>
                <p className="text-slate-400 text-sm">تاريخ التقديم: {new Date(res.submitted_at).toLocaleString()}</p>
              </Card>
            ))
          )}
        </div>

        {/* Dialog لمراجعة الأجوبة */}
        <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <AlertDialogContent className="max-w-3xl overflow-y-auto max-h-[80vh] bg-slate-900 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>مراجعة الأجوبة مع الشرح</AlertDialogTitle>
              <AlertDialogDescription>
                عرض مفصل لكل سؤال مع الإجابات الصحيحة والخاطئة والشرح.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="px-4 py-2">
              {results.length === 0 && <p>لا توجد نتائج لعرضها.</p>}

              {results.length > 0 && questions.length > 0 && results.map((res) => {
                const userAnswers = res.answers || {};

                return (
                  <div key={res.id} className="mb-8 border-b border-slate-700 pb-4">
                    <h3 className="text-lg font-semibold mb-2">مشارك: {res.participant_name || 'مشارك مجهول'}</h3>
                    {questions.map((q) => {
                      const userAns = userAnswers[q.id] || [];
                      const correct = isAnswerCorrect(userAns, q);

                      return (
                        <div
                          key={q.id}
                          className="mb-4 p-3 rounded-md border"
                          style={{ borderColor: correct ? 'green' : 'red' }}
                        >
                          <p className="font-semibold mb-1">السؤال: {q.question_text}</p>
                          <p className="mb-1">إجابات المشارك: {Array.isArray(userAns) ? userAns.join(', ') : userAns}</p>
                          <p className="mb-1 text-green-400">الإجابات الصحيحة: {q.correct_answers.join(', ')}</p>
                          {q.explanation && (
                            <p className="text-sm text-gray-300 mt-1">الشرح: {q.explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>إغلاق</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default SessionResults;
