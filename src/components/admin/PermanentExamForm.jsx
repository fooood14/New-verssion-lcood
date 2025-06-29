import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Textarea } from '@/components/ui/textarea';

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
    setQuestions([...questions, {
      id: crypto.randomUUID(),
      question: '',
      question_type: 'single',
      options: ['', ''],
      correct_answers: [],
      parts: []
    }]);
  };

  const handleQuestionChange = (id, field, value) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
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
        <div key={q.id} className="border p-4 mb-4">
          <Label>نوع السؤال:</Label>
          <select
            value={q.question_type}
            onChange={(e) => handleQuestionChange(q.id, 'question_type', e.target.value)}
          >
            <option value="single">سؤال عادي</option>
            <option value="compound">سؤال مركب</option>
          </select>

          <Label className="mt-2">نص السؤال:</Label>
          <Input
            value={q.question}
            onChange={(e) => handleQuestionChange(q.id, 'question', e.target.value)}
          />

          {q.question_type === 'compound' && (
            <div className="mt-4">
              {q.parts?.map((part, idx) => (
                <div key={idx} className="border p-2 my-2">
                  <Label>شطر {idx + 1}:</Label>
                  <Input
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
              <Button onClick={() => handleAddPart(q.id)}>+ إضافة شطر</Button>
            </div>
          )}
        </div>
      ))}

      <Button className="mt-4" onClick={handleAddQuestion}>+ سؤال جديد</Button>
    </div>
  );
};

export default PermanentExamForm;
