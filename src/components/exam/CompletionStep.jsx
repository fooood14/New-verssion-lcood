import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

const CompletionStep = ({ studentInfo, result, exam }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      key="completed"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-3xl w-full mx-auto text-center"
    >
      <Card className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-6" />
        </motion.div>

        <h2 className="text-3xl font-bold text-white mb-4">تم إنهاء الاختبار بنجاح!</h2>
        <p className="text-xl text-gray-300 mb-4">شكراً لك <span className="font-semibold">{studentInfo.name}</span> على المشاركة.</p>

        <div className="bg-slate-700/50 rounded-lg p-6 text-gray-200 space-y-2 text-lg">
          <p><strong>📛 الاسم:</strong> {studentInfo.name}</p>
          <p><strong>📞 رقم الهاتف:</strong> {studentInfo.phone}</p>
          <p><strong>✅ عدد الأجوبة الصحيحة:</strong> {result.correct} من {result.total}</p>
          <p><strong>📊 نسبة النجاح:</strong> {result.percent}%</p>
        </div>

        <div className="mt-6">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="bg-yellow-500 text-black px-6 py-2 rounded hover:bg-yellow-400 transition">
              مراجعة الأجوبة مع الشرح
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto bg-slate-900 text-white p-6 rounded-lg shadow-lg">
              {exam.questions.map((question, index) => {
                const userAnswer = result.answers[question.id] || [];
                const isCorrect = result.correctIds.includes(question.id);

                return (
                  <div key={question.id} className="mb-6 border rounded-lg p-4" style={{ borderColor: isCorrect ? 'green' : 'red' }}>
                    <h4 className="text-lg font-bold mb-2">{index + 1}. {question.question}</h4>

                    {/* خيارات الإجابة */}
                    {question.question_type === 'compound' ? (
                      question.parts.map((part, i) => (
                        <div key={i} className="mb-2">
                          <strong>الشطر {i + 1}:</strong> {userAnswer[i] || '❌ لم يتم اختيار'}
                          <br />
                          <span className="text-sm text-gray-400">الإجابة الصحيحة: {part.correct_answer}</span>
                        </div>
                      ))
                    ) : (
                      question.options.map((option, i) => {
                        const selected = userAnswer.includes(option);
                        const correct = question.correct_answers.includes(option);
                        const borderColor = selected
                          ? correct ? 'green' : 'red'
                          : correct ? 'green' : 'transparent';

                        return (
                          <div key={i} className={`p-2 border rounded mb-1 ${borderColor !== 'transparent' ? `border-${borderColor}-500` : ''}`}>
                            {option}
                          </div>
                        );
                      })
                    )}

                    {/* الشرح */}
                    {question.explanation && (
                      <div className="mt-2 text-sm text-yellow-300">
                        <strong>الشرح:</strong> {question.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </motion.div>
  );
};

export default CompletionStep;
