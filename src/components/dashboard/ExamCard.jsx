import { Clock, Eye, Users, Play, BarChart2, Copy } from "some-icon-library"; // استبدل بمكتبة الأيقونات لديك
import { motion } from "framer-motion";
import Card from "./Card"; // استبدل بالمسار الصحيح لكارد

const ExamCard = ({ exam, question, onCopyLink, onViewResults }) => {
  return (
    <motion.div>
      <Card>
        {/* معلومات الامتحان */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span>{exam.duration} دقيقة</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <span>{exam.questions?.length || 0} سؤال</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-400" />
            <span>{exam.participantsCount || 0} مشارك</span>
          </div>
        </div>

        {/* عرض السؤال */}
        <div className="border p-4 my-4 bg-gray-50">
          {question.type === "normal" ? (
            <>
              <h3 className="mb-2">{question.question_text}</h3>
              <ul className="list-disc list-inside">
                {question.options.map((opt, idx) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="mb-2">🧩 سؤال مركب:</p>
              <h4 className="mb-1">1. {question.sub_question_1}</h4>
              <h4>2. {question.sub_question_2}</h4>
            </>
          )}
        </div>

        {/* الأزرار */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          {exam.is_permanent ? (
            <Button
              onClick={() => onCopyLink(exam)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Play className="w-4 h-4 ml-2" />
              إنشاء جلسة مباشرة
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => onViewResults(exam.id)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <BarChart2 className="w-4 h-4 ml-2" />
                عرض النتائج
              </Button>
              <Button
                onClick={() => onCopyLink(exam)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Copy className="w-4 h-4 ml-2" />
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
