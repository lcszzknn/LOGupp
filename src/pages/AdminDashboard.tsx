import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Users, CreditCard, ShieldCheck, Plus, Trash2, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function AdminDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'professional' | 'client'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users', error);
    }
  };

  const toggleUserStatus = async (id: number, currentStatus: string) => {
    try {
      await axios.put(`/api/admin/users/${id}/status`, { 
        status: currentStatus === 'active' ? 'inactive' : 'active' 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      showToast(`Status do usuário atualizado com sucesso!`);
    } catch (error) {
      console.error('Error updating status', error);
      showToast('Erro ao atualizar status do usuário', 'error');
    }
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      showToast('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting user', error);
      showToast('Erro ao excluir usuário.', 'error');
    }
  };

  const handleCreateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/admin/users', {
        ...formData,
        role: 'professional'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '' });
      fetchUsers();
      showToast('Dono de negócio criado com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar dono de negócio');
      showToast('Erro ao criar dono de negócio', 'error');
    }
  };

  const filteredUsers = users.filter(u => filter === 'all' || u.role === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Painel Administrativo</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-yellow-500 text-neutral-900 px-4 py-2 rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Novo Dono de Negócio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-900/30 p-3 rounded-xl">
              <Users className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Total de Usuários</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-900/30 p-3 rounded-xl">
              <CreditCard className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Assinaturas Ativas</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.role === 'professional' && u.subscription_status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-amber-900/30 p-3 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Donos de Negócio</p>
              <p className="text-2xl font-bold text-white">
                {users.filter(u => u.role === 'professional').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">Gerenciar Acessos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('professional')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'professional' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              Donos de Negócio
            </button>
            <button
              onClick={() => setFilter('client')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'client' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              Clientes
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-800/50 text-white font-medium border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-neutral-800/50">
                  <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4 capitalize">
                    {u.role === 'professional' ? 'Dono de Negócio' : u.role === 'client' ? 'Cliente' : u.role}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.status === 'active' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleUserStatus(u.id, u.status)}
                        className={`font-medium ${u.status === 'active' ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                      >
                        {u.status === 'active' ? 'Suspender' : 'Reativar'}
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-red-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Dono de Negócio */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md border border-neutral-800 overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h2 className="text-xl font-bold text-white">Novo Dono de Negócio</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProfessional} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm border border-red-500/20">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Nome e sobrenome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  placeholder="Nome do profissional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-yellow-500 text-neutral-900 py-2.5 rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
                >
                  Criar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
