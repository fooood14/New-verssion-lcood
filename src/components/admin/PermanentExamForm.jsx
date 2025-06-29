import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PermanentExamForm = ({ onExamCreated, onCancel, userId, examToEdit }) => {
  const [questions, setQuestions] = useState([{
    id: crypto.randomUUID(),
    question: '',
    question_type: 'single',
    options: ['', ''],
    correct_answers: [],
    parts: []
  }]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question: '',
        question_type: 'single',
        options: ['', ''],
        correct_answers: [],
        parts: []
      }
    ]);
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        let updated = { ...q, [field]: value };

        // إذا تبدل نوع السؤال، غير البنية حسب النوع
        if (field === 'question_type') {
          if (value === 'compound') {
            updated = {
              ...updated,
              options: [],
              correct_answers: [],
              parts: [{ text: '', options: [] }],
            };
          } else {
            updated = {
              ...updated,
              options: ['', ''],
              correct_answers: [],
              parts: [],
            };
          }
        }

        return updated;
      }
      return q;
    }));
  };

  const handleOptionChange = (qid, idx, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qid) {
        const newOptions = [...q.options];
        newOptions[idx] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleAddPart = (qid) => {
    setQuestions(questions.map(q => {
      if (q.id === qid) {
        return {
          ...q,
          parts: [...(q.parts || []), { text: '', options: [] }]
        };
      }
      return q;
    }));
  };

  const handlePartChange = (qid, partIdx, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qid) {
        const newParts = [...q.parts];
        if (field === 'options') {
          newParts[partIdx][field] = value.split(',').map(opt => opt.trim());
        } else {
          newParts[partIdx][field] = value;
        }
        return { ...q, parts: newParts };
      }
      return q;
    }));
  };

  return (
    <div className="p-4">
      {questions.map((q, index) => (
        <div key={q.id} className="border p-4 mb-4 rounded bg-purple-900 text-white">
          <Label>نوع السؤال:</Label>
          <select
            className="mb-2 text-black"
            value={q.question_type}
            onChange={(e) => handleQuestionChange(q.id, 'question_type', e.target.value)}
          >
            <option value="single">سؤال عادي</option>
            <option value="compound">سؤال مركب</option>
          </select>

          <Label>نص السؤال:</Label>
          <Input
            className="mb-2"
            value={q.question}
            onChange={(e) => handleQuestionChange(q.id, 'question', e.target.value)}
          />

          {/* ✅ عرض الاختيارات إذا كان سؤال عادي */}
          {q.question_type === 'single' && (
            <>
              <Label>الاختيارات:</Label>
              {q.options.map((opt, idx) => (
                <Input
                  key={idx}
                  className="mb-1"
                  value={opt}
                  onChange={(e) => handleOptionChange(q.id, idx, e.target.value)}
                />
              ))}
            </>
          )}

          {/* ✅ سؤال مركب */}
          {q.question_type === 'compound' && (
            <div className="mt-3">
              {q.parts?.map((part, idx) => (
                <div key={idx} className="border p-2 my-2 rounded bg-purple-800">
                  <Label>شطر {idx + 1}:</Label>
                  <Input
                    className="mb-1"
                    placeholder="نص الشطر"
                    value={part.text}
                    onChange={(e) => handlePartChange(q.id, idx, 'text', e.target.value)}
                  />
                  <Input
                    placeholder="اختيارات (مثلاً: نعم, لا)"
                    value={part.options.join(', ')}
                    onChange={(e) => handlePartChange(q.id, idx, 'options', e.target.value)}
                  />
                </div>
              ))}
              <Button onClick={() => handleAddPart(q.id)} className="mt-2">+ إضافة شطر</Button>
            </div>
          )}
        </div>
      ))}

      <Button className="mt-4" onClick={handleAddQuestion}>+ سؤال جديد</Button>
    </div>
  );
};

export default PermanentExamForm;
