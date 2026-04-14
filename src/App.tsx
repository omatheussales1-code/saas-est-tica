import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Users, 
  ClipboardList, 
  FileText, 
  BellRing, 
  DollarSign, 
  Settings, 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  MoreVertical, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Menu, 
  ShieldCheck,
  Activity,
  MessageCircle,
  Sun,
  Moon,
  Trash2,
  Download,
  Pencil
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  parseISO, 
  isWithinInterval, 
  startOfWeek, 
  endOfWeek,
  startOfDay,
  endOfDay,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  Client, 
  Appointment, 
  Procedure, 
  FinancialEntry, 
  Lead, 
  Budget, 
  AppointmentStatus 
} from './types';
import { 
  MOCK_CLIENTS, 
  MOCK_APPOINTMENTS, 
  MOCK_PROCEDURES, 
  MOCK_FINANCIAL, 
  MOCK_LEADS, 
  MOCK_BUDGETS 
} from './mockData';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- Components ---

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-rose-50"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200"
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const StatCard = ({ title, value, icon, color, onClick, clickable }: { title: string, value: string | number, icon: React.ReactNode, color: string, onClick?: () => void, clickable?: boolean }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-white p-5 rounded-2xl shadow-sm border border-rose-50 flex items-center gap-4 transition-all",
      clickable && "cursor-pointer hover:border-rose-200 hover:shadow-md active:scale-95"
    )}
  >
    <div className={cn("p-3 rounded-xl", color)}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const Dashboard = ({ appointments, clients, procedures, onNavigateToAgenda }: { appointments: Appointment[], clients: Client[], procedures: Procedure[], onNavigateToAgenda: () => void }) => {
  const todayAppointments = appointments.filter(a => isToday(parseISO(a.date)));
  
  const dailyRevenue = todayAppointments
    .filter(a => a.status === 'realizado')
    .reduce((acc, curr) => acc + curr.price, 0);
  
  const missedAppointments = appointments.filter(a => a.status === 'faltou').length;
  
  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel de Controle</h1>
          <p className="text-sm font-medium text-gray-500">Bem-vinda, Dra. Brenda Fernandes</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-rose-100 shadow-sm flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sistema Online</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Atendimentos Hoje" 
          value={todayAppointments.length} 
          icon={<CalendarIcon className="w-5 h-5" />} 
          color="bg-rose-100 text-rose-600" 
          onClick={onNavigateToAgenda}
          clickable
        />
        <StatCard 
          title="Faturamento Hoje" 
          value={formatCurrency(dailyRevenue)} 
          icon={<DollarSign className="w-5 h-5" />} 
          color="bg-green-100 text-green-600" 
        />
        <StatCard 
          title="Pendentes (Não foram)" 
          value={missedAppointments} 
          icon={<BellRing className="w-5 h-5" />} 
          color="bg-amber-100 text-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-rose-50">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            Próximos Atendimentos
          </h2>
          <div className="space-y-4">
            {todayAppointments.length > 0 ? (
              todayAppointments.map(app => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                return (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-rose-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-rose-200 flex items-center justify-center text-rose-700 font-bold">
                        {client?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client?.name}</p>
                        <p className="text-sm text-gray-500">{proc?.name} • {format(parseISO(app.date), 'HH:mm')}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      app.status === 'confirmado' ? "bg-blue-100 text-blue-700" : 
                      app.status === 'realizado' ? "bg-green-100 text-green-700" : 
                      app.status === 'pendente' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                    )}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum atendimento para hoje.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            Resumo da Semana
          </h2>
          <div className="space-y-6">
            <div className="flex justify-between items-end h-32 gap-2">
              {[4, 6, 3, 8, 5, 2, 0].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-rose-200 rounded-t-lg transition-all hover:bg-rose-400" 
                    style={{ height: `${(h / 8) * 100}%` }}
                  />
                  <span className="text-[10px] text-gray-400 font-medium">
                    {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Agenda = ({ 
  appointments, 
  clients, 
  procedures,
  onUpdateStatus,
  onMarkAsPaid,
  onUndoMarkAsPaid,
  onOpenNewAppointment,
  onEditAppointment,
  onDeleteAppointment
}: { 
  appointments: Appointment[], 
  clients: Client[],
  procedures: Procedure[],
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onMarkAsPaid: (id: string) => void,
  onUndoMarkAsPaid: (id: string) => void,
  onOpenNewAppointment: (date: Date) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const dayAppointments = appointments.filter(a => isSameDay(parseISO(a.date), selectedDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(a => isSameDay(parseISO(a.date), date));
  };

  const statusColors: Record<AppointmentStatus, string> = {
    confirmado: "text-blue-500",
    realizado: "text-green-500",
    faltou: "text-red-500",
    pendente: "text-amber-500",
    desmarcado: "text-gray-400"
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    confirmado: "Confirmado",
    realizado: "Realizado",
    faltou: "Pendente (Follow-up)",
    pendente: "Aguardando",
    desmarcado: "Desmarcado"
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        <button 
          onClick={() => onOpenNewAppointment(selectedDate)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200"
        >
          <Plus className="w-5 h-5" />
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-rose-50 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-50 rounded-2xl overflow-hidden border border-gray-50 flex-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="bg-white py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayApps = getAppointmentsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <button 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "bg-white min-h-[100px] p-2 text-left transition-all hover:bg-rose-50/50 flex flex-col gap-1 relative group",
                    !isCurrentMonth && "opacity-30",
                    isSelected && "ring-2 ring-inset ring-rose-500 z-10"
                  )}
                >
                  <span className={cn(
                    "inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold",
                    isTodayDay ? "bg-rose-500 text-white" : "text-gray-700",
                    isSelected && !isTodayDay && "bg-rose-100 text-rose-600"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
                    {dayApps.slice(0, 3).map(app => (
                      <div key={app.id} className="flex items-center gap-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", 
                          app.status === 'realizado' ? 'bg-green-500' : 
                          app.status === 'confirmado' ? 'bg-blue-500' : 
                          app.status === 'faltou' ? 'bg-red-500' : 'bg-amber-500'
                        )} />
                        <span className="text-[10px] font-medium text-gray-500 truncate">
                          {clients.find(c => c.id === app.clientId)?.name.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-rose-50 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-rose-50/30">
            <h3 className="font-black text-gray-900 mb-1">Atendimentos do Dia</h3>
            <p className="text-sm text-rose-600 font-bold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {dayAppointments.length > 0 ? (
              dayAppointments.map(app => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                return (
                  <div key={app.id} className="p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-rose-100 transition-all group relative">
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEditAppointment(app)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteAppointment(app.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                          {client?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{client?.name}</p>
                          <p className="text-xs text-gray-500">{format(parseISO(app.date), 'HH:mm')} • {proc?.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                        <select 
                          value={app.status}
                          onChange={(e) => onUpdateStatus(app.id, e.target.value as AppointmentStatus)}
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider bg-transparent outline-none cursor-pointer",
                            statusColors[app.status]
                          )}
                        >
                          {(['confirmado', 'realizado', 'faltou', 'pendente', 'desmarcado'] as AppointmentStatus[]).map(s => (
                            <option key={s} value={s} className="bg-white text-gray-900">{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                      
                      {app.status !== 'realizado' ? (
                        <button
                          onClick={() => onMarkAsPaid(app.id)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                        >
                          <DollarSign className="w-3 h-3" />
                          Marcar como Pago
                        </button>
                      ) : (
                        <button
                          onClick={() => onUndoMarkAsPaid(app.id)}
                          className="w-full bg-amber-50 text-amber-600 hover:bg-amber-100 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Estornar Pagamento
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6">
                <CalendarIcon className="w-8 h-8 text-rose-200 mb-4" />
                <p className="text-gray-500 font-medium">Nenhum agendamento para este dia.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientsTab = ({ 
  clients, 
  appointments, 
  procedures, 
  onOpenNewClient,
  onEditClient,
  onDeleteClient
}: { 
  clients: Client[], 
  appointments: Appointment[], 
  procedures: Procedure[], 
  onOpenNewClient: () => void,
  onEditClient: (client: Client) => void,
  onDeleteClient: (id: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  if (selectedClient) {
    const clientAppointments = appointments.filter(a => a.clientId === selectedClient.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedClient(null)}
          className="flex items-center gap-2 text-rose-500 font-bold hover:text-rose-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          Voltar para lista
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50 text-center relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => onEditClient(selectedClient)}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    onDeleteClient(selectedClient.id);
                    setSelectedClient(null);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="w-24 h-24 rounded-3xl bg-rose-100 flex items-center justify-center text-rose-600 text-3xl font-black mx-auto mb-4">
                {selectedClient.name.charAt(0)}
              </div>
              <h2 className="text-xl font-black text-gray-900">{selectedClient.name}</h2>
              <p className="text-gray-500 mb-6">{selectedClient.phone}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
              <div className="flex items-center gap-2 mb-4 text-rose-600">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold">Atendimento Personalizado</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs font-bold text-gray-400 uppercase">Ar Condicionado</span>
                  <span className="text-sm font-medium text-gray-700 capitalize">{selectedClient.preferences?.airConditioning || 'Não definido'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs font-bold text-gray-400 uppercase">Música</span>
                  <span className="text-sm font-medium text-gray-700">{selectedClient.preferences?.music || 'Não definido'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs font-bold text-gray-400 uppercase">Bebida</span>
                  <span className="text-sm font-medium text-gray-700">{selectedClient.preferences?.beverage || 'Não definido'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Conversa</span>
                  <span className="text-sm font-medium text-gray-700 capitalize">{selectedClient.preferences?.conversation || 'Não definido'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Histórico</h3>
              <div className="space-y-4">
                {clientAppointments.map(app => {
                  const proc = procedures.find(p => p.id === app.procedureId);
                  return (
                    <div key={app.id} className="flex justify-between items-center p-4 rounded-xl bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900">{proc?.name}</p>
                        <p className="text-xs text-gray-500">{format(parseISO(app.date), "dd/MM/yyyy")}</p>
                      </div>
                      <span className="font-bold text-rose-600">{formatCurrency(app.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button 
          onClick={onOpenNewClient}
          className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200"
        >
          <Plus className="w-5 h-5" />
          Nova Cliente
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..." 
          className="flex-1 outline-none text-gray-700 bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div 
            key={client.id} 
            className="bg-white p-5 rounded-2xl shadow-sm border border-rose-50 hover:border-rose-200 transition-all group cursor-pointer relative"
          >
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteClient(client.id); }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div onClick={() => setSelectedClient(client)}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 text-xl font-bold">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.phone}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AppointmentsTab = ({ 
  appointments, 
  clients, 
  procedures, 
  onUpdateStatus,
  onEditAppointment,
  onDeleteAppointment
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void
}) => {
  const [filter, setFilter] = useState<AppointmentStatus | 'todos'>('todos');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const filteredAppointments = appointments.filter(a => {
    const statusMatch = filter === 'todos' || a.status === filter;
    const date = parseISO(a.date);
    const dateMatch = isWithinInterval(date, {
      start: startOfDay(parseISO(startDate)),
      end: endOfDay(parseISO(endDate))
    });
    return statusMatch && dateMatch;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const statusLabels: Record<AppointmentStatus, string> = {
    confirmado: "Confirmado",
    realizado: "Realizado",
    faltou: "Pendente (Follow-up)",
    pendente: "Aguardando",
    desmarcado: "Desmarcado"
  };

  const statusColors: Record<AppointmentStatus, string> = {
    confirmado: "bg-blue-100 text-blue-700",
    realizado: "bg-green-100 text-green-700",
    faltou: "bg-red-100 text-red-700",
    pendente: "bg-amber-100 text-amber-700",
    desmarcado: "bg-gray-400 text-white"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Controle de Atendimentos</h1>
          <p className="text-sm text-gray-500">Gerencie todos os serviços prestados.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-rose-50 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-rose-500" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold outline-none bg-transparent"
            />
            <span className="text-gray-300">até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold outline-none bg-transparent"
            />
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-rose-50 shadow-sm">
            {(['todos', 'pendente', 'confirmado', 'realizado', 'faltou'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === s ? "bg-rose-500 text-white shadow-md" : "text-gray-500 hover:bg-rose-50"
                )}
              >
                {s === 'todos' ? 'Todos' : statusLabels[s as AppointmentStatus] || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-rose-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data & Hora</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Procedimento</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAppointments.map(app => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                return (
                  <tr key={app.id} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{format(parseISO(app.date), 'dd/MM/yyyy')}</div>
                      <div className="text-xs text-gray-400">{format(parseISO(app.date), 'HH:mm')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">
                          {client?.name.charAt(0)}
                        </div>
                        <div className="font-medium text-gray-900">{client?.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{proc?.name}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(app.price)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          statusColors[app.status]
                        )}>
                          {statusLabels[app.status]}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onEditAppointment(app)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onDeleteAppointment(app.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const BudgetsTab = ({ 
  budgets, 
  clients, 
  procedures, 
  onAddBudget, 
  onAddProcedure, 
  onUpdateProcedure,
  onDeleteBudget
}: { 
  budgets: Budget[], 
  clients: Client[], 
  procedures: Procedure[], 
  onAddBudget: (b: Budget) => void, 
  onAddProcedure: (p: Procedure) => void, 
  onUpdateProcedure: (id: string, u: Partial<Procedure>) => void,
  onDeleteBudget: (id: string) => void
}) => {
  const [isNewBudgetModalOpen, setIsNewBudgetModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const handleCreateBudget = () => {
    if (!selectedClientId || !selectedProcedureId) return;
    const proc = procedures.find(p => p.id === selectedProcedureId);
    if (!proc) return;

    const price = customPrice ? parseFloat(customPrice) : proc.price;

    const newBudget: Budget = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: selectedClientId,
      items: [{ procedureId: selectedProcedureId, price }],
      total: price,
      date: new Date().toISOString(),
      status: 'pendente',
      validUntil: addMonths(new Date(), 1).toISOString()
    };

    onAddBudget(newBudget);
    setIsNewBudgetModalOpen(false);
    setSelectedClientId('');
    setSelectedProcedureId('');
    setCustomPrice('');
  };

  const handleSendToWhatsApp = (budget: Budget) => {
    const client = clients.find(c => c.id === budget.clientId);
    if (!client) return;
    const items = budget.items.map(item => {
      const p = procedures.find(proc => proc.id === item.procedureId);
      return `${p?.name}: ${formatCurrency(item.price)}`;
    }).join('\n');
    
    const text = `Olá ${client.name}! Segue seu orçamento:\n\n${items}\n\nTotal: ${formatCurrency(budget.total)}\nVálido até: ${format(parseISO(budget.validUntil), 'dd/MM/yyyy')}`;
    window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Orçamentos</h1>
        <button 
          onClick={() => setIsNewBudgetModalOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-200"
        >
          <Plus className="w-5 h-5" />
          Novo Orçamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map(budget => {
          const client = clients.find(c => c.id === budget.clientId);
          return (
            <div key={budget.id} className="bg-white p-5 rounded-2xl shadow-sm border border-rose-50 hover:border-rose-200 transition-all group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onDeleteBudget(budget.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{client?.name}</h3>
                  <p className="text-xs text-gray-500">{format(parseISO(budget.date), 'dd/MM/yyyy')}</p>
                </div>
                <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                  {budget.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                {budget.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-500">{procedures.find(p => p.id === item.procedureId)?.name}</span>
                    <span className="font-bold">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="text-lg font-black text-rose-600">{formatCurrency(budget.total)}</span>
                <button 
                  onClick={() => handleSendToWhatsApp(budget)}
                  className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isNewBudgetModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl border border-rose-50"
            >
              <h2 className="text-xl font-bold mb-6">Gerar Novo Orçamento</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Cliente</label>
                  <select 
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300"
                  >
                    <option value="">Selecionar cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Procedimento</label>
                  <select 
                    value={selectedProcedureId}
                    onChange={e => setSelectedProcedureId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300"
                  >
                    <option value="">Selecionar procedimento...</option>
                    {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Valor Customizado (Opcional)</label>
                  <input 
                    type="number"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="Deixe vazio para usar valor padrão"
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsNewBudgetModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateBudget}
                    className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200"
                  >
                    Gerar Orçamento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FollowUpTab = ({ leads, appointments, clients, procedures, onUpdateStatus }: { leads: Lead[], appointments: Appointment[], clients: Client[], procedures: Procedure[], onUpdateStatus: (id: string, status: Lead['status']) => void }) => {
  const [activeSubTab, setActiveSubTab] = useState<'leads' | 'post-proc' | 'immediate'>('leads');

  const missedAppointments = appointments
    .filter(a => a.status === 'faltou')
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const completedAppointments = appointments
    .filter(a => a.status === 'realizado')
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Follow-up Inteligente</h1>
          <p className="text-sm text-gray-500">Mantenha o relacionamento com suas clientes ativo.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-rose-50 shadow-sm">
          {['leads', 'post-proc', 'immediate'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize",
                activeSubTab === tab ? "bg-rose-500 text-white shadow-md" : "text-gray-500 hover:bg-rose-50"
              )}
            >
              {tab === 'leads' ? 'Leads' : tab === 'post-proc' ? 'Pós-Procedimento' : 'Pendentes (Não foram)'}
            </button>
          ))}
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activeSubTab === 'leads' ? (
            leads.map((lead) => (
              <div key={lead.id} className="bg-white p-5 rounded-3xl shadow-sm border border-rose-50 flex items-center justify-between group hover:border-rose-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{lead.name}</h3>
                    <p className="text-xs text-gray-500 italic">"{lead.lastMessage}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{lead.platform}</span>
                  <button className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          ) : activeSubTab === 'post-proc' ? (
            completedAppointments.map((app) => {
              const client = clients.find(c => c.id === app.clientId);
              const proc = procedures.find(p => p.id === app.procedureId);
              return (
                <div key={app.id} className="bg-white p-5 rounded-3xl shadow-sm border border-rose-50 flex items-center justify-between group hover:border-rose-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 font-bold">
                      {client?.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{client?.name}</h3>
                      <p className="text-xs text-gray-500">{proc?.name} • Realizado em {format(parseISO(app.date), 'dd/MM')}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          ) : (
            missedAppointments.map((app) => {
              const client = clients.find(c => c.id === app.clientId);
              const proc = procedures.find(p => p.id === app.procedureId);
              return (
                <div key={app.id} className="bg-white p-5 rounded-3xl shadow-sm border border-rose-50 flex items-center justify-between group hover:border-rose-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                      {client?.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{client?.name}</h3>
                      <p className="text-xs text-gray-500">{proc?.name} • Faltou em {format(parseISO(app.date), 'dd/MM')}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-rose-500 p-6 rounded-3xl text-white shadow-lg shadow-rose-200">
            <Activity className="w-8 h-8 mb-4 opacity-80" />
            <h2 className="text-xl font-bold mb-2">Régua de Relacionamento</h2>
            <p className="text-xs text-rose-50">Dicas automáticas para aumentar sua conversão.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinancialTab = ({ 
  appointments, 
  clients, 
  procedures, 
  entries, 
  onAddEntry,
  onEditEntry,
  onDeleteEntry
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  entries: FinancialEntry[], 
  onAddEntry: (e: FinancialEntry) => void,
  onEditEntry: (e: FinancialEntry) => void,
  onDeleteEntry: (id: string) => void
}) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('receita');
  const [category, setCategory] = useState('Geral');

  const totalRevenue = entries.filter(e => e.type === 'receita').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'despesa').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalRevenue - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;
    onAddEntry({
      id: Math.random().toString(36).substr(2, 9),
      description: desc,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      type,
      category
    });
    setDesc('');
    setAmount('');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const businessName = "Brenda Fernandes Estética";
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');
    
    doc.setFontSize(20);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(businessName, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // gray-500
    doc.text("Extrato Financeiro", 14, 30);
    doc.text(`Gerado em: ${dateStr}`, 14, 38);
    
    const tableData = entries.map(e => [
      format(parseISO(e.date), 'dd/MM/yyyy'),
      e.description,
      e.type === 'receita' ? 'Entrou' : 'Saiu',
      formatCurrency(e.amount)
    ]);
    
    (doc as any).autoTable({
      head: [['Data', 'Descrição', 'Tipo', 'Valor']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 241, 242] } // rose-50
    });
    
    doc.save(`extrato_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <button onClick={exportPDF} className="text-rose-500 font-bold flex items-center gap-2">
          <Download className="w-5 h-5" /> Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Entradas</p>
          <p className="text-2xl font-black text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Saídas</p>
          <p className="text-2xl font-black text-red-500">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Saldo</p>
          <p className={cn("text-2xl font-black", balance >= 0 ? "text-blue-600" : "text-red-600")}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
          <h2 className="text-lg font-bold mb-6">Novo Lançamento</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input 
              type="text" value={desc} onChange={e => setDesc(e.target.value)} 
              placeholder="Descrição" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none" 
            />
            <input 
              type="number" value={amount} onChange={e => setAmount(e.target.value)} 
              placeholder="Valor" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none" 
            />
            <select 
              value={type} onChange={e => setType(e.target.value as any)}
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none"
            >
              <option value="receita">Entrou</option>
              <option value="despesa">Saiu</option>
            </select>
            <button type="submit" className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold">Lançar</button>
          </form>
        </div>
        <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-rose-50 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-rose-50 text-rose-700 text-xs font-bold uppercase">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.sort((a,b) => b.date.localeCompare(a.date)).map(entry => (
                <tr key={entry.id} className="group transition-colors hover:bg-rose-50/30">
                  <td className="px-6 py-4 text-xs text-gray-400">{format(parseISO(entry.date), 'dd/MM/yy')}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{entry.description}</div>
                    <div className="text-[10px] uppercase text-gray-400">{entry.type === 'receita' ? 'Entrou' : 'Saiu'}</div>
                  </td>
                  <td className={cn("px-6 py-4 text-sm font-black text-right", entry.type === 'receita' ? "text-green-600" : "text-red-500")}>
                    <div className="flex items-center justify-end gap-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditEntry(entry)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span>{entry.type === 'receita' ? '+' : '-'} {formatCurrency(entry.amount)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SettingsTab = ({ 
  procedures, 
  onAddProcedure, 
  onUpdateProcedure, 
  onDeleteProcedure 
}: { 
  procedures: Procedure[], 
  onAddProcedure: (p: Procedure) => void, 
  onUpdateProcedure: (id: string, updates: Partial<Procedure>) => void, 
  onDeleteProcedure: (id: string) => void 
}) => {
  const [isAddingProc, setIsAddingProc] = useState(false);
  const [newProc, setNewProc] = useState({ name: '', price: '', duration: '' });

  const handleAdd = () => {
    if (!newProc.name || !newProc.price || !newProc.duration) return;
    onAddProcedure({
      id: Math.random().toString(36).substr(2, 9),
      name: newProc.name,
      price: parseFloat(newProc.price),
      duration: parseInt(newProc.duration)
    });
    setNewProc({ name: '', price: '', duration: '' });
    setIsAddingProc(false);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Perfil Profissional</h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                <input type="text" defaultValue="Brenda Fernandes" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Nome do Negócio</label>
                <input type="text" defaultValue="Brenda Fernandes Estética" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 transition-all" />
              </div>
              <button className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all">
                Salvar Perfil
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Procedimentos e Preços</h2>
            <button 
              onClick={() => setIsAddingProc(true)}
              className="text-rose-500 font-bold text-sm flex items-center gap-1 hover:underline"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-rose-50 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {procedures.map(proc => (
                <div key={proc.id} className="p-4 flex justify-between items-center group hover:bg-rose-50/30 transition-all">
                  <div>
                    <p className="font-bold text-gray-900">{proc.name}</p>
                    <p className="text-xs text-gray-500">{proc.duration} min • {formatCurrency(proc.price)}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onDeleteProcedure(proc.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAddingProc && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-200 space-y-4 animate-in fade-in slide-in-from-top-2">
              <input 
                placeholder="Nome do Procedimento" 
                value={newProc.name}
                onChange={e => setNewProc(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Preço (R$)" 
                  type="number"
                  value={newProc.price}
                  onChange={e => setNewProc(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none"
                />
                <input 
                  placeholder="Duração (min)" 
                  type="number"
                  value={newProc.duration}
                  onChange={e => setNewProc(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsAddingProc(false)} className="flex-1 py-3 font-bold text-gray-500">Cancelar</button>
                <button onClick={handleAdd} className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">Adicionar</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [procedures, setProcedures] = useState<Procedure[]>(MOCK_PROCEDURES);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(MOCK_FINANCIAL);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [budgets, setBudgets] = useState<Budget[]>(MOCK_BUDGETS);
  
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [clientStep, setClientStep] = useState(1);
  const [selectedDateForNewApp, setSelectedDateForNewApp] = useState(new Date());

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [editingFinancialEntry, setEditingFinancialEntry] = useState<FinancialEntry | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleMarkAsPaid = (id: string) => {
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const client = clients.find(c => c.id === app.clientId);
    const proc = procedures.find(p => p.id === app.procedureId);

    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'realizado' } : a));

    const newEntry: FinancialEntry = {
      id: Math.random().toString(36).substr(2, 9),
      description: `Atendimento: ${client?.name} (${proc?.name})`,
      amount: app.price,
      date: new Date().toISOString(),
      type: 'receita',
      category: 'Serviços',
      appointmentId: id
    };
    setFinancialEntries(prev => [...prev, newEntry]);
  };

  const handleUndoMarkAsPaid = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmado' } : a));
    setFinancialEntries(prev => prev.filter(e => e.appointmentId !== id));
  };

  const handleAddAppointment = (app: Appointment) => {
    setAppointments(prev => [...prev, app]);
  };

  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const handleUpdateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteClient = (id: string) => {
    showConfirm('Excluir Cliente', 'Tem certeza que deseja excluir esta cliente? Todos os agendamentos dela também serão removidos.', () => {
      setClients(prev => prev.filter(c => c.id !== id));
      setAppointments(prev => prev.filter(a => a.clientId !== id));
    });
  };

  const handleAddFinancialEntry = (entry: FinancialEntry) => {
    setFinancialEntries(prev => [...prev, entry]);
  };

  const handleUpdateFinancialEntry = (id: string, updates: Partial<FinancialEntry>) => {
    setFinancialEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleDeleteFinancialEntry = (id: string) => {
    setFinancialEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateLeadStatus = (id: string, status: Lead['status']) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const handleAddBudget = (budget: Budget) => {
    setBudgets(prev => [...prev, budget]);
  };

  const handleDeleteBudget = (id: string) => {
    showConfirm('Excluir Orçamento', 'Tem certeza que deseja excluir este orçamento?', () => {
      setBudgets(prev => prev.filter(b => b.id !== id));
    });
  };

  const handleAddProcedure = (proc: Procedure) => {
    setProcedures(prev => [...prev, proc]);
  };

  const handleUpdateProcedure = (id: string, updates: Partial<Procedure>) => {
    setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteProcedure = (id: string) => {
    showConfirm('Excluir Procedimento', 'Tem certeza que deseja excluir este procedimento?', () => {
      setProcedures(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleUpdateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleDeleteAppointment = (id: string) => {
    showConfirm('Excluir Agendamento', 'Tem certeza que deseja excluir este agendamento?', () => {
      setAppointments(prev => prev.filter(a => a.id !== id));
      setFinancialEntries(prev => prev.filter(e => e.appointmentId !== id));
    });
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
    { id: 'follow-up', label: 'Follow-up', icon: BellRing },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard appointments={appointments} clients={clients} procedures={procedures} onNavigateToAgenda={() => setActiveTab('agenda')} />;
      case 'agenda': return (
        <Agenda 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures}
          onUpdateStatus={handleUpdateStatus}
          onMarkAsPaid={handleMarkAsPaid}
          onUndoMarkAsPaid={handleUndoMarkAsPaid}
          onOpenNewAppointment={(date) => {
            setSelectedDateForNewApp(date);
            setIsNewAppModalOpen(true);
          }}
          onEditAppointment={setEditingAppointment}
          onDeleteAppointment={handleDeleteAppointment}
        />
      );
      case 'clientes': return (
        <ClientsTab 
          clients={clients} 
          appointments={appointments} 
          procedures={procedures} 
          onOpenNewClient={() => { setClientStep(1); setIsNewClientModalOpen(true); }}
          onEditClient={setEditingClient}
          onDeleteClient={handleDeleteClient}
        />
      );
      case 'atendimentos': return (
        <AppointmentsTab 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          onUpdateStatus={handleUpdateStatus}
          onEditAppointment={setEditingAppointment}
          onDeleteAppointment={handleDeleteAppointment}
        />
      );
      case 'orcamentos': return (
        <BudgetsTab 
          budgets={budgets} 
          clients={clients} 
          procedures={procedures} 
          onAddBudget={handleAddBudget} 
          onAddProcedure={handleAddProcedure} 
          onUpdateProcedure={handleUpdateProcedure}
          onDeleteBudget={handleDeleteBudget}
        />
      );
      case 'follow-up': return <FollowUpTab leads={leads} appointments={appointments} clients={clients} procedures={procedures} onUpdateStatus={handleUpdateLeadStatus} />;
      case 'financeiro': return (
        <FinancialTab 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          entries={financialEntries} 
          onAddEntry={handleAddFinancialEntry}
          onEditEntry={setEditingFinancialEntry}
          onDeleteEntry={handleDeleteFinancialEntry}
        />
      );
      case 'configuracoes': return (
        <SettingsTab 
          procedures={procedures}
          onAddProcedure={handleAddProcedure}
          onUpdateProcedure={handleUpdateProcedure}
          onDeleteProcedure={handleDeleteProcedure}
        />
      );
      default: return <Dashboard appointments={appointments} clients={clients} procedures={procedures} onNavigateToAgenda={() => setActiveTab('agenda')} />;
    }
  };

  return (
    <div className="min-h-screen flex font-sans transition-colors duration-300 bg-[#FFF9F9] text-gray-900">
      {/* Modals (Placeholders for reconstruction) */}
      {isNewAppModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-6">Novo Agendamento</h2>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const date = formData.get('date') as string;
                const time = formData.get('time') as string;
                const clientId = formData.get('clientId') as string;
                const procedureId = formData.get('procedureId') as string;
                
                if (!clientId || !procedureId || !date || !time) return;

                const proc = procedures.find(p => p.id === procedureId);
                const newApp: Appointment = {
                  id: Math.random().toString(36).substr(2, 9),
                  clientId,
                  procedureId,
                  date: `${date}T${time}:00`,
                  status: 'confirmado',
                  price: proc?.price || 0
                };
                handleAddAppointment(newApp);
                setIsNewAppModalOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase">Cliente</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsNewAppModalOpen(false);
                      setClientStep(1);
                      setIsNewClientModalOpen(true);
                    }}
                    className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                  >
                    + Nova Cliente
                  </button>
                </div>
                <div className="relative group/select">
                  <input 
                    type="text"
                    list="clients-list"
                    name="clientSearch"
                    placeholder="Digite o nome da cliente..."
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300"
                    onChange={(e) => {
                      const selected = clients.find(c => c.name === e.target.value);
                      const hiddenInput = document.getElementById('selected-client-id') as HTMLInputElement;
                      if (selected && hiddenInput) {
                        hiddenInput.value = selected.id;
                      }
                    }}
                  />
                  <datalist id="clients-list">
                    {clients.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  <input type="hidden" name="clientId" id="selected-client-id" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                  <input 
                    name="date" 
                    type="date" 
                    required 
                    defaultValue={format(selectedDateForNewApp, 'yyyy-MM-dd')}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Horário</label>
                  <input 
                    name="time" 
                    type="time" 
                    required 
                    defaultValue={format(new Date(), 'HH:mm')}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Serviço</label>
                <select 
                  name="procedureId" 
                  required 
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300"
                >
                  <option value="">Selecionar serviço...</option>
                  {procedures.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsNewAppModalOpen(false)} 
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200"
                >
                  Agendar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900">Cadastrar Cliente</h2>
              <div className="flex gap-1">
                <div className={cn("w-2 h-2 rounded-full", clientStep === 1 ? "bg-rose-500" : "bg-gray-200")} />
                <div className={cn("w-2 h-2 rounded-full", clientStep === 2 ? "bg-rose-500" : "bg-gray-200")} />
              </div>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (clientStep === 1) {
                  setClientStep(2);
                  return;
                }
                const formData = new FormData(e.currentTarget);
                const newClient: Client = {
                  id: Math.random().toString(36).substr(2, 9),
                  name: formData.get('name') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  observations: formData.get('observations') as string,
                  createdAt: new Date().toISOString(),
                  preferences: {
                    airConditioning: formData.get('airConditioning') as any,
                    music: formData.get('music') as string,
                    beverage: formData.get('beverage') as string,
                    conversation: formData.get('conversation') as any
                  }
                };
                handleAddClient(newClient);
                setIsNewClientModalOpen(false);
                setClientStep(1);
              }}
              className="space-y-4"
            >
              {clientStep === 1 ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <input name="name" required type="text" placeholder="Ex: Maria Silva" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Telefone / WhatsApp</label>
                    <input name="phone" required type="tel" placeholder="(00) 00000-0000" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">E-mail (Opcional)</label>
                    <input name="email" type="email" placeholder="maria@email.com" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Observações</label>
                    <textarea name="observations" rows={2} placeholder="Alergias, preferências, etc..." className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 resize-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-2 mb-2 text-rose-600">
                    <ShieldCheck className="w-4 h-4" />
                    <h3 className="text-sm font-bold">Preferências de Atendimento</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Ar Condicionado</label>
                      <select name="airConditioning" className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm outline-none">
                        <option value="">Não definido</option>
                        <option value="gelado">Gelado</option>
                        <option value="fresco">Fresco</option>
                        <option value="natural">Natural</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Conversa</label>
                      <select name="conversation" className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm outline-none">
                        <option value="">Não definido</option>
                        <option value="gosta">Gosta de conversar</option>
                        <option value="quieta">Prefere silêncio</option>
                        <option value="neutra">Neutra</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Música Preferida</label>
                      <input name="music" type="text" placeholder="Ex: MPB, Jazz" className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Bebida Preferida</label>
                      <input name="beverage" type="text" placeholder="Ex: Café, Água" className="w-full p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm outline-none" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {clientStep === 1 ? (
                  <>
                    <button type="button" onClick={() => setIsNewClientModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                    <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200">Próximo</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setClientStep(1)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">Voltar</button>
                    <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-200">Finalizar</button>
                  </>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Edit Client Modal */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Editar Cliente</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateClient(editingClient.id, {
                    name: formData.get('name') as string,
                    phone: formData.get('phone') as string,
                    email: formData.get('email') as string,
                    observations: formData.get('observations') as string,
                  });
                  setEditingClient(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                  <input name="name" required defaultValue={editingClient.name} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                  <input name="phone" required defaultValue={editingClient.phone} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">E-mail</label>
                  <input name="email" defaultValue={editingClient.email} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Observações</label>
                  <textarea name="observations" defaultValue={editingClient.observations} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 resize-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingClient(null)} className="flex-1 py-3 font-bold text-gray-500">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Appointment Modal */}
      <AnimatePresence>
        {editingAppointment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Editar Agendamento</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const date = formData.get('date') as string;
                  const time = formData.get('time') as string;
                  handleUpdateAppointment(editingAppointment.id, {
                    date: `${date}T${time}:00`,
                    procedureId: formData.get('procedureId') as string,
                  });
                  setEditingAppointment(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                  <input name="date" type="date" required defaultValue={editingAppointment.date.split('T')[0]} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Horário</label>
                  <input name="time" type="time" required defaultValue={editingAppointment.date.split('T')[1].substring(0, 5)} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Serviço</label>
                  <select name="procedureId" required defaultValue={editingAppointment.procedureId} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300">
                    {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingAppointment(null)} className="flex-1 py-3 font-bold text-gray-500">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Financial Entry Modal */}
      <AnimatePresence>
        {editingFinancialEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Editar Lançamento</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateFinancialEntry(editingFinancialEntry.id, {
                    description: formData.get('description') as string,
                    amount: parseFloat(formData.get('amount') as string),
                    type: formData.get('type') as any,
                  });
                  setEditingFinancialEntry(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
                  <input name="description" required defaultValue={editingFinancialEntry.description} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Valor</label>
                  <input name="amount" type="number" step="0.01" required defaultValue={editingFinancialEntry.amount} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Tipo</label>
                  <select name="type" required defaultValue={editingFinancialEntry.type} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300">
                    <option value="receita">Entrou</option>
                    <option value="despesa">Saiu</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingFinancialEntry(null)} className="flex-1 py-3 font-bold text-gray-500">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-rose-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-gray-900 leading-none">BF GESTÃO</span>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Sistema Profissional</span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                  activeTab === item.id 
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-100" 
                    : "text-gray-500 hover:bg-rose-50 hover:text-rose-600"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-gray-400 group-hover:text-rose-500")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-rose-50 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 text-gray-500 hover:bg-rose-50 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-rose-500 transition-colors relative">
              <BellRing className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
