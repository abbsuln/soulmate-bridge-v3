import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';
import Login from './components/Login';
import Chat from './components/Chat';

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-[9999] px-6 text-center" dir="rtl">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-rose-500/10 blur-[90px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center relative"
      >
        <div className="relative flex items-center justify-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="absolute w-24 h-24 rounded-full border border-rose-500/30"
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="relative z-10 w-16 h-16 flex items-center justify-center bg-gradient-to-br from-rose-500/20 to-rose-600/10 rounded-full border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.2)]"
          >
            <Heart className="w-8 h-8 text-rose-400 fill-rose-500" />
          </motion.div>
        </div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-amber-200"
        >
          نبضُ العشّاق
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 0.6 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xs font-light tracking-widest text-slate-300 mt-2"
        >
          عباس ❤️ فاطمة
        </motion.p>

        <div className="w-32 h-[2px] bg-white/10 rounded-full mt-10 overflow-hidden relative">
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="absolute h-full w-[60%] bg-gradient-to-r from-transparent via-rose-400 to-transparent"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<'abbas' | 'fatima' | null>(() => {
    return localStorage.getItem('chat_user_v2') as 'abbas' | 'fatima' | null;
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (user: 'abbas' | 'fatima') => {
    setCurrentUser(user);
    localStorage.setItem('chat_user_v2', user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('chat_user_v2');
  };

  const otherUser = currentUser === 'abbas' ? 'fatima' : 'abbas';

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>

      {!showSplash && (
        currentUser
          ? <Chat currentUser={currentUser} onLogout={handleLogout} otherUser={otherUser} />
          : <Login onLogin={handleLogin} />
      )}
    </>
  );
}
