import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CompletionStep = ({ studentInfo }) => {
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

        <div className="bg-slate-700/50 rounded-lg p-6">
          <p className="text-gray-300">تم حفظ إجاباتك وإرسالها إلى منشئ الاختبار.</p>
          <p className="text-sm text-gray-400 mt-2">يمكنك الآن إغلاق هذه الصفحة.</p>
        </div>
      </Card>
    </motion.div>
  );
};

export default CompletionStep;