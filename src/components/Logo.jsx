import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Logo = () => {
    const navigate = useNavigate();
    return (
        <motion.div
            className="flex justify-center items-center my-8 cursor-pointer"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <motion.div
                animate={{
                    scale: [1, 1.02, 1],
                    rotate: [0, 0.5, -0.5, 0],
                }}
                transition={{
                    duration: 8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror"
                }}
            >
                <img  
                    alt="شعار كود السياقة الإصدار الجديد" 
                    className="w-52 h-52 md:w-60 md:h-60 object-contain drop-shadow-lg"
                    src="/IMG_4216.png"  // هنا غيرت اللينك باش يشير للصورة في public
                />
            </motion.div>
        </motion.div>
    );
};

export default Logo;
