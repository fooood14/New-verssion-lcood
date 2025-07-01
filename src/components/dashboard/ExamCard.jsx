import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Play } from 'lucide-react';

const ExamCard = ({ exam }) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const createLiveSession = async (withVideo) => {
    setLoading(true);
    const { data, error } = await supabase.from('tests').insert([{
      title: exam.title,
      duration: exam.duration,
      original_test_id: exam.id,
      with_video: withVideo,
      user_id: exam.user_id
    }]).select('id').single();

    setLoading(false);

    if (error || !data) {
      toast({ title: 'خطأ', description: 'فشل في إنشاء الجلسة.', variant: 'destructive' });
      return;
    }

    toast({ title: 'تم الإنشاء', description: 'تم إنشاء الجلسة بنجاح!' });
    navigate(`/session/${data.id}`);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="text-xl">{exam.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-between items-center">
        <span className="text-sm text-slate-400">المدة: {exam.duration} دقيقة</span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Play className="w-4 h-4 ml-2" /> إنشاء جلسة مباشرة
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg">اختيار نوع الجلسة</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
              <Button
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  setDialogOpen(false);
                  createLiveSession(true);
                }}
              >
                بالفيديو 🎥
              </Button>
              <Button
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 text-white"
                onClick={() => {
                  setDialogOpen(false);
                  createLiveSession(false);
                }}
              >
                بدون فيديو ❌
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ExamCard;
