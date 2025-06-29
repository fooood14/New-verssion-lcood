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

const AdminLoginDialog = ({ open, onOpenChange }) => {
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (pin === 'lcood2285') {
      sessionStorage.setItem('isAdminAccess', 'true');
      toast({ title: "تم التحقق بنجاح", description: "مرحباً أيها المسؤول!" });
      navigate('/admin');
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
            <ShieldCheck className="text-yellow-400" />
            <span>دخول المسؤول</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            الرجاء إدخال الرمز السري للوصول إلى قسم إدارة الاختبارات الثابتة.
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
          <AlertDialogAction onClick={handleLogin} className="bg-yellow-500 hover:bg-yellow-600">
            دخول
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AdminLoginDialog;