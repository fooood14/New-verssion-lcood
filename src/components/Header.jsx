import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogIn } from 'lucide-react';

const Header = ({ session }) => {
    const navigate = useNavigate();

    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                     <img  alt="شعار النظام" className="w-12 h-12 object-contain" src="https://storage.googleapis.com/hostinger-horizons-assets-prod/c3b1096e-23b4-4946-8835-5c8199a4ad3b/f63af81a480e9397b8bf730c054efd38.png" />
                     <span className="text-xl font-bold text-white">اختبارات السياقة</span>
                </div>
                <div className="flex items-center gap-4">
                    {session ? (
                         <Button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                            <LayoutDashboard className="w-4 h-4 ml-2" />
                            لوحة التحكم
                        </Button>
                    ) : (
                        <Button onClick={() => navigate('/login')} variant="outline" className="text-slate-300 border-slate-600 hover:bg-slate-700">
                            <LogIn className="w-4 h-4 ml-2" />
                            تسجيل الدخول
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;