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
import { Eye } from 'lucide-react';

const SessionResults = ({ sessionId }) => {
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: resultData } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_id', sessionId);

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', sessionId);

      setResults(resultData || []);
      setQuestions(questionData || []);
    };

    fetchData();
  }, [sessionId]);

  const getQuestionById = (id) => questions.find((q) => q.id === id);

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
                  <p><strong>اسم:</strong> {result.name || result.email}</p>
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
                      {questions.map((question, qIdx) => {
                        const userAnswer = result.answers?.[question.id] ?? [];
                        const isCompound = question.question_type === 'compound';
                        const compoundParts = (() => {
                          if (isCompound) {
                            if (Array.isArray(question.parts)) return question.parts;
                            try {
                              return JSON.parse(question.parts);
                            } catch {
                              return [];
                            }
                          }
                          return [];
                        })();

                        return (
                          <div key={question.id} className="bg-slate-800/50 p-4 rounded border border-slate-700">
                            <h3 className="text-white font-bold mb-2">سؤال {qIdx + 1}:</h3>
                            <p className="text-yellow-300 mb-4">{question.question_text}</p>

                            {isCompound ? (
                              compoundParts.map((part, partIdx) => (
                                <div key={partIdx} className="mb-4 bg-slate-700 p-3 rounded">
                                  <p className="text-white mb-2 font-medium">شطر {partIdx + 1}: {part.text}</p>
                                  <div className="space-y-2">
                                    {part.options.map((option, optIdx) => {
                                      const isCorrect = part.correct_answer === optIdx;
                                      const isSelected = userAnswer[partIdx] === optIdx;
                                      const color = isCorrect
                                        ? 'bg-green-500/20 border-green-400 text-green-300'
                                        : isSelected
                                        ? 'bg-red-500/20 border-red-400 text-red-300'
                                        : 'bg-slate-800 border-slate-600 text-white';
                                      return (
                                        <div key={optIdx} className={`p-2 rounded border ${color}`}>
                                          {option}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="space-y-2">
                                {(question.options || []).map((option, optIdx) => {
                                  const isCorrect = (question.correct_answers || []).includes(optIdx);
                                  const isSelected = userAnswer.includes(optIdx);
                                  const color = isCorrect
                                    ? 'bg-green-500/20 border-green-400 text-green-300'
                                    : isSelected
                                    ? 'bg-red-500/20 border-red-400 text-red-300'
                                    : 'bg-slate-800 border-slate-600 text-white';
                                  return (
                                    <div key={optIdx} className={`p-2 rounded border ${color}`}>
                                      {option}
                                    </div>
                                  );
                                })}
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
