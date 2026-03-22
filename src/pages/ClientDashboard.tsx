import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function ClientDashboard() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const apptsRes = await axios.get('/api/appointments', { headers: { Authorization: `Bearer ${token}` } });
      setAppointments(apptsRes.data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    try {
      await axios.put(`/api/appointments/${id}/status`, { status: 'cancelled' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Agendamento cancelado com sucesso!');
    } catch (error) {
      console.error('Error cancelling appointment', error);
      showToast('Erro ao cancelar agendamento', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Meu Painel</h1>

      <div className="grid grid-cols-1 gap-8">
        <div className="space-y-6">
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-semibold text-white">Meus Agendamentos</h2>
            </div>
            <div className="divide-y divide-neutral-800">
              {appointments.length === 0 ? (
                <div className="p-6 text-center text-neutral-400">Você ainda não tem agendamentos.</div>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="p-6 flex items-center justify-between hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-900/30 p-3 rounded-xl mt-1">
                        <Clock className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{apt.business_name || apt.professional_name}</p>
                        <p className="text-sm text-neutral-400">{apt.service_name}</p>
                        <p className="text-sm font-medium text-yellow-500 mt-1">
                          {format(new Date(apt.start_time), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        apt.status === 'scheduled' ? 'bg-blue-900/30 text-blue-400' :
                        apt.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {apt.status === 'scheduled' ? 'Confirmado' : apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                      </span>
                      {apt.status === 'scheduled' && (
                        <button 
                          onClick={() => handleCancel(apt.id)}
                          className="text-sm text-red-500 hover:text-red-400 font-medium"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
