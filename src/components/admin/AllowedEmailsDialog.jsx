import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';

const AllowedEmailsDialog = ({ exam, onClose, onSuccess }) => {
  const [isRestricted, setIsRestricted] = useState(false);
  const [emailsText, setEmailsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (exam) {
      setIsRestricted(exam.is_restricted_by_email || false);
      setEmailsText((exam.allowed_emails || []).join(', '));
    }
  }, [exam]);

  const handleSave = async () => {
    setIsSaving(true);
    const emailsArray = emailsText
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email !== '');

    const { error } = await supabase
      .from('tests')
      .update({
        is_restricted_by_email: isRestricted,
        allowed_emails: isRestricted ? emailsArray : null,
      })
      .eq('id', exam.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "خطأ",
        description: `فشل في تحديث الإعدادات: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم الحفظ",
        description: "تم تحديث إعدادات الوصول بنجاح.",
      });
      onSuccess();
    }
  };

  if (!exam) return null;

  return (
    <Dialog open={!!exam} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>تقييد الوصول للاختبار: {exam.title}</DialogTitle>
        </DialogHeader>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 py-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="restrict-mode"
              checked={isRestricted}
              onCheckedChange={setIsRestricted}
            />
            <Label htmlFor="restrict-mode" className="text-lg">تفعيل التقييد بالبريد الإلكتروني</Label>
          </div>

          <AnimatePresence>
            {isRestricted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <Label htmlFor="emails">قائمة الإيميلات المسموح بها (افصل بينها بفاصلة)</Label>
                <Textarea
                  id="emails"
                  value={emailsText}
                  onChange={(e) => setEmailsText(e.target.value)}
                  placeholder="example1@mail.com, example2@mail.com, ..."
                  className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">إلغاء</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllowedEmailsDialog;