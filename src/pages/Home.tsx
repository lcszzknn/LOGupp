import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (user.role === 'professional') {
        navigate('/dashboard');
      } else {
        navigate('/client-dashboard');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      login(response.data.token, response.data.user);
      
      const userRole = response.data.user.role;
      if (userRole === 'admin') {
        navigate('/admin-dashboard');
      } else if (userRole === 'professional') {
        navigate('/dashboard');
      } else {
        navigate('/client-dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Premium Deep Animated Background Effects */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 50, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-yellow-500/10 blur-[140px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-yellow-600/15 blur-[130px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, 30, -30, 0],
            y: [0, 30, -30, 0],
            scale: [1, 0.9, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-white/[0.04] blur-[100px]" 
        />
      </div>

      {/* Subtle Noise Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-overlay" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Logo Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="fixed top-0 left-0 w-full p-0 flex justify-between items-center z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3">
          <Logo className="h-48 w-auto -mt-12 -ml-6 drop-shadow-2xl" />
        </div>
      </motion.div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[440px] px-6 z-10"
      >
        <div className="bg-[#0A0A0A]/60 backdrop-blur-[40px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          
          {/* Top highlight border */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent"></div>
          {/* Subtle glowing ring overlay */}
          <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 pointer-events-none"></div>

          <div className="mb-10 space-y-2 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-[28px] font-semibold text-white tracking-tight"
            >
              Acesso ao Sistema
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-neutral-400 font-light text-sm"
            >
              Insira suas credenciais ou solicite-as ao administrador.
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-2xl text-xs font-medium backdrop-blur-sm flex flex-col items-center justify-center text-center gap-2"
              >
                {error}
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="group"
            >
              <label className="block text-[10px] font-bold text-neutral-500 mb-2 ml-1 uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-[18px] w-[18px] text-neutral-500 group-focus-within:text-yellow-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-5 py-[18px] bg-[#111111]/80 hover:bg-[#151515] border border-white/[0.05] rounded-2xl focus:ring-1 focus:ring-yellow-500/30 focus:border-yellow-500/50 focus:bg-[#0B0B0B] text-white text-sm placeholder-neutral-600 transition-all font-light outline-none"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="group"
            >
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Senha</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-[18px] w-[18px] text-neutral-500 group-focus-within:text-yellow-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-5 py-[18px] bg-[#111111]/80 hover:bg-[#151515] border border-white/[0.05] rounded-2xl focus:ring-1 focus:ring-yellow-500/30 focus:border-yellow-500/50 focus:bg-[#0B0B0B] text-white text-sm placeholder-neutral-600 transition-all font-light outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="pt-2"
            >
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center items-center gap-2 py-[18px] px-4 rounded-2xl text-sm font-semibold text-black bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-yellow-500 transition-all shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:shadow-[0_0_35px_rgba(234,179,8,0.3)] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 group-hover:text-black/80 transition-transform" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          {/* Registration removed as per request (admin only) */}
        </div>
      </motion.div>
    </div>
  );
}
