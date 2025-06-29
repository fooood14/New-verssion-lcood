import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { LogIn, Mail, Lock, UserPlus, Settings } from 'lucide-react';
import SiteAdminLoginDialog from '@/components/admin/SiteAdminLoginDialog';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Allow registration for anyone
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        if (signUpData.user && !signUpData.session) {
           toast({
            title: "التسجيل شبه مكتمل!",
            description: "لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني. يرجى التحقق منه لإكمال التسجيل.",
            variant: "default",
            duration: 7000,
          });
          setEmail('');
          setPassword('');
        }
      } else {
        // On Login, validate if the email is allowed first
        const { data: validationData, error: validationError } = await supabase.functions.invoke('validate-user-on-login', {
          body: JSON.stringify({ email }),
        });

        if (validationError) throw validationError;
        if (validationData.error) throw new Error(validationData.error);

        if (!validationData.isAllowed) {
            throw new Error("هذا الحساب غير مصرح له بالدخول.");
        }

        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        if (signInData.user && signInData.session) {
          toast({
            title: "تم تسجيل الدخول بنجاح!",
            description: "مرحباً بعودتك!",
          });
          navigate('/permanent-exams');
        }
      }
    } catch (error) {
      toast({
        title: "خطأ في المصادقة",
        description: error.message || "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <Button onClick={() => setShowAdminDialog(true)} variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
          <Settings className="h-6 w-6" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center mb-6">
            <img 
            src="https://storage.googleapis.com/hostinger-horizons-assets-prod/c3b1096e-23b4-4946-8835-5c8199a4ad3b/c035ba67552d9fbfd218dcbf2db7928b.png" 
            alt="شعار كود السياقة الإصدار الجديد" 
            className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"
            />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
        </h1>
        <p className="text-lg text-gray-300 mt-2">
          {isSignUp ? 'انضم إلينا لإدارة اختباراتك بسهولة' : 'مرحباً بك في لوحة تحكم الاختبارات'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-white mb-2 block flex items-center">
                <Mail className="w-4 h-4 mr-2 text-yellow-400" />
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                required
                className="bg-slate-700 border-slate-600 text-white text-lg p-4 focus:border-yellow-500"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-white mb-2 block flex items-center">
                <Lock className="w-4 h-4 mr-2 text-yellow-400" />
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                className="bg-slate-700 border-slate-600 text-white text-lg p-4 focus:border-yellow-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-70"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
              ) : (
                <div className="flex items-center justify-center">
                  {isSignUp ? <UserPlus className="w-5 h-5 ml-2" /> : <LogIn className="w-5 h-5 ml-2" />}
                  {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              {isSignUp ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400">
            <p>عند {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}، فإنك توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.</p>
          </div>
        </Card>
      </motion.div>
    </div>
    <SiteAdminLoginDialog open={showAdminDialog} onOpenChange={setShowAdminDialog} />
    </>
  );
};

export default LoginPage;