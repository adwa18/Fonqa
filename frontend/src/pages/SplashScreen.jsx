// src/pages/SplashScreen.jsx
import { motion } from 'framer-motion';
export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full tg-bg">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="text-6xl mb-4">💕</motion.div>
      <h1 className="text-2xl font-bold fonqa-text">Fonqa</h1>
      <p className="text-sm amharic text-gray-500 mt-1">ፎንቃ</p>
    </div>
  );
}
