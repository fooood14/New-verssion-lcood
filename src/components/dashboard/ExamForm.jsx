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
  const [questions, setQuestions] = useState([createNewQuestion()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function createNewQuestion() {
    return {
      id: crypto.randomUUID(),
      question_type: 'single',
      question: '',
      options: ['', ''],
      correct_answers: [], // للاختيار الواحد والمتعدد
      compound_parts: [
        { question: '', options: ['', ''] }, // لا يوجد correct_answers هنا
        { question: '', options: ['', ''] }  // لا يوجد correct_answers هنا
      ]
    };
  }

  const addQuestion = () => {
    setQuestions([...questions, createNewQuestion()]);
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

    if (field === 'question_type') {
      if (value === 'compound') {
        // عند التحول لسؤال مركب، تهيئة correct_answers لتكون مصفوفة تحتوي على مصفوفتين فارغتين للشطرين
        updated[index].correct_answers = [[], []];
        updated[index].compound_parts = [
          { question: '', options: ['', ''] },
          { question: '', options: ['', ''] }
        ];
        // التأكد من مسح الخيارات القديمة في حال التحول من Single/Multiple
        updated[index].options = [];
      } else {
        // عند التحول من مركب إلى Single/Multiple، تهيئة correct_answers لتكون فارغة
        updated[index].correct_answers = [];
        updated[index].compound_parts = [];
        // إعادة تهيئة الخيارات العادية
        updated[index].options = ['', ''];
      }
    }

    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
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
      // يجب تعديل correct_answers هنا لإزالة الفهرس الصحيح
      updated[qIndex].correct_answers = updated[qIndex].correct_answers.filter(i => i !== oIndex);
      setQuestions(updated);
    } else {
      toast({ title: "تنبيه", description: "يجب أن يحتوي السؤال على خيارين على الأقل." });
    }
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

  // --------- For Compound Questions ---------

  const updateCompoundPartField = (qIndex, partIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex].compound_parts[partIndex][field] = value;
    setQuestions(updated);
  };

  const addCompoundOption = (qIndex, partIndex) => {
    const updated = [...questions];
    updated[qIndex].compound_parts[partIndex].options.push('');
    // لا نحتاج لتعديل correct_answers هنا لأنها على مستوى السؤال الأب
    setQuestions(updated);
  };

  const updateCompoundOption = (qIndex, partIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].compound_parts[partIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  // هذا هو المكان الذي نعدل فيه correct_answers للسؤال المركب ككل
  const handleCompoundCorrectAnswerChange = (qIndex, partIndex, oIndex) => {
    const updated = [...questions];
    const compoundCorrectAnswers = updated[qIndex].correct_answers[partIndex]; // الوصول لمصفوفة الإجابات الصحيحة للشطر المحدد

    const currentIndex = compoundCorrectAnswers.indexOf(oIndex);
    if (currentIndex === -1) {
      compoundCorrectAnswers.push(oIndex);
    } else {
      compoundCorrectAnswers.splice(currentIndex, 1);
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // إضافة تحقق بسيط للبيانات الأساسية قبل الإرسال
    if (!examTitle.trim()) {
      toast({ title: "خطأ", description: "عنوان الامتحان لا يمكن أن يكون فارغًا." });
      setIsSubmitting(false);
      return;
    }
    if (examDuration <= 0) {
      toast({ title: "خطأ", description: "مدة الامتحان يجب أن تكون أكبر من صفر." });
      setIsSubmitting(false);
      return;
    }

    // يمكن إضافة تحققات إضافية هنا لضمان أن كل سؤال لديه نص وخيارات وإجابات صحيحة
    // هذا الجزء لم يتم إدراجه في هذا التعديل لتركيزه على منطق الأسئلة المركبة

    if (!userId) {
      toast({ title: "خطأ", description: "يجب أن تكون مسجل الدخول." });
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.from('exams').insert([{
      user_id: userId,
      title: examTitle,
      duration: examDuration,
      questions: questions
    }]);

    setIsSubmitting(false);

    if (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء الحفظ: " + error.message });
      console.error("Supabase error:", error); // للمزيد من التفاصيل في الكونسول
    } else {
      toast({ title: "تم", description: "تم إنشاء الامتحان بنجاح." });
      onExamCreated();
    }
  };

  return (
    <div className="space-y-4">
      <Label>عنوان الامتحان</Label>
      <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />

      <Label>مدة الامتحان (بالدقائق)</Label>
      <Input
        type="number"
        value={examDuration}
        onChange={(e) => setExamDuration(Number(e.target.value))}
      />

      {questions.map((question, qIndex) => (
        <motion.div key={question.id} className="border p-4 rounded space-y-2">
          <div className="flex justify-between items-center">
            <Label>نوع السؤال:</Label>
            <Tabs value={question.question_type} onValueChange={(val) => updateQuestionField(qIndex, 'question_type', val)}>
              <TabsList>
                <TabsTrigger value="single">اختيار واحد</TabsTrigger>
                <TabsTrigger value="multiple">اختيارات متعددة</TabsTrigger>
                <TabsTrigger value="compound">سؤال مركب</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="destructive" onClick={() => removeQuestion(qIndex)}>
              <Trash2 size={16} />
            </Button>
          </div>

          {question.question_type === 'compound' ? (
            <div className="space-y-4">
              {question.compound_parts.map((part, partIndex) => (
                <div key={partIndex} className="border p-2 rounded">
                  <Label>شطر {partIndex === 0 ? 'أ' : 'ب'}</Label>
                  <Input
                    value={part.question}
                    onChange={(e) => updateCompoundPartField(qIndex, partIndex, 'question', e.target.value)}
                  />
                  {part.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center space-x-2">
                      <Input
                        value={opt}
                        onChange={(e) => updateCompoundOption(qIndex, partIndex, oIndex, e.target.value)}
                      />
                      <Checkbox
                        // التحقق من صحة الخيار للشطر المحدد
                        checked={question.correct_answers[partIndex]?.includes(oIndex)}
                        onCheckedChange={() => handleCompoundCorrectAnswerChange(qIndex, partIndex, oIndex)}
                      />
                    </div>
                  ))}
                  <Button onClick={() => addCompoundOption(qIndex, partIndex)}>إضافة خيار</Button>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Label>نص السؤال:</Label>
              <Input
                value={question.question}
                onChange={(e) => updateQuestionField(qIndex, 'question', e.target.value)}
              />

              {question.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center space-x-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                  />
                  <Checkbox
                    checked={question.correct_answers.includes(oIndex)}
                    onCheckedChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                  />
                </div>
              ))}
              <Button onClick={() => addOption(qIndex)}>إضافة خيار</Button>
            </>
          )}
        </motion.div>
      ))}

      <Button onClick={addQuestion}>إضافة سؤال</Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>إنشاء الامتحان</Button>
      <Button variant="secondary" onClick={onCancel}>إلغاء</Button>
    </div>
  );
};

export default ExamForm;
