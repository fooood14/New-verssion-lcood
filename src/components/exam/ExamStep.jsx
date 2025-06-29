import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, Check, RotateCcw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

  const handleAnswer = (value) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = value;
    setAnswers(updatedAnswers);
  };

  const handleCompoundAnswer = (partIndex, value) => {
    const prev = answers[currentQuestionIndex] || {};
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = {
      ...prev,
      [partIndex]: value,
    };
    setAnswers(updatedAnswers);
  };

  return (
    <div className="p-4">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-lg font-bold">السؤال {currentQuestionIndex + 1}</h2>
        <span className="text-sm text-gray-600">
          الوقت المتبقي: {formatTime(questionTimeLeft)}
        </span>
      </div>

      {currentQuestion.question_type === 'single' && (
        <div>
          <h3 className="mb-4 font-semibold">{currentQuestion.question}</h3>
          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`q-${currentQuestionIndex}`}
                  value={opt}
                  checked={answers[currentQuestionIndex] === opt}
                  onChange={() => handleAnswer(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ✅ سؤال مركب */}
      {currentQuestion.question_type === 'compound' && (
        <div>
          <h3 className="mb-4 font-semibold">{currentQuestion.question}</h3>
          {currentQuestion.parts?.map((part, idx) => (
            <div key={idx} className="mb-4">
              <p className="mb-2 font-medium">{part.text}</p>
              <div className="flex gap-4">
                {part.options.map((opt, oidx) => (
                  <label key={oidx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`compound-${currentQuestionIndex}-${idx}`}
                      value={opt}
                      checked={answers[currentQuestionIndex]?.[idx] === opt}
                      onChange={() => handleCompoundAnswer(idx, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleNext}>التالي</Button>
      </div>
    </div>
  );
};

export default ExamStep;
