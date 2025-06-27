import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/Logo';

const RegistrationStep = ({ exam, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (exam?.is_restricted_by_email) {
      onSubmit({ email });
    } else {
      onSubmit({ name, phone });
    }
  };

  const isRestricted = exam?.is_restricted_by_email;

  return (
    <motion.div
      key="registration"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl w-full mx-auto"
    >
      <Logo />

      <Card className="p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700 backdrop-blur-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{exam.title}</h1>
          <div className="flex justify-center gap-6 text-gray-300">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span>{exam.duration} دقيقة</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>{exam.questions.length} سؤال</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isRestricted ? (
             <div>
               <Label htmlFor="email" className="text-white mb-2 block">البريد الإلكتروني</Label>
               <Input
                 id="email"
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="أدخل بريدك الإلكتروني المسموح به"
                 className="bg-slate-700 border-slate-600 text-white text-lg p-4"
               />
             </div>
          ) : (
            <>
              <div>
                <Label htmlFor="name" className="text-white mb-2 block">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  className="bg-slate-700 border-slate-600 text-white text-lg p-4"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-white mb-2 block">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="أدخل رقم هاتفك"
                  className="bg-slate-700 border-slate-600 text-white text-lg p-4"
                />
              </div>
            </>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-4 text-lg font-semibold"
          >
            بدء الاختبار
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default RegistrationStep;