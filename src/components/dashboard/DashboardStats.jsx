import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Users, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const DashboardStats = ({ stats }) => {
  const { totalTests, totalParticipants, averageScore } = stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
    >
      <Card className="p-6 bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-300 text-sm font-medium">إجمالي الاختبارات</p>
            <p className="text-3xl font-bold text-white">{totalTests || 0}</p>
          </div>
          <BarChart className="w-8 h-8 text-blue-400" />
        </div>
      </Card>
      
      <Card className="p-6 bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-300 text-sm font-medium">إجمالي المشاركين</p>
            <p className="text-3xl font-bold text-white">{totalParticipants || 0}</p>
          </div>
          <Users className="w-8 h-8 text-green-400" />
        </div>
      </Card>
      
      <Card className="p-6 bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-300 text-sm font-medium">متوسط النجاح</p>
            <p className="text-3xl font-bold text-white">{averageScore || 0}%</p>
          </div>
          <CheckCircle className="w-8 h-8 text-purple-400" />
        </div>
      </Card>
    </motion.div>
  );
};

export default DashboardStats;