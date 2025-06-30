import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const SessionResults = ({ sessionId }) => {
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: resultsData } = await supabase
        .from('test_results')
        .select('*, participant:session_participants(name, email, phone_number)')
        .eq('test_id', sessionId)
        .order('submitted_at', { ascending: false });

      const { data: questionsData } = await supabase
        .from('questions')
        .select('id, question_text, question_type, correct_answers, parts')
        .eq('test_id', sessionId);

      setResults(resultsData || []);
      setQuestions(questionsData || []);
      setLoading(false);
    };

    if (sessionId) fetchData();
  }, [sessionId]);

  const getQuestionById = (id) => questions.find(q => q.id === id);

  const isCompoundCorrect = (userAnswer, correctParts) => {
    if (!userAnswer || !correctParts) return false;
    return correctParts.every((p, idx) => userAnswer[idx] === p.options[p.correct_answer]);
  };

  const isStandardCorrect = (userAnswer, correctAnswer) => {
    if (!userAnswer || !correctAnswer) return false;
    return Array.isArray(userAnswer)
      ? [...userAnswer].sort().join(',') === [...correctAnswer].sort().join(',')
      : userAnswer === correctAnswer[0];
  };

  const downloadCSV = () => {
    const csvHeader = `الاسم,الهاتف,البريد,النتيجة,النسبة,المدة,عدد الأسئلة\n`;
    const rows = results.map(r =>
      `${r.participant?.name || ''},${r.participant?.phone_number || ''},${r.participant?.email || ''},${r.score},${r.percentage}%,${r.time_spent}s,${r.total_questions}`
    );
    const csvContent = csvHeader + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'session_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">نتائج الجلسة</h2>
        <Button onClick={downloadCSV} className="flex items-center gap-2">
          <Download className="w-4 h-4" /> تحميل CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-white">جاري التحميل...</p>
      ) : (
        results.map((result, idx) => (
          <Card key={result.id} className="bg-slate-700 border border-slate-600 p-4 text-white space-y-4">
            <div>
              <h3 className="font-bold text-lg">المشارك {idx + 1}</h3>
              <p>الاسم: {result.participant?.name || '—'}</p>
              <p>الهاتف: {result.participant?.phone_number || '—'}</p>
              <p>البريد: {result.participant?.email || '—'}</p>
              <p>النتيجة: {result.score}/{result.total_questions}</p>
              <p>النسبة: {result.percentage}%</p>
              <p>المدة المستغرقة: {result.time_spent} ثانية</p>
              <p>تاريخ الإرسال: {new Date(result.submitted_at).toLocaleString()}</p>
            </div>

            <div className="border-t border-slate-500 pt-4 space-y-4">
              <h4 className="text-yellow-400 font-semibold">تفاصيل الأجوبة:</h4>
              {Object.entries(result.answers || {}).map(([qid, userAnswer], i) => {
                const q = getQuestionById(qid);
                if (!q) return null;

                const isCorrect = q.question_type === 'compound'
                  ? isCompoundCorrect(userAnswer, q.parts || [])
                  : isStandardCorrect(userAnswer, q.correct_answers);

                return (
                  <div key={qid} className="p-4 rounded bg-slate-800 border border-slate-600 space-y-2">
                    <p className="font-semibold">
                      سؤال {i + 1}: {q.question_text}
                      <span className={`ml-3 font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? '✔️ صحيح' : '❌ خطأ'}
                      </span>
                    </p>

                    {q.question_type === 'compound' ? (
                      q.parts?.map((part, pIdx) => (
                        <div key={pIdx} className="ml-4">
                          <p className="text-sm mb-1">شطر {pIdx + 1}: {part.text}</p>
                          <ul className="text-sm list-disc ml-4">
                            <li>الجواب المشارك: <span className="text-blue-300">{userAnswer?.[pIdx] || 'لا شيء'}</span></li>
                            <li>الجواب الصحيح: <span className="text-green-300">{part.options[part.correct_answer]}</span></li>
                          </ul>
                        </div>
                      ))
                    ) : (
                      <div className="ml-4 text-sm">
                        <p>الجواب المشارك: <span className="text-blue-300">
                          {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer}
                        </span></p>
                        <p>الجواب الصحيح: <span className="text-green-300">{q.correct_answers.join(', ')}</span></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default SessionResults;
