import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, RotateCcw, Info, Check, X as IconX, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const PublicExamPlayer = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const videoRef = useRef(null);

  const isCorrect = (userAnswers = [], correctAnswers = []) => {
    if (!Array.isArray(userAnswers) || !Array.isArray(correctAnswers)) return false;
    if (userAnswers.length !== correctAnswers.length) return false;
    const sortedUserAnswers = [...userAnswers].sort();
    const sortedCorrectAnswers = [...correctAnswers].sort();
    return sortedUserAnswers.every((val, index) => val === sortedCorrectAnswers[index]);
  };
  
  const nextQuestion = () => {
    if (exam && currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  useEffect(() => {
    const fetchExamDetails = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select(`*, questions(*)`)
        .eq('id', examId)
        .eq('is_permanent', true)
        .single();

      if (error || !data) {
        toast({ title: "خطأ", description: "الاختبار غير موجود.", variant: "destructive" });
        navigate('/');
        return;
      }
      const formattedExam = {
        id: data.id,
        title: data.title,
        duration: data.duration,
        questions: (data.questions || []).map(q => ({
          id: q.id,
          question: q.question_text,
          options: q.options,
          correct_answers: q.correct_answers,
          question_type: q.question_type,
          video_url: q.video_url,
          explanation: q.explanation,
          explanation_video_url: q.explanation_video_url,
          time_limit_seconds: q.time_limit_seconds
        })).sort((a,b) => (a.id || '').localeCompare(b.id || ''))
      };
      setExam(formattedExam);
      setLoading(false);
    };
    fetchExamDetails();
  }, [examId, navigate]);

  useEffect(() => {
    if (exam && exam.questions.length > 0) {
        const currentQuestion = exam.questions[currentQuestionIndex];
        if (currentQuestion && currentQuestion.time_limit_seconds) {
            setQuestionTimeLeft(currentQuestion.time_limit_seconds);
        } else {
            setQuestionTimeLeft(null);
        }
        if (videoRef.current) {
            videoRef.current.src = (currentQuestion.video_url?.replace("watch?v=", "embed/") || '') + '?autoplay=1';
        }
    }
  }, [currentQuestionIndex, exam]);

  useEffect(() => {
    if (questionTimeLeft === null || isFinished) return;

    if (questionTimeLeft <= 0) {
        nextQuestion();
        return;
    }

    const timer = setInterval(() => {
        setQuestionTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [questionTimeLeft, isFinished]);

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handleSubmit = () => {
      if (!exam) return;
      const finalScore = exam.questions.reduce((total, question) => {
        const userAnswersForQuestion = answers[question.id] || [];
        return total + (isCorrect(userAnswersForQuestion, question.correct_answers) ? 1 : 0);
    }, 0);
    setScore(finalScore);
    setIsFinished(true);
  };
  
  const handleAnswerSelect = (questionId, answerIndex) => {
    const question = exam.questions.find(q => q.id === questionId);
    setAnswers(prev => {
      const newAnswers = { ...prev };
      if (question.question_type === 'single') {
        newAnswers[questionId] = [answerIndex];
      } else {
        const currentAnswers = newAnswers[questionId] || [];
        const answerPos = currentAnswers.indexOf(answerIndex);
        if (answerPos === -1) newAnswers[questionId] = [...currentAnswers, answerIndex];
        else newAnswers[questionId] = currentAnswers.filter(i => i !== answerIndex);
      }
      return newAnswers;
    });
  };

  const clearAnswer = (questionId) => {
    setAnswers(prev => {
        const newAnswers = {...prev};
        delete newAnswers[questionId];
        return newAnswers;
    });
  };

  const prevQuestion = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1) };
  
  if (loading || !exam) return <div className="min-h-screen flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div></div>;

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswers = currentQuestion ? answers[currentQuestion.id] || [] : [];
  
  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
        {isFinished ? (
            <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
              <Card className="p-8 bg-slate-800/80 border-slate-700 text-center mb-8">
                  <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold text-white mb-4">لقد أكملت الاختبار بنجاح!</h2>
                  <p className="text-xl text-gray-300 mb-4">نتيجتك هي: <span className="font-bold text-yellow-400">{score}/{exam.questions.length}</span></p>
                  <p className="text-lg text-gray-400 mb-8">متوسط النجاح: <span className="font-bold text-blue-400">{Math.round((score / exam.questions.length) * 100)}%</span></p>
              </Card>
              <div className="mt-8">
                  <h3 className="text-2xl font-bold text-white text-center mb-4">مراجعة الإجابات</h3>
                  <div className="space-y-4">
                      {exam.questions.map((q, i) => {
                          const userAnswers = answers[q.id] || [];
                          const correct = isCorrect(userAnswers, q.correct_answers);
                          return (
                              <div key={q.id} className={`p-4 rounded-lg border-2 ${correct ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                                  <p className="font-semibold mb-2 text-white">{i + 1}. {q.question}</p>
                                  <div className="space-y-2 mb-4">
                                      {q.options.map((opt, oIndex) => {
                                          const isUserAnswer = userAnswers.includes(oIndex);
                                          const isCorrectAnswer = q.correct_answers.includes(oIndex);
                                          return (
                                              <div key={oIndex} className={`flex items-center justify-end gap-3 p-2 rounded text-right text-white ${isUserAnswer && !isCorrectAnswer ? 'bg-red-500/20' : ''} ${isCorrectAnswer ? 'bg-green-500/20' : ''}`}>
                                                  <span>{opt}</span>
                                                  {isCorrectAnswer ? <Check className="w-5 h-5 text-green-400" /> : <div className="w-5 h-5" />}
                                                  {isUserAnswer && !isCorrectAnswer && <IconX className="w-5 h-5 text-red-400" />}
                                              </div>
                                          );
                                      })}
                                  </div>
                                  {q.explanation && (
                                      <div className="mt-4 pt-4 border-t border-slate-600">
                                          <p className="font-bold text-yellow-300 flex items-center gap-2 mb-2"><Info size={16}/>شرح الإجابة:</p>
                                          <p className="text-slate-300 whitespace-pre-wrap">{q.explanation}</p>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
              <div className="text-center mt-8">
                  <Button onClick={() => navigate('/')}>العودة لقائمة الاختبارات</Button>
              </div>
          </motion.div>
        ) : (
            <motion.div key="exam" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-4xl">
                 <h2 className="text-2xl font-bold text-white text-center mb-6">{exam.title}</h2>
                 {currentQuestion.video_url && (
                    <div className="mb-6 rounded-lg overflow-hidden aspect-video bg-black border border-slate-700">
                        <iframe ref={videoRef} width="100%" height="100%" src={currentQuestion.video_url.replace("watch?v=", "embed/") + '?autoplay=1'} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                 )}
                 <Card className="p-8 bg-slate-800/80 border-slate-700 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-semibold text-white text-right flex-1">{currentQuestionIndex+1}. {currentQuestion.question}</h3>
                        <div className="flex flex-col items-center gap-2">
                            {questionTimeLeft !== null && (
                                <div className="flex items-center gap-2 text-orange-400 font-mono text-lg">
                                    <Clock className="w-5 h-5"/>
                                    <span>{formatTime(questionTimeLeft)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4">{currentQuestion.options.map((option, index) => (<motion.div key={index} whileHover={{ scale: 1.02 }}><button onClick={() => handleAnswerSelect(currentQuestion.id, index)} className={`w-full p-4 text-right rounded-lg border-2 ${ currentAnswers.includes(index) ? 'border-yellow-500 bg-yellow-500/20' : 'border-slate-600 bg-slate-700/50 hover:border-slate-500' }`}><span className="text-lg text-white">{option}</span></button></motion.div>))}</div>
                 </Card>
                 <div className="flex justify-between items-center">
                    <Button onClick={prevQuestion} disabled={currentQuestionIndex === 0} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"><ArrowRight className="w-4 h-4 ml-2" /> السابق</Button>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => clearAnswer(currentQuestion.id)} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300" disabled={currentAnswers.length === 0}>
                            <RotateCcw className="w-4 h-4 ml-2" />
                            إلغاء
                        </Button>
                        {currentQuestionIndex === exam.questions.length - 1 ? (
                            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">إنهاء الاختبار <CheckCircle className="w-4 h-4 mr-2" /></Button>
                        ) : (
                            <Button onClick={nextQuestion}>التالي <ArrowLeft className="w-4 h-4 mr-2" /></Button>
                        )}
                    </div>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
    </div>
  );
};

export default PublicExamPlayer;