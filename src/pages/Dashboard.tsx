import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, DollarSign, Settings, User, CheckCircle, Trash2, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Dashboard() {
  const { user, token, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [profileData, setProfileData] = useState({ business_name: '', description: '', photo_url: '', city: '', instagram: '', banner_url: '' });

  const defaultHours = [
    { day_of_week: 0, start_time: '09:00', end_time: '18:00', is_active: false },
    { day_of_week: 1, start_time: '09:00', end_time: '18:00', is_active: true },
    { day_of_week: 2, start_time: '09:00', end_time: '18:00', is_active: true },
    { day_of_week: 3, start_time: '09:00', end_time: '18:00', is_active: true },
    { day_of_week: 4, start_time: '09:00', end_time: '18:00', is_active: true },
    { day_of_week: 5, start_time: '09:00', end_time: '18:00', is_active: true },
    { day_of_week: 6, start_time: '09:00', end_time: '14:00', is_active: true }
  ];
  const [workingHours, setWorkingHours] = useState<any[]>(defaultHours);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');

  useEffect(() => {
    if (user?.professionalData) {
      setProfileData({
        business_name: user.professionalData.business_name || '',
        description: user.professionalData.description || '',
        photo_url: user.professionalData.photo_url || '',
        city: user.professionalData.city || '',
        instagram: user.professionalData.instagram || '',
        banner_url: user.professionalData.banner_url || ''
      });
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [apptsRes, servsRes, hoursRes, blockedRes] = await Promise.all([
        axios.get('/api/appointments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/professional/hours', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/professional/blocked-dates', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAppointments(apptsRes.data);
      setServices(servsRes.data);
      if (hoursRes.data && hoursRes.data.length > 0) {
        setWorkingHours(hoursRes.data);
      } else {
        setWorkingHours(defaultHours);
      }
      setBlockedDates(blockedRes.data || []);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  const handleSaveHours = async () => {
    try {
      await axios.put('/api/professional/hours', { hours: workingHours }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Horários atualizados com sucesso!');
    } catch (error) {
      console.error('Error saving hours', error);
      showToast('Erro ao atualizar horários', 'error');
    }
  };

  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate) return;
    try {
      await axios.post('/api/professional/blocked-dates', { date: newBlockedDate }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      setNewBlockedDate('');
      showToast('Data bloqueada com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao bloquear data', 'error');
    }
  };

  const handleRemoveBlockedDate = async (date: string) => {
    if (!confirm('Deseja remover o bloqueio desta data?')) return;
    try {
      await axios.delete(`/api/professional/blocked-dates/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Bloqueio removido com sucesso!');
    } catch (error) {
      console.error(error);
      showToast('Erro ao remover bloqueio', 'error');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put('/api/professional/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      showToast('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile', error);
      showToast('Erro ao atualizar perfil', 'error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_url' | 'banner_url') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/services', {
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewService({ name: '', price: '', duration: '' });
      fetchData();
      showToast('Serviço adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding service', error);
      showToast('Erro ao adicionar serviço', 'error');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Deseja realmente excluir este serviço?')) return;
    try {
      await axios.delete(`/api/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting service', error);
      showToast('Erro ao excluir serviço', 'error');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await axios.put(`/api/appointments/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Status do agendamento atualizado!');
    } catch (error) {
      console.error('Error updating status', error);
      showToast('Erro ao atualizar status', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard Profissional</h1>
        <div className="bg-emerald-900/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
          Plano Ativo
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-900/30 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Agendamentos Hoje</p>
              <p className="text-2xl font-bold text-white">
                {appointments.filter(a => new Date(a.start_time).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-900/30 p-3 rounded-xl">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Receita Prevista (Mês)</p>
              <p className="text-2xl font-bold text-white">
                R$ {appointments.reduce((acc, curr) => acc + curr.price, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="bg-amber-900/30 p-3 rounded-xl">
              <User className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-neutral-400 font-medium">Total de Clientes</p>
              <p className="text-2xl font-bold text-white">
                {new Set(appointments.map(a => a.client_id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appointments List */}
        <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-xl font-semibold text-white">Próximos Agendamentos</h2>
          </div>
          <div className="divide-y divide-neutral-800">
            {appointments.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">Nenhum agendamento encontrado.</div>
            ) : (
              appointments.map((apt) => (
                <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors">
                  <div>
                    <p className="font-semibold text-white">{apt.client_name}</p>
                    <p className="text-sm text-neutral-400">{apt.service_name} - R$ {apt.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-yellow-500 font-medium">
                      <Clock className="h-4 w-4" />
                      {format(new Date(apt.start_time), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-center ${
                      apt.status === 'scheduled' ? 'bg-blue-900/30 text-blue-400' :
                      apt.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                    </span>
                    {apt.status === 'scheduled' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusChange(apt.id, 'completed')} className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-900/50">Concluir</button>
                        <button onClick={() => handleStatusChange(apt.id, 'cancelled')} className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded hover:bg-red-900/50">Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Services Management */}
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">Meus Serviços</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddService} className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Nome do serviço"
                  required
                  className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  value={newService.name}
                  onChange={e => setNewService({...newService, name: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Preço (R$)"
                  required
                  min="0"
                  step="0.01"
                  className="w-24 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  value={newService.price}
                  onChange={e => setNewService({...newService, price: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Minutos"
                  required
                  min="1"
                  className="w-24 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  value={newService.duration}
                  onChange={e => setNewService({...newService, duration: e.target.value})}
                />
                <button type="submit" className="bg-yellow-500 text-neutral-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-400">
                  Adicionar
                </button>
              </form>

              <div className="divide-y divide-neutral-800">
                {services.map(service => (
                  <div key={service.id} className="py-3 flex justify-between items-center group">
                    <div>
                      <p className="font-medium text-white">{service.name}</p>
                      <p className="text-sm text-neutral-400">{service.duration} minutos</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-white">R$ {service.price.toFixed(2)}</p>
                      <button 
                        onClick={() => handleDeleteService(service.id)}
                        className="text-neutral-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-neutral-800 opacity-0 group-hover:opacity-100"
                        title="Excluir serviço"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Horários de Atendimento */}
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Horários de Atendimento</h2>
              <button 
                onClick={handleSaveHours}
                className="bg-yellow-500 text-neutral-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-400 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, idx) => {
                  const dayHour = workingHours.find(h => h.day_of_week === idx) || defaultHours[idx];
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-950/50">
                      <div className="flex items-center gap-4 w-1/3">
                        <input 
                          type="checkbox" 
                          checked={!!dayHour.is_active}
                          onChange={(e) => {
                            const newHours = [...workingHours];
                            const hIndex = newHours.findIndex(h => h.day_of_week === idx);
                            if(hIndex >= 0) newHours[hIndex].is_active = e.target.checked;
                            setWorkingHours(newHours);
                          }}
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-neutral-950"
                        />
                        <span className={`font-medium ${dayHour.is_active ? 'text-white' : 'text-neutral-500'}`}>{dayName}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 w-2/3 justify-end">
                        <input 
                          type="time"
                          disabled={!dayHour.is_active}
                          value={dayHour.start_time}
                          onChange={(e) => {
                            const newHours = [...workingHours];
                            const hIndex = newHours.findIndex(h => h.day_of_week === idx);
                            if(hIndex >= 0) newHours[hIndex].start_time = e.target.value;
                            setWorkingHours(newHours);
                          }}
                          className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50"
                        />
                        <span className="text-neutral-500">até</span>
                        <input 
                          type="time"
                          disabled={!dayHour.is_active}
                          value={dayHour.end_time}
                          onChange={(e) => {
                            const newHours = [...workingHours];
                            const hIndex = newHours.findIndex(h => h.day_of_week === idx);
                            if(hIndex >= 0) newHours[hIndex].end_time = e.target.value;
                            setWorkingHours(newHours);
                          }}
                          className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bloqueio de Imprevistos / Folgas */}
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">Bloqueio de Imprevistos / Folgas</h2>
              <p className="text-sm text-neutral-400 mt-1">Selecione datas específicas para marcar como "Fora de Serviço".</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddBlockedDate} className="flex gap-4 mb-6">
                <input
                  type="date"
                  required
                  className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:ring-yellow-500 focus:border-yellow-500 text-white"
                  value={newBlockedDate}
                  onChange={e => setNewBlockedDate(e.target.value)}
                />
                <button type="submit" className="bg-red-900/40 text-red-500 border border-red-900/50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-900/60 transition-colors">
                  Bloquear Data
                </button>
              </form>

              <div className="divide-y divide-neutral-800">
                {blockedDates.map(date => (
                  <div key={date} className="py-3 flex justify-between items-center group">
                    <p className="font-medium text-white">{format(new Date(`${date}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                    <button 
                      onClick={() => handleRemoveBlockedDate(date)}
                      className="text-neutral-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-neutral-800 opacity-0 group-hover:opacity-100"
                      title="Desbloquear data"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {blockedDates.length === 0 && (
                  <p className="text-sm text-neutral-500 py-2">Nenhuma data bloqueada.</p>
                )}
              </div>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">Configurações do Perfil</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Foto de Perfil</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700 flex-shrink-0">
                        {profileData.photo_url ? (
                          <img src={profileData.photo_url} alt="Perfil" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500"><User className="h-6 w-6" /></div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'photo_url')}
                        className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/10 file:text-yellow-500 hover:file:bg-yellow-500/20 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Banner (Capa)</label>
                    <div className="flex flex-col gap-3">
                      <div className="w-full h-16 rounded-lg bg-neutral-800 overflow-hidden border border-neutral-700 flex-shrink-0">
                        {profileData.banner_url ? (
                          <img src={profileData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-yellow-600/20 to-amber-600/20"></div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'banner_url')}
                        className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500/10 file:text-yellow-500 hover:file:bg-yellow-500/20 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Nome do Negócio</label>
                  <input
                    type="text"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                    value={profileData.business_name}
                    onChange={e => setProfileData({...profileData, business_name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo, SP"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                      value={profileData.city}
                      onChange={e => setProfileData({...profileData, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">@ do Instagram</label>
                    <input
                      type="text"
                      placeholder="Ex: @seunegocio"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                      value={profileData.instagram}
                      onChange={e => setProfileData({...profileData, instagram: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                    value={profileData.description}
                    onChange={e => setProfileData({...profileData, description: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full bg-white text-neutral-900 px-4 py-2 rounded-lg font-medium hover:bg-neutral-200">
                  Salvar Alterações
                </button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-neutral-800">
                <p className="text-sm text-neutral-400 mb-2">Seu link público para agendamentos:</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/professional/${user?.professionalData?.id}`}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-400"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/professional/${user?.professionalData?.id}`);
                      showToast('Link copiado para a área de transferência!');
                    }}
                    className="bg-neutral-800 text-neutral-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
