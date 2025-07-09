import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Users, Clock, Share2, Trash2, Copy, BarChart2, Star, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ExamCard = ({
  exam,
  index,
  onDelete,
  onCopyLink,
  onViewResults,
  isOwner,
  onStartSession,
  onViewLiveSession, // دالة الربط مع صفحة العرض السينمائي
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleStartSession = (withVideo) => {
    setDialogOpen(false);
    if (onStartSession) {
      onStartSession(exam, withVideo); // إنشاء الجلسة بدون توجيه
    }
  };

  return (
    <motion.div
      key={exam.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <Card
        className={`p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-300 flex flex-col h-full ${
          exam.is_permanent ? 'border-yellow-500/30' : ''
        }`}
      >
        {exam.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={exam.image_url}
              alt={exam.title}
              className="w-full h-32 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-white truncate flex-1 flex items-center gap-2">
            {exam.is_permanent && <Star className="w-5 h-5 text-yellow-400" />}
            {exam.title}
          </h3>
          <div className="flex gap-2 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopyLink(exam)}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              disabled={exam.is_permanent}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(exam.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
              disabled={!isOwner || exam.is_permanent}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3 text-gray-300 flex-grow">
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

        <div className="mt-4 pt-4 border-t border-slate-700">
          {exam.is_permanent ? (
            <>
              <Button
                onClick={() => setDialogOpen(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Play className="w-4 h-4 ml-2" />
                إنشاء جلسة مباشرة
              </Button>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-xl">طريقة عرض الجلسة</DialogTitle>
                  </DialogHeader>
                  <p className="text-slate-400 text-sm mt-2 mb-4">
                    هل ترغب في عرض فيديوهات الأسئلة أثناء الجلسة؟
                  </p>
                  <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      onClick={() => handleStartSession(false)}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      بدون فيديو
                    </Button>
                    <Button
                      onClick={() => handleStartSession(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      بالفيديو
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => onViewLiveSession(exam)}  // هنا يفتح عرض الفيديو السينمائي
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="w-4 h-4 ml-2" />
                عرض الجلسة المباشرة
              </Button>
              <Button
                onClick={() => onViewResults(exam.id)}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <BarChart2 className="w-4 h-4 ml-2" />
                عرض النتائج
              </Button>
              <Button
                onClick={() => onCopyLink(exam)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
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
