import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CompletionStep = ({ studentInfo, correctCount, totalQuestions, onReview }) => {
  const percent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <motion.div
      key="completed"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-2xl w-full mx-auto text-center"
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
        <p className="text-xl text-gray-300 mb-8">شكراً لك {studentInfo.name} على المشاركة.</p>

        <div className="bg-slate-700/50 rounded-lg p-6 text-right">
          <p><strong className="text-gray-300">الاسم:</strong> {studentInfo.name}</p>
          <p><strong className="text-gray-300">الهاتف:</strong> {studentInfo.phone || 'غير متوفر'}</p>
          <p className="mt-2"><strong className="text-gray-300">النتيجة:</strong> {correctCount} / {totalQuestions}</p>
          <p><strong className="text-gray-300">نسبة النجاح:</strong> {percent}%</p>
        </div>

        {onReview && (
          <div className="mt-6">
            <Button onClick={onReview} className="bg-blue-600 hover:bg-blue-700 text-white">
              مراجعة الأجوبة مع الشرح
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default CompletionStep;
