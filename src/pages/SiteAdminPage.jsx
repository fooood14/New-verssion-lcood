import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Trash2, Shield, MailPlus, ServerCrash, List } from 'lucide-react';
import Logo from '@/components/Logo';

const SiteAdminPage = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const getPin = () => sessionStorage.getItem('siteAdminPin');

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const pin = getPin();
      if (!pin) throw new Error("Admin PIN not found.");

      const { data, error } = await supabase.functions.invoke('manage-global-emails', {
        body: JSON.stringify({ action: 'GET' }),
        headers: { Authorization: `Bearer ${pin}` }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setEmails(data);
    } catch (err) {
      toast({ title: "خطأ", description: `فشل في جلب الإيميلات: ${err.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast({ title: "تنبيه", description: "حقل البريد الإلكتروني لا يمكن أن يكون فارغاً." });
      return;
    }
    setIsSubmitting(true);
    try {
      const pin = getPin();
      if (!pin) throw new Error("Admin PIN not found.");

      const { data, error } = await supabase.functions.invoke('manage-global-emails', {
        body: JSON.stringify({ action: 'ADD', payload: { email: newEmail } }),
        headers: { Authorization: `Bearer ${pin}` }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "تمت الإضافة", description: `تمت إضافة ${data.email} بنجاح.` });
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      toast({ title: "خطأ", description: `فشل في إضافة البريد الإلكتروني: ${err.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteEmail = async (id) => {
    try {
      const pin = getPin();
      if (!pin) throw new Error("Admin PIN not found.");

      const { data, error } = await supabase.functions.invoke('manage-global-emails', {
        body: JSON.stringify({ action: 'DELETE', payload: { id } }),
        headers: { Authorization: `Bearer ${pin}` }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      toast({ title: "تم الحذف", description: "تم حذف البريد الإلكتروني بنجاح." });
      fetchEmails();
    } catch (err) {
      toast({ title: "خطأ", description: `فشل في حذف البريد الإلكتروني: ${err.message}`, variant: "destructive" });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isSiteAdminAccess');
    sessionStorage.removeItem('siteAdminPin');
    navigate('/login');
    toast({ title: "تم الخروج من وضع الإدارة" });
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="absolute top-6 left-6">
          <Button onClick={handleLogout} variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-700">
            <LogOut className="w-5 h-5 ml-2" />
            خروج
          </Button>
        </div>
        <div className="text-center mt-4 mb-8">
            <Logo />
        </div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4 flex items-center justify-center gap-3">
            <Shield className="w-10 h-10"/>
            إدارة الموقع
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            التحكم في قائمة الإيميلات المسموح لها بالتسجيل في المنصة.
          </p>
        </motion.div>

        <Card className="bg-slate-800/50 border-slate-700 text-white mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><MailPlus/>إضافة بريد إلكتروني جديد</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row gap-4">
                    <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="example@email.com"
                        required
                        className="bg-slate-700 border-slate-600 text-white text-lg p-4 flex-grow"
                    />
                    <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-green-500 to-cyan-600 hover:from-green-600 hover:to-cyan-700 text-white px-6 py-4 text-md font-semibold">
                        {isSubmitting ? 'جاري الإضافة...' : <div className="flex items-center gap-2"><Plus className="w-5 h-5"/> إضافة</div>}
                    </Button>
                </form>
            </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><List/>
              قائمة الإيميلات المسموح بها ({emails.length})
              <span className="text-sm text-gray-400">(إذا كانت القائمة فارغة، يمكن للجميع التسجيل)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-3"></div>
                <p>جاري تحميل القائمة...</p>
              </div>
            ) : emails.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-gray-400">
                <ServerCrash className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-2xl font-semibold text-slate-500">القائمة فارغة</h3>
                <p className="text-slate-600">حالياً، يمكن لأي شخص التسجيل. أضف بريداً إلكترونياً لبدء التقييد.</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {emails.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <span className="font-mono text-cyan-300">{item.email}</span>
                      <Button onClick={() => handleDeleteEmail(item.id)} variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/20 hover:text-red-300">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SiteAdminPage;