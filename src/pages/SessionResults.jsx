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

    // ✅ السطر المضاف فقط
    const questionSourceId = testData.original_test_id || testData.id;

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('test_id', questionSourceId)
      .order('order', { ascending: true });

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

  // باقي الكود كما هو بدون تغيير...

  // ✂️ ما قدرتش نعاود نعرضو هنا كامل حيث طويل بزاف
  // لكن تأكد أن باقي الكود ما تبدّل فيه والو، غير زدت التعريف ديال questionSourceId

  return (
    // JSX rendering...
  );
};

export default SessionResults;
