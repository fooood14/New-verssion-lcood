import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


const ExamForm = ({ onExamCreated, onCancel, userId }) => {
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [questions, setQuestions] = useState([{
    id: crypto.randomUUID(),
    question: '',
    options: ['', ''],
    correct_answers: [],
    question_type: 'single'
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      question: '',
      options: ['', ''],
      correct_answers: [],
      question_type: 'single'
    }]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    } else {
      toast({ title: "تنبيه", description: "يجب أن يحتوي الاختبار على سؤال واحد على الأقل." });
    }
  };

  const updateQuestionField = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    if(field === 'question_type') {
      updated[index].correct_answers = [];
    }
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    if (updated[qIndex].options.length > 2) {
      updated[qIndex].options.splice(oIndex, 1);
      // Also remove from correct answers if it was selected
      updated[qIndex].correct_answers = updated[qIndex].correct_answers.filter(i => i !== oIndex);
      setQuestions(updated);
    } else {
      toast({ title: "تنبيه", description: "يجب أن يحتوي السؤال على خيارين على الأقل." });
    }
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIndex, oIndex) => {
    const updated = [...questions];
    const question = updated[qIndex];
    if (question.question_type === 'single') {
      question.correct_answers = [oIndex];
    } else {
      const currentIndex = question.correct_answers.indexOf(oIndex);
      if (currentIndex === -1) {
        question.correct_answers.push(oIndex);
      } else {
        question.correct_answers.splice(currentIndex, 1);
      }
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!userId) {
        toast({ title: "خطأ في المصادقة", description: "المستخدم غير مسجل الدخول.", variant: "destructive" });
        setIsSubmitting(false); return;
    }
    if (!examTitle.trim()) {
        toast({ title: "بيانات غير مكتملة", description: "يرجى إدخال عنوان للاختبار.", variant: "destructive" });
        setIsSubmitting(false); return;
    }

    for (const q of questions) {
        if (!q.question.trim()) {
            toast({ title: "بيانات غير مكتملة", description: `يرجى إدخال نص للسؤال رقم ${questions.indexOf(q) + 1}.`, variant: "destructive" });
            setIsSubmitting(false); return;
        }
        if (q.options.some(opt => !opt.trim())) {
            toast({ title: "بيانات غير مكتملة", description: `يرجى تعبئة جميع الخيارات للسؤال رقم ${questions.indexOf(q) + 1}.`, variant: "destructive" });
            setIsSubmitting(false); return;
        }
        if (q.correct_answers.length === 0) {
            toast({ title: "بيانات غير مكتملة", description: `يرجى تحديد إجابة صحيحة واحدة على الأقل للسؤال رقم ${questions.indexOf(q) + 1}.`, variant: "destructive" });
            setIsSubmitting(false); return;
        }
    }

    const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([{ title: examTitle, duration: examDuration, user_id: userId, is_permanent: false }])
        .select().single();

    if (testError) {
        toast({ title: "خطأ في إنشاء الاختبار", description: testError.message, variant: "destructive" });
        setIsSubmitting(false); return;
    }
    const questionsToInsert = questions.map((q, index) => ({
  test_id: testData.id,
  question_text: q.question,
  options: q.options,
  correct_answers: q.correct_answers,
  question_type: q.question_type,
  order: index // 👈 هذا هو الترتيب حسب ما دار المستخدم
}));

    const { error: questionsError } = await supabase.from('questions').insert(questionsToInsert);

    if (questionsError) {
        await supabase.from('tests').delete().eq('id', testData.id);
        toast({ title: "خطأ في إنشاء الأسئلة", description: questionsError.message, variant: "destructive" });
        setIsSubmitting(false); return;
    }

    toast({ title: "تم إنشاء الاختبار بنجاح! 🎉" });
    onExamCreated();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700"
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">إنشاء اختبار جلسة</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="text-white mb-2 block">عنوان الاختبار</Label>
              <Input id="title" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="أدخل عنوان الاختبار" className="bg-slate-700 border-slate-600 text-white" disabled={isSubmitting} />
            </div>
            <div>
              <Label htmlFor="duration" className="text-white mb-2 block">مدة الاختبار (بالدقائق)</Label>
              <Input id="duration" type="number" value={examDuration} onChange={(e) => setExamDuration(parseInt(e.target.value) || 1)} className="bg-slate-700 border-slate-600 text-white" min="1" disabled={isSubmitting} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-white text-lg">الأسئلة</Label>
              <Button onClick={addQuestion} variant="outline" className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20" disabled={isSubmitting}><Plus className="w-4 h-4 ml-2" /> إضافة سؤال</Button>
            </div>
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-white">السؤال {qIndex + 1}</Label>
                    <div className="flex items-center gap-2">
                      <Tabs defaultValue="single" value={q.question_type} onValueChange={(val) => updateQuestionField(qIndex, 'question_type', val)} className="w-[200px]">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                            <TabsTrigger value="single" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">إجابة واحدة</TabsTrigger>
                            <TabsTrigger value="multiple" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">إجابات متعددة</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      {questions.length > 1 && (<Button onClick={() => removeQuestion(qIndex)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300" disabled={isSubmitting}><Trash2 className="w-4 h-4" /></Button>)}
                    </div>
                  </div>
                  <Input value={q.question} onChange={(e) => updateQuestionField(qIndex, 'question', e.target.value)} placeholder="أدخل نص السؤال" className="bg-slate-600 border-slate-500 text-white mb-4" disabled={isSubmitting} />
                  <div className="space-y-3 mb-4">
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        {q.question_type === 'single' ? (
                            <input type="radio" id={`q${qIndex}-opt${oIndex}`} name={`correct-${qIndex}`} checked={q.correct_answers[0] === oIndex} onChange={() => handleCorrectAnswerChange(qIndex, oIndex)} className="form-radio h-5 w-5 text-yellow-500 bg-slate-600 border-slate-500 focus:ring-yellow-400 cursor-pointer" disabled={isSubmitting}/>
                        ) : (
                            <Checkbox id={`q${qIndex}-opt${oIndex}`} checked={q.correct_answers.includes(oIndex)} onCheckedChange={() => handleCorrectAnswerChange(qIndex, oIndex)} className="h-5 w-5 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-600" disabled={isSubmitting} />
                        )}
                        <Input value={opt} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} placeholder={`الخيار ${oIndex + 1}`} className="bg-slate-600 border-slate-500 text-white" disabled={isSubmitting} />
                        <Button onClick={() => removeOption(qIndex, oIndex)} variant="ghost" size="icon" className="text-red-500 hover:text-red-400 w-8 h-8" disabled={q.options.length <= 2 || isSubmitting}><X className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => addOption(qIndex)} variant="outline" size="sm" className="text-green-400 border-green-500 hover:bg-green-500/20" disabled={isSubmitting}><Plus className="w-4 h-4 ml-2" /> إضافة خيار</Button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 disabled:opacity-70">{isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الاختبار'}</Button>
          <Button onClick={onCancel} variant="outline" disabled={isSubmitting} className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-70">إلغاء</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ExamForm;
