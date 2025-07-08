// ... جميع import كما في كودك السابق

const Dashboard = () => {
  const [exams, setExams] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalTests: 0, totalParticipants: 0, averageScore: 0 });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserAndExams = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchExams(user.id);
      } else {
        navigate('/login');
      }
    };
    getUserAndExams();
  }, [navigate]);

  const fetchExams = async (userId) => {
    setLoading(true);
    const { data: userTests } = await supabase
      .from('tests')
      .select('*, questions(id)')
      .eq('user_id', userId)
      .neq('is_permanent', true);

    const { data: permanentTests } = await supabase
      .from('tests')
      .select('*, questions(id)')
      .eq('is_permanent', true);

    const allExams = [...(userTests || []), ...(permanentTests || [])];
    const uniqueExams = Array.from(new Map(allExams.map(exam => [exam.id, exam])).values());

    const examsWithParticipants = await Promise.all(uniqueExams.map(async (exam) => {
      let participantsCount = 0;

      if (exam.is_permanent) {
        const { data: sessionTests } = await supabase
          .from('tests')
          .select('id')
          .eq('original_test_id', exam.id);

        const sessionIds = sessionTests?.map(t => t.id) || [];
        const { data: results } = await supabase
          .from('test_results')
          .select('participant_id')
          .in('test_id', sessionIds);

        participantsCount = results ? new Set(results.map(r => r.participant_id)).size : 0;
      } else {
        const { data: results } = await supabase
          .from('test_results')
          .select('participant_id')
          .eq('test_id', exam.id);

        participantsCount = results ? new Set(results.map(r => r.participant_id)).size : 0;
      }

      return { ...exam, participantsCount };
    }));

    const sortedExams = examsWithParticipants.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setExams(sortedExams);
    await calculateStats(sortedExams, userId);
    setLoading(false);
  };

  const calculateStats = async (allExams, userId) => {
    const userExamIds = allExams.filter(e => e.user_id === userId && !e.is_permanent).map(e => e.id);
    const permanentTestIds = allExams.filter(e => e.is_permanent).map(e => e.id);

    let allSessionTestIds = [];
    if (permanentTestIds.length > 0) {
      const { data: sessionTests } = await supabase.from('tests')
        .select('id')
        .in('original_test_id', permanentTestIds)
        .eq('user_id', userId);
      allSessionTestIds = sessionTests?.map(t => t.id) || [];
    }

    const relevantTestIds = [...new Set([...userExamIds, ...allSessionTestIds])];

    const { data: results } = await supabase
      .from('test_results')
      .select('percentage, participant_id')
      .in('test_id', relevantTestIds);

    const totalParticipants = results ? new Set(results.map(r => r.participant_id)).size : 0;
    const totalScore = results?.reduce((acc, r) => acc + r.percentage, 0) || 0;
    const averageScore = results?.length ? Math.round(totalScore / results.length) : 0;

    setStats({ totalTests: allExams.length, totalParticipants, averageScore });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('isAdminAccess');
    navigate('/login');
  };

  const handleAdminAccess = () => setShowAdminLogin(true);

  const handleExamCreated = () => {
    setShowCreateDialog(false);
    if (user) fetchExams(user.id);
  };

  const handleDelete = async (examId) => {
    const { error } = await supabase.from('tests').delete().eq('id', examId);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف الاختبار بنجاح.' });
      fetchExams(user.id);
    }
  };

  // إنشاء جلسة فقط (دون التوجيه)
  const handleCreateSession = async (exam, withVideo = false) => {
    if (!user) return;

    if (exam.is_permanent) {
      const { data: session, error } = await supabase
        .from('tests')
        .insert({
          title: `${exam.title} - جلسة مباشرة`,
          duration: exam.duration,
          user_id: user.id,
          is_permanent: false,
          original_test_id: exam.id,
          with_video: withVideo
        })
        .select()
        .single();

      if (error) {
        toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        return;
      }

      // نسخ الأسئلة
      const { data: originalQuestions, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', exam.id);

      if (fetchError) {
        toast({ title: 'فشل تحميل الأسئلة', description: fetchError.message, variant: 'destructive' });
        return;
      }

      const clonedQuestions = originalQuestions.map(q => {
        const { id, ...rest } = q;
        return { ...rest, test_id: session.id };
      });

      const { error: insertError } = await supabase
        .from('questions')
        .insert(clonedQuestions);

      if (insertError) {
        toast({ title: 'فشل نسخ الأسئلة', description: insertError.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'تم إنشاء الجلسة', description: 'تمت إضافة الجلسة إلى قائمة الاختبارات.' });
      fetchExams(user.id);
    }
  };

  const handleViewLiveSession = (exam) => {
    navigate(`/live-session/${exam.id}`, { state: { exam } });
  };

  const handleViewResults = (examId) => {
    navigate(`/results/${examId}`);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ... بقية JSX بدون تعديل كبير ... */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((exam, index) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            index={index}
            isOwner={exam.user_id === user?.id}
            onDelete={handleDelete}
            onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/session/${exam.id}`)}
            onViewResults={handleViewResults}
            onStartSession={handleCreateSession}
            onViewLiveSession={handleViewLiveSession}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
