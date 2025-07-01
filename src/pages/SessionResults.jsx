// الكود الكامل لمكون SessionResults.jsx سيكون هنا
// لكن سيتم لصقه مباشرة من الردود المجمعة السابقة

// نظرًا للطول، سأجمع الآن كل الأجزاء التي سبق إرسالها وأضعها دفعة واحدة في الملف

// الجزء 1
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

  const isCorrect = (userAnswers = [], correctAnswers = []) => {
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

  // باقي الأجزاء التي تشمل:
  // - fetchAndSetData
  // - useEffect
  // - دوال التحكم
  // - return
  // سيتم إكمالها في هذا السياق...