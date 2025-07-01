import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Check, X, Info } from 'lucide-react';

const isCorrect = (userAnswers, correctAnswers) => {
  if (!userAnswers || !correctAnswers) return false;
  if (userAnswers.length !== correctAnswers.length) return false;
  const sortedUser = [...userAnswers].sort();
  const sortedCorrect = [...correctAnswers].sort();
  return sortedUser.every((val, i) => val === sortedCorrect[i]);
};

const SessionResults = ({ sessionId }) => {
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [questionsMap, setQuestionsMap] = useState(new Map());

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        alert("معرف الجلسة غير موجود.");
        return;
      }

      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (testError || !testData) {
        alert("فشل في تحميل بيانات الجلسة.");
        return;
      }

      setTest(testData);

      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', sessionId);

      const map = new Map();
      questions.forEach(q => map.set(q.id, q));
      setQuestionsMap(map);

      const { data: res } = await supabase
        .from('test_results')
        .select('*, session_participants(name, phone_number, email)')
        .eq('test_id', sessionId);

      setResults(res || []);
    };

    fetchData();
  }, [sessionId]);

  if (!test) return <p className="text-white p-4">جاري التحميل...</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl text-white font-bold mb-6">نتائج الجلسة</h1>
      {results.length === 0 ? (
        <p className="text-gray-400">لا توجد نتائج بعد.</p>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="bg-slate-800 p-4 rounded-lg text-white shadow border border-slate-600">
              <div className="flex justify-between items-center">
                <div>
                  <p><strong>الاسم:</strong> {result.session_participants?.name || result.session_participants?.email}</p>
                  <p><strong>الهاتف:</strong> {result.session_participants?.phone_number || 'غير متوفر'}</p>
                  <p><strong>النتيجة:</strong> {result.score}/{result.total_questions}</p>
                  <p><strong>المدة:</strong> {Math.floor(result.time_spent / 60)} دقيقة</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-500/10">
                      <Eye className="w-4 h-4 ml-2" />
                      عرض الإجابات
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">مراجعة الإجابات</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                      {test.questions.map((q, i) => {
                        const question = questionsMap.get(q.id);
                        if (!question) return null;
                        const userAnswers = result.answers[q.id] || [];
                        const correct = isCorrect(userAnswers, question.correct_answers);
                        const isCompound = question.question_type === 'compound';

                        let parts = [];
                        if (isCompound) {
                          try {
                            parts = Array.isArray(question.parts)
                              ? question.parts
                              : JSON.parse(question.parts || '[]');
                          } catch {
                            parts = [];
                          }
                        }

                        return (
                          <div
                            key={q.id}
                            className={`p-4 rounded-lg border-2 ${
                              correct
                                ? 'border-green-500/50 bg-green-500/10'
                                : 'border-red-500/50 bg-red-500/10'
                            }`}
                          >
                            <p className="font-semibold mb-2">{i + 1}. {question.question_text}</p>

                            {isCompound ? (
                              <div className="space-y-4 mb-4">
                                {parts.map((part, partIdx) => {
                                  const selected = userAnswers[partIdx];
                                  return (
                                    <div key={partIdx}>
                                      <p className="text-yellow-400 mb-1">شطر {partIdx + 1}: {part.text}</p>
                                      {part.options.map((opt, oIndex) => {
                                        const isCorrectAnswer = part.correct_answer === oIndex;
                                        const isUserAnswer = selected === oIndex;
                                        return (
                                          <div
                                            key={oIndex}
                                            className={`flex items-center justify-end gap-3 p-2 rounded text-right ${
                                              isUserAnswer && !isCorrectAnswer ? 'bg-red-500/20' : ''
                                            } ${isCorrectAnswer ? 'bg-green-500/20' : ''}`}
                                          >
                                            <span className={`${isCorrectAnswer ? 'text-green-300 font-semibold' : ''}`}>{opt}</span>
                                            {isCorrectAnswer ? (
                                              <Check className="w-5 h-5 text-green-400" />
                                            ) : (
                                              <div className="w-5 h-5" />
                                            )}
                                            {isUserAnswer && !isCorrectAnswer && (
                                              <X className="w-5 h-5 text-red-400" />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-2 mb-4">
                                {question.options.map((opt, oIndex) => {
                                  const isUserAnswer = userAnswers.includes(oIndex);
                                  const isCorrectAnswer = question.correct_answers.includes(oIndex);
                                  return (
                                    <div
                                      key={oIndex}
                                      className={`flex items-center justify-end gap-3 p-2 rounded text-right ${
                                        isUserAnswer && !isCorrectAnswer ? 'bg-red-500/20' : ''
                                      } ${isCorrectAnswer ? 'bg-green-500/20' : ''}`}
                                    >
                                      <span className={`${isCorrectAnswer ? 'text-green-300 font-semibold' : ''}`}>{opt}</span>
                                      {isCorrectAnswer ? (
                                        <Check className="w-5 h-5 text-green-400" />
                                      ) : (
                                        <div className="w-5 h-5" />
                                      )}
                                      {isUserAnswer && !isCorrectAnswer && (
                                        <X className="w-5 h-5 text-red-400" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {question.explanation && (
                              <div className="mt-4 pt-4 border-t border-slate-600">
                                <p className="font-bold text-yellow-300 flex items-center gap-2 mb-2">
                                  <Info size={16} /> شرح الإجابة:
                                </p>
                                <p className="text-slate-300 whitespace-pre-wrap">{question.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionResults;
