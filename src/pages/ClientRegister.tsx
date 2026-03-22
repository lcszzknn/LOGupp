import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2, Sparkles, UserPlus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function ClientRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        role: 'client'
      });
      login(response.data.user, response.data.token);
      showToast('Conta criada com sucesso! Seja bem-vindo(a).');
      navigate('/client-dashboard');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao criar conta', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-[20%] -left-[10%] w-[50%] h-[70%] rounded-full bg-yellow-500/20 blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[80%] rounded-full bg-amber-600/20 blur-[150px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-md w-full z-10">
        <div className="relative backdrop-blur-xl bg-neutral-900/60 border border-neutral-800/80 rounded-[2rem] p-8 shadow-2xl overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-2 bg-yellow-500/10 rounded-xl mb-4 border border-yellow-500/20">
               <UserPlus className="h-5 w-5 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Criar Conta</h2>
            <p className="text-neutral-400 text-sm mt-2">Cadastre-se para agendar com os profissionais.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-4">
              <div className="relative group">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 mb-1">Nome Completo</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 h-5 w-5 text-neutral-500 group-focus-within:text-yellow-500 transition-colors" />
                  <input type="text" required className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all text-sm" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 mb-1">E-mail</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 h-5 w-5 text-neutral-500 group-focus-within:text-yellow-500 transition-colors" />
                  <input type="email" required className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all text-sm" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 mb-1">Senha</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 h-5 w-5 text-neutral-500 group-focus-within:text-yellow-500 transition-colors" />
                  <input type="password" required className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 transition-all text-sm" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full relative group mt-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-neutral-900 rounded-xl py-3.5 font-bold shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_25px_rgba(234,179,8,0.4)] transition-all overflow-hidden">
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Cadastrar <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>}
              </span>
            </button>
          </form>

          <div className="mt-6 text-center pt-5 border-t border-neutral-800/50">
            <p className="text-sm text-neutral-400">
              Já tem uma conta? <Link to="/login" className="text-yellow-500 hover:text-yellow-400 font-medium ml-1">Fazer Login</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
