import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, BookOpen, Clock, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from 'lucide-react';
import Logo from '@/components/Logo';

const PermanentExamsPage = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showDashboardLogin, setShowDashboardLogin] = useState(false);
    const [pin, setPin] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const getUserAndExams = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                fetchPermanentExams();
            } else {
                navigate('/login');
            }
        };
        getUserAndExams();
    }, [navigate]);

    const fetchPermanentExams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tests')
                .select('*, questions(id)')
                .eq('is_permanent', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching exams:', error);
                toast({ 
                    title: 'خطأ في تحميل الاختبارات', 
                    description: error.message, 
                    variant: 'destructive' 
                });
            } else {
                // Get participants count for each permanent exam
                const examsWithParticipants = await Promise.all((data || []).map(async (exam) => {
                    // For permanent tests, count participants from all sessions created from this test
                    const { data: sessionTests } = await supabase
                        .from('tests')
                        .select('id')
                        .eq('original_test_id', exam.id);
                    
                    let participantsCount = 0;
                    if (sessionTests && sessionTests.length > 0) {
                        const sessionIds = sessionTests.map(t => t.id);
                        const { data: results } = await supabase
                            .from('test_results')
                            .select('participant_id')
                            .in('test_id', sessionIds);
                        
                        participantsCount = results ? new Set(results.map(r => r.participant_id)).size : 0;
                    }
                    
                    return { ...exam, participantsCount };
                }));
                
                setExams(examsWithParticipants);
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            toast({ 
                title: 'خطأ غير متوقع', 
                description: 'حدث خطأ أثناء تحميل الاختبارات', 
                variant: 'destructive' 
            });
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
            sessionStorage.clear();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            toast({ 
                title: 'خطأ في تسجيل الخروج', 
                description: 'حدث خطأ أثناء تسجيل الخروج', 
                variant: 'destructive' 
            });
        }
    };

    const handleDashboardAccess = () => {
        setShowDashboardLogin(true);
        setPin('');
    };

    const handleDashboardLogin = () => {
        if (pin === 'lcood2285') {
            sessionStorage.setItem('isAdminAccess', 'true');
            toast({ 
                title: "تم التحقق بنجاح", 
                description: "مرحباً بك في لوحة التحكم!" 
            });
            navigate('/dashboard');
            setShowDashboardLogin(false);
        } else {
            toast({ 
                title: "خطأ في التحقق", 
                description: "الرمز السري غير صحيح.", 
                variant: "destructive" 
            });
        }
        setPin('');
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleDashboardLogin();
        }
    };

    const handleExamClick = (examId) => {
        navigate(`/exam/${examId}`);
    };

    return (
        <div className="min-h-screen p-6">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">الاختبارات المتاحة</h1>
                    <p className="text-slate-400">مرحباً بك، {user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleDashboardAccess} 
                        className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-blue-400"
                    >
                        <Settings className="w-4 h-4 ml-2" />
                        لوحة التحكم
                    </Button>
                    <Button 
                        onClick={handleSignOut} 
                        variant="outline" 
                        className="text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-red-400"
                    >
                        <LogOut className="w-4 h-4 ml-2" />
                        تسجيل الخروج
                    </Button>
                </div>
            </header>
            
            <div className="text-center mb-12">
                <Logo />
            </div>

            <motion.main 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-white mb-2">اختر الاختبار الذي تريد المشاركة فيه</h2>
                    <p className="text-slate-400">جميع الاختبارات متاحة للمشاركة المباشرة</p>
                </div>
                
                {loading ? (
                    <div className="text-center text-white mt-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                        <p className="text-lg">جاري تحميل الاختبارات...</p>
                    </div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-16 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <h3 className="text-xl font-semibold text-white mb-2">لا توجد اختبارات متاحة حالياً</h3>
                        <p className="text-slate-400">سيتم إضافة اختبارات جديدة قريباً.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {exams.map((exam, index) => (
                            <motion.div
                                key={exam.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="cursor-pointer"
                                onClick={() => handleExamClick(exam.id)}
                            >
                                <Card className="h-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 text-white hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-xl">
                                    {exam.image_url && (
                                        <div className="p-4 pb-0">
                                            <div className="rounded-lg overflow-hidden">
                                                <img 
                                                    src={exam.image_url} 
                                                    alt={exam.title}
                                                    className="w-full h-32 object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg font-bold text-center mb-2 text-blue-300">
                                            {exam.title}
                                        </CardTitle>
                                        {exam.description && (
                                            <p className="text-sm text-slate-400 text-center line-clamp-2">
                                                {exam.description}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <BookOpen className="w-4 h-4" />
                                                    <span>{exam.questions?.length || 0} سؤال</span>
                                                </div>
                                                {exam.duration && (
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{exam.duration} دقيقة</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="pt-3 border-t border-slate-700">
                                                <Button 
                                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transition-all duration-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExamClick(exam.id);
                                                    }}
                                                >
                                                    <Play className="w-4 h-4 ml-2" />
                                                    بدء الاختبار
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.main>

            <AlertDialog open={showDashboardLogin} onOpenChange={setShowDashboardLogin}>
                <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-center justify-center">
                            <ShieldCheck className="text-blue-400" />
                            <span>دخول لوحة التحكم</span>
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            الرجاء إدخال الرمز السري للوصول إلى لوحة التحكم الخاصة بك.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="pin" className="text-right sr-only">الرمز السري</Label>
                        <Input 
                            id="pin" 
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="ادخل الرمز السري هنا"
                            className="bg-slate-800 border-slate-600 text-white text-center tracking-widest text-lg"
                            autoFocus
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel 
                            className="bg-transparent hover:bg-slate-700"
                            onClick={() => setPin('')}
                        >
                            إلغاء
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDashboardLogin} 
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            دخول
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PermanentExamsPage;
