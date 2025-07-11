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
  BarChart2,
  Copy,
  FileDown,
  RotateCw,
  Play
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const SessionResults = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: testData, error } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (error || !testData) {
        toast({ title: 'خطأ', description: 'لم يتم العثور على الاختبار.', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      setTest(testData);

      const { data: resultsData } = await supabase
        .from('test_results')
        .select('id')
        .eq('test_id', testId);

      setResults(resultsData || []);
      setLoading(false);
    };

    fetchData();
  }, [testId, navigate]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/exam-session/${testId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'تم النسخ!', description: 'تم نسخ رابط الاختبار كامل إلى الحافظة.' });
  };

  const handleExportToPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const container = document.getElementById('results-container');
    if (!container) return;

    toast({ title: 'جاري التصدير', description: 'يرجى الانتظار...' });

    const canvas = await html2canvas(container, { backgroundColor: '#0f172a', scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`نتائج-${test.title}.pdf`);
    setIsExporting(false);
    toast({ title: 'تم الحفظ', description: 'تم حفظ الملف بنجاح.' });
  };

  const handleResetSession = async () => {
    const { error: error1 } = await supabase.from('test_results').delete().eq('test_id', testId);
    const { error: error2 } = await supabase.from('session_participants').delete().eq('session_id', testId);
    if (error1 || error2) {
      toast({ title: 'خطأ', description: 'فشل في إعادة التعيين.', variant: 'destructive' });
    } else {
      setResults([]);
      toast({ title: 'تم', description: 'تمت إعادة تعيين الجلسة.' });
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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative text-center mb-8">
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="absolute top-0 right-0 text-slate-300 border-slate-600 hover:bg-slate-700">
          <ArrowRight className="w-4 h-4 ml-2" /> العودة
        </Button>
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-2">
          {test.title}
        </h1>
        <p className="text-lg md:text-xl text-gray-300">مراقبة مباشرة لنتائج المشاركين</p>
      </motion.div>

      <div className="max-w-6xl mx-auto">
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
                <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
              </Button>
              <Button
                variant="outline"
                className="text-yellow-400 border-yellow-500 hover:bg-yellow-500/20"
                onClick={() => navigate(`/exam-session/${testId}?viewOnly=true`)}
              >
                <Play className="w-4 h-4 ml-2" /> عرض الجلسة
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
                    <AlertDialogDescription>سيتم حذف جميع النتائج.</AlertDialogDescription>
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
                شارك رابط الجلسة وانتظر ظهور النتائج هنا.
              </CardDescription>
            </Card>
          ) : (
            <p className="text-white text-center mt-8">تم استقبال {results.length} نتيجة.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionResults;
