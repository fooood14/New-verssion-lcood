import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ExamVideos = () => {
  const { sessionId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);

  // ✅ جلب بيانات الجلسة والأسئلة
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('original_test_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('❌ جلسة غير صالحة:', sessionError?.message);
        setLoading(false);
        return;
      }

      const testId = sessionData.original_test_id;

      const { data: questionsData, error: questionError } = await supabase
        .from('questions')
        .select('id, question_text, video_url, time_limit_seconds')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });

      if (questionError || !questionsData || questionsData.length === 0) {
        console.warn('⚠️ لم يتم العثور على أسئلة.');
      } else {
        setQuestions(questionsData);
      }

      setLoading(false);
      setCurrentVideoIndex(0);
    };

    fetchData();
  }, [sessionId]);

  // ✅ إدارة الفيديو والمؤقت
  useEffect(() => {
    if (!questions.length) return;

    const currentQuestion = questions[currentVideoIndex];
    const video = videoRef.current;
    const customLimit = currentQuestion?.time_limit_seconds || 15;

    const startCountdown = (limit) => {
      setDuration(limit);
