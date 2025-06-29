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
      updated[index].correct_answers = [];
      if (value === 'compound') {
        updated[index].options = [];
        updated[index].parts = [{ text: '', options: ['نعم', 'لا'] }];
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
      if (currentIndex === -1) question.correct_answers.push(oIndex);
      else question.correct_answers.splice(currentIndex, 1);
    }
    setQuestions(updated);
  };
  return (
    <div className="space-y-6">
      {questions.map((q, qIndex) => (
        <motion.div key={q.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <div className="flex justify-between items-center mb-3">
            <Label className="text-white">السؤال {qIndex + 1}</Label>
            <div className="flex items-center gap-2">
              <Tabs defaultValue="single" value={q.question_type} onValueChange={(val) => updateQuestionField(qIndex, 'question_type', val)} className="w-[260px]">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                  <TabsTrigger value="single" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">إجابة واحدة</TabsTrigger>
                  <TabsTrigger value="multiple" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">إجابات متعددة</TabsTrigger>
                  <TabsTrigger value="compound" className="data-[state=active]:bg-slate-600 data-[state=active]:text-white">سؤال مركب</TabsTrigger>
                </TabsList>
              </Tabs>
              {questions.length > 1 && (
                <Button onClick={() => removeQuestion(qIndex)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <Input
            value={q.question}
            onChange={(e) => updateQuestionField(qIndex, 'question', e.target.value)}
            placeholder="أدخل نص السؤال"
            className="bg-slate-600 border-slate-500 text-white mb-4"
          />

          {q.question_type !== 'compound' ? (
            <div className="space-y-3 mb-4">
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
          ) : (
            <div className="space-y-4 mb-4">
              {q.parts?.map((part, partIdx) => (
                <div key={partIdx} className="bg-slate-800 p-3 rounded border border-slate-600">
                  <Label className="text-white mb-1 block">شطر {partIdx + 1}</Label>
                  <Input
                    className="mb-2 bg-slate-600 border-slate-500 text-white"
                    value={part.text}
                    placeholder="نص الشطر"
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].parts[partIdx].text = e.target.value;
                      setQuestions(newQuestions);
                    }}
                  />
                  <Input
                    className="bg-slate-600 border-slate-500 text-white"
                    value={part.options.join(', ')}
                    placeholder="مثلاً: نعم, لا"
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].parts[partIdx].options = e.target.value.split(',').map(x => x.trim());
                      setQuestions(newQuestions);
                    }}
                  />
                </div>
              ))}
              <Button
                onClick={() => {
                  const newQuestions = [...questions];
                  newQuestions[qIndex].parts.push({ text: '', options: ['نعم', 'لا'] });
                  setQuestions(newQuestions);
                }}
              >
                + إضافة شطر
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <Input
                type="number"
                value={q.time_limit_seconds}
                onChange={(e) => updateQuestionField(qIndex, 'time_limit_seconds', parseInt(e.target.value) || 0)}
                placeholder="زمن السؤال (ثواني)"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-400" />
              <Input
                value={q.video_url}
                onChange={(e) => updateQuestionField(qIndex, 'video_url', e.target.value)}
                placeholder="رابط فيديو السؤال (اختياري)"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-600 space-y-4">
            <div>
              <Label className="text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                شرح الإجابة الصحيحة
              </Label>
              <Textarea
                value={q.explanation}
                onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)}
                placeholder="اكتب شرحاً يظهر للمستخدم بعد الاختبار"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>
            <div>
              <Label className="text-white mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                رابط فيديو الشرح
              </Label>
              <Input
                value={q.explanation_video_url}
                onChange={(e) => updateQuestionField(qIndex, 'explanation_video_url', e.target.value)}
                placeholder="رابط فيديو إضافي للشرح"
                className="bg-slate-600 border-slate-500 text-white"
              />
            </div>
          </div>
        </motion.div>
      ))}

      <Button onClick={addQuestion} className="mt-4">+ سؤال جديد</Button>

      <div className="flex gap-4 mt-8">
        <Button
          onClick={() => {
            // مثال فقط: ضيف هنا منطق الحفظ حسب مشروعك
            console.log(questions);
            toast({ title: "✔", description: "تم التحضير للحفظ (أضف منطقي هنا)" });
          }}
          className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 disabled:opacity-70"
        >
          حفظ الاختبار
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-70"
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
};

export default PermanentExamForm;
