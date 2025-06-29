import React from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const PublicExamCard = ({ exam, index }) => {
    const navigate = useNavigate();
  return (
    <motion.div
      key={exam.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
    >
      <Card className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:border-yellow-500/50 transition-all duration-300 flex flex-col h-full">
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
          <h3 className="text-xl font-bold text-white truncate flex-1">{exam.title}</h3>
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
            <p className="text-slate-400 text-sm">{exam.description || 'اختبار عام متاح للجميع.'}</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-700">
          <Button
            onClick={() => navigate(`/exam/${exam.id}`)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <PlayCircle className="w-4 h-4 ml-2" />
            ابدأ الاختبار
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default PublicExamCard;