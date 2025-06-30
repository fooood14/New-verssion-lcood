import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const ExamStep = ({ exam, studentInfo, timeLeft, answers, setAnswers, onSubmit }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const currentQuestion = exam.questions[currentQuestionIndex];
  const [questionTimeLeft, setQuestionTimeLeft] = useState(currentQuestion.time_limit_seconds || 30);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetQuestionTimer = () => {
    const newQuestion = exam.questions[currentQuestionIndex];
    setQuestionTimeLeft(newQuestion?.time_limit_seconds || 30);
  };

  useEffect(() => {
    resetQuestionTimer();
    const interval = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          handleNext();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex]);

  const handleNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onSubmit();
    }
  };

  // ✅ للأحادية والمتعددة
  const handleAnswer = (optionIndex) => {
    const updated = { ...answers };
    const qid = currentQuestion.id;

    if (currentQuestion.question_type === 'single') {
      updated[qid] = [optionIndex];
    } else {
      const prev = updated[qid] || [];
      if (prev.includes(optionIndex)) {
        updated[qid] = prev.filter(i => i !== optionIndex);
      } else {
        updated[qid] = [...prev, optionIndex];
      }
    }

    setAnswers(updated);
  };

  // ✅ للسؤال المركب
  const handleCompoundAnswer = (partIndex, selectedIndex) => {
    const updated = { ...answers };
    const qid = currentQuestion.id;
    const prev = updated[qid] || [];

    const newParts = [...prev];
    newParts[partIndex] = selectedIndex;
    updated[qid] = newParts;

    setAnswers(updated);
  };

  return (
    <div className="p-4 text-white bg-slate-800 rounded-lg shadow max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-bold">السؤال {currentQuestionIndex + 1} من {exam.questions.length}</h2>
        <span className="text-sm text-yellow-400">الوقت المتبقي: {formatTime(questionTimeLeft)}</span>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-semibold">{currentQuestion.question}</h3>

        {/* السؤال المركب */}
        {currentQuestion.question_type === 'compound' ? (
          <div className="space-y-6">
            {currentQuestion.parts?.map((part, partIndex) => (
              <div key={partIndex} className="bg-slate-700 p-4 rounded space-y-2 border border-slate-600">
                <p className="font-medium">شطر {partIndex + 1}: {part.text}</p>
                {part.options.map((opt, optIndex) => (
                  <label key={optIndex} className="block">
                    <input
                      type="radio"
                      name={`compound-${currentQuestionIndex}-${partIndex}`}
                      checked={answers[currentQuestion.id]?.[partIndex] === optIndex}
                      onChange={() => handleCompoundAnswer(partIndex, optIndex)}
                      className="mr-2"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : (
          // السؤال العادي (إجابة واحدة أو متعددة)
          <div className="space-y-3">
            {currentQuestion.options.map((opt, optIndex) => (
              <label key={optIndex} className="block">
                <input
                  type={currentQuestion.question_type === 'single' ? 'radio' : 'checkbox'}
                  name={`q-${currentQuestion.id}`}
                  checked={answers[currentQuestion.id]?.includes(optIndex)}
                  onChange={() => handleAnswer(optIndex)}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">التالي</Button>
      </div>
    </div>
  );
};

export default ExamStep;
