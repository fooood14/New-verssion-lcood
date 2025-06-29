import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
// ... بقية الاستيرادات

const PermanentExamsPage = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showDashboardLogin, setShowDashboardLogin] = useState(false);
    const [pin, setPin] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const getUserAndExams = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!isMounted) return;

            if (user) {
                setUser(user);
                await fetchPermanentExams();
            } else {
                navigate('/login');
            }
            setLoading(false);
        };
        getUserAndExams();

        return () => { isMounted = false; }
    }, [navigate]);

    const fetchPermanentExams = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tests')
                .select('*, questions(id)')
                .eq('is_permanent', true)
                .order('created_at', { ascending: false });

            if (error) {
                toast({ title: 'خطأ في تحميل الاختبارات', description: error.message, variant: 'destructive' });
                setLoading(false);
                return;
            }

            const examsWithParticipants = await Promise.all((data || []).map(async (exam) => {
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
        } catch (error) {
            toast({ title: 'خطأ غير متوقع', description: 'حدث خطأ أثناء تحميل الاختبارات', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // ... بقية الكود كما هو (دون تغيير)

    return (
        <div className="min-h-screen p-6">
            {loading ? (
                <div className="text-center text-white mt-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-lg">جاري تحميل الاختبارات...</p>
                </div>
            ) : (
                // بقية JSX لعرض الاختبارات أو الرسائل
                // ... كما في كودك الحالي
                <>
                {/* Your UI here */}
                </>
            )}
        </div>
    );
};

export default PermanentExamsPage;
