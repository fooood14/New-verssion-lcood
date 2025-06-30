import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CompletionStep = ({ studentInfo, result }) => {
  const renderAnswerBlock = (question, userAnswer, index) => {
    if (question.question_type === 'compound') {
      return (
        <div className="space-y-3">
          {question.parts?.map((part, idx) => {
            const userPartAnswer = userAnswer?.[idx];
            const correctAnswer = part.options[part.correct_answer];
            const isCorrect = userPartAnswer === correctAnswer;

            return (
              <div key={idx} className={`p-3 rounded border ${isCorrect ? 'border-green-500 bg-green-100/10' : 'border-red-500 bg-red-100/10'}`}>
                <div className="text-sm text-white mb-1 font-semibold">شطر {idx + 1}: {part.text}</div>
                <div className="text-sm text-gray-300">
                  إجابتك: <span className="font-bold">{userPartAnswer || '—'}</span>
                </div>
                <div className="text-sm text-gray-300">
                  الجواب الصحيح: <span className="font-bold">{correctAnswer}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      const correctAnswers = (question.correct_answers || []).map(i => question.options[i]);
      const isCorrect = Array.isArray(userAnswer)
        ? userAnswer.sort().join() === correctAnswers.sort().join()
        : correctAnswers.includes(userAnswer);

      return (
        <div className={`p-3 rounded border ${isCorrect ? 'border-green-500 bg-green-100/10' : 'border-red-500 bg-red-100/10'}`}>
          <div className="text-sm text-gray-300">
            إجابتك: <span className="font-bold">{Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || '—'}</span>
          </div>
          <div className="text-sm text-gray-300">
            الجواب الصحيح: <span className="font-bold">{correctAnswers.join(', ')}</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="p-6 bg-slate-800 border border-slate-600">
        <h2 className="text-2xl font-bold text-white mb-4">🎉 تم إنهاء الاختبار</h2>
        <p className="text-gray-300 mb-2">الاسم: {studentInfo.name || studentInfo.email}</p>
        <p className="text-gray-300 mb-2">عدد الأسئلة: {result?.total_questions}</p>
        <p className="text-gray-300 mb-2">النسبة المئوية: {result?.percentage}%</p>
        <p className="text-gray-300 mb-2">النتيجة: {result?.score}/{result?.total_questions}</p>
      </Card>

      <div className="space-y-6">
        {result?.questions?.map((question, index) => {
          const userAnswer = result.answers?.[question.id];

          return (
            <Card key={question.id} className="p-4 bg-slate-700/50 border border-slate-600 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">السؤال {index + 1}:</h3>
                {(() => {
                  if (question.question_type === 'compound') {
                    const partsCorrect = question.parts.every((part, idx) => {
                      const correct = part.options[part.correct_answer];
                      return userAnswer?.[idx] === correct;
                    });
                    return partsCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />;
                  } else {
                    const correctAnswers = (question.correct_answers || []).map(i => question.options[i]);
                    const userVals = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
                    const isCorrect = userVals.sort().join() === correctAnswers.sort().join();
                    return isCorrect ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />;
                  }
                })()}
              </div>

              <p className="text-white">{question.question}</p>
              {renderAnswerBlock(question, userAnswer, index)}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CompletionStep;
