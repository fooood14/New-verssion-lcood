import React from "react";
import { Clock, Eye, Users, Play, BarChart2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import Card from '../ui/card';


// زر بسيط، استبدله بزر مكتبتك إذا كنت تستخدم UI library مثل Chakra, Material, Tailwind Buttons...
const Button = ({ children, onClick, className }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded transition-colors duration-200 ${className}`}
  >
    {children}
  </button>
);

const ExamCard = ({ exam, question, onCopyLink, onViewResults }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <Card className="p-4 bg-white dark:bg-slate-800 shadow-md rounded-lg">
        {/* معلومات الامتحان */}
        <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-300 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span>{exam.duration} دقيقة</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span>{exam.questions?.length || 0} سؤال</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-green-500" />
            <span>{exam.participantsCount || 0} مشارك</span>
          </div>
        </div>

        {/* عرض السؤال */}
        <div className="border border-gray-300 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {question.question_type === "single" || question.question_type === "multiple" ? (
            <>
              <h3 className="mb-2 font-semibold">{question.question_text}</h3>
              <ul className="list-disc list-inside space-y-1">
                {question.options.map((opt, idx) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            </>
          ) : question.question_type === "compound" ? (
            <>
              <p className="mb-2 font-semibold">🧩 سؤال مركب:</p>
              <h4 className="mb-1">1. {question.sub_question_1}</h4>
              <h4>2. {question.sub_question_2}</h4>
            </>
          ) : (
            <p>نوع السؤال غير معروف</p>
          )}
        </div>

        {/* الأزرار */}
        <div className="mt-6 border-t border-gray-300 dark:border-gray-700 pt-4 flex flex-col gap-3">
          {exam.is_permanent ? (
            <Button
              onClick={() => onCopyLink(exam)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full flex justify-center items-center gap-2"
            >
              <Play className="w-5 h-5" />
              إنشاء جلسة مباشرة
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={() => onViewResults(exam.id)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex justify-center items-center gap-2"
              >
                <BarChart2 className="w-5 h-5" />
                عرض النتائج
              </Button>
              <Button
                onClick={() => onCopyLink(exam)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white flex justify-center items-center gap-2"
              >
                <Copy className="w-5 h-5" />
                نسخ الرابط
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default ExamCard;
