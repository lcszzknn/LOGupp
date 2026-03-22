import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError(err.response?.data?.error || 'Erro ao fazer login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-800 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-white mb-8">Bem-vindo de volta</h2>
        
        {error && (
          <div className="bg-red-900/30 text-red-400 border border-red-500/30 p-4 rounded-lg mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-700 rounded-xl focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-3 bg-neutral-950 border border-neutral-700 rounded-xl focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4 mb-2">
            <p className="text-xs text-neutral-500 text-center">
              Precisa de acesso de profissional?<br/>
              <span className="font-medium text-neutral-400">Solicite sua conta ao administrador.</span>
            </p>
            <div className="border-t border-neutral-800/50 pt-4">
              <p className="text-sm text-center text-neutral-400">
                É um cliente novo?{' '}
                <Link to="/register" className="text-yellow-500 hover:text-yellow-400 font-medium">
                  Criar conta
                </Link>
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-neutral-900 bg-yellow-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
          >
            Entrar
          </button>
        </form>

        {/* Registration removed */}
      </div>
    </div>
  );
}
