import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';

const PublicExamPlayer = () => {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchExam = async () => {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('id, title, duration')
        .eq('id', examId)
        .single();

      if (testError) {
        toast({ title: "خطأ", description: testError.message, variant: "destructive" });
        return;
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', examId);

      if (questionsError) {
        toast({ title: "خطأ", description: questionsError.message, variant: "destructive" });
        return;
      }

      setExam({
        ...testData,
        questions: questionsData.sort((a, b) => (a.id || '').localeCompare(b.id || '')),
      });
    };

    fetchExam();
  }, [examId]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleChange = (questionId, optionIndex) => {
    const current = answers[questionId] || [];
    const exists = current.includes(optionIndex);
    const updated = exists ? current.filter(i => i !== optionIndex) : [...current, optionIndex];
    setAnswers(prev => ({ ...prev, [questionId]: updated }));
  };

  const handleCompoundAnswer = (questionId, partIndex, selectedIndex) => {
    const current = answers[questionId] || {};
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...current,
        [partIndex]: selectedIndex,
      }
    }));
  };

  const currentQuestion = exam?.questions?.[currentIndex];

  const nextQuestion = () => {
    if (currentIndex < exam.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast({ title: "انتهى الاختبار", description: "لقد وصلت إلى نهاية الاختبار." });
    }
  };

  if (!exam) return <div className="text-center text-white mt-10">جاري التحميل...</div>;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-slate-800 text-white rounded shadow space-y-6">
      <h2 className="text-2xl font-bold">{exam.title}</h2>
      <p>السؤال {currentIndex + 1} من {exam.questions.length}</p>

      {currentQuestion && (
        <div className="space-y-4">
          <p className="font-semibold">{currentQuestion.question_text}</p>

          {/* الأسئلة المركبة */}
          {currentQuestion.question_type === 'compound' && currentQuestion.parts?.length > 0 ? (
            currentQuestion.parts.map((part, partIdx) => (
              <div key={partIdx} className="bg-slate-700 p-4 rounded space-y-3 border border-slate-600">
                <p className="font-medium">شطر {partIdx + 1}: {part.text}</p>
                {part.options?.map((opt, optIdx) => (
                  <label key={optIdx} className="block">
                    <input
                      type="radio"
                      name={`compound-${currentQuestion.id}-${partIdx}`}
                      checked={answers[currentQuestion.id]?.[partIdx] === optIdx}
                      onChange={() => handleCompoundAnswer(currentQuestion.id, partIdx, optIdx)}
                      className="mr-2"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ))
          ) : (
            // الأسئلة العادية
            <div className="space-y-2">
              {currentQuestion.options?.map((opt, idx) => (
                <label key={idx} className="flex items-center gap-2">
                  {currentQuestion.question_type === 'single' ? (
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={answers[currentQuestion.id] === idx}
                      onChange={() => handleAnswerChange(currentQuestion.id, idx)}
                    />
                  ) : (
                    <Checkbox
                      checked={answers[currentQuestion.id]?.includes(idx)}
                      onCheckedChange={() => handleMultipleChange(currentQuestion.id, idx)}
                    />
                  )}
                  {opt}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-end">
        <Button onClick={nextQuestion} className="bg-blue-600 hover:bg-blue-700 text-white">التالي</Button>
      </div>
    </div>
  );
};

export default PublicExamPlayer;
