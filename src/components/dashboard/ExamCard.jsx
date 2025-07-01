import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, ListTodo, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const ExamCard = ({ exam, onSessionCreated }) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  const handleCreateSession = async (withVideo) => {
    setCreatingSession(true);

    const { data, error } = await supabase
      .from('live_sessions')
      .insert([
        {
          test_id: exam.id,
          with_video: withVideo,
        },
      ])
      .select()
      .single();

    setCreatingSession(false);
    setDialogOpen(false);

    if (error || !data) {
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء الجلسة.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'تم إنشاء الجلسة بنجاح' });
    if (onSessionCreated) onSessionCreated();
    navigate(`/session/${data.id}`);
  };

  return (
    <Card className="bg-slate-800/40 border-slate-700 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-white">{exam.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-slate-300 gap-2">
          <ListTodo className="w-4 h-4" />
          <span>{exam.questions_count} سؤال</span>
        </div>
        <div className="flex items-center text-sm text-slate-300 gap-2">
          <Users className="w-4 h-4" />
          <span>{exam.participants_count} مشارك</span>
        </div>
        <div className="flex items-center text-sm text-slate-300 gap-2">
          <Clock className="w-4 h-4" />
          <span>{exam.duration} دقيقة</span>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              <Play className="w-4 h-4 ml-2" />
              إنشاء جلسة مباشرة
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border border-slate-700 text-white text-center">
            <h2 className="text-xl font-bold mb-4">خيارات الجلسة</h2>
            <p className="mb-6 text-slate-300">هل تريد عرض فيديوهات الأسئلة أثناء الجلسة؟</p>
            <div className="flex flex-col gap-4">
              <Button
                onClick={() => handleCreateSession(true)}
                disabled={creatingSession}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                ✅ بالفيديو
              </Button>
              <Button
                onClick={() => handleCreateSession(false)}
                disabled={creatingSession}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                🚫 بدون فيديو
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ExamCard;
