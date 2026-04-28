import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle,
  Eye,
  AlertCircle, 
  Menu, 
  ShieldCheck,
  Activity,
  MessageCircle,
  Sun,
  Moon,
  Trash2,
  Download,
  Pencil,
  Zap,
  Rocket,
  ArrowRight
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
  subDays,
  isTomorrow,
  differenceInMinutes,
  isAfter,
  isValid,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, googleProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from './firebase';
import { cn } from './lib/utils';
import { 
  Client, 
  Appointment, 
  Procedure, 
  FinancialEntry, 
  Lead, 
  Budget, 
  AppointmentStatus,
  FollowUp,
  UserProfile
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

// --- Types & Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// --- Components ---

const NotificationCenter = ({ alerts }: { alerts: { id: string, message: string, type: 'info' | 'warning' | 'error' }[] }) => (
  <div className="fixed bottom-4 right-4 z-[150] flex flex-col gap-2 max-w-xs w-full">
    <AnimatePresence>
      {alerts.map(alert => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          className={cn(
            "p-4 rounded-2xl shadow-xl border flex items-center gap-3",
            alert.type === 'info' ? "bg-blue-50 border-blue-100 text-blue-800" :
            alert.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-800" :
            "bg-red-50 border-red-100 text-red-800"
          )}
        >
          {alert.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <BellRing className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold leading-tight">{alert.message}</p>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

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

const LoadingScreen = () => (
  <div className="fixed inset-0 z-[1000] bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white p-12 rounded-[48px] shadow-2xl border-4 border-white flex flex-col items-center gap-8"
    >
      <div className="relative">
        <div className="w-24 h-24 bg-rose-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-rose-200 animate-bounce">
          <ShieldCheck className="text-white w-12 h-12" />
        </div>
        <div className="absolute -inset-4 border-2 border-dashed border-rose-200 rounded-[40px] animate-spin-slow" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Preparando Tudo...</h2>
        <p className="text-gray-500 font-medium">Organizando sua agenda e seus dados.</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            className="w-3 h-3 bg-rose-500 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  </div>
);

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

const Dashboard = ({ 
  appointments, 
  clients, 
  procedures, 
  onNavigateToAgenda, 
  notificationHistory,
  csLabel,
  user,
  userProfile,
  leads
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onNavigateToAgenda: () => void, 
  notificationHistory: { id: string, message: string, type: 'info' | 'warning' | 'error', date: Date }[],
  csLabel: string,
  user: User | null,
  userProfile: UserProfile | null,
  leads: Lead[]
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const todayAppointments = appointments.filter(a => a.date && isToday(parseISO(a.date)));
  const tomorrowAppointments = appointments.filter(a => a.date && isTomorrow(parseISO(a.date)));
  const delayedAppointments = appointments.filter(a => a.status === 'atrasado');
  
  const nextApp = todayAppointments.find(a => a.status === 'confirmado');
  const missedAppointments = appointments.filter(a => a.status === 'faltou').length;
  
  return (
    <div className="space-y-6 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel de Controle</h1>
          <p className="text-sm font-medium text-gray-500">Bem-vindo(a) de volta, {userProfile?.name?.split(' ')[0] || user.displayName || 'Profissional'}!</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="relative p-3 bg-white rounded-xl border border-rose-100 shadow-sm text-gray-400 hover:text-rose-500 hover:border-rose-200 transition-all"
          >
            <BellRing className="w-5 h-5" />
            {notificationHistory.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>

          <div className="bg-white px-4 py-2 rounded-xl border border-rose-100 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sistema Online</span>
          </div>
        </div>
      </header>

      {/* Painel de Histórico de Notificações */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <div className="fixed inset-0 z-[140]" onClick={() => setIsHistoryOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute right-0 top-16 z-[145] w-80 bg-white rounded-3xl shadow-2xl border border-rose-50 overflow-hidden"
            >
              <div className="p-4 border-b border-rose-50 bg-rose-50/30 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Notificações Recentes</h3>
                <span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded-full">
                  {notificationHistory.length}
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {notificationHistory.length > 0 ? (
                  notificationHistory.map((notif) => (
                    <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        notif.type === 'info' ? "bg-blue-100 text-blue-600" :
                        notif.type === 'warning' ? "bg-amber-100 text-amber-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {notif.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 leading-tight mb-1">{notif.message}</p>
                        <p className="text-[10px] text-gray-400">{format(notif.date, 'HH:mm', { locale: ptBR })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <BellRing className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nenhuma notificação por enquanto.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Alertas Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tomorrowAppointments.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <CalendarIcon className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase">Amanhã</p>
              <p className="text-sm font-bold text-blue-800">Você tem {tomorrowAppointments.length} atendimentos agendados para amanhã</p>
            </div>
          </div>
        )}

        {delayedAppointments.length > 0 && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <AlertCircle className="text-white w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400 uppercase">Atraso</p>
              <p className="text-sm font-bold text-red-800">{delayedAppointments.length} atendimento(s) em atraso</p>
            </div>
          </div>
        )}
      </div>

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
          title="Próximo em" 
          value={nextApp?.date ? format(parseISO(nextApp.date), 'HH:mm') : '--:--'} 
          icon={<Clock className="w-5 h-5" />} 
          color="bg-blue-100 text-blue-600" 
        />
        <StatCard 
          title="Pendentes (Não foram)" 
          value={missedAppointments} 
          icon={<BellRing className="w-5 h-5" />} 
          color="bg-amber-100 text-amber-600" 
        />
        <StatCard 
          title={`Total ${csLabel}`} 
          value={clients.length} 
          icon={<Users className="w-5 h-5 text-blue-600" />} 
          color="bg-blue-50"
        />
        <StatCard 
          title="Leads Ativos" 
          value={leads.filter(l => l.status !== 'convertido' && l.status !== 'perdido').length} 
          icon={<MessageCircle className="w-5 h-5 text-purple-600" />} 
          color="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50 lg:col-span-3">
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
                  <div key={app.id} className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-colors",
                    app.status === 'atrasado' ? "bg-red-50 border border-red-100 animate-pulse" : "bg-gray-50 hover:bg-rose-50"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold",
                        app.status === 'atrasado' ? "bg-red-500 text-white" : "bg-rose-200 text-rose-700"
                      )}>
                        {client?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client?.name}</p>
                        <p className="text-sm text-gray-500">{proc?.name} • {app.date ? format(parseISO(app.date), 'HH:mm') : '--:--'}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      app.status === 'confirmado' ? "bg-blue-100 text-blue-700" : 
                      app.status === 'realizado' ? "bg-green-100 text-green-700" : 
                      app.status === 'pendente' ? "bg-amber-100 text-amber-700" : 
                      app.status === 'atrasado' ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
                    )}>
                      {(app.status || '').charAt(0).toUpperCase() + (app.status || '').slice(1)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum atendimento para hoje.</p>
            )}
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
  onDeleteAppointment,
  cLabel
}: { 
  appointments: Appointment[], 
  clients: Client[],
  procedures: Procedure[],
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onMarkAsPaid: (id: string) => void,
  onUndoMarkAsPaid: (id: string) => void,
  onOpenNewAppointment: (date: Date) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  cLabel: string
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(monthStart, { weekStartsOn: 0 }), 
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }) 
  });

  const dayAppointments = appointments.filter(a => a.date && isSameDay(parseISO(a.date), selectedDate))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(a => a.date && isSameDay(parseISO(a.date), date));
  };

  const statusColors: Record<AppointmentStatus, string> = {
    confirmado: "text-blue-500",
    realizado: "text-green-500",
    faltou: "text-red-500",
    pendente: "text-amber-500",
    desmarcado: "text-gray-400",
    atrasado: "text-red-600 font-bold animate-pulse"
  };

  const statusLabels: Record<AppointmentStatus, string> = {
    confirmado: "Confirmado",
    realizado: "Realizado",
    faltou: "Pendente (Follow-up)",
    pendente: "Aguardando",
    desmarcado: "Desmarcado",
    atrasado: "Atrasado"
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
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  setSelectedDate(now);
                }}
                className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors border border-rose-100"
              >
                Hoje
              </button>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
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
                          {clients.find(c => c.id === app.clientId)?.name?.split(' ')[0] || cLabel}
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
                          {client?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{client?.name || 'Cliente Excluída'}</p>
                          <p className="text-xs text-gray-500">{app.date ? format(parseISO(app.date), 'HH:mm') : '--:--'} • {proc?.name || 'Procedimento'}</p>
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
  onDeleteClient,
  cLabel,
  csLabel
}: { 
  clients: Client[], 
  appointments: Appointment[], 
  procedures: Procedure[], 
  onOpenNewClient: () => void,
  onEditClient: (client: Client) => void,
  onDeleteClient: (id: string) => void,
  cLabel: string,
  csLabel: string
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (c.phone || '').includes(searchTerm)
  );

  if (selectedClient) {
    const clientAppointments = appointments.filter(a => a.clientId === selectedClient.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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
                {selectedClient.name?.charAt(0) || '?'}
              </div>
              <h2 className="text-xl font-black text-gray-900">{selectedClient.name || cLabel}</h2>
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
                        <p className="text-xs text-gray-500">{app.date ? format(parseISO(app.date), "dd/MM/yyyy") : '-'}</p>
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
                  {client.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">{client.name || cLabel}</h3>
                  <p className="text-sm text-gray-500">{client.phone || '-'}</p>
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
  onDeleteAppointment,
  cLabel
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  cLabel: string
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
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const statusLabels: Record<AppointmentStatus, string> = {
    confirmado: "Confirmado",
    realizado: "Realizado",
    faltou: "Pendente (Follow-up)",
    pendente: "Aguardando",
    desmarcado: "Desmarcado",
    atrasado: "Atrasado"
  };

  const statusColors: Record<AppointmentStatus, string> = {
    confirmado: "bg-blue-100 text-blue-700",
    realizado: "bg-green-100 text-green-700",
    faltou: "bg-red-100 text-red-700",
    pendente: "bg-amber-100 text-amber-700",
    desmarcado: "bg-gray-400 text-white",
    atrasado: "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
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
            {(['todos', 'pendente', 'confirmado', 'atrasado', 'realizado', 'faltou'] as const).map((s) => (
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

          <div className="bg-white rounded-2xl shadow-sm border border-rose-50 overflow-hidden text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data & Hora</th>
                <th className="px-6 py-4">{cLabel}</th>
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
                      <div className="text-sm font-bold text-gray-900">{app.date ? format(parseISO(app.date), 'dd/MM/yyyy') : '-'}</div>
                      <div className="text-xs text-gray-400">{app.date ? format(parseISO(app.date), 'HH:mm') : '--:--'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">
                          {client?.name?.charAt(0) || '?'}
                        </div>
                        <div className="font-medium text-gray-900">{client?.name || `${cLabel} Excluída`}</div>
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
  onDeleteBudget,
  cLabel,
  userProfile
}: { 
  budgets: Budget[], 
  clients: Client[], 
  procedures: Procedure[], 
  onAddBudget: (b: Budget) => void, 
  onAddProcedure: (p: Procedure) => void, 
  onUpdateProcedure: (id: string, u: Partial<Procedure>) => void,
  onDeleteBudget: (id: string) => void,
  cLabel: string,
  userProfile: UserProfile | null
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
      validUntil: addDays(new Date(), userProfile?.budgetValidityDays || 7).toISOString()
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
      return `${p?.name || 'Procedimento'}: ${formatCurrency(item.price)}`;
    }).join('\n');
    
    const text = `Olá ${client.name || cLabel}! Segue seu orçamento:\n\n${items}\n\nTotal: ${formatCurrency(budget.total)}\nVálido até: ${budget.validUntil ? format(parseISO(budget.validUntil), 'dd/MM/yyyy') : '-'}`;
    window.open(`https://wa.me/${(client.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
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
                  <h3 className="font-bold text-gray-900">{client?.name || cLabel}</h3>
                  <p className="text-xs text-gray-500">{budget.date ? format(parseISO(budget.date), 'dd/MM/yyyy') : '-'}</p>
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

const LeadsTab = ({ 
  leads, 
  onUpdateStatus,
  onDelete
}: { 
  leads: Lead[], 
  onUpdateStatus: (id: string, status: Lead['status']) => void,
  onDelete: (id: string) => void
}) => {
  const statusLabels: Record<Lead['status'], string> = {
    'novo': 'Novo',
    'follow-up-1': '1º Contato',
    'follow-up-3': '3º Contato',
    'follow-up-7': '7º Contato',
    'convertido': 'Convertido',
    'perdido': 'Perdido'
  };

  const statusColors: Record<Lead['status'], string> = {
    'novo': 'bg-blue-100 text-blue-700',
    'follow-up-1': 'bg-amber-100 text-amber-700',
    'follow-up-3': 'bg-orange-100 text-orange-700',
    'follow-up-7': 'bg-rose-100 text-rose-700',
    'convertido': 'bg-green-100 text-green-700',
    'perdido': 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Prospecção de Clientes</h1>
          <p className="text-sm font-medium text-gray-500">Transforme interessados em faturamento real.</p>
        </div>
        <div className="flex items-center gap-2 bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100 animate-pulse">
          <Zap className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="text-xs font-black text-rose-600 uppercase">Aceleração Ativa</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Leads List */}
        <div className="lg:col-span-8 space-y-6">
          {leads.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.map(lead => (
                <div key={lead.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-rose-50 flex flex-col gap-4 group transition-all hover:shadow-xl hover:shadow-rose-100/30">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl",
                        lead.platform === 'instagram' ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white" : "bg-green-500 text-white"
                      )}>
                        {lead.platform === 'instagram' ? <MessageCircle className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{lead.name}</h3>
                        <p className="text-[10px] text-gray-400 uppercase font-black">{lead.platform}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDelete(lead.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl relative">
                    <p className="text-xs text-gray-600 line-clamp-3 italic">"{lead.lastMessage}"</p>
                    <div className="absolute -top-2 -left-2 bg-white p-1 rounded-lg border border-gray-100">
                      <Clock className="w-3 h-3 text-rose-500" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", statusColors[lead.status])}>
                      {statusLabels[lead.status]}
                    </span>
                    {lead.estimatedValue && (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">
                        Potencial: {formatCurrency(lead.estimatedValue)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 flex gap-2">
                    <select 
                      className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-xs font-bold text-gray-500 outline-none focus:ring-2 focus:ring-rose-500"
                      value={lead.status}
                      onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)}
                    >
                      {Object.entries(statusLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <button className="p-3 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all active:scale-95">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] border-2 border-dashed border-rose-100 p-12 text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                <Rocket className="w-10 h-10 text-rose-400" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Sua agenda está pronta, mas faltam clientes?</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8 font-medium">
                O sistema é sua máquina de vendas, mas você precisa de combustível (leads). Comece a capturar dados de possíveis clientes agora.
              </p>
              <button 
                onClick={() => window.open('https://wa.me/seunumerodecontato', '_blank')}
                className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-gray-200 flex items-center gap-3 mx-auto"
              >
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                Quero LOTAR minha agenda
              </button>
            </div>
          )}
        </div>

        {/* Traffic Manager Sidebar Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10">
              <div className="bg-rose-500 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-rose-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black mb-4 leading-tight">Impulsione seu Negócio com Tráfego Pago 🚀</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Nós configuramos suas campanhas no **Facebook, Instagram e Google** para que as pessoas certas encontrem o seu serviço.
              </p>
              
              <ul className="space-y-3 mb-8">
                {['Anúncios segmentados', 'Relatórios semanais', 'Novos leads todos os dias', 'Estratégia personalizada'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-xs font-bold text-gray-300">
                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => window.open('https://wa.me/seunumerodecontato', '_blank')}
                className="w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-sm hover:bg-rose-50 transition-all flex items-center justify-center gap-2 group-hover:gap-4 transition-all"
              >
                Falar com Especialista
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100">
            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-2">Dica de Crescimento</h4>
            <p className="text-xs font-medium text-rose-800 leading-relaxed">
              Responder um lead nos primeiros 5 minutos aumenta em até 9x a chance de conversão. Use este dashboard para não perder tempo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FollowUpTab = ({ 
  followUps, 
  onOpenNewFollowUp,
  onUpdateStatus,
  onDelete,
  onEdit,
  cLabel
}: { 
  followUps: FollowUp[], 
  onOpenNewFollowUp: () => void,
  onUpdateStatus: (id: string, status: FollowUp['status']) => void,
  onDelete: (id: string) => void,
  onEdit?: (fu: FollowUp) => void,
  cLabel: string
}) => {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Follow-up</h1>
          <p className="text-sm font-medium text-gray-500 text-balance">Gerencie o acompanhamento pós-procedimento de suas clientes.</p>
        </div>
        <button 
          onClick={onOpenNewFollowUp}
          className="bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Follow-up
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-rose-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-rose-50/50">
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Procedimento</th>
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Profissional</th>
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Data Follow-up</th>
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Observação</th>
                <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {followUps.length > 0 ? (
                followUps.map(fu => (
                  <tr key={fu.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center font-bold text-rose-600 text-xs">
                          {fu.clientName?.charAt(0) || '?'}
                        </div>
                        <span className="font-bold text-gray-900">{fu.clientName || cLabel}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-medium">{fu.procedureName || 'Procedimento'}</td>
                    <td className="p-4 text-sm text-gray-600">{fu.professionalName || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{fu.date ? format(parseISO(fu.date), 'dd/MM/yyyy') : '-'}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        fu.status === 'Pendente' ? "bg-amber-100 text-amber-700" :
                        fu.status === 'Em andamento' ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {fu.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{fu.observation}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => onEdit && onEdit(fu)}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors" 
                          title="Editar registros"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Abrir WhatsApp">
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        {fu.status !== 'Concluído' && (
                          <button 
                            onClick={() => onUpdateStatus(fu.id, 'Concluído')}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" 
                            title="Marcar como concluído"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => onDelete(fu.id)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors" 
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                        <BellRing className="w-8 h-8 text-rose-200" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Nenhum follow-up pendente</p>
                        <p className="text-xs text-gray-400">Clique em "Novo Follow-up" para criar um acompanhamento manual.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  onDeleteEntry,
  userProfile
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  entries: FinancialEntry[], 
  onAddEntry: (e: FinancialEntry) => void,
  onEditEntry: (e: FinancialEntry) => void,
  onDeleteEntry: (id: string) => void,
  userProfile: UserProfile | null
}) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('receita');
  const [category, setCategory] = useState('Geral');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro' | 'outro'>('pix');

  const categories = {
    receita: ['Procedimento', 'Venda de Produto', 'Cursos', 'Outro'],
    despesa: ['Aluguel', 'Produtos', 'Marketing', 'Energia/Água', 'Outro']
  };

  const totalRevenue = entries.filter(e => e.type === 'receita').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'despesa').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalRevenue - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || isNaN(parseFloat(amount))) return;
    onAddEntry({
      id: Math.random().toString(36).substr(2, 9),
      description: desc,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      type,
      category,
      paymentMethod
    });
    setDesc('');
    setAmount('');
    setCategory(type === 'receita' ? categories.receita[0] : categories.despesa[0]);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const businessName = userProfile?.businessName || "Meu Negócio";
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');
    
    doc.setFontSize(20);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(businessName, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // gray-500
    doc.text("Extrato Financeiro", 14, 30);
    doc.text(`Gerado em: ${dateStr}`, 14, 38);
    
    const tableData = entries.map(e => [
      e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '-',
      e.description || 'Sem descrição',
      e.type === 'receita' ? 'Entrou' : 'Saiu',
      formatCurrency(e.amount || 0)
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
              value={type} onChange={e => {
                const newType = e.target.value as 'receita' | 'despesa';
                setType(newType);
                setCategory(newType === 'receita' ? categories.receita[0] : categories.despesa[0]);
              }}
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-rose-500 font-bold"
            >
              <option value="receita">Dinheiro Entrando (Receita)</option>
              <option value="despesa">Dinheiro Saindo (Despesa)</option>
            </select>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Categoria</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700"
              >
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Forma de Pagamento</label>
              <select 
                value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700"
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all active:scale-95">
              Confirmar Lançamento
            </button>
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
              {[...entries].sort((a,b) => (b.date || '').localeCompare(a.date || '')).map(entry => (
                <tr key={entry.id} className="group transition-colors hover:bg-rose-50/30">
                  <td className="px-6 py-4 text-xs text-gray-400">{entry.date ? format(parseISO(entry.date), 'dd/MM/yy') : '-'}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{entry.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{entry.category || 'Geral'}</span>
                      {entry.paymentMethod && <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{entry.paymentMethod}</span>}
                    </div>
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

const ServicesTab = ({ 
  procedures, 
  onAddProcedure, 
  onUpdateProcedure, 
  onDeleteProcedure,
  onEditProcedure 
}: { 
  procedures: Procedure[], 
  onAddProcedure: (p: Procedure) => void, 
  onUpdateProcedure: (id: string, updates: Partial<Procedure>) => void, 
  onDeleteProcedure: (id: string) => void,
  onEditProcedure: (p: Procedure) => void
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
    <div className="max-w-5xl space-y-8">
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Serviços</h1>
          <p className="text-sm font-medium text-gray-500">Gerencie seu catálogo de procedimentos e valores</p>
        </div>
        <button 
          onClick={() => setIsAddingProc(true)}
          className="bg-rose-500 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Novo Serviço
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {procedures.map(proc => (
          <motion.div 
            key={proc.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[32px] shadow-sm border border-rose-50 group hover:shadow-xl hover:shadow-rose-100/30 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shadow-inner group-hover:scale-110 transition-transform">
                <Activity className="w-7 h-7" />
              </div>
              <button 
                onClick={() => onDeleteProcedure(proc.id)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">{proc.name}</h3>
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400 mb-8">
              <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg"><Clock className="w-4 h-4 text-rose-400" /> {proc.duration} min</span>
              <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">{formatCurrency(proc.price)}</span>
            </div>
            <button 
              onClick={() => onEditProcedure(proc)}
              className="w-full py-3.5 rounded-2xl border-2 border-gray-50 text-gray-400 font-bold hover:border-rose-100 hover:text-rose-600 hover:bg-rose-50/50 transition-all active:scale-95"
            >
              Editar Procedimento
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isAddingProc && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl relative border border-rose-50"
            >
              <h2 className="text-3xl font-black text-gray-900 mb-8">Novo Serviço</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase ml-4 tracking-widest text-left block">Nome do Serviço</label>
                  <input 
                    placeholder="Ex: Limpeza de Pele" 
                    value={newProc.name}
                    onChange={e => setNewProc(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-gray-700 placeholder:text-gray-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-4 tracking-widest text-left block">Preço</label>
                    <input 
                      placeholder="0,00" 
                      type="number"
                      value={newProc.price}
                      onChange={e => setNewProc(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full p-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-gray-700 placeholder:text-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-4 tracking-widest text-left block">Minutos</label>
                    <input 
                      placeholder="60" 
                      type="number"
                      value={newProc.duration}
                      onChange={e => setNewProc(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full p-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-gray-700 placeholder:text-gray-300"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                  <button onClick={() => setIsAddingProc(false)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
                  <button onClick={handleAdd} className="flex-1 bg-rose-500 text-white py-5 rounded-2xl font-bold shadow-xl shadow-rose-200 hover:bg-rose-600 hover:-translate-y-1 transition-all active:translate-y-0">Salvar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsTab = ({ 
  userProfile,
  onUpdateProfile,
  onResetMocks
}: { 
  userProfile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void,
  onResetMocks: () => void
}) => {
  const [profile, setProfile] = useState<Partial<UserProfile>>(userProfile || {});

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile]);

  const daysOfWeek = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 }
  ];

  return (
    <div className="max-w-5xl space-y-8 text-left pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-sm font-medium text-gray-500">Ajuste os detalhes do seu negócio e atendimento</p>
        </div>
        <button 
          onClick={() => onUpdateProfile(profile)}
          className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all active:scale-95"
        >
          Salvar Tudo
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-500" /> Perfil Profissional
            </h2>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-rose-50 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Nome Completo</label>
                  <input 
                    type="text" 
                    value={profile.name || ''} 
                    onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Nome do Negócio</label>
                  <input 
                    type="text" 
                    value={profile.businessName || ''} 
                    onChange={e => setProfile(p => ({ ...p, businessName: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-4">WhatsApp (DDD)</label>
                    <input 
                      type="text" 
                      placeholder="(00) 00000-0000"
                      value={profile.phone || ''} 
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-4">Instagram</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                      <input 
                        type="text" 
                        placeholder="seu.perfil"
                        value={profile.instagram || ''} 
                        onChange={e => setProfile(p => ({ ...p, instagram: e.target.value }))}
                        className="w-full p-4 pl-10 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Endereço do Estúdio</label>
                  <input 
                    type="text" 
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={profile.address || ''} 
                    onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-500" /> Detalhes do Negócio
            </h2>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-rose-50 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Especialidade / Ramo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Estética, Nutrição, Fisioterapia"
                    value={profile.specialty || ''} 
                    onChange={e => setProfile(p => ({ ...p, specialty: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Validade de Orçamentos (Dias)</label>
                  <input 
                    type="number" 
                    value={profile.budgetValidityDays || 7} 
                    onChange={e => setProfile(p => ({ ...p, budgetValidityDays: parseInt(e.target.value) }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Como você chama seus clientes?</label>
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                    {['Cliente', 'Paciente', 'Aluno', 'Membro'].map(label => (
                      <button
                        key={label}
                        onClick={() => setProfile(p => ({ ...p, clientLabel: label as any }))}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                          profile.clientLabel === label 
                            ? "bg-white text-rose-500 shadow-sm" 
                            : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-500" /> Horário de Atendimento
            </h2>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-rose-50 space-y-8">
              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1 block">Dias Úteis</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => {
                    const isSelected = profile.workingDays?.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        onClick={() => {
                          const current = profile.workingDays || [];
                          const next = isSelected 
                            ? current.filter(v => v !== day.value)
                            : [...current, day.value].sort();
                          setProfile(p => ({ ...p, workingDays: next }));
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          isSelected 
                            ? "bg-rose-500 text-white shadow-md shadow-rose-100" 
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Abertura</label>
                  <input 
                    type="time"
                    value={profile.workingHours?.start || '08:00'}
                    onChange={e => setProfile(p => ({ ...p, workingHours: { ...p.workingHours!, start: e.target.value } }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-4">Fechamento</label>
                  <input 
                    type="time" 
                    value={profile.workingHours?.end || '18:00'}
                    onChange={e => setProfile(p => ({ ...p, workingHours: { ...p.workingHours!, end: e.target.value } }))}
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-500" /> Sistema
            </h2>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-rose-50 space-y-4">
              <p className="text-sm text-gray-500 font-medium">
                Precisa de dados fictícios para testar as ferramentas do sistema?
              </p>
              <button 
                onClick={onResetMocks}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4 text-rose-500" /> Restaurar Dados de Exemplo
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Firebase Auth
  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  // Firebase Firestore Sync
  React.useEffect(() => {
    if (!user) {
      setClients([]);
      setAppointments([]);
      setProcedures([]);
      setFinancialEntries([]);
      setLeads([]);
      setBudgets([]);
      setFollowUps([]);
      return;
    }

    const q = (path: string) => query(collection(db, path), where('ownerId', '==', user.uid));

    const unsubscribers = [
      onSnapshot(q('clients'), (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() } as Client))), (e) => handleFirestoreError(e, OperationType.LIST, 'clients')),
      onSnapshot(q('appointments'), (s) => setAppointments(s.docs.map(d => ({ id: d.id, ...d.data() } as Appointment))), (e) => handleFirestoreError(e, OperationType.LIST, 'appointments')),
      onSnapshot(q('procedures'), (s) => setProcedures(s.docs.map(d => ({ id: d.id, ...d.data() } as Procedure))), (e) => handleFirestoreError(e, OperationType.LIST, 'procedures')),
      onSnapshot(q('financialEntries'), (s) => setFinancialEntries(s.docs.map(d => ({ id: d.id, ...d.data() } as FinancialEntry))), (e) => handleFirestoreError(e, OperationType.LIST, 'financialEntries')),
      onSnapshot(q('leads'), (s) => setLeads(s.docs.map(d => ({ id: d.id, ...d.data() } as Lead))), (e) => handleFirestoreError(e, OperationType.LIST, 'leads')),
      onSnapshot(q('budgets'), (s) => setBudgets(s.docs.map(d => ({ id: d.id, ...d.data() } as Budget))), (e) => handleFirestoreError(e, OperationType.LIST, 'budgets')),
      onSnapshot(q('followUps'), (s) => setFollowUps(s.docs.map(d => ({ id: d.id, ...d.data() } as FollowUp))), (e) => handleFirestoreError(e, OperationType.LIST, 'followUps')),
      onSnapshot(doc(db, 'userProfiles', user.uid), (s) => {
        if (s.exists()) {
          setUserProfile({ id: s.id, ...s.data() } as UserProfile);
        } else {
          // Initialize default profile
          const defaultProfile: UserProfile = {
            name: user.displayName || '',
            businessName: '',
            specialty: 'Estética',
            phone: '',
            address: '',
            instagram: '',
            workingHours: { start: '08:00', end: '18:00' },
            workingDays: [1, 2, 3, 4, 5],
            budgetValidityDays: 7,
            clientLabel: 'Cliente',
            ownerId: user.uid
          };
          setDoc(doc(db, 'userProfiles', user.uid), defaultProfile);
        }
        // After loading profile and setting up listeners, we can stop loading
        setTimeout(() => setIsInitialLoading(false), 800);
      }, (e) => handleFirestoreError(e, OperationType.GET, 'userProfile')),
    ];

    return () => unsubscribers.forEach(u => u());
  }, [user]);

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) { console.error(e); }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      setAuthError('Falha ao entrar com Google. Tente o login por e-mail.');
    }
  };
  
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewFollowUpModalOpen, setIsNewFollowUpModalOpen] = useState(false);
  const [clientStep, setClientStep] = useState(1);
  const [selectedDateForNewApp, setSelectedDateForNewApp] = useState(new Date());
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const email = emailInput.toLowerCase().trim();
    const password = passwordInput.toLowerCase(); // Per request: case-insensitive
    
    if (password.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        const isDefaultAdmin = email === 'brefer@gmail.com' && password === 'brefer';
        
        if (isDefaultAdmin) {
          try {
            // Attempt to sign in, if fails, create
            await signInWithEmailAndPassword(auth, email, password);
          } catch (signInErr: any) {
            await createUserWithEmailAndPassword(auth, email, password);
          }
        } else {
          setAuthError('Usuário não encontrado ou senha incorreta.');
        }
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('O login por e-mail não está ativado no Firebase Console.');
      } else {
        setAuthError('Erro ao entrar. ' + error.message);
      }
    }
  };

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [editingFinancialEntry, setEditingFinancialEntry] = useState<FinancialEntry | null>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [alerts, setAlerts] = useState<{ id: string, message: string, type: 'info' | 'warning' | 'error' }[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<{ id: string, message: string, type: 'info' | 'warning' | 'error', date: Date }[]>([]);
  const shownAlerts = React.useRef<Set<string>>(new Set());

  // Lógica de Alertas
  React.useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      const newAlerts: { id: string, message: string, type: 'info' | 'warning' | 'error' }[] = [];
      const updatedAppointments = [...appointments];
      let hasChanges = false;

      appointments.forEach(app => {
        const appDate = parseISO(app.date);
        if (!isValid(appDate)) return;
        const diffMinutes = differenceInMinutes(appDate, now);

        // 1. Alerta de 1 dia antes
        if (isTomorrow(appDate)) {
          const alertId = `tomorrow-${app.id}`;
          if (!shownAlerts.current.has(alertId)) {
            if (!newAlerts.find(a => a.id === 'tomorrow-general')) {
              newAlerts.push({ id: 'tomorrow-general', message: 'Você tem atendimentos agendados para amanhã', type: 'info' });
              shownAlerts.current.add(alertId);
            }
          }
        }

        // 2. Alerta de 10 minutos antes
        if (diffMinutes <= 10 && diffMinutes > 0 && app.status === 'confirmado') {
          const alertId = `10min-${app.id}`;
          if (!shownAlerts.current.has(alertId)) {
            newAlerts.push({ id: alertId, message: `Seu próximo atendimento começa em ${diffMinutes} minutos`, type: 'warning' });
            shownAlerts.current.add(alertId);
          }
        }

        // 3. Alerta de Atraso
        if (isAfter(now, appDate) && app.status === 'confirmado') {
          const alertId = `delay-${app.id}`;
          const index = updatedAppointments.findIndex(a => a.id === app.id);
          if (index !== -1 && updatedAppointments[index].status !== 'atrasado') {
            updatedAppointments[index] = { ...updatedAppointments[index], status: 'atrasado' };
            hasChanges = true;
            
            if (!shownAlerts.current.has(alertId)) {
              newAlerts.push({ id: alertId, message: `Atendimento atrasado: Verifique o horário`, type: 'error' });
              shownAlerts.current.add(alertId);
            }
          }
        }
      });

      if (hasChanges) {
        setAppointments(updatedAppointments);
      }

      if (newAlerts.length > 0) {
        const historyEntries = newAlerts.map(a => ({ ...a, date: new Date() }));
        setNotificationHistory(prev => [...historyEntries, ...prev].slice(0, 20));
        
        setAlerts(prev => {
          // Filtrar alertas que já existem para evitar duplicatas de chaves
          const uniqueNewAlerts = newAlerts.filter(na => !prev.some(p => p.id === na.id));
          return [...prev, ...uniqueNewAlerts].slice(-3);
        });
        
        // Remove alertas visuais após 10 segundos
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => !newAlerts.some(na => na.id === a.id)));
        }, 10000);
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000); // Checa a cada 30s
    return () => clearInterval(interval);
  }, [appointments]); // Removido 'role' da dependência

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `appointments/${id}`); }
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!user) return;
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const client = clients.find(c => c.id === app.clientId);
    const proc = procedures.find(p => p.id === app.procedureId);

    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'realizado' });
      await addDoc(collection(db, 'financialEntries'), {
        description: `Atendimento: ${client?.name} (${proc?.name})`,
        amount: app.price,
        date: new Date().toISOString(),
        type: 'receita',
        category: 'Serviços',
        appointmentId: id,
        ownerId: user.uid
      });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'payment'); }
  };

  const handleUndoMarkAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'confirmado' });
      const entry = financialEntries.find(e => e.appointmentId === id);
      if (entry) {
        await deleteDoc(doc(db, 'financialEntries', entry.id));
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'undo-payment'); }
  };

  const handleAddAppointment = async (app: Appointment) => {
    if (!user) return;
    try {
      const { id, ...data } = app;
      await addDoc(collection(db, 'appointments'), { ...data, ownerId: user.uid });
      setIsNewAppModalOpen(false);
      setAlerts(prev => [...prev, { id: Math.random().toString(), message: 'Agendamento salvo com sucesso!', type: 'info' }].slice(-3));
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'appointments'); }
  };

  const handleAddClient = async (client: Client) => {
    if (!user) return;
    try {
      const { id, ...data } = client;
      await addDoc(collection(db, 'clients'), { ...data, ownerId: user.uid });
      setIsNewClientModalOpen(false);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'clients'); }
  };

  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    try {
      await updateDoc(doc(db, 'clients', id), updates);
      setEditingClient(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `clients/${id}`); }
  };

  const handleDeleteClient = (id: string) => {
    showConfirm('Excluir Cliente', 'Tem certeza que deseja excluir esta cliente? Todos os agendamentos dela também serão removidos.', async () => {
      try {
        await deleteDoc(doc(db, 'clients', id));
        const toDelete = appointments.filter(a => a.clientId === id);
        for (const app of toDelete) {
          await deleteDoc(doc(db, 'appointments', app.id));
        }
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `clients/${id}`); }
    });
  };

  const handleAddFinancialEntry = async (entry: FinancialEntry) => {
    if (!user) return;
    try {
      const { id, ...data } = entry;
      await addDoc(collection(db, 'financialEntries'), { ...data, ownerId: user.uid });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'financialEntries'); }
  };

  const handleUpdateFinancialEntry = async (id: string, updates: Partial<FinancialEntry>) => {
    try {
      await updateDoc(doc(db, 'financialEntries', id), updates);
      setEditingFinancialEntry(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `financialEntries/${id}`); }
  };

  const handleDeleteFinancialEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'financialEntries', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `financialEntries/${id}`); }
  };

  const handleUpdateLeadStatus = async (id: string, status: Lead['status']) => {
    try {
      await updateDoc(doc(db, 'leads', id), { status });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `leads/${id}`); }
  };

  const handleDeleteLead = (id: string) => {
    showConfirm('Excluir Lead', 'Deseja remover este contato da prospecção?', async () => {
      try {
        await deleteDoc(doc(db, 'leads', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `leads/${id}`); }
    });
  };

  const handleAddBudget = async (budget: Budget) => {
    if (!user) return;
    try {
      const { id, ...data } = budget;
      await addDoc(collection(db, 'budgets'), { ...data, ownerId: user.uid });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'budgets'); }
  };

  const handleAddFollowUp = async (followUp: FollowUp) => {
    if (!user) return;
    try {
      const { id, ...data } = followUp;
      await addDoc(collection(db, 'followUps'), { ...data, ownerId: user.uid });
      setIsNewFollowUpModalOpen(false);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'followUps'); }
  };

  const handleUpdateFollowUpStatus = async (id: string, status: FollowUp['status']) => {
    try {
      await updateDoc(doc(db, 'followUps', id), { status });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `followUps/${id}`); }
  };

  const handleUpdateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    try {
      await updateDoc(doc(db, 'followUps', id), updates);
      setEditingFollowUp(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `followUps/${id}`); }
  };

  const handleDeleteFollowUp = (id: string) => {
    showConfirm(
      'Excluir Follow-up',
      'Tem certeza que deseja excluir este acompanhamento?',
      async () => {
        try {
          await deleteDoc(doc(db, 'followUps', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `followUps/${id}`); }
      }
    );
  };

  const handleDeleteBudget = (id: string) => {
    showConfirm('Excluir Orçamento', 'Tem certeza que deseja excluir este orçamento?', async () => {
      try {
        await deleteDoc(doc(db, 'budgets', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `budgets/${id}`); }
    });
  };

  const handleAddProcedure = async (proc: Procedure) => {
    if (!user) return;
    try {
      const { id, ...data } = proc;
      await addDoc(collection(db, 'procedures'), { ...data, ownerId: user.uid });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'procedures'); }
  };

  const handleUpdateProcedure = async (id: string, updates: Partial<Procedure>) => {
    try {
      await updateDoc(doc(db, 'procedures', id), updates);
      setEditingProcedure(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `procedures/${id}`); }
  };

  const handleDeleteProcedure = (id: string) => {
    showConfirm('Excluir Procedimento', 'Tem certeza que deseja excluir este procedimento?', async () => {
      try {
        await deleteDoc(doc(db, 'procedures', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `procedures/${id}`); }
    });
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      await updateDoc(doc(db, 'appointments', id), updates);
      setEditingAppointment(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `appointments/${id}`); }
  };

  const handleResetMocks = () => {
    if (!user) return;
    showConfirm('Carregar Dados de Exemplo', 'Isso irá carregar dados de teste no banco de dados com seus relacionamentos preservados. Deseja continuar?', async () => {
      try {
        for (const p of MOCK_PROCEDURES) await setDoc(doc(db, 'procedures', p.id), { ...p, ownerId: user.uid });
        for (const c of MOCK_CLIENTS) await setDoc(doc(db, 'clients', c.id), { ...c, ownerId: user.uid });
        for (const a of MOCK_APPOINTMENTS) await setDoc(doc(db, 'appointments', a.id), { ...a, ownerId: user.uid });
        for (const f of MOCK_FINANCIAL) await setDoc(doc(db, 'financialEntries', f.id), { ...f, ownerId: user.uid });
        for (const l of MOCK_LEADS) await setDoc(doc(db, 'leads', l.id), { ...l, ownerId: user.uid });
        for (const b of MOCK_BUDGETS) await setDoc(doc(db, 'budgets', b.id), { ...b, ownerId: user.uid });
        
        setAlerts([{ id: 'mock-loaded', message: 'Dados de exemplo carregados com sucesso no Firebase!', type: 'info' }]);
      } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'reset-mocks'); }
    });
  };

  const handleDeleteAppointment = (id: string) => {
    showConfirm('Excluir Agendamento', 'Tem certeza que deseja excluir este agendamento?', async () => {
      try {
        await deleteDoc(doc(db, 'appointments', id));
        const entries = financialEntries.filter(e => e.appointmentId === id);
        for (const entry of entries) await deleteDoc(doc(db, 'financialEntries', entry.id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `appointments/${id}`); }
    });
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'userProfiles', user.uid), updates, { merge: true });
      setAlerts(prev => [...prev, { id: Math.random().toString(), message: 'Configurações salvas!', type: 'info' }].slice(-3));
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'userProfile'); }
  };

  const cLabel = userProfile?.clientLabel || 'Cliente';
  const csLabel = cLabel === 'Cliente' ? 'Clientes' : 
                 cLabel === 'Paciente' ? 'Pacientes' :
                 cLabel === 'Aluno' ? 'Alunos' : 'Membros';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'clientes', label: csLabel, icon: Users },
    { id: 'prospeccao', label: 'Prospecção', icon: MessageCircle },
    { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
    { id: 'servicos', label: 'Serviços', icon: Activity },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
    { id: 'follow-up', label: 'Follow-up', icon: BellRing },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return (
        <Dashboard 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          onNavigateToAgenda={() => setActiveTab('agenda')} 
          notificationHistory={notificationHistory}
          csLabel={csLabel}
          user={user}
          userProfile={userProfile}
          leads={leads}
        />
      );
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
          cLabel={cLabel}
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
          cLabel={cLabel}
          csLabel={csLabel}
        />
      );
      case 'prospeccao': return (
        <LeadsTab 
          leads={leads} 
          onUpdateStatus={handleUpdateLeadStatus} 
          onDelete={handleDeleteLead} 
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
          cLabel={cLabel}
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
          cLabel={cLabel}
          userProfile={userProfile}
        />
      );
      case 'follow-up': return (
        <FollowUpTab 
          followUps={followUps} 
          onOpenNewFollowUp={() => setIsNewFollowUpModalOpen(true)}
          onUpdateStatus={handleUpdateFollowUpStatus}
          onDelete={handleDeleteFollowUp}
          onEdit={setEditingFollowUp}
          cLabel={cLabel}
        />
      );
      case 'financeiro': return (
        <FinancialTab 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          entries={financialEntries} 
          onAddEntry={handleAddFinancialEntry}
          onEditEntry={setEditingFinancialEntry}
          onDeleteEntry={handleDeleteFinancialEntry}
          userProfile={userProfile}
        />
      );
      case 'servicos': return (
        <ServicesTab 
          procedures={procedures}
          onAddProcedure={handleAddProcedure}
          onUpdateProcedure={handleUpdateProcedure}
          onDeleteProcedure={handleDeleteProcedure}
          onEditProcedure={setEditingProcedure}
        />
      );
      case 'configuracoes': return (
        <SettingsTab 
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onResetMocks={handleResetMocks}
        />
      );
      default: return (
        <Dashboard 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          onNavigateToAgenda={() => setActiveTab('agenda')} 
          notificationHistory={notificationHistory}
          csLabel={csLabel}
          user={user}
          userProfile={userProfile}
          leads={leads}
        />
      );
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F9]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 bg-rose-500 rounded-2xl shadow-xl shadow-rose-200"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F9] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl border border-rose-50 w-full max-w-md text-center"
        >
          <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-200 mx-auto mb-8">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight">Gestão Profissional</h1>
          <p className="text-gray-500 font-medium mb-10 px-4">O sistema inteligente para organizar sua agenda, clientes e financeiro.</p>
          
          <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-4">E-mail</label>
              <input 
                type="email" 
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="exemplo@gmail.com"
                className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                required
              />
            </div>
            <div className="text-left">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-4">Senha</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Sua senha"
                className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                required
              />
            </div>
            {authError && <p className="text-rose-500 text-xs font-bold">{authError}</p>}
            <button 
              type="submit"
              className="w-full bg-rose-500 text-white p-4 rounded-2xl font-bold shadow-lg shadow-rose-200 active:scale-95 transition-all"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <span className="relative bg-white px-4 text-xs font-bold text-gray-300 uppercase">ou use</span>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white border-2 border-gray-100 hover:border-rose-200 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 group"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:grayscale-0 grayscale transition-all" alt="Google" referrerPolicy="no-referrer" />
            Entrar com Google
          </button>
          
          <p className="mt-8 text-xs text-gray-400 font-medium">
            Seus dados são salvos de forma segura e privada.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans transition-colors duration-300 bg-[#FFF9F9] text-gray-900">
      <NotificationCenter alerts={alerts} />
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
                let clientId = formData.get('clientId') as string;
                const clientSearch = formData.get('clientSearch') as string;
                
                // Fallback: Tentativa de encontrar pelo nome se o ID estiver vazio
                if (!clientId && clientSearch) {
                  const match = clients.find(c => (c.name || '').toLowerCase() === clientSearch.toLowerCase());
                  if (match) clientId = match.id;
                }
                
                const procedureId = formData.get('procedureId') as string;
                
                if (!clientId) {
                  setAlerts(prev => [...prev, { id: 'error-client', message: 'Por favor, selecione uma cliente da lista.', type: 'error' }].slice(-3));
                  return;
                }
                if (!procedureId || !date || !time) {
                  setAlerts(prev => [...prev, { id: 'error-fields', message: 'Por favor, preencha todos os campos do agendamento.', type: 'error' }].slice(-3));
                  return;
                }

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
                      const val = e.target.value;
                      const selected = clients.find(c => (c.name || '').toLowerCase() === val.toLowerCase());
                      const hiddenInput = document.getElementById('selected-client-id') as HTMLInputElement;
                      if (hiddenInput) {
                        hiddenInput.value = selected ? selected.id : '';
                      }
                    }}
                    onBlur={(e) => {
                      // Se o usuário digitou mas não selecionou, tentamos encontrar uma correspondência exata
                      if (!(document.getElementById('selected-client-id') as HTMLInputElement).value) {
                         const match = clients.find(c => (c.name || '').toLowerCase() === (e.target.value || '').toLowerCase());
                         if (match) {
                           (document.getElementById('selected-client-id') as HTMLInputElement).value = match.id;
                           e.target.value = match.name;
                         }
                      }
                    }}
                  />
                  <datalist id="clients-list">
                    {[...clients].sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  <input type="hidden" name="clientId" id="selected-client-id" />
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

      {isNewFollowUpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-6">Novo Follow-up</h2>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                const clientName = formData.get('clientName') as string;
                const procedureName = formData.get('procedureName') as string;
                const professionalName = formData.get('professionalName') as string;
                const date = formData.get('date') as string;
                const status = formData.get('status') as FollowUp['status'];
                const observation = formData.get('observation') as string;
                
                if (!clientName || !procedureName || !date) return;

                handleAddFollowUp({
                  id: Math.random().toString(36).substr(2, 9),
                  clientName,
                  procedureName,
                  professionalName,
                  date,
                  status,
                  observation
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nome da Cliente</label>
                <input type="text" name="clientName" required className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-rose-500" placeholder="Ex: Maria Silva" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Procedimento Realizado</label>
                <input type="text" name="procedureName" required className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-rose-500" placeholder="Ex: Limpeza de Pele" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Profissional Responsável</label>
                <input type="text" name="professionalName" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-rose-500" placeholder="Ex: Dra. Brenda" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Data Follow-up</label>
                  <input type="date" name="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Status</label>
                  <select name="status" className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-rose-500">
                    <option value="Pendente">Pendente</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Observação</label>
                <textarea name="observation" rows={3} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-rose-500" placeholder="Detalhes do acompanhamento..."></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsNewFollowUpModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200">Salvar</button>
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
                e.currentTarget.reset();
                setIsNewClientModalOpen(false);
                setClientStep(1);
                setAlerts(prev => [...prev, { id: 'client-added', message: 'Cliente cadastrada com sucesso!', type: 'info' }].slice(-3));
              }}
              className="space-y-4"
            >
              <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", clientStep !== 1 && "hidden")}>
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

              <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", clientStep !== 2 && "hidden")}>
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
                    status: formData.get('status') as AppointmentStatus
                  });
                  setEditingAppointment(null);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                    <input name="date" type="date" required defaultValue={editingAppointment?.date?.split('T')[0] || ''} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Horário</label>
                    <input name="time" type="time" required defaultValue={editingAppointment?.date?.split('T')[1]?.substring(0, 5) || ''} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Serviço</label>
                  <select name="procedureId" required defaultValue={editingAppointment.procedureId} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold">
                    {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                  <select name="status" required defaultValue={editingAppointment.status} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold">
                    <option value="pendente">Aguardando</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="realizado">Realizado</option>
                    <option value="faltou">Faltou (Follow-up)</option>
                    <option value="desmarcado">Desmarcado</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingAppointment(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-100 transition-all active:scale-95">Salvar</button>
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
                  <input name="description" required defaultValue={editingFinancialEntry.description} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Valor</label>
                    <input name="amount" type="number" step="0.01" required defaultValue={editingFinancialEntry.amount} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Tipo</label>
                    <select name="type" required defaultValue={editingFinancialEntry.type} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold">
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingFinancialEntry(null)} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-rose-100 transition-all active:scale-95">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Procedure Modal */}
      <AnimatePresence>
        {editingProcedure && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl relative border border-rose-50"
            >
              <h2 className="text-3xl font-black text-gray-900 mb-8">Editar Serviço</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateProcedure(editingProcedure.id, {
                    name: formData.get('name') as string,
                    price: parseFloat(formData.get('price') as string),
                    duration: parseInt(formData.get('duration') as string)
                  });
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase ml-4 tracking-widest text-left block">Nome do Serviço</label>
                  <input name="name" required defaultValue={editingProcedure.name} className="w-full p-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-gray-700" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-4 tracking-widest text-left block">Preço</label>
                    <input name="price" type="number" step="0.01" required defaultValue={editingProcedure.price} className="w-full p-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-4 tracking-widest text-left block">Duração (Min)</label>
                    <input name="duration" type="number" required defaultValue={editingProcedure.duration} className="w-full p-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold text-gray-700" />
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => setEditingProcedure(null)} className="flex-1 py-5 font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-5 rounded-2xl font-bold shadow-xl shadow-rose-200 hover:bg-rose-600 hover:-translate-y-1 transition-all active:translate-y-0">Salvar Alterações</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit FollowUp Modal */}
      <AnimatePresence>
        {editingFollowUp && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl relative border border-rose-50"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Editar Follow-up</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateFollowUp(editingFollowUp.id, {
                    clientName: formData.get('clientName') as string,
                    procedureName: formData.get('procedureName') as string,
                    professionalName: formData.get('professionalName') as string,
                    date: formData.get('date') as string,
                    status: formData.get('status') as any,
                    observation: formData.get('observation') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nome da Cliente</label>
                  <input name="clientName" required defaultValue={editingFollowUp.clientName} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Data</label>
                    <input name="date" type="date" required defaultValue={editingFollowUp.date} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Status</label>
                    <select name="status" defaultValue={editingFollowUp.status} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold">
                      <option value="Pendente">Pendente</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Observação</label>
                  <textarea name="observation" rows={3} defaultValue={editingFollowUp.observation} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditingFollowUp(null)} className="flex-1 py-4 font-bold text-gray-400">Cancelar</button>
                  <button type="submit" className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold">Salvar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex w-full h-full overflow-hidden">
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-rose-50 transition-transform duration-300 ease-in-out lg:translate-x-0 flex-shrink-0",
          !isSidebarOpen && "-translate-x-full"
        )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-gray-900 leading-none truncate max-w-[180px]">{userProfile?.businessName || 'MEU SISTEMA'}</span>
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{userProfile?.specialty || 'Gestão Profissional'}</span>
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

          <div className="mt-4 p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-white relative overflow-hidden group cursor-pointer" onClick={() => window.open('https://wa.me/seunumerodecontato', '_blank')}>
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/20 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-rose-500/40 transition-all" />
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Boost de Vendas</span>
              </div>
              <p className="text-xs font-bold leading-tight">Quer lotar sua agenda com tráfego pago?</p>
              <button className="mt-1 text-[10px] font-black uppercase flex items-center gap-1 text-rose-500 group-hover:gap-2 transition-all">
                Falar com minha agência <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-rose-50 mt-4">
            <button 
              onClick={signOutUser}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all group"
            >
              <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Sair do Sistema
            </button>
          </div>
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
  </div>
);
}
