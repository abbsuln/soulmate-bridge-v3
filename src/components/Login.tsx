import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Lock, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: 'abbas' | 'fatima') => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [selectedUser, setSelectedUser] = useState<'abbas' | 'fatima' | null>(null);
  const [showPass, setShowPass] = useState(false);
  const SECRET = "always";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === SECRET && selectedUser) {
      onLogin(selectedUser);
    } else {
      setError(true);
      if (window.navigator.vibrate) window.navigator.vibrate([80, 40, 80]);
      setTimeout(() => setError(false), 2000);
    }
  };

  const users = [
    { id: 'abbas' as const, label: 'عباس', emoji: '💙', from: 'from-blue-600', to: 'to-blue-400', glow: 'shadow-blue-500/25', activeBorder: 'border-blue-500/50 bg-blue-500/8' },
    { id: 'fatima' as const, label: 'فاطمة', emoji: '🌸', from: 'from-pink-500', to: 'to-rose-400', glow: 'shadow-pink-500/25', activeBorder: 'border-pink-500/50 bg-pink-500/8' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0d0d0f] font-sans text-white relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#8774e1]/8 rounded-full filter blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-500/8 rounded-full filter blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="mb-10 flex flex-col items-center"
      >
        <div className="relative mb-5">
          <div className="w-[76px] h-[76px] rounded-[22px] bg-gradient-to-br from-[#8774e1] to-pink-400 flex items-center justify-center shadow-2xl shadow-[#8774e1]/30">
            <Heart className="w-9 h-9 text-white fill-white" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-[22px] bg-[#8774e1]/40 pointer-events-none"
          />
        </div>
        <h1 className="text-[22px] font-bold text-white tracking-wide">SoulMate Bridge</h1>
        <p className="text-white/35 text-[13px] mt-1">مساحتنا الخاصة</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[340px] px-5"
      >
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <p className="text-white/40 text-[13px] text-center mb-4">من أنت؟</p>
            <div className="grid grid-cols-2 gap-3">
              {users.map(u => (
                <motion.button
                  key={u.id}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedUser(u.id)}
                  className={`relative py-5 rounded-[20px] border-2 transition-all duration-300 flex flex-col items-center gap-2.5 ${
                    selectedUser === u.id
                      ? `${u.activeBorder} shadow-xl ${u.glow}`
                      : 'border-white/6 bg-white/3 hover:bg-white/6'
                  }`}
                >
                  <div className={`w-[46px] h-[46px] rounded-[14px] bg-gradient-to-br ${u.from} ${u.to} flex items-center justify-center text-[22px] shadow-lg`}>
                    {u.emoji}
                  </div>
                  <span className={`font-bold text-[16px] transition-colors ${selectedUser === u.id ? 'text-white' : 'text-white/45'}`}>
                    {u.label}
                  </span>
                  {selectedUser === u.id && (
                    <motion.div
                      layoutId="sel"
                      className="absolute inset-0 rounded-[18px] ring-1 ring-inset ring-white/10 pointer-events-none"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <motion.div
                  animate={error ? { x: [-10, 10, -7, 7, -4, 4, 0] } : {}}
                  transition={{ duration: 0.45 }}
                  className="relative"
                >
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-white/25 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    placeholder="الرمز السري"
                    autoFocus
                    className={`w-full bg-white/5 border-2 rounded-[16px] py-[14px] pr-10 pl-10 text-center tracking-[0.45em] text-white text-[18px] focus:outline-none transition-all duration-300 ${
                      error
                        ? 'border-red-500/55 bg-red-500/5 placeholder:text-red-400/40'
                        : 'border-white/8 focus:border-white/18 focus:bg-white/7'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-[15px] h-[15px]" /> : <Eye className="w-[15px] h-[15px]" />}
                  </button>
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-[13px] text-center"
                    >
                      الرمز غير صحيح، حاول مرة ثانية
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  disabled={!passcode}
                  className="w-full bg-gradient-to-l from-[#8774e1] to-[#a08df5] text-white rounded-[16px] py-[14px] font-bold text-[16px] shadow-xl shadow-[#8774e1]/20 disabled:opacity-35 disabled:shadow-none transition-all duration-300"
                >
                  دخول
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
