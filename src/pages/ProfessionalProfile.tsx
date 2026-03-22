import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { format, addDays, startOfToday, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, MapPin, Star, List } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function ProfessionalProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfessional = async () => {
      try {
        const response = await axios.get(`/api/professionals/${id}`);
        setProfessional(response.data);
      } catch (error) {
        console.error('Error fetching professional', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfessional();
  }, [id]);

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (professional && professional.id) {
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const res = await axios.get(`/api/professionals/${professional.id}/booked-times?date=${dateStr}`);
          setBookedTimes(res.data);
        } catch (error) {
          console.error('Error fetching booked times', error);
        }
      }
    };
    fetchBookedTimes();
  }, [selectedDate, professional]);

  // Calculate totals
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0) || 30; // Default stepping if no service selected

  // Generate available times dynamically based on professional schedules
  let availableTimes: string[] = [];
  const isBlockedDate = professional?.blockedDates?.includes(format(selectedDate, 'yyyy-MM-dd'));

  if (professional && professional.hours && !isBlockedDate) {
    const dayOfWeek = selectedDate.getDay();
    const daySchedule = professional.hours.find((h: any) => h.day_of_week === dayOfWeek);

    if (daySchedule && daySchedule.is_active) {
      const [startH, startM] = daySchedule.start_time.split(':').map(Number);
      const [endH, endM] = daySchedule.end_time.split(':').map(Number);
      
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      while (currentMinutes + totalDuration <= endMinutes) {
        const proposedStartMs = setMinutes(setHours(selectedDate, Math.floor(currentMinutes / 60)), currentMinutes % 60).getTime();
        const proposedEndMs = proposedStartMs + totalDuration * 60000;

        const hasConflict = bookedTimes.some(appt => {
          const aptStartMs = new Date(appt.start_time).getTime();
          const aptEndMs = new Date(appt.end_time).getTime();
          // Detailed overlap logic: (StartA < EndB) and (EndA > StartB)
          return (proposedStartMs < aptEndMs && proposedEndMs > aptStartMs);
        });

        if (!hasConflict) {
          const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
          const m = (currentMinutes % 60).toString().padStart(2, '0');
          availableTimes.push(`${h}:${m}`);
        }
        currentMinutes += 30; // Step every 30 mins
      }
    }
  }

  const toggleService = (service: any) => {
    setSelectedServices(prev => {
      if (prev.find(s => s.id === service.id)) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
    setSelectedTime(null); // Reset time when duration changes
  };

  const handleBooking = async () => {
    if (!user) {
      showToast('Você precisa estar logado para agendar.', 'error');
      navigate('/login');
      return;
    }

    if (user.role !== 'client') {
      showToast('Apenas clientes podem fazer agendamentos.', 'error');
      return;
    }

    if (selectedServices.length === 0 || !selectedTime) {
      showToast('Selecione pelo menos um serviço e um horário.', 'error');
      return;
    }

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = new Date(startTime.getTime() + totalDuration * 60000);

      await axios.post('/api/appointments', {
        professional_id: professional.id,
        service_ids: selectedServices.map(s => s.id),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast('Agendamento realizado com sucesso!');
      navigate('/client-dashboard');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao agendar horário.', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-20">Carregando...</div>;
  if (!professional) return <div className="flex justify-center py-20">Profissional não encontrado.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Profile */}
      <div className="bg-neutral-900 rounded-3xl shadow-sm border border-neutral-800 overflow-hidden mb-8">
        <div 
          className="h-48 bg-gradient-to-r from-yellow-600 to-amber-600 bg-cover bg-center"
          style={professional.banner_url ? { backgroundImage: `url(${professional.banner_url})` } : {}}
        ></div>
        <div className="px-8 pb-8 relative">
          <div className="absolute -top-16 left-8 w-32 h-32 bg-neutral-900 rounded-full p-2 shadow-md">
            <div className="w-full h-full bg-neutral-800 rounded-full overflow-hidden flex items-center justify-center">
              {professional.photo_url ? (
                <img src={professional.photo_url} alt={professional.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-neutral-400">{professional.name.charAt(0)}</span>
              )}
            </div>
          </div>
          <div className="pt-20">
            <h1 className="text-3xl font-bold text-white">{professional.business_name || professional.name}</h1>
            <p className="text-lg text-neutral-400 mt-2">{professional.description || 'Profissional da beleza'}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-neutral-400 font-medium">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>4.9 (120 avaliações)</span>
              </div>
              {professional.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{professional.city}</span>
                </div>
              )}
              {professional.instagram && (
                <div className="flex items-center gap-1">
                  <span className="text-lg leading-none">📸</span>
                  <span>{professional.instagram}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Services Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <List className="h-5 w-5 text-yellow-500" />
              Escolha um Serviço
            </h2>
            <div className="space-y-4">
              {professional.services.length === 0 ? (
                <p className="text-neutral-400">Nenhum serviço cadastrado.</p>
              ) : (
                professional.services.map((service: any) => (
                  <div 
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedServices.find(s => s.id === service.id)
                        ? 'border-yellow-500 bg-yellow-900/20' 
                        : 'border-neutral-800 hover:border-yellow-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-white">{service.name}</h3>
                        <p className="text-sm text-neutral-400 mt-1">{service.duration} minutos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-white">R$ {service.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="space-y-6">
          <div className="bg-neutral-900 rounded-2xl shadow-sm border border-neutral-800 p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-yellow-500" />
              Agendar Horário
            </h2>

            {/* Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-300 mb-3">Data</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                  const date = addDays(startOfToday(), offset);
                  const isSelected = date.getTime() === selectedDate.getTime();
                  return (
                    <button
                      key={offset}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      className={`flex flex-col items-center min-w-[64px] p-3 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-yellow-500 border-yellow-500 text-neutral-900 shadow-md' 
                          : 'bg-neutral-950 border-neutral-700 text-neutral-400 hover:border-yellow-500/50 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="text-xs font-medium uppercase">{format(date, 'EEE', { locale: ptBR })}</span>
                      <span className="text-xl font-bold mt-1">{format(date, 'dd')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Horários Disponíveis
              </label>
              {isBlockedDate ? (
                <div className="text-center p-4 bg-red-900/10 border border-red-900/30 rounded-xl">
                  <p className="text-red-400 font-medium text-sm">Profissional fora de serviço nesta data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableTimes.length > 0 ? (
                    availableTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                          selectedTime === time
                            ? 'bg-yellow-500 border-yellow-500 text-neutral-900 shadow-sm'
                            : 'bg-neutral-950 border-neutral-700 text-neutral-300 hover:border-yellow-500/50 hover:bg-neutral-800'
                        }`}
                      >
                        {time}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-3 text-center text-sm text-neutral-500 py-4">
                      Nenhum horário disponível para a duração atual neste dia.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary & Action */}
            <div className="border-t border-neutral-800 pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-neutral-400">Tempo Estimado:</span>
                <span className="text-sm font-semibold text-white">{totalDuration} min</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-neutral-400 font-medium">Total:</span>
                <span className="text-2xl font-bold text-white">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleBooking}
                disabled={selectedServices.length === 0 || !selectedTime}
                className="w-full bg-yellow-500 text-neutral-900 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
