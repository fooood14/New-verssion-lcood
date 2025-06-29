import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const SiteAdminLoginDialog = ({ open, onOpenChange }) => {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (pin === 'lcood2285') {
      sessionStorage.setItem('isSiteAdminAccess', 'true');
      sessionStorage.setItem('siteAdminPin', pin);
      toast({ title: "تم التحقق بنجاح", description: "مرحباً بمسؤول الموقع!" });
      navigate('/site-admin');
      onOpenChange(false);
    } else {
      toast({ title: "خطأ في التحقق", description: "الرمز السري غير صحيح.", variant: "destructive" });
    }
    setPin('');
  };
  
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="text-green-400" />
            <span>إدارة الموقع</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            الرجاء إدخال الرمز السري للوصول إلى لوحة تحكم إدارة الموقع.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="pin" className="text-right sr-only">الرمز السري</Label>
          <Input 
            id="pin" 
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ادخل الرمز السري هنا"
            className="bg-slate-800 border-slate-600 text-white text-center tracking-widest"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent hover:bg-slate-700">إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogin} className="bg-green-600 hover:bg-green-700">
            دخول
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SiteAdminLoginDialog;