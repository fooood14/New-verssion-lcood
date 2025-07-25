// [نفس الاستيرادات بدون تغيير]
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, X, Video, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';

const PermanentExamForm = ({ onExamCreated, onCancel, userId, examToEdit }) => {
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [examImageUrl, setExamImageUrl] = useState('');
  const [questions, setQuestions] = useState([{
    id: crypto.randomUUID(),
    question: '',
    options: ['', ''],
    correct_answers: [],
    question_type: 'single',
    video_url: '',
    time_limit_seconds: 30,
    explanation: '',
    explanation_video_url: '',
    parts: []
  }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (examToEdit) {
      setExamTitle(examToEdit.title);
      setExamDuration(examToEdit.duration);
      setExamImageUrl(examToEdit.image_url || '');
      setQuestions(examToEdit.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options || [],
        correct_answers: q.correct_answers || [],
        question_type: q.question_type,
        video_url: q.video_url || '',
        time_limit_seconds: q.time_limit_seconds || 30,
        explanation: q.explanation || '',
        explanation_video_url: q.explanation_video_url || '',
        parts: q.parts || []
      })));
    }
  }, [examToEdit]);

  const addQuestion = () => {
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      question: '',
      options: ['', ''],
      correct_answers: [],
      question_type: 'single',
      video_url: '',
      time_limit_seconds: 30,
      explanation: '',
      explanation_video_url: '',
      parts: []
    }]);
  };

  const updateQuestionField = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;

    if (field === 'question_type') {
      updated[index].correct_answers = [];

      if (value === 'compound') {
        updated[index].options = [];
        updated[index].parts = [{ text: '', options: ['', ''], correct_answer: 0 }];
      } else {
        updated[index].options = ['', ''];
        updated[index].parts = [];
      }
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

    const { data: testData, error: testError } = await supabase
      .from('tests')
      .insert([{
        title: examTitle,
        duration: examDuration,
        user_id: userId,
        is_permanent: true,
        image_url: examImageUrl
      }])
      .select()
      .single();

    if (testError) {
      toast({ title: "خطأ", description: testError.message, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const questionsToInsert = questions.map(q => {
      const base = {
        test_id: testData.id,
        question_text: q.question,
        question_type: q.question_type,
        video_url: q.video_url,
        time_limit_seconds: q.time_limit_seconds,
        explanation: q.explanation,
        explanation_video_url: q.explanation_video_url
      };

      if (q.question_type === "compound") {
        base.options = [];
        base.correct_answers = [];
        base.parts = q.parts.map(p => ({
          text: p.text,
          options: p.options,
          correct_answer: p.correct_answer
        }));
      } else {
        base.options = q.options;
        base.correct_answers = q.correct_answers;
      }

      return base;
    });

    const { error: questionsError } = await supabase.from('questions').insert(questionsToInsert);

    if (questionsError) {
      await supabase.from('tests').delete().eq('id', testData.id);
      toast({ title: "خطأ", description: `فشل في حفظ الأسئلة: ${questionsError.message}`, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: "✔", description: "تم حفظ الاختبار بنجاح" });
    onExamCreated();
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-full max-w-4xl space-y-6">

        {/* معلومات عامة */}
        <div className="space-y-4">
          <Label className="text-white">عنوان الاختبار:</Label>
          <Input className="bg-slate-700 text-white border-slate-600" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
          <Label className="text-white">مدة الاختبار (بالدقائق):</Label>
          <Input type="number" className="bg-slate-700 text-white border-slate-600" value={examDuration} onChange={(e) => setExamDuration(parseInt(e.target.value))} />
          <Label className="text-white">رابط صورة (اختياري):</Label>
          <Input className="bg-slate-700 text-white border-slate-600" value={examImageUrl} onChange={(e) => setExamImageUrl(e.target.value)} />
        </div>

        {/* الأسئلة */}
        {questions.map((q, qIndex) => (
          <motion.div key={q.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-white">السؤال {qIndex + 1}</Label>
              <div className="flex items-center gap-2">
                <Tabs value={q.question_type} onValueChange={(val) => updateQuestionField(qIndex, 'question_type', val)} className="w-[260px]">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                    <TabsTrigger value="single">إجابة واحدة</TabsTrigger>
                    <TabsTrigger value="multiple">إجابات متعددة</TabsTrigger>
                    <TabsTrigger value="compound">سؤال مركب</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* نص السؤال */}
            <Input
              value={q.question}
              onChange={(e) => updateQuestionField(qIndex, 'question', e.target.value)}
              placeholder="أدخل نص السؤال"
              className="bg-slate-600 border-slate-500 text-white"
            />

            {/* الوقت */}
            <div>
              <Label className="text-white flex items-center gap-2"><Clock className="w-4 h-4" /> مدة السؤال (بالثواني):</Label>
              <Input
                type="number"
                className="bg-slate-600 border-slate-500 text-white"
                value={q.time_limit_seconds}
                onChange={(e) => updateQuestionField(qIndex, 'time_limit_seconds', parseInt(e.target.value))}
              />
            </div>

            {/* نوع السؤال */}
            {q.question_type === 'compound' ? (
              <div className="space-y-4">
                {q.parts?.map((part, partIdx) => (
                  <div key={partIdx} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 space-y-3">
                    <Label className="text-white block">شطر {partIdx + 1}</Label>
                    <Input
                      value={part.text}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[qIndex].parts[partIdx].text = e.target.value;
                        setQuestions(updated);
                      }}
                      placeholder="نص الشطر"
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                    {part.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`compound-correct-${qIndex}-${partIdx}`}
                          checked={part.correct_answer === optIdx}
                          onChange={() => {
                            const updated = [...questions];
                            updated[qIndex].parts[partIdx].correct_answer = optIdx;
                            setQuestions(updated);
                          }}
                          className="form-radio h-5 w-5 text-yellow-500 bg-slate-600 border-slate-500 cursor-pointer"
                        />
                        <Input
                          value={opt}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIndex].parts[partIdx].options[optIdx] = e.target.value;
                            setQuestions(updated);
                          }}
                          placeholder={`الخيار ${optIdx + 1}`}
                          className="bg-slate-600 border-slate-500 text-white"
                        />
                        <Button onClick={() => {
                          const updated = [...questions];
                          updated[qIndex].parts[partIdx].options.splice(optIdx, 1);
                          setQuestions(updated);
                        }} variant="ghost" size="icon" className="text-red-500 hover:text-red-400 w-8 h-8">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={() => {
                      const updated = [...questions];
                      updated[qIndex].parts[partIdx].options.push('');
                      setQuestions(updated);
                    }} variant="outline" size="sm" className="text-green-400 border-green-500 hover:bg-green-500/20">
                      <Plus className="w-4 h-4 ml-2" /> إضافة خيار
                    </Button>
                  </div>
                ))}
                <Button onClick={() => {
                  const updated = [...questions];
                  updated[qIndex].parts.push({ text: '', options: ['', ''], correct_answer: 0 });
                  setQuestions(updated);
                }} variant="outline" size="sm" className="text-blue-400 border-blue-500 hover:bg-blue-500/20">
                  <Plus className="w-4 h-4 ml-2" /> إضافة شطر
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    {q.question_type === 'single' ? (
                      <input type="radio" name={`correct-${qIndex}`} checked={q.correct_answers[0] === oIndex} onChange={() => handleCorrectAnswerChange(qIndex, oIndex)} />
                    ) : (
                      <Checkbox checked={q.correct_answers.includes(oIndex)} onCheckedChange={() => handleCorrectAnswerChange(qIndex, oIndex)} />
                    )}
                    <Input value={opt} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} />
                    <Button onClick={() => removeOption(qIndex, oIndex)}><X /></Button>
                  </div>
                ))}
                <Button onClick={() => addOption(qIndex)}>إضافة خيار</Button>
              </div>
            )}

            {/* الفيديو والشرح في الأسفل */}
            <div className="mt-6 space-y-4">
              <div>
                <Label className="text-white flex items-center gap-2"><Video className="w-4 h-4" /> رابط الفيديو:</Label>
                <Input
                  className="bg-slate-600 border-slate-500 text-white"
                  value={q.video_url}
                  onChange={(e) => updateQuestionField(qIndex, 'video_url', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-white flex items-center gap-2"><Info className="w-4 h-4" /> شرح الجواب:</Label>
                <Textarea
                  className="bg-slate-600 border-slate-500 text-white"
                  value={q.explanation}
                  onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)}
                />
              </div>

              <div>
                <Label className="text-white flex items-center gap-2"><Video className="w-4 h-4" /> فيديو الشرح:</Label>
                <Input
                  className="bg-slate-600 border-slate-500 text-white"
                  value={q.explanation_video_url}
                  onChange={(e) => updateQuestionField(qIndex, 'explanation_video_url', e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        ))}

        {/* الأزرار */}
        <div className="flex justify-end gap-4 mt-6">
          <Button onClick={addQuestion} className="bg-green-600 hover:bg-green-700 text-white">+ سؤال جديد</Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">حفظ</Button>
          <Button onClick={onCancel} className="bg-gray-600 hover:bg-gray-700 text-white">إلغاء</Button>
        </div>

      </div>
    </div>
  );
};

export default PermanentExamForm;
