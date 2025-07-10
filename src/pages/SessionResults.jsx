// ... باقي الاستيرادات كما هي ...
import {
  // ...
  FileDown,
  Play
} from 'lucide-react';
// ... باقي الاستيرادات كما هي ...

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

    const questionSourceId = testData.original_test_id || testData.id;
    const { data: questionsData } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', questionSourceId);

    const sortedQuestions = (questionsData || []).sort((a, b) =>
      (a.id || '').localeCompare(b.id || '')
    );
    setTest({ ...testData, questions: sortedQuestions });

    const { data: resultsData } = await supabase
      .from('test_results')
      .select('*, session_participants(name, phone_number)')
      .in('test_id', [testId])
      .order('submitted_at', { ascending: false });

    setResults(resultsData || []);

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
    await supabase.from('test_results').delete().eq('test_id', testId);
    await supabase.from('session_participants').delete().eq('session_id', testId);
    setResults([]);
    toast({ title: 'تم بنجاح', description: 'تم مسح جميع نتائج هذه الجلسة.' });
  };

  const handleExportToPDF = () => {
    if (isExporting) return;
    setIsExporting(true);
    const resultsContainer = document.getElementById('results-container');
    if (!resultsContainer) return;

    toast({ title: 'جاري التصدير...', description: 'قد تستغرق العملية بضع لحظات.' });

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
      .catch(() => {
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء تصدير النتائج.', variant: 'destructive' });
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
    setResults((prev) => prev.filter((r) => r.id !== resultId));
    toast({ title: 'تم الحذف', description: 'تم حذف نتيجة المشارك.' });
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
                {isExporting ? (
                  'جاري التصدير...'
                ) : (
                  <>
                    <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
                  </>
                )}
              </Button>
              <Button
                onClick={() => navigate(`/session/${testId}?viewOnly=true`)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Play className="w-4 h-4 ml-2" />
                عرض الجلسة
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
                    <AlertDialogDescription>سيتم حذف جميع نتائج المشاركين في هذه الجلسة بشكل نهائي.</AlertDialogDescription>
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

        {/* النتائج (تبقى كما هي) */}
        <div id="results-container">
          {/* ... باقي الكود الخاص بالنتائج والمراجعة ... */}
        </div>
      </div>
    </div>
  );
};

export default SessionResults;
