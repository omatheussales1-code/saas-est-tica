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
  UserCheck,
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
  ArrowRight,
  RotateCcw,
  Palette,
  Target,
  Heart,
  Sparkles,
  Instagram,
  Globe,
  ExternalLink,
  Info,
  User as UserIcon,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
  isBefore,
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
  UserProfile,
  MessageTemplate
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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';

// --- Constants & Types ---

const LANDING_PAGE_URL = 'https://iridescent-gecko-731eb9.netlify.app';
const UPGRADE_URL = 'https://funny-jalebi-005836.netlify.app/#depoimentos';

const COLOR_PRESETS = {
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337'
  },
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
  },
  green: {
    50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
    500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d'
  },
  red: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
    500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d'
  },
  purple: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95'
  },
  indigo: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
    500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
  }
};

const getThemeColor = (profile: UserProfile | null, shade: number = 500) => {
  const theme = profile?.accentColor || 'rose';
  return (COLOR_PRESETS[theme as keyof typeof COLOR_PRESETS] as any)[shade] || COLOR_PRESETS.rose[500];
};

const hexToRgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const FollowUpTriggerModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  client,
  procedure,
  onAddFollowUp,
  userProfile
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  appointment: Appointment | null,
  client: Client | null,
  procedure: Procedure | null,
  onAddFollowUp: (fu: FollowUp) => void,
  userProfile: UserProfile | null
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [returnDays, setReturnDays] = useState('30');
  
  if (!isOpen || !appointment || !client) return null;

  const toggleOption = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const followUps: { days: number, obs: string }[] = [];

    if (selected.includes('tomorrow')) {
      followUps.push({ days: 1, obs: 'Check-up pós-procedimento (como está se sentindo?)' });
    }
    if (selected.includes('7days')) {
      followUps.push({ days: 7, obs: 'Follow-up de 7 dias (resultados iniciais e cuidados)' });
    }
    if (selected.includes('15days')) {
      followUps.push({ days: 15, obs: 'Follow-up de 15 dias (manutenção ou novo serviço)' });
    }
    if (selected.includes('custom')) {
      const days = parseInt(returnDays);
      if (!isNaN(days)) {
        followUps.push({ days, obs: `Retorno personalizado em ${days} dias` });
      }
    }

    followUps.forEach(fu => {
      onAddFollowUp({
        id: Math.random().toString(36).substr(2, 9),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        procedureName: procedure?.name || 'Procedimento',
        professionalName: userProfile?.name || 'Profissional',
        date: addDays(new Date(), fu.days).toISOString(),
        status: 'Pendente',
        observation: fu.obs
      });
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-rose-50"
      >
        {/* Header de Sucesso */}
        <div className="bg-rose-500 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500 shadow-xl"
          >
            <CheckCircle2 className="w-8 h-8" />
          </motion.div>
          <h2 className="text-2xl font-black text-white mb-1">Atendimento Finalizado!</h2>
          <p className="text-rose-100 text-sm font-bold uppercase tracking-widest">Procedimento Concluído com Sucesso</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center mb-2">
            <h3 className="text-lg font-black text-gray-900 leading-tight">Fidelize {client.name.split(' ')[0]}</h3>
            <p className="text-sm text-gray-500 font-medium text-balance leading-tight">Selecione as opções de acompanhamento desejadas:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Check-up Amanhã */}
            <button 
              onClick={() => toggleOption('tomorrow')}
              className={cn(
                "group p-5 rounded-3xl border transition-all text-left relative",
                selected.includes('tomorrow') 
                  ? "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-200" 
                  : "bg-rose-50 border-rose-100 hover:bg-rose-100"
              )}
            >
              <p className={cn("text-sm font-black", selected.includes('tomorrow') ? "text-white" : "text-rose-900")}>Check-up amanhã</p>
              <p className={cn("text-[10px] font-bold uppercase", selected.includes('tomorrow') ? "text-rose-100" : "text-rose-600/70")}>Saber como ela está</p>
              {selected.includes('tomorrow') && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
            </button>

            {/* 7 Dias */}
            <button 
              onClick={() => toggleOption('7days')}
              className={cn(
                "group p-5 rounded-3xl border transition-all text-left relative",
                selected.includes('7days') 
                  ? "bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-200" 
                  : "bg-blue-50 border-blue-100 hover:bg-blue-100"
              )}
            >
              <p className={cn("text-sm font-black", selected.includes('7days') ? "text-white" : "text-blue-900")}>7 Dias Depois</p>
              <p className={cn("text-[10px] font-bold uppercase", selected.includes('7days') ? "text-blue-100" : "text-blue-600/70")}>Verificar resultados</p>
              {selected.includes('7days') && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
            </button>

            {/* 15 Dias */}
            <button 
              onClick={() => toggleOption('15days')}
              className={cn(
                "group p-5 rounded-3xl border transition-all text-left relative",
                selected.includes('15days') 
                  ? "bg-purple-500 border-purple-600 text-white shadow-lg shadow-purple-200" 
                  : "bg-purple-50 border-purple-100 hover:bg-purple-100"
              )}
            >
              <p className={cn("text-sm font-black", selected.includes('15days') ? "text-white" : "text-purple-900")}>15 Dias Depois</p>
              <p className={cn("text-[10px] font-bold uppercase", selected.includes('15days') ? "text-purple-100" : "text-purple-600/70")}>Lembrete de Retorno</p>
              {selected.includes('15days') && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-white" /></div>}
            </button>

            {/* Personalizado */}
            <div 
              onClick={() => toggleOption('custom')}
              className={cn(
                "p-5 rounded-3xl border transition-all flex flex-col justify-between cursor-pointer relative",
                selected.includes('custom') 
                  ? "bg-gray-900 border-gray-900 shadow-lg shadow-gray-200" 
                  : "bg-gray-50 border-gray-100 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <p className={cn("text-[10px] font-black uppercase tracking-wider", selected.includes('custom') ? "text-gray-400" : "text-gray-400")}>Data Personalizada</p>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <input 
                  type="number" 
                  min="1"
                  value={returnDays} 
                  onChange={e => setReturnDays(e.target.value)}
                  className={cn(
                    "w-full p-2 rounded-xl border font-black text-center outline-none transition-all",
                    selected.includes('custom') 
                      ? "bg-white/10 border-white/20 text-white focus:ring-1 focus:ring-white/50" 
                      : "bg-white border-gray-100 text-rose-500 focus:ring-2 focus:ring-rose-500"
                  )}
                />
              </div>
              {selected.includes('custom') && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-green-400" /></div>}
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className={cn(
                "w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl",
                selected.length > 0 
                  ? "bg-gray-900 text-white hover:-translate-y-1 shadow-gray-200 active:translate-y-0" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              Confirmar {selected.length > 0 && `(${selected.length})`} Agendamentos
            </button>
            
            <button 
              onClick={onClose}
              className="w-full py-2 text-xs font-black text-gray-300 uppercase tracking-widest hover:text-gray-500 transition-colors"
            >
              Agora não, obrigado
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

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
    userId: string | null | undefined;
    email: string | null | undefined;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string | null;
      email: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email
      })) || []
    }
  };
  
  let errorMessage: string;
  try {
    errorMessage = JSON.stringify(errInfo);
  } catch (e) {
    // Fallback if circular structures are somehow present
    errorMessage = JSON.stringify({
      error: errInfo.error,
      operationType: errInfo.operationType,
      path: errInfo.path,
      authInfo: { userId: errInfo.authInfo.userId }
    });
  }
  
  console.error('Firestore Error: ', errorMessage);
  throw new Error(errorMessage);
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
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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

const resolveTemplate = (template: string, data: { 
  customerName?: string, 
  date?: string, 
  time?: string, 
  procedure?: string, 
  address?: string, 
  businessName?: string,
  price?: number
}) => {
  let result = template;
  result = result.replace(/{cliente_nome}/g, data.customerName || '');
  result = result.replace(/{data}/g, data.date || '');
  result = result.replace(/{hora}/g, data.time || '');
  result = result.replace(/{procedimento}/g, data.procedure || '');
  result = result.replace(/{endereco}/g, data.address || '');
  result = result.replace(/{nome_espaco}/g, data.businessName || '');
  result = result.replace(/{valor}/g, data.price ? formatCurrency(data.price) : '');
  return result;
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

const statusColors: Record<AppointmentStatus, string> = {
  confirmado: "text-rose-500",
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

const Dashboard = ({ 
  appointments, 
  clients, 
  procedures, 
  onNavigateToAgenda, 
  notificationHistory,
  csLabel,
  user,
  userProfile,
  setIsSidebarOpen,
  setIsNotificationsOpen,
  isNotificationsOpen,
  onSendWhatsApp
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onNavigateToAgenda: () => void, 
  notificationHistory: { id: string, message: string, type: 'info' | 'warning' | 'error', date: Date }[],
  csLabel: string,
  user: User | null,
  userProfile: UserProfile | null,
  setIsSidebarOpen: (open: boolean) => void,
  setIsNotificationsOpen: (open: boolean) => void,
  isNotificationsOpen: boolean,
  onSendWhatsApp: (app: Appointment, type: 'confirmation' | 'reminder') => void
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const todayAppointments = useMemo(() => 
    appointments
      .filter(a => a.date && isToday(parseISO(a.date)))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
    [appointments]
  );
  
  const tomorrowAppointments = useMemo(() => 
    appointments.filter(a => a.date && isTomorrow(parseISO(a.date))),
    [appointments]
  );
  
  const delayedAppointments = useMemo(() => 
    appointments.filter(a => a.status === 'atrasado'),
    [appointments]
  );
  
  const nextApp = useMemo(() => 
    todayAppointments
      .filter(a => a.status === 'confirmado' && isAfter(parseISO(a.date), now))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0],
    [todayAppointments, now]
  );

  const timeRemaining = useMemo(() => {
    if (!nextApp?.date) return null;
    const appDate = parseISO(nextApp.date);
    const diff = differenceInMinutes(appDate, now);
    if (diff <= 0) return 'Agora';
    if (diff < 60) return `em ${diff} min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `em ${hours}h ${mins > 0 ? mins + 'm' : ''}`;
  }, [nextApp, now]);
  
  const missedAppointments = appointments.filter(a => a.status === 'faltou').length;
  
  return (
    <div className="space-y-6 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:bg-rose-50 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel de Controle</h1>
            <p className="text-sm font-medium text-gray-500">Bem-vindo(a) de volta, {userProfile?.name?.split(' ')[0] || user?.displayName || 'Profissional'}!</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={cn(
              "p-3 text-gray-400 hover:text-rose-500 transition-colors relative rounded-2xl bg-white border border-rose-50 shadow-sm",
              isNotificationsOpen && "bg-rose-50 text-rose-500"
            )}
          >
            <BellRing className="w-5 h-5" />
            {notificationHistory.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Próximos Hoje" 
          value={todayAppointments.length} 
          icon={<Clock className="w-6 h-6 text-rose-500" />}
          color="bg-rose-50"
        />
        <StatCard 
          title="Lembretes Amanhã" 
          value={tomorrowAppointments.length} 
          icon={<MessageCircle className="w-6 h-6 text-emerald-500" />}
          color="bg-emerald-50"
        />
        <StatCard 
          title="Próximo Cliente" 
          value={timeRemaining || '—'} 
          icon={<UserCheck className="w-6 h-6 text-blue-500" />}
          color="bg-blue-50"
        />
        <StatCard 
          title="Faltas (Pendentes)" 
          value={missedAppointments} 
          icon={<AlertCircle className="w-6 h-6 text-red-500" />}
          color="bg-red-50"
        />
      </div>

      {/* Painel Principal: Agenda e Lembretes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Lado Esquerdo: Agenda de Hoje */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Clock className="w-6 h-6 text-rose-500" />
                Próximos de Hoje
              </h2>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">{todayAppointments.length} agendamentos para hoje</p>
            </div>
            <button 
              onClick={onNavigateToAgenda}
              className="p-3 bg-white border border-rose-50 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
              title="Ver Agenda"
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white p-4 rounded-[40px] border border-rose-50 shadow-sm space-y-2 min-h-[400px]">
            {todayAppointments.length > 0 ? (
              todayAppointments.slice(0, 5).map((app, index) => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                return (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group p-5 rounded-[32px] hover:bg-rose-50 transition-all flex items-center justify-between border border-transparent hover:border-rose-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-rose-50 rounded-2xl flex flex-col items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                        <span className="text-[10px] font-black uppercase">{format(parseISO(app.date!), 'HH:mm')}</span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">{client?.name}</p>
                        <p className="text-xs font-medium text-gray-400">{proc?.name}</p>
                      </div>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-50", statusColors[app.status])}>
                      {statusLabels[app.status]}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-40">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold italic">Nenhum atendimento para hoje.</p>
              </div>
            )}
            
            {todayAppointments.length > 5 && (
              <button 
                onClick={onNavigateToAgenda}
                className="w-full py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
              >
                + {todayAppointments.length - 5} outros atendimentos hoje
              </button>
            )}
          </div>
        </div>

        {/* Lado Direito: Fila de Lembretes (DIA ANTERIOR) */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-emerald-500" />
                Lembretes para Amanhã
              </h2>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Enviar mensagens de confirmação</p>
            </div>
            {tomorrowAppointments.length > 0 && (
              <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                {tomorrowAppointments.length} Pendentes
              </div>
            )}
          </div>

          <div className="bg-emerald-50/30 p-4 rounded-[40px] border border-emerald-100 shadow-inner space-y-3 min-h-[400px]">
            {tomorrowAppointments.length > 0 ? (
              tomorrowAppointments.map((app, index) => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                return (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white p-5 rounded-[32px] border border-emerald-50 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50">
                        <UserIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{client?.name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase">
                          {format(parseISO(app.date!), 'HH:mm')} • {proc?.name}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onSendWhatsApp(app, 'reminder')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 animate-in fade-in zoom-in duration-300"
                    >
                      Lembrar
                    </button>
                  </motion.div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
                <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center shadow-md text-emerald-100 border border-emerald-50">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <p className="font-black text-gray-400 uppercase text-xs tracking-widest mb-1">Tudo Enviado!</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[200px]">Nenhum agendamento para amanhã precisa de lembrete agora.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-8 rounded-[40px] lg:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Clock className="w-6 h-6 text-rose-500" />
                Próximos da Agenda
              </h2>
              <p className="text-sm text-gray-500 font-medium">Fluxo de atendimentos para hoje</p>
            </div>
            <button 
              onClick={onNavigateToAgenda}
              className="text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
            >
              Ver Agenda Completa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((app, index) => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                const isLate = app.status === 'atrasado';
                const isDone = app.status === 'realizado';

                return (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group relative p-6 rounded-[32px] border transition-all duration-300",
                      isLate 
                        ? "bg-red-50 border-red-100 shadow-xl shadow-red-100/50" 
                        : isDone
                        ? "bg-emerald-50 border-emerald-100 opacity-75"
                        : "bg-white border-rose-50 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100/30 hover:-translate-y-1"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                          isLate ? "bg-red-500 text-white" : "bg-rose-100 text-rose-600"
                        )}>
                          {client?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-base leading-tight">{client?.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{app.date ? format(parseISO(app.date), 'HH:mm') : '--:--'}</span>
                            <span className="text-[10px] font-bold text-gray-300">•</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate max-w-[100px]">{proc?.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        app.status === 'confirmado' ? "bg-rose-100 text-rose-600" : 
                        app.status === 'realizado' ? "bg-emerald-100 text-emerald-600" : 
                        app.status === 'pendente' ? "bg-amber-100 text-amber-600" : 
                        app.status === 'atrasado' ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-gray-100 text-gray-500"
                      )}>
                        {statusLabels[app.status as AppointmentStatus] || app.status}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1">
                        {app.status === 'confirmado' && (
                          <div className="flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] font-black text-rose-600 uppercase">
                              {(() => {
                                const diff = differenceInMinutes(parseISO(app.date), now);
                                if (diff <= 0) return 'Agora';
                                if (diff < 60) return `${diff}m`;
                                return `${Math.floor(diff/60)}h ${diff%60}m`;
                              })()}
                            </span>
                          </div>
                        )}
                        {isLate && (
                          <div className="flex items-center gap-1.5 bg-red-500 px-3 py-1.5 rounded-xl">
                            <AlertCircle className="w-3 h-3 text-white" />
                            <span className="text-[10px] font-black text-white uppercase">Atrasado</span>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => onNavigateToAgenda()}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                <CalendarIcon className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-500 font-bold">Nenhum atendimento para hoje.</p>
              </div>
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
  onMarkAsFinished,
  onMarkAsPaid,
  onUndoMarkAsPaid,
  onOpenNewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  cLabel,
  userProfile
}: { 
  appointments: Appointment[], 
  clients: Client[],
  procedures: Procedure[],
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onMarkAsFinished: (id: string) => void,
  onMarkAsPaid: (id: string) => void,
  onUndoMarkAsPaid: (id: string) => void,
  onOpenNewAppointment: (date: Date) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  cLabel: string,
  userProfile: UserProfile | null
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

  const handleSendWhatsApp = (app: Appointment, type: 'confirmation' | 'reminder') => {
    const client = clients.find(c => c.id === app.clientId);
    const proc = procedures.find(p => p.id === app.procedureId);
    if (!client) return;

    const template = type === 'confirmation' 
      ? (userProfile?.confirmationMessageTemplate || 'Olá {cliente_nome}, tudo bem? Seu horário {data} às {hora} está confirmado ❤️🧚♀️\n\nPra eu te atender do jeitinho que você gosta, me conta:\n• Você é mais de ficar quietinha relaxando ou gosta de bater papo durante a massagem?\n• Qual música ou cantor(a) você escolheria pra tocar na sua sessão?\n• Tem algo no seu corpo ou no seu dia a dia que te incomoda e que você gostaria muito que eu te ajudasse?\n\nVai ser um prazer te conhecer melhor! 💛\n\nEndereço: {endereco}\n{nome_espaco}')
      : (userProfile?.reminderMessageTemplate || 'Olá {cliente_nome}, tudo bem? Passando para confirmar seu horário amanhã, {data} às {hora}. ❤️🧚♀️');

    const appDate = app.date ? parseISO(app.date) : new Date();
    
    const message = resolveTemplate(template, {
      customerName: client.name,
      date: format(appDate, 'dd/MM/yyyy'),
      time: format(appDate, 'HH:mm'),
      procedure: proc?.name,
      address: userProfile?.address,
      businessName: userProfile?.businessName,
      price: app.price
    });

    const phone = (client.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
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
                          app.status === 'confirmado' ? 'bg-rose-500' : 
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
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {dayAppointments.length > 0 ? (
              dayAppointments.map((app, index) => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = procedures.find(p => p.id === app.procedureId);
                const isLate = app.status === 'atrasado';
                const isRealized = app.status === 'realizado';

                return (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-5 rounded-[28px] border transition-all duration-300 group relative",
                      isLate 
                        ? "bg-red-50 border-red-100 shadow-lg shadow-red-100/30" 
                        : isRealized
                        ? "bg-emerald-50/50 border-emerald-100/50 grayscale-[0.3]"
                        : "bg-white border-rose-50 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100/20"
                    )}
                  >
                    {/* Action Bar Floating */}
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                      <button 
                        onClick={() => onEditAppointment(app)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-blue-100 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteAppointment(app.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm",
                        isLate ? "bg-red-500 text-white" : "bg-rose-100 text-rose-600"
                      )}>
                        {client?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-gray-900 text-base flex items-center gap-2 truncate">
                          {client?.name || 'Cliente Excluída'}
                          {isRealized && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1 text-rose-500">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-wider">{app.date ? format(parseISO(app.date), 'HH:mm') : '--:--'}</span>
                          </div>
                          <span className="text-gray-300">•</span>
                          <span className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-widest">{proc?.name || 'Serviço'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-gray-50">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSendWhatsApp(app, 'confirmation')}
                          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-100 transition-all"
                          title="Enviar confirmação de agendamento"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(app, 'reminder')}
                          className="flex-1 bg-amber-50 text-amber-600 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-100 hover:bg-amber-100 transition-all"
                          title="Enviar lembrete (Dia anterior)"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          Lembrete
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3 h-3 text-gray-300" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Controle de Status</span>
                        </div>
                        <select 
                          value={app.status}
                          onChange={(e) => onUpdateStatus(app.id, e.target.value as AppointmentStatus)}
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest bg-white/50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-100 outline-none cursor-pointer transition-all",
                            statusColors[app.status]
                          )}
                        >
                          {(['confirmado', 'realizado', 'faltou', 'pendente', 'desmarcado', 'atrasado'] as AppointmentStatus[]).map(s => (
                            <option key={s} value={s} className="bg-white text-gray-900">{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="pt-2 grid grid-cols-1 gap-2">
                        {app.status !== 'realizado' ? (
                          <button
                            onClick={() => onMarkAsFinished(app.id)}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Finalizar Atendimento
                          </button>
                        ) : !app.isPaid ? (
                          <button
                            onClick={() => onMarkAsPaid(app.id)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:translate-y-0"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Cobrar Agora
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <div className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100/50">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Finalizado e Pago
                            </div>
                            <button
                              onClick={() => onUndoMarkAsPaid(app.id)}
                              className="px-4 bg-gray-50 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-[20px] transition-all border border-gray-100"
                              title="Estornar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {app.status === 'realizado' && !app.isPaid && (
                          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                            <span className="animate-pulse w-1.5 h-1.5 bg-amber-500 rounded-full" />
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Aguardando Pagamento</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 px-8">
                <div className="w-20 h-20 bg-rose-50 rounded-[32px] flex items-center justify-center mb-6">
                  <CalendarIcon className="w-8 h-8 text-rose-200" />
                </div>
                <h4 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-2">Dia Tranquilo</h4>
                <p className="text-gray-400 text-xs font-medium leading-relaxed">Nenhum agendamento encontrado para esta data.</p>
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
    (c.phone || '').includes(searchTerm) ||
    (c.email || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const exportClientsCSV = () => {
    if (clients.length === 0) return;
    
    const data = clients.map(c => ({
      'NOME COMPLETO': `${c.name || ''} ${c.lastName || ''}`.trim(),
      'WHATSAPP': c.phone || '',
      'E-MAIL': c.email || '',
      'CIDADE': c.city || '',
      'ESTADO': c.state || '',
      'ANIVERSÁRIO': c.birthday ? format(new Date(c.birthday), 'dd/MM/yyyy') : '',
      'DATA CADASTRO': c.createdAt ? format(new Date(c.createdAt), 'dd/MM/yyyy') : '',
      'OBSERVAÇÕES': c.observations || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = [{ wch: 40 }, { wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CRM Clientes");
    XLSX.writeFile(wb, `crm_completo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportLookalikeXLSX = () => {
    if (clients.length === 0) return;
    
    // Formato otimizado para Meta (Facebook) e Google Ads
    const data = clients.map(c => ({
      'email': (c.email || '').toLowerCase().trim(),
      'phone': (c.phone || '').replace(/\D/g, ''), // Somente números
      'fn': (c.name || '').trim(), // First Name
      'ln': (c.lastName || '').trim(), // Last Name
      'ct': (c.city || '').trim(), // City
      'st': (c.state || '').trim().toLowerCase(), // State (usualmente minúsculo ou abreviado)
      'country': (c.country || 'BR').toUpperCase(),
      'dob': c.birthday ? c.birthday.replace(/-/g, '') : '', // Date of Birth YYYYMMDD
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lookalike");
    XLSX.writeFile(wb, `lookalike_ads_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

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
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
              <p className="text-gray-500 font-medium">{selectedClient.phone}</p>
              {selectedClient.email && <p className="text-xs text-gray-400 font-bold mt-1">{selectedClient.email}</p>}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
              <div className="flex items-center gap-2 mb-4 text-rose-600">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-bold">Dados de CRM</h3>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span className="truncate">{selectedClient.email || 'Email não cadastrado'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                  <span>{selectedClient.phone || 'WhatsApp não cadastrado'}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 px-2">Base de dados completa para gestão de fidelização, promoções e anúncios.</p>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Lista de Clientes (CRM)</h1>
          <p className="text-sm text-gray-500 font-medium">Sua base de dados completa para fidelização e vendas</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={exportClientsCSV}
            className="flex-1 md:flex-none border-2 border-rose-100 text-rose-500 hover:bg-rose-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm"
          >
            <Download className="w-4 h-4" />
            CRM Completo
          </button>
          <button 
            onClick={onOpenNewClient}
            className="flex-1 md:flex-none bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-200 font-bold"
          >
            <Plus className="w-5 h-5" />
            Nova Cliente
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nome, telefone ou e-mail..." 
          className="flex-1 outline-none text-gray-700 bg-transparent font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {sortedClients.map(client => (
          <div 
            key={client.id} 
            className="bg-white p-8 rounded-[32px] shadow-sm border border-rose-50 hover:border-rose-200 transition-all group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/20 group-hover:bg-rose-500 transition-colors" />
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
            <div onClick={() => setSelectedClient(client)} className="pl-2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-xl font-bold">
                  {client.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-1 leading-tight">{client.name || cLabel}</h3>
                  <p className="text-xs text-gray-400 font-black mt-0.5">{client.phone || '-'}</p>
                </div>
              </div>
              <div className="space-y-2.5 pt-2 border-t border-gray-50">
                {client.email && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tight">
                    <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-3 h-3 text-blue-500" />
                    </div>
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tight">
                  <div className="w-5 h-5 rounded-lg bg-gray-50 flex items-center justify-center">
                    <CalendarIcon className="w-3 h-3 text-gray-400" />
                  </div>
                  <span>Cadastrada em {client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy') : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {sortedClients.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[40px] border border-rose-50">
          <Users className="w-12 h-12 text-rose-100 mx-auto mb-4" />
          <p className="text-gray-400 font-bold">Nenhuma cliente encontrada.</p>
        </div>
      )}
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
  cLabel,
  userProfile
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  cLabel: string,
  userProfile: UserProfile | null
}) => {
  const [filter, setFilter] = useState<AppointmentStatus | 'todos'>('todos');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleSendWhatsApp = (app: Appointment, type: 'confirmation' | 'reminder') => {
    const client = clients.find(c => c.id === app.clientId);
    const proc = procedures.find(p => p.id === app.procedureId);
    if (!client) return;

    const template = type === 'confirmation' 
      ? (userProfile?.confirmationMessageTemplate || 'Olá {cliente_nome}, tudo bem? Seu horário {data} às {hora} está confirmado ❤️🧚♀️\n\nPra eu te atender do jeitinho que você gosta, me conta:\n• Você é mais de ficar quietinha relaxando ou gosta de bater papo durante a massagem?\n• Qual música ou cantor(a) você escolheria pra tocar na sua sessão?\n• Tem algo no seu corpo ou no seu dia a dia que te incomoda e que você gostaria muito que eu te ajudasse?\n\nVai ser um prazer te conhecer melhor! 💛\n\nEndereço: {endereco}\n{nome_espaco}')
      : (userProfile?.reminderMessageTemplate || 'Olá {cliente_nome}, tudo bem? Passando para confirmar seu horário amanhã, {data} às {hora}. ❤️🧚♀️');

    const appDate = app.date ? parseISO(app.date) : new Date();
    
    const message = resolveTemplate(template, {
      customerName: client.name,
      date: format(appDate, 'dd/MM/yyyy'),
      time: format(appDate, 'HH:mm'),
      procedure: proc?.name,
      address: userProfile?.address,
      businessName: userProfile?.businessName,
      price: app.price
    });

    const phone = (client.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };
  
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
    confirmado: "bg-rose-100 text-rose-700",
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
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                            statusColors[app.status]
                          )}>
                            {statusLabels[app.status]}
                          </span>
                          {app.status === 'realizado' && (
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                              app.isPaid ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                            )}>
                              {app.isPaid ? "Pago" : "Pendente"}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleSendWhatsApp(app, 'confirmation')}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Confirmação WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleSendWhatsApp(app, 'reminder')}
                            className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                            title="Lembrete WhatsApp"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onEditAppointment(app)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
  onDelete,
  onAddLead
}: { 
  leads: Lead[], 
  onUpdateStatus: (id: string, status: Lead['status']) => void, 
  onDelete: (id: string) => void,
  onAddLead: (lead: Lead) => void
}) => {
  return (
    <div className="space-y-12 pb-24 -mt-8">
      {/* Hero Section: Strategically Positioning */}
      <section className="relative -mx-8 px-8 py-24 bg-[#050b1a] text-white overflow-hidden rounded-b-[60px] shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/5 rounded-full -ml-24 -mb-24 blur-[100px]" />
        
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 bg-blue-400/10 px-6 py-3 rounded-full border border-blue-400/20">
              ESTRATÉGIA DE POSICIONAMENTO
            </span>
          </motion.div>
          
          <h1 className="text-4xl md:text-7xl font-black tracking-wider leading-[1.1] mb-8 text-white uppercase">
            Seu Instagram pode estar <br /> 
            <span className="text-blue-200 italic font-serif">afastando clientes.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-blue-100 font-medium leading-relaxed max-w-2xl mx-auto mb-12 opacity-95">
            As pessoas até chegam no seu perfil... mas não sentem segurança para fechar com você. Vamos transformar sua presença digital em uma máquina de vendas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <button 
              onClick={() => window.open(UPGRADE_URL, '_blank')}
              className="w-full sm:w-auto bg-white text-[#050b1a] px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-blue-50 active:scale-95 flex items-center justify-center gap-3 shadow-2xl"
            >
              Quero Melhorar Meu Instagram
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Diagnosis Blocks */}
      <section className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-black text-[#050b1a] text-center mb-12 tracking-tight">Isso acontece no seu perfil hoje?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            "Atrai muitos curiosos pedindo orçamento, mas poucos agendamentos reais",
            "Sente que precisa baixar o preço para não perder a cliente para a concorrência",
            "Passa horas criando conteúdo e sente que ninguém valoriza seu esforço",
            "O seu serviço é de alta qualidade, mas o seu perfil parece amador e confuso",
            "Sofre com pessoas que perguntam o preço e 'somem' logo em seguida",
            "Sabe que é uma autoridade no que faz, mas sua imagem digital não transmite isso"
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-7 rounded-3xl border border-slate-100 flex items-center gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-200 transition-all">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <p className="font-bold text-[#050b1a] text-lg leading-tight">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Transformation Pillars */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-[#050b1a] tracking-tight uppercase">O QUE EU FAÇO <span className="text-slate-400">COM VOCÊ:</span></h2>
          <div className="h-1 w-20 bg-blue-600 mx-auto mt-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: "SUA IDENTIDADE", desc: "Deixar o seu perfil com a sua cara e com um visual profissional que passa confiança.", icon: Instagram },
            { label: "SUA MENSAGEM", desc: "Aprender a falar de um jeito que seus clientes entendam e valorizem o seu esforço.", icon: MessageCircle },
            { label: "SEUS CONTEÚDOS", desc: "Ideias simples para postar todo dia sem sofrimento e atrair as pessoas certas.", icon: Target },
            { label: "SUAS VENDAS", desc: "Dicas para transformar curiosos em clientes fiéis através de uma conversa leve.", icon: TrendingUp }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 text-[#050b1a] group-hover:bg-[#050b1a] group-hover:text-white transition-all">
                <item.icon className="w-7 h-7" />
              </div>
              <h4 className="text-xs font-black text-[#050b1a] mb-3 tracking-widest uppercase">{item.label}</h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Opportunity Management - Replaced with Website CTA */}
      <section className="max-w-6xl mx-auto px-4 pt-12 border-t border-slate-100">
        <div className="bg-[#050b1a] text-white rounded-[50px] p-24 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[100px]" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10">
              <Globe className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">VAMOS CONSTRUIR SEU IMPÉRIO DIGITAL?</h3>
            <p className="text-blue-100/70 text-lg font-medium mb-12 leading-relaxed">
              O seu talento merece um posicionamento que faça as pessoas desejarem o seu serviço imediatamente, sem questionar o preço.
            </p>
            <button 
              onClick={() => window.open(UPGRADE_URL, '_blank')}
              className="bg-white text-[#050b1a] px-16 py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95 flex items-center gap-4 mx-auto"
            >
              VISITAR MEU SITE OFICIAL
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Final Premium CTA */}
      <section className="max-w-4xl mx-auto text-center py-24 px-6 relative">
        <h2 className="text-4xl md:text-5xl font-black text-[#050b1a] mb-8 italic font-serif leading-tight">Pronta para elevar o nível <br />do seu negócio?</h2>
        <p className="text-slate-500 text-lg font-medium mb-12 max-w-xl mx-auto">
          O seu talento merece um Instagram que faça as pessoas desejarem o seu serviço imediatamente.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-5 justify-center">
          <button 
            onClick={() => window.open(UPGRADE_URL, '_blank')}
            className="bg-[#050b1a] text-white px-14 py-7 rounded-[28px] font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95 inline-flex items-center gap-4 group"
          >
            Quero Melhorar Meu Instagram
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </section>

      {/* CRM Section - Real Lead Management */}
      <section className="max-w-6xl mx-auto px-4 py-24 border-t border-slate-100">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-black text-[#050b1a] tracking-tight uppercase">GESTÃO DE <span className="text-slate-400">PROSPECÇÃO</span></h2>
            <p className="text-slate-500 font-medium mt-2">Gerencie e converta seus contatos interessados em clientes reais.</p>
          </div>
          <button 
            onClick={() => {
              const name = prompt('Nome do Lead:');
              const phone = prompt('WhatsApp do Lead:');
              if (name && phone) {
                onAddLead({ id: '', name, phone, status: 'novo', origin: 'CRM Manual' });
              }
            }}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome / Origem</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.length > 0 ? leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{lead.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lead.origin || 'Instagram'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
                        className="flex items-center gap-2 text-green-600 font-bold hover:underline"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {lead.phone}
                      </button>
                    </td>
                    <td className="p-6">
                      <select 
                        value={lead.status}
                        onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-transparent outline-none cursor-pointer appearance-none",
                          lead.status === 'novo' ? "bg-blue-100 text-blue-700" :
                          lead.status === 'contato' ? "bg-amber-100 text-amber-700" :
                          lead.status === 'proposta' ? "bg-purple-100 text-purple-700" :
                          lead.status === 'convertido' ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-600"
                        )}
                      >
                        <option value="novo">Novo Lead</option>
                        <option value="contato">Em Contato</option>
                        <option value="proposta">Proposta Enviada</option>
                        <option value="convertido">Convertido</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    </td>
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => onDelete(lead.id)}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                      Nenhum lead encontrado para gerenciar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
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
  const [showHistory, setShowHistory] = useState(false);

  const { today, overdue, upcoming, completed } = useMemo(() => {
    const now = new Date();
    const sorted = [...followUps].sort((a, b) => {
      const dateA = a.date ? parseISO(a.date).getTime() : 0;
      const dateB = b.date ? parseISO(b.date).getTime() : 0;
      return dateA - dateB;
    });

    return {
      today: sorted.filter(fu => fu.status !== 'Concluído' && fu.date && isSameDay(parseISO(fu.date), now)),
      overdue: sorted.filter(fu => fu.status !== 'Concluído' && fu.date && isBefore(startOfDay(parseISO(fu.date)), startOfDay(now)) && !isSameDay(parseISO(fu.date), now)),
      upcoming: sorted.filter(fu => fu.status !== 'Concluído' && fu.date && isAfter(startOfDay(parseISO(fu.date)), startOfDay(now)) && !isSameDay(parseISO(fu.date), now)),
      completed: sorted.filter(fu => fu.status === 'Concluído')
    };
  }, [followUps]);

  const renderTable = (list: FollowUp[], emptyMessage: string) => (
    <div className="bg-white rounded-3xl shadow-sm border border-rose-50 overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-rose-50/50">
              <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Cliente</th>
              <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Procedimento</th>
              <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Data</th>
              <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Status</th>
              <th className="p-4 text-[10px] font-black text-rose-400 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.length > 0 ? (
              list.map(fu => (
                <tr key={fu.id} className="hover:bg-rose-50/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center font-bold text-rose-600 text-xs">
                        {fu.clientName?.charAt(0) || '?'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{fu.clientName || 'Cliente'}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const phone = fu.clientPhone ? fu.clientPhone.replace(/\D/g, '') : '';
                            const text = `Olá ${fu.clientName}! Tudo bem? Gostaria de saber como você está se sentindo após o procedimento de ${fu.procedureName}...`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                          }}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm group"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-900 font-bold leading-tight">{fu.procedureName}</p>
                    <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">{fu.observation}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <div className="flex flex-col">
                      <span className="font-bold">{fu.date ? format(parseISO(fu.date), 'dd/MM/yyyy') : '-'}</span>
                      {fu.date && isToday(parseISO(fu.date)) && <span className="text-[9px] text-rose-500 font-black uppercase">Hoje</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => fu.status !== 'Concluído' && onUpdateStatus(fu.id, 'Concluído')}
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1",
                        fu.status === 'Pendente' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                        fu.status === 'Concluído' ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", fu.status === 'Pendente' ? "bg-amber-500" : "bg-green-500")} />
                      {fu.status}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit && onEdit(fu)} className="p-2 text-gray-400 hover:text-rose-500 group transition-all hover:scale-110"><Pencil className="w-5 h-5" /></button>
                      <button onClick={() => onDelete(fu.id)} className="p-2 text-gray-300 hover:text-red-500 group transition-all hover:scale-110"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Follow-up</h1>
          <p className="text-sm font-medium text-gray-500">Revise seus alertas de acompanhamento para fidelizar clientes.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2",
              showHistory ? "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-200" : "bg-white border-rose-100 text-rose-500 hover:bg-rose-50"
            )}
          >
            <RotateCcw className="w-5 h-5" />
            {showHistory ? 'Mostrar Ativos' : 'Ver Histórico'}
          </button>
          <button 
            onClick={onOpenNewFollowUp}
            className="flex-1 sm:flex-none bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo
          </button>
        </div>
      </header>

      {showHistory ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 mb-2 px-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="font-black text-gray-900 uppercase tracking-tight">Histórico de Concluídos</h3>
          </div>
          {renderTable(completed, "Nenhum histórico disponível.")}
        </motion.div>
      ) : (
        <div className="space-y-12">
          {/* Hoje */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-2 px-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight">Alertas de Hoje</h3>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{today.length} pendentes para agora</p>
              </div>
            </div>
            {renderTable(today, "Nenhum acompanhamento programado para hoje.")}
          </motion.div>

          {/* Atrasados */}
          {overdue.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-amber-600 uppercase tracking-tight">Pendentes / Atrasados</h3>
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{overdue.length} atenções necessárias</p>
                </div>
              </div>
              {renderTable(overdue, "")}
            </motion.div>
          )}

          {/* Próximos */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-2 px-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-blue-600 uppercase tracking-tight">Agendados Futuros</h3>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Acompanhamentos que virão nos próximos dias</p>
              </div>
            </div>
            {renderTable(upcoming, "Nenhum acompanhamento futuro agendado.")}
          </motion.div>
        </div>
      )}
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
  onMarkAsPaid,
  onSendWhatsApp,
  userProfile
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  entries: FinancialEntry[], 
  onAddEntry: (e: FinancialEntry) => void,
  onEditEntry: (e: FinancialEntry) => void,
  onDeleteEntry: (id: string) => void,
  onMarkAsPaid: (id: string) => void,
  onSendWhatsApp: (app: Appointment, type: 'payment') => void,
  userProfile: UserProfile | null
}) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('receita');
  
  const pendingPayments = useMemo(() => {
    return appointments.filter(app => app.status === 'realizado' && !app.isPaid);
  }, [appointments]);

  const [category, setCategory] = useState('Geral');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro' | 'outro'>('pix');
  
  // Filter States
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth'>('thisMonth');
  const [catFilter, setCatFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');

  const categories = {
    receita: ['Procedimento', 'Venda de Produto', 'Cursos', 'Outro'],
    despesa: ['Aluguel', 'Produtos', 'Marketing', 'Energia/Água', 'Outro']
  };

  const allCategories = Array.from(new Set([...categories.receita, ...categories.despesa]));

  const filteredEntries = useMemo(() => {
    let result = entries;
    const now = new Date();

    // Date Filter
    if (dateFilter === 'today') {
      result = result.filter(e => e.date && isToday(parseISO(e.date)));
    } else if (dateFilter === '7d') {
      result = result.filter(e => e.date && isAfter(parseISO(e.date), subDays(now, 7)));
    } else if (dateFilter === '30d') {
      result = result.filter(e => e.date && isAfter(parseISO(e.date), subDays(now, 30)));
    } else if (dateFilter === 'thisMonth') {
      result = result.filter(e => e.date && isSameMonth(parseISO(e.date), now));
    } else if (dateFilter === 'lastMonth') {
      result = result.filter(e => e.date && isSameMonth(parseISO(e.date), subMonths(now, 1)));
    }

    // Category Filter
    if (catFilter !== 'all') {
      result = result.filter(e => e.category === catFilter);
    }

    // Payment Method Filter
    if (payFilter !== 'all') {
      result = result.filter(e => e.paymentMethod === payFilter);
    }

    return result;
  }, [entries, dateFilter, catFilter, payFilter]);

  const totalRevenue = filteredEntries.filter(e => e.type === 'receita').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = filteredEntries.filter(e => e.type === 'despesa').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalRevenue - totalExpenses;

  // Chart Data Preparation
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.filter(e => e.type === 'receita').forEach(e => {
      counts[e.category || 'Outro'] = (counts[e.category || 'Outro'] || 0) + e.amount;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const dailyData = useMemo(() => {
    const days: Record<string, { date: string, receita: number, despesa: number }> = {};
    const last15Days = eachDayOfInterval({
      start: subDays(new Date(), 14),
      end: new Date()
    });

    last15Days.forEach(day => {
      const key = format(day, 'dd/MM');
      days[key] = { date: key, receita: 0, despesa: 0 };
    });

    filteredEntries.forEach(e => {
      if (!e.date) return;
      const key = format(parseISO(e.date), 'dd/MM');
      if (days[key]) {
        if (e.type === 'receita') days[key].receita += e.amount;
        else days[key].despesa += e.amount;
      }
    });

    return Object.values(days);
  }, [filteredEntries]);

  const primary500 = getThemeColor(userProfile, 500);

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
    const primary600 = getThemeColor(userProfile, 600);
    const [r, g, b] = hexToRgb(primary600);
    doc.setTextColor(r, g, b); 
    doc.text(businessName, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // gray-500
    doc.text("Relatório Financeiro Detalhado", 14, 30);
    doc.text(`Período Selecionado: ${dateFilter}`, 14, 38);
    doc.text(`Gerado em: ${dateStr}`, 14, 46);
    
    const tableData = filteredEntries.map(e => [
      e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '-',
      e.description || 'Sem descrição',
      e.category || '-',
      e.paymentMethod || '-',
      e.type === 'receita' ? 'Entrada' : 'Saída',
      formatCurrency(e.amount || 0)
    ]);
    
    (doc as any).autoTable({
      head: [['Data', 'Descrição', 'Categoria', 'Pagamento', 'Tipo', 'Valor']],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: hexToRgb(getThemeColor(userProfile, 50)) }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Entradas: ${formatCurrency(totalRevenue)}`, 14, finalY);
    doc.text(`Total Saídas: ${formatCurrency(totalExpenses)}`, 14, finalY + 7);
    doc.text(`Saldo Final: ${formatCurrency(balance)}`, 14, finalY + 14);
    
    doc.save(`relatorio_financeiro_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const COLORS = [getThemeColor(userProfile, 500), '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
          <p className="text-sm text-gray-500">Gestão completa e relatórios detalhados</p>
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 rounded-[32px] border border-amber-100 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-amber-100 bg-white/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-amber-900 tracking-tight">Pagamentos Pendentes</h3>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Atendimentos realizados que ainda não foram cobrados</p>
              </div>
            </div>
            <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{pendingPayments.length} Pendentes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50/50">
                <tr>
                  <th className="px-8 py-4">Cliente</th>
                  <th className="px-8 py-4">Data</th>
                  <th className="px-8 py-4 text-right">Valor</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/50">
                {pendingPayments.map(app => {
                  const client = clients.find(c => c.id === app.clientId);
                  const proc = procedures.find(p => p.id === app.procedureId);
                  return (
                    <tr key={app.id} className="hover:bg-white/40 transition-colors">
                      <td className="px-8 py-4">
                        <p className="font-black text-gray-900 text-sm leading-none mb-1">{client?.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">{proc?.name}</p>
                      </td>
                      <td className="px-8 py-4 text-xs font-bold text-gray-500">
                        {app.date ? format(parseISO(app.date), "dd/MM/yyyy") : '-'}
                      </td>
                      <td className="px-8 py-4 text-sm font-black text-amber-600 text-right">
                        {formatCurrency(app.price)}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => onSendWhatsApp(app, 'payment')}
                            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
                          >
                            <MessageCircle className="w-3 h-3" /> Cobrar
                          </button>
                          <button 
                            onClick={() => onMarkAsPaid(app.id)}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-100 hover:bg-black transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Marcar Pago
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-50 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-rose-500">
          <CalendarIcon className="w-4 h-4" />
          <select 
            value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}
            className="text-xs font-bold outline-none bg-transparent"
          >
            <option value="all">Todo Período</option>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="thisMonth">Este Mês</option>
            <option value="lastMonth">Mês Passado</option>
          </select>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-2 text-rose-500">
          <ClipboardList className="w-4 h-4" />
          <select 
            value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="text-xs font-bold outline-none bg-transparent"
          >
            <option value="all">Todas Categorias</option>
            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-2 text-rose-500">
          <DollarSign className="w-4 h-4" />
          <select 
            value={payFilter} onChange={e => setPayFilter(e.target.value)}
            className="text-xs font-bold outline-none bg-transparent"
          >
            <option value="all">Todas Formas</option>
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="ml-auto">
          <button onClick={exportPDF} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-rose-100 transition-all">
            <Download className="w-4 h-4" /> PDF Detalhado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full blur-2xl group-hover:bg-green-100 transition-all" />
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Entradas</p>
          <p className="text-2xl font-black text-green-600">{formatCurrency(totalRevenue)}</p>
          <div className="mt-2 text-[10px] text-green-500 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> No período filtrado
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-all" />
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Saídas</p>
          <p className="text-2xl font-black text-red-500">{formatCurrency(totalExpenses)}</p>
          <div className="mt-2 text-[10px] text-red-400 font-bold">Distribuição em {filteredEntries.filter(e => e.type === 'despesa').length} itens</div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-50 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl group-hover:bg-rose-100 transition-all" />
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Saldo Líquido</p>
          <p className={cn("text-2xl font-black", balance >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(balance)}
          </p>
          <div className="mt-2 text-[10px] text-gray-500 font-bold">Resultado operacional</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-rose-50">
          <h2 className="text-lg font-bold mb-6">Novo Lançamento</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Descrição</label>
              <input 
                type="text" value={desc} onChange={e => setDesc(e.target.value)} 
                placeholder="Ex: Aluguel, Venda, etc" className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none font-bold" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Valor</label>
              <input 
                type="number" value={amount} onChange={e => setAmount(e.target.value)} 
                placeholder="0,00" className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none font-bold text-rose-600" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Tipo</label>
              <select 
                value={type} onChange={e => {
                  const newType = e.target.value as 'receita' | 'despesa';
                  setType(newType);
                  setCategory(newType === 'receita' ? categories.receita[0] : categories.despesa[0]);
                }}
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              >
                <option value="receita">Receita (Dinheiro Entrando)</option>
                <option value="despesa">Despesa (Dinheiro Saindo)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Categoria</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              >
                {categories[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Pagamento</label>
              <select 
                value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-rose-500 font-bold"
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all active:scale-95">
              Salvar Lançamento
            </button>
          </form>
        </div>
        <div className="lg:col-span-8 bg-white rounded-[32px] shadow-sm border border-rose-50 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-rose-50 flex justify-between items-center">
            <h2 className="font-black text-gray-900 tracking-tight">Histórico de Movimentações</h2>
            <span className="text-[10px] font-black text-gray-400 uppercase">{filteredEntries.length} itens encontrados</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-rose-50/50 text-rose-700 text-xs font-black uppercase">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum lançamento no período filtrado.</td>
                  </tr>
                ) : (
                  [...filteredEntries].sort((a,b) => (b.date || '').localeCompare(a.date || '')).map(entry => (
                    <tr key={entry.id} className="group hover:bg-rose-50/20 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-400">{entry.date ? format(parseISO(entry.date), 'dd/MM') : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{entry.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{entry.category || 'Geral'}</span>
                          <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{entry.paymentMethod}</span>
                        </div>
                      </td>
                      <td className={cn("px-6 py-4 text-sm font-black text-right", entry.type === 'receita' ? "text-green-600" : "text-red-500")}>
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEditEntry(entry)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => onDeleteEntry(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <span>{entry.type === 'receita' ? '+' : '-'} {formatCurrency(entry.amount)}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos e Relatórios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-rose-50">
          <h3 className="text-lg font-black text-gray-900 mb-8 tracking-tight">Distribuição de Receitas</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-rose-50">
          <h3 className="text-lg font-black text-gray-900 mb-8 tracking-tight">Evolução Diária (Últimos 15 dias)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primary500} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={primary500} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94A3B8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94A3B8'}} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend />
                <Area type="monotone" dataKey="receita" name="Entradas" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
                <Area type="monotone" dataKey="despesa" name="Saídas" stroke={primary500} strokeWidth={3} fillOpacity={1} fill="url(#colorDesp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[40px] text-white overflow-hidden relative">
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-rose-500/20 rounded-full blur-[100px]" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Ticket Médio</p>
              <h4 className="text-3xl font-black">{formatCurrency(totalRevenue / (filteredEntries.filter(e => e.type === 'receita').length || 1))}</h4>
              <p className="text-[10px] text-gray-500 mt-1">Por venda no período</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Volume Total</p>
              <h4 className="text-3xl font-black">{filteredEntries.length}</h4>
              <p className="text-[10px] text-gray-500 mt-1">Operações registradas</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Margem Bruta</p>
              <h4 className="text-3xl font-black">{totalRevenue > 0 ? ((balance / totalRevenue) * 100).toFixed(1) : 0}%</h4>
              <p className="text-[10px] text-gray-500 mt-1">Rentabilidade sobre receita</p>
            </div>
            <div className="flex flex-col justify-end items-end">
              <button onClick={exportPDF} className="bg-rose-500 text-white px-8 py-4 rounded-2xl font-bold hover:bg-rose-600 transition-all flex items-center gap-3">
                <Download className="w-5 h-5" /> Exportar Balanço Completo
              </button>
            </div>
          </div>
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
  onResetMocks,
  isDemo
}: { 
  userProfile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void,
  onResetMocks: () => void,
  isDemo?: boolean
}) => {
  const [profile, setProfile] = useState<Partial<UserProfile>>(userProfile || {});

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile]);

  // Real-time theme preview with cleanup
  useEffect(() => {
    const theme = profile.accentColor || 'rose';
    const colors = COLOR_PRESETS[theme as keyof typeof COLOR_PRESETS];
    if (colors) {
      Object.entries(colors).forEach(([shade, hex]) => {
        document.documentElement.style.setProperty(`--primary-${shade}`, hex);
      });
    }

    // Reset to official theme color if user leaves settings without saving
    return () => {
      const savedTheme = userProfile?.accentColor || 'rose';
      const savedColors = COLOR_PRESETS[savedTheme as keyof typeof COLOR_PRESETS];
      if (savedColors) {
        Object.entries(savedColors).forEach(([shade, hex]) => {
          document.documentElement.style.setProperty(`--primary-${shade}`, hex);
        });
      }
    };
  }, [profile.accentColor, userProfile?.accentColor]);

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
    <div className="max-w-full space-y-8 text-left pb-20 px-4">
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
              <Palette className="w-5 h-5 text-rose-500" /> Cor do Sistema
            </h2>
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-rose-50 space-y-6">
              <p className="text-sm text-gray-500 font-medium">Escolha uma cor que combine com sua marca:</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {Object.keys(COLOR_PRESETS).map((colorKey) => {
                  const colors = COLOR_PRESETS[colorKey as keyof typeof COLOR_PRESETS];
                  const isSelected = profile.accentColor === colorKey || (!profile.accentColor && colorKey === 'rose');
                  
                  return (
                    <button
                      key={colorKey}
                      onClick={() => setProfile(p => ({ ...p, accentColor: colorKey }))}
                      className={cn(
                        "w-10 h-10 rounded-full transition-all flex items-center justify-center relative",
                        isSelected ? "ring-4 ring-offset-2 ring-gray-200" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: colors[500] }}
                      title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                    >
                      {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                    </button>
                  );
                })}
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
                disabled={isDemo}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                  isDemo 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-gray-900 text-white hover:bg-black"
                )}
              >
                <Activity className="w-4 h-4 text-rose-500" /> 
                {isDemo ? 'Indisponível no Modo Demo' : 'Restaurar Dados de Exemplo'}
              </button>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
};

const MessageTemplatesTab = ({
  templates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  userProfile
}: {
  templates: MessageTemplate[],
  onAddTemplate: (t: MessageTemplate) => void,
  onUpdateTemplate: (id: string, t: Partial<MessageTemplate>) => void,
  onDeleteTemplate: (id: string) => void,
  userProfile: UserProfile | null
}) => {
  const [isEditing, setIsEditing] = useState<MessageTemplate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<MessageTemplate['category']>('outros');

  const handleOpenEdit = (t: MessageTemplate) => {
    setIsEditing(t);
    setName(t.name || '');
    setContent(t.content || '');
    setCategory(t.category || 'outros');
  };

  const handleSave = () => {
    if (isEditing) {
      onUpdateTemplate(isEditing.id, { name, content, category });
      setIsEditing(null);
    } else {
      onAddTemplate({
        id: Math.random().toString(36).substr(2, 9),
        name,
        content,
        category
      });
      setIsAdding(false);
    }
    setName('');
    setContent('');
    setCategory('outros');
  };

  const tags = [
    { tag: '{cliente_nome}', label: 'Nome Cliente', color: 'bg-emerald-50 text-emerald-600 shadow-emerald-100/40' },
    { tag: '{data}', label: 'Data do Agend.', color: 'bg-blue-50 text-blue-600 shadow-blue-100/40' },
    { tag: '{hora}', label: 'Hora Marcada', color: 'bg-purple-50 text-purple-600 shadow-purple-100/40' },
    { tag: '{procedimento}', label: 'Procedimento', color: 'bg-amber-50 text-amber-600 shadow-amber-100/40' },
    { tag: '{endereco}', label: 'Seu Endereço', color: 'bg-rose-50 text-rose-600 shadow-rose-100/40' },
    { tag: '{valor}', label: 'Valor (R$)', color: 'bg-indigo-50 text-indigo-600 shadow-indigo-100/40' },
    { tag: '{nome_espaco}', label: 'Seu Espaço', color: 'bg-gray-50 text-gray-600 shadow-gray-100/40' },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <MessageCircle className="w-8 h-8 text-rose-500" /> Mensagens
          </h1>
          <p className="text-sm font-medium text-gray-500">Configure seus modelos de WhatsApp e automatize seu atendimento</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setName(''); setContent(''); setCategory('outros'); }}
          className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 transition-all shadow-xl shadow-rose-200 font-bold active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Novo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
        {templates.map(t => (
          <motion.div 
            key={t.id}
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-[40px] shadow-sm border border-rose-50 flex flex-col justify-between group relative overflow-hidden h-[320px] cursor-pointer"
            onClick={() => handleOpenEdit(t)}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteTemplate(t.id); }}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight truncate">{t.name}</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {t.category === 'agendamento' ? 'Confirmação' : t.category === 'lembrete' ? 'Lembrete' : 'Outros'}
                </span>
              </div>
              <p className="text-gray-500 text-sm line-clamp-4 font-medium leading-relaxed italic">
                "{t.content}"
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-rose-50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Editar Modelo</span>
              <ChevronRight className="w-4 h-4 text-rose-500" />
            </div>
          </motion.div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-rose-100 opacity-60">
            <MessageCircle className="w-12 h-12 text-rose-300 mb-4" />
            <p className="text-gray-500 font-bold">Nenhum modelo criado ainda.</p>
            <p className="text-gray-400 text-sm">Clique em "Novo Modelo" para começar.</p>
          </div>
        )}
      </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[48px] shadow-2xl w-full max-w-6xl overflow-hidden border border-rose-50 flex flex-col lg:flex-row h-[90vh]"
          >
            {/* Editor Side */}
            <div className="flex-1 p-10 overflow-y-auto space-y-8 border-r border-rose-50 scrollbar-hide">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                  {isAdding ? 'Novo Modelo' : 'Editar Modelo'}
                </h2>
                <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Nome do Modelo</label>
                  <input 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Confirmação de Horário"
                    className="w-full p-6 rounded-3xl bg-gray-50 border-none outline-none focus:ring-4 focus:ring-rose-100 font-black text-gray-700 text-lg transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Categoria</label>
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                    {['agendamento', 'lembrete', 'outros'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat as any)}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                          category === cat ? "bg-white text-rose-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Conteúdo da Mensagem</label>
                  <textarea 
                    id="template-textarea"
                    rows={8}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Sua mensagem aqui... Use as tags para personalizar!"
                    className="w-full p-8 rounded-[40px] bg-gray-50 border-none outline-none focus:ring-4 focus:ring-rose-100 font-medium text-gray-700 text-lg leading-relaxed shadow-inner resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 ml-4">
                     <Info className="w-4 h-4 text-rose-500" />
                     <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Variáveis Dinâmicas</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(v => (
                       <button
                        key={v.tag}
                        onClick={() => {
                          const textarea = document.getElementById('template-textarea') as HTMLTextAreaElement;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newValue = content.substring(0, start) + v.tag + content.substring(end);
                          setContent(newValue);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + v.tag.length, start + v.tag.length);
                          }, 10);
                        }}
                        className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-transparent hover:border-white shadow-sm hover:scale-105 active:scale-95 ${v.color}`}
                      >
                        + {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button 
                  onClick={handleSave}
                  disabled={!name || !content}
                  className={cn(
                    "w-full py-6 rounded-[32px] font-black text-lg shadow-2xl transition-all uppercase tracking-widest",
                    (!name || !content) 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                      : "bg-rose-500 text-white shadow-rose-200 hover:-translate-y-1 active:translate-y-0"
                  )}
                >
                  {isEditing ? 'Atualizar Modelo' : 'Criar Modelo'}
                </button>
              </div>
            </div>

            {/* Preview Side */}
            <div className="hidden lg:flex w-[450px] bg-[#e5ddd5] flex-col relative overflow-hidden shadow-inner">
               <div className="absolute top-0 inset-x-0 h-24 bg-[#075e54] flex items-center px-8 z-20 shadow-md">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-4 border-2 border-white/20 flex items-center justify-center overflow-hidden">
                  <UserIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-white font-black text-base leading-tight truncate max-w-[250px]">{userProfile?.businessName || 'Seu Espaço'}</p>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Online agora</p>
                </div>
              </div>

              <div className="p-8 mt-24">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={content}
                  className="bg-white p-6 rounded-[32px] rounded-tl-none border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-sm relative flex flex-col justify-between z-10 self-start max-w-[95%]"
                >
                  <div className="relative z-10">
                    {resolveTemplate(content || 'Sua mensagem aparecerá aqui...', {
                      customerName: 'Ana Silva',
                      date: format(addDays(new Date(), 1), 'dd/MM/yyyy'),
                      time: '14:30',
                      procedure: 'Limpeza de Pele',
                      address: userProfile?.address || 'Rua das Flores, 123',
                      businessName: userProfile?.businessName || 'Meu Espaço',
                      price: 150
                    }).split(/({.*?})/).map((part, i) => (
                      part.startsWith('{') && part.endsWith('}') ? (
                        <span key={i} className="px-2 py-0.5 mx-0.5 bg-rose-50 text-rose-600 rounded-lg font-black text-[11px] ring-1 ring-rose-100 italic select-none">
                          {part}
                        </span>
                      ) : part
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <span className="text-[9px] text-gray-400 font-black opacity-60">
                      {format(new Date(), 'HH:mm')} ✓✓
                    </span>
                  </div>
                </motion.div>
              </div>
              
              <div className="absolute bottom-10 left-10 right-10 bg-white/90 backdrop-blur p-6 rounded-[32px] border border-white/50 shadow-xl">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dica de Emoji</p>
                 <p className="text-[11px] text-gray-600 font-medium leading-snug">
                   Seus emojis 🎉 e formatações (ex: *negrito*) aparecerão normalmente no WhatsApp da cliente.
                 </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Helper to check demo mode outside component for initial state
const checkIsDemo = () => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check localStorage first for persistence
    const isPersistedDemo = localStorage.getItem('demo_mode_active') === 'true';
    
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    const fullUrl = window.location.href.toLowerCase();
    
    const isCurrentlyDemo = params.get('demo') === 'true' || 
           params.has('demo') ||
           path.includes('/demo') || 
           hash.includes('demo') ||
           fullUrl.includes('demo=true');

    if (isCurrentlyDemo && !isPersistedDemo) {
      localStorage.setItem('demo_mode_active', 'true');
    }
    
    const result = isCurrentlyDemo || isPersistedDemo;
    console.log('[DemoCheck] Current:', isCurrentlyDemo, 'Persisted:', isPersistedDemo, 'Result:', result);
    return result;
  } catch (e) {
    console.error('[DemoCheck] Error:', e);
    return false;
  }
};

const IS_DEMO_INITIAL = checkIsDemo();

const DEFAULT_CONFIRMATION_TEMPLATE = 'Olá {cliente_nome}, tudo bem? Seu horário {data} às {hora} está confirmado ❤️🧚♀️\n\nPra eu te atender do jeitinho que você gosta, me conta:\n• Você é mais de ficar quietinha relaxando ou gosta de bater papo durante a massagem?\n• Qual música ou cantor(a) você escolheria pra tocar na sua sessão?\n• Tem algo no seu corpo ou no seu dia a dia que te incomoda e que você gostaria muito que eu te ajudasse?\n\nVai ser um prazer te conhecer melhor! 💛\n\nEndereço: {endereco}\n{nome_espaco}';
const DEFAULT_REMINDER_TEMPLATE = 'Olá {cliente_nome}, tudo bem? Passando para confirmar seu horário amanhã, {data} às {hora}. ❤️🧚♀️';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isSidebarMini, setIsSidebarMini] = useState(false);
  const [user, setUser] = useState<User | null>(IS_DEMO_INITIAL ? ({ uid: 'demo-user' } as any) : null);
  const [isAuthReady, setIsAuthReady] = useState(IS_DEMO_INITIAL);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(IS_DEMO_INITIAL ? true : null);
  
  const [clients, setClients] = useState<Client[]>(IS_DEMO_INITIAL ? MOCK_CLIENTS : []);
  const [appointments, setAppointments] = useState<Appointment[]>(IS_DEMO_INITIAL ? MOCK_APPOINTMENTS : []);
  const [procedures, setProcedures] = useState<Procedure[]>(IS_DEMO_INITIAL ? MOCK_PROCEDURES : []);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(IS_DEMO_INITIAL ? MOCK_FINANCIAL : []);
  const [leads, setLeads] = useState<Lead[]>(IS_DEMO_INITIAL ? MOCK_LEADS : []);
  const [budgets, setBudgets] = useState<Budget[]>(IS_DEMO_INITIAL ? MOCK_BUDGETS : []);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(IS_DEMO_INITIAL ? {
    id: 'demo-user',
    name: 'Usuária Demo (Lookalike)',
    businessName: 'Clínica de Estética Especializada',
    specialty: 'Estética Avançada',
    phone: '(11) 99999-9999',
    address: 'Rua da Estética, 123',
    instagram: '@marketing_estetico',
    workingHours: { start: '08:00', end: '19:00' },
    workingDays: [1, 2, 3, 4, 5, 6],
    budgetValidityDays: 15,
    clientLabel: 'Paciente',
    confirmationMessageTemplate: DEFAULT_CONFIRMATION_TEMPLATE,
    reminderMessageTemplate: DEFAULT_REMINDER_TEMPLATE,
    ownerId: 'demo-user',
    email: 'demo@demo.com',
    plan: 'pro',
    accentColor: 'rose',
    createdAt: new Date().toISOString()
  } : null);
  const [isInitialLoading, setIsInitialLoading] = useState(!IS_DEMO_INITIAL);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [justCreatedAppointment, setJustCreatedAppointment] = useState<{app: Appointment, client: Client} | null>(null);

  // --- DEMO MODE LOGIC ---
  const isDemo = useMemo(() => IS_DEMO_INITIAL, []);

  // Initialize data for Demo Mode
  useEffect(() => {
    if (isDemo) {
      console.log('Activating Demo Mode...');
      // Set all mock data
      setClients(MOCK_CLIENTS);
      setAppointments(MOCK_APPOINTMENTS);
      setProcedures(MOCK_PROCEDURES);
      setFinancialEntries(MOCK_FINANCIAL);
      setLeads(MOCK_LEADS);
      setBudgets(MOCK_BUDGETS);
      setMessageTemplates([
        { id: '1', name: 'Confirmação de Agendamento', content: DEFAULT_CONFIRMATION_TEMPLATE, category: 'agendamento' },
        { id: '2', name: 'Lembrete do Dia Anterior', content: DEFAULT_REMINDER_TEMPLATE, category: 'lembrete' }
      ]);
      
      // Force user state for demo
      setUser({ 
        uid: 'demo-user', 
        displayName: 'Usuária Demo (Lookalike)', 
        email: 'demo@demo.com',
        emailVerified: true 
      } as any);
      
      setUserProfile({
        id: 'demo-user',
        name: 'Usuária Demo (Lookalike)',
        businessName: 'Clínica de Estética Especializada',
        specialty: 'Estética Avançada',
        phone: '(11) 99999-9999',
        address: 'Rua da Estética, 123',
        instagram: '@marketing_estetico',
        workingHours: { start: '08:00', end: '19:00' },
        workingDays: [1, 2, 3, 4, 5, 6],
        budgetValidityDays: 15,
        clientLabel: 'Paciente',
        confirmationMessageTemplate: DEFAULT_CONFIRMATION_TEMPLATE,
        reminderMessageTemplate: DEFAULT_REMINDER_TEMPLATE,
        ownerId: 'demo-user',
        email: 'demo@demo.com'
      });
      
      setIsInitialLoading(false);
      setIsAuthReady(true);
      console.log('Demo Mode Initialized');
    }
  }, [isDemo]);
  // --- END DEMO MODE LOGIC ---

  // Update Theme Color
  useEffect(() => {
    const theme = userProfile?.accentColor || 'rose';
    const colors = COLOR_PRESETS[theme as keyof typeof COLOR_PRESETS];
    if (colors) {
      Object.entries(colors).forEach(([shade, hex]) => {
        document.documentElement.style.setProperty(`--primary-${shade}`, hex);
      });
    }
  }, [userProfile?.accentColor]);

  const addNotification = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { id, message, type, date: new Date() };
    
    setNotificationHistory(prev => [newNotification, ...prev].slice(0, 50));
    setAlerts(prev => [...prev, { id, message, type }].slice(-3));
    
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 3000);
  };

  // Limpeza de notificações antigas (não hoje)
  useEffect(() => {
    const checkAndClearOldNotifications = () => {
      setNotificationHistory(prev => prev.filter(n => {
        const nDate = n.date instanceof Date ? n.date : (n.date as any).toDate ? (n.date as any).toDate() : new Date(n.date);
        return isSameDay(nDate, new Date());
      }));
    };
    
    checkAndClearOldNotifications();
    const interval = setInterval(checkAndClearOldNotifications, 60000); // Checa a cada minuto
    return () => clearInterval(interval);
  }, []);

  // Firebase Auth
  React.useEffect(() => {
    if (isDemo) {
      // Bypassing auth logic for Demo Mode
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.email === 'brefer@gmail.com' || u.email === 'teus.rma@gmail.com') {
          setIsAuthorized(true);
        } else {
          try {
            const authRef = doc(db, 'authorized_emails', u.email?.toLowerCase()?.trim() || '');
            const authSnap = await getDoc(authRef);
            setIsAuthorized(authSnap.exists());
          } catch (e) {
            console.error('Error checking authorization:', e);
            setIsAuthorized(false);
          }
        }
      } else {
        setIsAuthorized(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  // Firebase Firestore Sync
  React.useEffect(() => {
    if (isDemo) return; // Skip Firebase in demo mode
    if (!user || isAuthorized === false) {
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
      onSnapshot(q('messageTemplates'), (s) => {
        const templates = s.docs.map(d => ({ id: d.id, ...d.data() } as MessageTemplate));
        if (templates.length === 0 && userProfile) {
          // Migration/Initialization: Create default templates if none exist
          const defaults: MessageTemplate[] = [
            { id: 'conf', name: 'Confirmação de Agendamento', content: userProfile.confirmationMessageTemplate || DEFAULT_CONFIRMATION_TEMPLATE, category: 'agendamento', ownerId: user.uid },
            { id: 'rem', name: 'Lembrete do Dia Anterior', content: userProfile.reminderMessageTemplate || DEFAULT_REMINDER_TEMPLATE, category: 'lembrete', ownerId: user.uid }
          ];
          defaults.forEach(async t => {
            const { id, ...data } = t;
            await addDoc(collection(db, 'messageTemplates'), data);
          });
        }
        setMessageTemplates(templates);
      }, (e) => handleFirestoreError(e, OperationType.LIST, 'messageTemplates')),
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
            ownerId: user.uid,
            plan: 'free',
            accentColor: 'rose',
            createdAt: new Date().toISOString()
          };
          setDoc(doc(db, 'userProfiles', user.uid), defaultProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, 'userProfile-init'));
        }
        // After loading profile and setting up listeners, we can stop loading
        setTimeout(() => setIsInitialLoading(false), 800);
      }, (e) => handleFirestoreError(e, OperationType.GET, 'userProfile')),
    ];

    return () => unsubscribers.forEach(u => u());
  }, [user]);

  const signOutUser = async () => {
    try {
      localStorage.removeItem('demo_mode_active');
      await signOut(auth);
      if (isDemo) {
        window.location.href = window.location.origin + window.location.pathname;
      }
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
        newAlerts.forEach(na => addNotification(na.message, na.type));
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
    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      return;
    }
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `appointments/${id}`); }
  };

  const [isFollowUpTriggerModalOpen, setIsFollowUpTriggerModalOpen] = useState(false);
  const [followUpAppRef, setFollowUpAppRef] = useState<Appointment | null>(null);

  const handleMarkAsFinished = async (id: string, customStatus?: AppointmentStatus) => {
    if (!user && !isDemo) return;
    const status = customStatus || 'realizado';
    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: status as AppointmentStatus } : a));
      const app = appointments.find(a => a.id === id);
      if (app && status === 'realizado') {
        setFollowUpAppRef(app);
        setIsFollowUpTriggerModalOpen(true);
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'appointments', id), { status: status as AppointmentStatus });
      const app = appointments.find(a => a.id === id);
      if (app && status === 'realizado') {
        setFollowUpAppRef(app);
        setIsFollowUpTriggerModalOpen(true);
      }
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `appointments/${id}`); }
  };

  const handleMarkAsPaid = async (id: string, paymentMethod: any = 'pix') => {
    if (!user && !isDemo) return;
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const client = clients.find(c => c.id === app.clientId);
    const proc = procedures.find(p => p.id === app.procedureId);

    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, isPaid: true } : a));
      const entry: FinancialEntry = {
        id: Math.random().toString(36).substr(2, 9),
        description: `Atendimento: ${client?.name} (${proc?.name})`,
        amount: app.price,
        date: new Date().toISOString(),
        type: 'receita',
        category: 'Serviços',
        appointmentId: id,
        paymentMethod,
        ownerId: 'demo-user'
      };
      setFinancialEntries(prev => [...prev, entry]);
      return;
    }

    try {
      await updateDoc(doc(db, 'appointments', id), { isPaid: true });
      await addDoc(collection(db, 'financialEntries'), {
        description: `Atendimento: ${client?.name} (${proc?.name})`,
        amount: app.price,
        date: new Date().toISOString(),
        type: 'receita',
        category: 'Serviços',
        appointmentId: id,
        paymentMethod,
        ownerId: user.uid
      });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'payment'); }
  };

  const handleUndoMarkAsPaid = async (id: string) => {
    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmado', isPaid: false } : a));
      setFinancialEntries(prev => prev.filter(e => e.appointmentId !== id));
      return;
    }
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'confirmado', isPaid: false });
      const entry = financialEntries.find(e => e.appointmentId === id);
      if (entry) {
        await deleteDoc(doc(db, 'financialEntries', entry.id));
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'undo-payment'); }
  };

  const handleAddAppointment = async (app: Appointment) => {
    const client = clients.find(c => c.id === app.clientId);
    if (isDemo) {
      const newApp = { ...app, id: Math.random().toString(36).substr(2, 9) };
      setAppointments(prev => [...prev, newApp]);
      setIsNewAppModalOpen(false);
      addNotification('Agendamento salvo com sucesso! (Modo Demo)', 'info');
      if (client) setJustCreatedAppointment({ app: newApp, client });
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = app;
      const docRef = await addDoc(collection(db, 'appointments'), { ...data, ownerId: user.uid });
      setIsNewAppModalOpen(false);
      addNotification('Agendamento salvo com sucesso!', 'info');
      if (client) setJustCreatedAppointment({ app: { ...app, id: docRef.id }, client });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'appointments'); }
  };

  const handleAddClient = async (client: Client) => {
    if (isDemo) {
      setClients(prev => [...prev, { ...client, id: Math.random().toString(36).substr(2, 9) }]);
      setIsNewClientModalOpen(false);
      addNotification('Registro criado com sucesso! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = client;
      await addDoc(collection(db, 'clients'), { ...data, ownerId: user.uid });
      setIsNewClientModalOpen(false);
      addNotification('Registro criado com sucesso!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'clients'); }
  };

  const handleUpdateClient = async (id: string, updates: Partial<Client>) => {
    if (isDemo) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      addNotification('Cliente atualizado com sucesso (Modo Demo)', 'info');
      return;
    }
    try {
      await updateDoc(doc(db, 'clients', id), updates);
      setEditingClient(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `clients/${id}`); }
  };

  const handleDeleteClient = (id: string) => {
    showConfirm('Excluir Cliente', 'Tem certeza que deseja excluir esta cliente? Todos os agendamentos dela também serão removidos.', async () => {
      if (isDemo) {
        setClients(prev => prev.filter(c => c.id !== id));
        setAppointments(prev => prev.filter(a => a.clientId !== id));
        addNotification('Registro removido com sucesso! (Modo Demo)', 'warning');
        return;
      }
      try {
        await deleteDoc(doc(db, 'clients', id));
        const toDelete = appointments.filter(a => a.clientId === id);
        for (const app of toDelete) {
          await deleteDoc(doc(db, 'appointments', app.id));
        }
        addNotification('Registro removido com sucesso!', 'warning');
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `clients/${id}`); }
    });
  };

  const handleAddFinancialEntry = async (entry: FinancialEntry) => {
    if (isDemo) {
      setFinancialEntries(prev => [...prev, { ...entry, id: Math.random().toString(36).substr(2, 9) }]);
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = entry;
      await addDoc(collection(db, 'financialEntries'), { ...data, ownerId: user.uid });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'financialEntries'); }
  };

  const handleUpdateFinancialEntry = async (id: string, updates: Partial<FinancialEntry>) => {
    if (isDemo) {
      setFinancialEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      setEditingFinancialEntry(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'financialEntries', id), updates);
      setEditingFinancialEntry(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `financialEntries/${id}`); }
  };

  const handleDeleteFinancialEntry = async (id: string) => {
    if (isDemo) {
      setFinancialEntries(prev => prev.filter(e => e.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'financialEntries', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `financialEntries/${id}`); }
  };

  const handleUpdateLeadStatus = async (id: string, status: Lead['status']) => {
    if (isDemo) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l));
      return;
    }
    try {
      await updateDoc(doc(db, 'leads', id), { status });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `leads/${id}`); }
  };

  const handleDeleteLead = (id: string) => {
    showConfirm('Excluir Lead', 'Deseja remover este contato da prospecção?', async () => {
      if (isDemo) {
        setLeads(prev => prev.filter(l => l.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(db, 'leads', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `leads/${id}`); }
    });
  };

  const handleAddLead = async (lead: Lead) => {
    if (isDemo) {
      setLeads(prev => [...prev, { 
        ...lead, 
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]);
      addNotification('Novo lead registrado no CRM! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = lead;
      await addDoc(collection(db, 'leads'), { 
        ...data, 
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      addNotification('Novo lead registrado no CRM!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'leads'); }
  };

  const handleAddBudget = async (budget: Budget) => {
    if (isDemo) {
      setBudgets(prev => [...prev, { ...budget, id: Math.random().toString(36).substr(2, 9) }]);
      addNotification('Orçamento gerado com sucesso! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = budget;
      await addDoc(collection(db, 'budgets'), { ...data, ownerId: user.uid });
      addNotification('Orçamento gerado com sucesso!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'budgets'); }
  };

  const handleAddFollowUp = async (followUp: FollowUp) => {
    if (isDemo) {
      setFollowUps(prev => [...prev, { ...followUp, id: Math.random().toString(36).substr(2, 9) }]);
      setIsNewFollowUpModalOpen(false);
      addNotification('Acompanhamento agendado! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = followUp;
      await addDoc(collection(db, 'followUps'), { ...data, ownerId: user.uid });
      setIsNewFollowUpModalOpen(false);
      addNotification('Acompanhamento agendado!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'followUps'); }
  };

  const handleUpdateFollowUpStatus = async (id: string, status: FollowUp['status']) => {
    if (isDemo) {
      setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      if (status === 'Concluído') {
        addNotification('Acompanhamento realizado com sucesso! (Modo Demo)', 'info');
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'followUps', id), { status });
      if (status === 'Concluído') {
        addNotification('Acompanhamento realizado com sucesso!', 'info');
      }
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `followUps/${id}`); }
  };

  const handleUpdateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    if (isDemo) {
      setFollowUps(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      setEditingFollowUp(null);
      return;
    }
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
        if (isDemo) {
          setFollowUps(prev => prev.filter(f => f.id !== id));
          return;
        }
        try {
          await deleteDoc(doc(db, 'followUps', id));
        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `followUps/${id}`); }
      }
    );
  };

  const handleDeleteBudget = (id: string) => {
    showConfirm('Excluir Orçamento', 'Tem certeza que deseja excluir este orçamento?', async () => {
      if (isDemo) {
        setBudgets(prev => prev.filter(b => b.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(db, 'budgets', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `budgets/${id}`); }
    });
  };

  const handleAddProcedure = async (proc: Procedure) => {
    if (isDemo) {
      setProcedures(prev => [...prev, { ...proc, id: Math.random().toString(36).substr(2, 9) }]);
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = proc;
      await addDoc(collection(db, 'procedures'), { ...data, ownerId: user.uid });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'procedures'); }
  };

  const handleUpdateProcedure = async (id: string, updates: Partial<Procedure>) => {
    if (isDemo) {
      setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      setEditingProcedure(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'procedures', id), updates);
      setEditingProcedure(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `procedures/${id}`); }
  };

  const handleDeleteProcedure = (id: string) => {
    showConfirm('Excluir Procedimento', 'Tem certeza que deseja excluir este procedimento?', async () => {
      if (isDemo) {
        setProcedures(prev => prev.filter(p => p.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(db, 'procedures', id));
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `procedures/${id}`); }
    });
  };

  const handleAddMessageTemplate = async (template: MessageTemplate) => {
    if (isDemo) {
      setMessageTemplates(prev => [...prev, { ...template, id: Math.random().toString(36).substr(2, 9) }]);
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = template;
      await addDoc(collection(db, 'messageTemplates'), { ...data, ownerId: user.uid });
      addNotification('Modelo de mensagem criado!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'messageTemplates'); }
  };

  const handleUpdateMessageTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    if (isDemo) {
      setMessageTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      return;
    }
    try {
      await updateDoc(doc(db, 'messageTemplates', id), updates);
      addNotification('Modelo de mensagem atualizado!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `messageTemplates/${id}`); }
  };

  const handleDeleteMessageTemplate = (id: string) => {
    showConfirm('Excluir Modelo', 'Tem certeza que deseja excluir este modelo de mensagem?', async () => {
      if (isDemo) {
        setMessageTemplates(prev => prev.filter(t => t.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(db, 'messageTemplates', id));
        addNotification('Modelo de mensagem excluído.', 'warning');
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `messageTemplates/${id}`); }
    });
  };

  const handleUpdateAppointment = async (id: string, updates: Partial<Appointment>) => {
    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      setEditingAppointment(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'appointments', id), updates);
      setEditingAppointment(null);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `appointments/${id}`); }
  };

  const handleDeleteAppointment = (id: string) => {
    showConfirm('Excluir Agendamento', 'Tem certeza que deseja excluir este agendamento?', async () => {
      if (isDemo) {
        setAppointments(prev => prev.filter(a => a.id !== id));
        setFinancialEntries(prev => prev.filter(e => e.appointmentId !== id));
        addNotification('Agendamento removido! (Modo Demo)', 'warning');
        return;
      }
      try {
        await deleteDoc(doc(db, 'appointments', id));
        const entries = financialEntries.filter(e => e.appointmentId === id);
        for (const entry of entries) await deleteDoc(doc(db, 'financialEntries', entry.id));
        addNotification('Agendamento removido!', 'warning');
      } catch (e) { handleFirestoreError(e, OperationType.DELETE, `appointments/${id}`); }
    });
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (isDemo) {
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      addNotification('Configurações salvas! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'userProfiles', user.uid), updates, { merge: true });
      addNotification('Configurações salvas!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'userProfile'); }
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
        
        addNotification('Dados de exemplo carregados com sucesso!', 'info');
      } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'reset-mocks'); }
    });
  };

  const cLabel = userProfile?.clientLabel || 'Cliente';
  const csLabel = cLabel === 'Cliente' ? 'Clientes' : 
                 cLabel === 'Paciente' ? 'Pacientes' :
                 cLabel === 'Aluno' ? 'Alunos' : 'Membros';

  const handleSendWhatsApp = (app: Appointment, type: 'confirmation' | 'reminder' | 'payment') => {
    const client = clients.find(c => c.id === app.clientId);
    const proc = procedures.find(p => p.id === app.procedureId);
    if (!client) return;

    let template = '';
    if (type === 'confirmation') {
      const t = messageTemplates.find(mt => mt.category === 'agendamento');
      template = t?.content || userProfile?.confirmationMessageTemplate || DEFAULT_CONFIRMATION_TEMPLATE;
    } else if (type === 'reminder') {
      const t = messageTemplates.find(mt => mt.category === 'lembrete');
      template = t?.content || userProfile?.reminderMessageTemplate || DEFAULT_REMINDER_TEMPLATE;
    } else {
      template = `Olá {cliente_nome}! Tudo bem? Passando para te enviar o fechamento do seu atendimento de hoje ({procedimento}). O valor total ficou {valor}. Se preferir, pode fazer o PIX por aqui mesmo! 😊`;
    }

    const appDate = app.date ? parseISO(app.date) : new Date();
    
    const message = resolveTemplate(template, {
      customerName: client.name,
      date: format(appDate, 'dd/MM/yyyy'),
      time: format(appDate, 'HH:mm'),
      procedure: proc?.name,
      address: userProfile?.address,
      businessName: userProfile?.businessName,
      price: app.price
    });

    const phone = (client.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'clientes', label: csLabel, icon: Users },
    { id: 'prospeccao', label: 'Crescimento', icon: TrendingUp },
    { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
    { id: 'servicos', label: 'Serviços', icon: Activity },
    { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
    { id: 'follow-up', label: 'Follow-up', icon: BellRing },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { id: 'mensagens', label: 'Mensagens', icon: MessageCircle },
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
          setIsSidebarOpen={setIsSidebarOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          isNotificationsOpen={isNotificationsOpen}
          onSendWhatsApp={handleSendWhatsApp}
        />
      );
      case 'agenda': return (
        <Agenda 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures}
          onUpdateStatus={handleUpdateStatus}
          onMarkAsFinished={handleMarkAsFinished}
          onMarkAsPaid={handleMarkAsPaid}
          onUndoMarkAsPaid={handleUndoMarkAsPaid}
          onOpenNewAppointment={(date) => {
            setSelectedDateForNewApp(date);
            setIsNewAppModalOpen(true);
          }}
          onEditAppointment={setEditingAppointment}
          onDeleteAppointment={handleDeleteAppointment}
          cLabel={cLabel}
          userProfile={userProfile}
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
          onAddLead={handleAddLead}
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
          userProfile={userProfile}
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
          onMarkAsPaid={handleMarkAsPaid}
          onSendWhatsApp={handleSendWhatsApp}
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
      case 'mensagens': return (
        <MessageTemplatesTab 
          templates={messageTemplates}
          onAddTemplate={handleAddMessageTemplate}
          onUpdateTemplate={handleUpdateMessageTemplate}
          onDeleteTemplate={handleDeleteMessageTemplate}
          userProfile={userProfile}
        />
      );
      case 'configuracoes': return (
        <SettingsTab 
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onResetMocks={handleResetMocks}
          isDemo={isDemo}
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
          setIsSidebarOpen={setIsSidebarOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          isNotificationsOpen={isNotificationsOpen}
          onSendWhatsApp={handleSendWhatsApp}
        />
      );
    }
  };

  if (!isAuthReady && !isDemo) {
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

  if (!user && !isDemo) {
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Ou</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-gray-100 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Entrar com Google
            </button>
            <button 
              type="button"
              onClick={() => {
                // Set persistence and reload
                localStorage.setItem('demo_mode_active', 'true');
                const baseUrl = window.location.origin + window.location.pathname;
                window.location.href = baseUrl + '?demo=true';
              }}
              className="w-full bg-blue-50 text-blue-600 p-4 rounded-2xl font-bold border border-blue-100 hover:bg-blue-100 transition-all mt-2"
            >
              Acessar Versão Demo (Teste)
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

  if (isAuthorized === false && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF9F9] p-4 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[40px] shadow-2xl border border-rose-50 w-full max-w-md"
        >
          <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Rocket className="text-rose-500 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-4">Acesso não liberado</h1>
          <p className="text-gray-500 mb-8">Para acessar o sistema, você precisa adquirir sua licença via Kiwify. Se você já comprou, aguarde alguns instantes até que seu e-mail seja liberado.</p>
          <button 
            onClick={() => window.open(UPGRADE_URL, '_blank')}
            className="w-full bg-rose-500 text-white p-4 rounded-2xl font-bold mb-4"
          >
            Comprar Licença agora
          </button>
          <button 
            onClick={signOutUser}
            className="text-gray-400 text-xs font-bold uppercase hover:text-gray-600 transition-all"
          >
            Sair e usar outro e-mail
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans transition-colors duration-300 bg-[#FFF9F9] text-gray-900">
      {isDemo && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-6 bg-white/80 backdrop-blur-xl px-8 py-4 rounded-[32px] border border-blue-50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Modo Demonstração</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Os dados serão resetados ao sair</p>
          </div>
          <div className="w-px h-10 bg-slate-100" />
          <button 
            onClick={() => window.open(UPGRADE_URL, '_blank')}
            className="group relative overflow-hidden bg-[#050b1a] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200/50"
          >
            <span className="relative z-10 transition-colors group-hover:text-blue-200">Adquirir Versão Completa</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
          </button>
        </div>
      )}
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
                  addNotification('Por favor, selecione uma cliente da lista.', 'error');
                  return;
                }
                if (!procedureId || !date || !time) {
                  addNotification('Por favor, preencha todos os campos do agendamento.', 'error');
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

      {justCreatedAppointment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-rose-50 text-center p-10"
          >
            <div className="w-24 h-24 bg-emerald-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <div className="w-16 h-16 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Agendado!</h2>
            <p className="text-gray-500 font-medium text-sm leading-relaxed mb-10">
              O horário de <span className="text-gray-900 font-bold">{justCreatedAppointment.client.name}</span> foi reservado com sucesso. Deseja enviar a mensagem de confirmação para o WhatsApp?
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => {
                  const app = justCreatedAppointment.app;
                  const client = justCreatedAppointment.client;
                  const proc = procedures.find(p => p.id === app.procedureId);
                  
                  const template = userProfile?.confirmationMessageTemplate || DEFAULT_CONFIRMATION_TEMPLATE;
                  const appDate = app.date ? parseISO(app.date) : new Date();
                  
                  const message = resolveTemplate(template, {
                    customerName: client.name,
                    date: format(appDate, 'eeee, dd/MM/yyyy', { locale: ptBR }),
                    time: format(appDate, 'HH:mm'),
                    procedure: proc?.name,
                    address: userProfile?.address,
                    businessName: userProfile?.businessName,
                    price: app.price
                  });

                  const phone = (client.phone || '').replace(/\D/g, '');
                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                  setJustCreatedAppointment(null);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                Enviar no WhatsApp
              </button>
              <button 
                onClick={() => setJustCreatedAppointment(null)}
                className="w-full text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors py-2"
              >
                Agora não, obrigado
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isNewFollowUpModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-rose-50"
          >
            <div className="p-8 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Novo Follow-up</h2>
                <p className="text-sm font-medium text-gray-500">Agende um lembrete de contato.</p>
              </div>
              <button 
                onClick={() => setIsNewFollowUpModalOpen(false)}
                className="p-2 hover:bg-rose-50 rounded-2xl transition-colors text-gray-400 hover:text-rose-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
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

                // Encontrar o telefone da cliente se ela estiver cadastrada
                const registeredClient = clients.find(c => c.name === clientName);
                const clientPhone = registeredClient?.phone || '';

                handleAddFollowUp({
                  id: Math.random().toString(36).substr(2, 9),
                  clientName,
                  clientPhone,
                  procedureName,
                  professionalName,
                  date,
                  status,
                  observation
                });
                setIsNewFollowUpModalOpen(false);
              }}
              className="p-8 space-y-5"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Cliente</label>
                <input 
                  type="text" 
                  name="clientName" 
                  list="follow-up-clients"
                  required 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all outline-none" 
                  placeholder="Nome da cliente..." 
                />
                <datalist id="follow-up-clients">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Serviço/Motivo</label>
                  <input type="text" name="procedureName" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all outline-none" placeholder="Ex: Retorno" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Data</label>
                  <input type="date" name="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Notas / O que falar?</label>
                <textarea name="observation" rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-rose-500 transition-all outline-none resize-none" placeholder="Ex: Perguntar se gostou do resultado..."></textarea>
              </div>

              <input type="hidden" name="professionalName" value={userProfile?.name || ''} />
              <input type="hidden" name="status" value="Pendente" />

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  Salvar Lembrete
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
                  lastName: formData.get('lastName') as string,
                  phone: formData.get('phone') as string,
                  email: formData.get('email') as string,
                  city: formData.get('city') as string,
                  state: formData.get('state') as string,
                  country: (formData.get('country') as string) || 'BR',
                  birthday: formData.get('birthday') as string,
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
                addNotification('Cliente cadastrada com sucesso!', 'info');
              }}
              className="space-y-4"
            >
              <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", clientStep !== 1 && "hidden")}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Primeiro Nome</label>
                    <input name="name" required type="text" placeholder="Ex: Maria" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Sobrenome</label>
                    <input name="lastName" type="text" placeholder="Ex: Silva" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">WhatsApp</label>
                    <input name="phone" required type="tel" placeholder="(00) 00000-0000" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Aniversário</label>
                    <input name="birthday" type="date" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">E-mail (Lookalike)</label>
                  <input name="email" type="email" placeholder="maria@email.com" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Cidade</label>
                    <input name="city" type="text" placeholder="Sua cidade" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Estado (UF)</label>
                    <input name="state" type="text" placeholder="Ex: SP" maxLength={2} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 uppercase" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Observações</label>
                  <textarea name="observations" rows={1} placeholder="Alergias, preferências, etc..." className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 resize-none" />
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

      <FollowUpTriggerModal 
        isOpen={isFollowUpTriggerModalOpen}
        onClose={() => {
          setIsFollowUpTriggerModalOpen(false);
          setFollowUpAppRef(null);
        }}
        appointment={followUpAppRef}
        client={followUpAppRef ? clients.find(c => c.id === followUpAppRef.clientId) || null : null}
        procedure={followUpAppRef ? procedures.find(p => p.id === followUpAppRef.procedureId) || null : null}
        onAddFollowUp={handleAddFollowUp}
        userProfile={userProfile}
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
                    lastName: formData.get('lastName') as string,
                    phone: formData.get('phone') as string,
                    email: formData.get('email') as string,
                    city: formData.get('city') as string,
                    state: formData.get('state') as string,
                    birthday: formData.get('birthday') as string,
                    observations: formData.get('observations') as string,
                  });
                  setEditingClient(null);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome</label>
                    <input name="name" required defaultValue={editingClient.name} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Sobrenome</label>
                    <input name="lastName" defaultValue={editingClient.lastName} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">WhatsApp</label>
                    <input name="phone" required defaultValue={editingClient.phone} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Aniversário</label>
                    <input name="birthday" type="date" defaultValue={editingClient.birthday} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">E-mail</label>
                  <input name="email" defaultValue={editingClient.email} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Cidade</label>
                    <input name="city" defaultValue={editingClient.city} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Estado (UF)</label>
                    <input name="state" defaultValue={editingClient.state} maxLength={2} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 uppercase" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Observações</label>
                  <textarea name="observations" defaultValue={editingClient.observations} rows={1} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 resize-none" />
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
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[155] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <aside className={cn(
          "fixed lg:static inset-y-0 left-0 z-[160] p-0 bg-white border-r border-rose-50 transition-all duration-300 ease-in-out lg:translate-x-0 flex-shrink-0 flex flex-col",
          isSidebarMini ? "w-20" : "w-72",
          !isSidebarOpen && "-translate-x-full"
        )}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 mb-10 px-2 justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 flex-shrink-0">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              {!isSidebarMini && (
                <div className="flex flex-col whitespace-nowrap overflow-hidden">
                  <span className="text-lg font-black tracking-tight text-gray-900 leading-none truncate max-w-[150px]">{userProfile?.businessName || 'MEU SISTEMA'}</span>
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">{userProfile?.specialty || 'Gestão Profissional'}</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsSidebarMini(!isSidebarMini)}
              className="p-2 hover:bg-rose-50 rounded-lg text-gray-400 hidden lg:block"
            >
              {isSidebarMini ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                title={item.label}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth >= 1024) setIsSidebarMini(true);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group relative",
                  activeTab === item.id 
                    ? "bg-rose-500 text-white shadow-lg shadow-rose-100" 
                    : "text-gray-500 hover:bg-rose-50 hover:text-rose-600",
                  isSidebarMini && "justify-center px-0"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", activeTab === item.id ? "text-white" : "text-gray-400 group-hover:text-rose-500")} />
                {!isSidebarMini && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
              </button>
            ))}
          </nav>

          {!isSidebarMini && (
            <div 
              className="mt-4 p-5 bg-[#0f1115] rounded-[32px] text-white relative overflow-hidden group cursor-pointer border border-white/5 transition-all hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]" 
              onClick={() => {
                setActiveTab('prospeccao');
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                if (window.innerWidth >= 1024) setIsSidebarMini(true);
              }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/20 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-rose-500/40 transition-all" />
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-600 rounded-lg shadow-lg shadow-rose-600/20 group-hover:rotate-12 transition-transform">
                    <Rocket className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 whitespace-nowrap">
                    Impulso Extra
                  </span>
                </div>
                <div>
                  <p className="text-xs font-black leading-tight text-gray-100 whitespace-nowrap overflow-hidden">Encontre Novos Clientes</p>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">Anúncios que Funcionam</p>
                </div>
                <button className="mt-2 text-[10px] font-black uppercase flex items-center gap-1.5 text-rose-500 group-hover:gap-3 transition-all border-t border-white/5 pt-3 w-full">
                  Quero saber mais <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <div className={cn("pt-6 border-t border-rose-50 mt-4", isSidebarMini && "flex justify-center")}>
            <button 
              onClick={signOutUser}
              title="Sair do Sistema"
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all group",
                isSidebarMini && "justify-center px-0"
              )}
            >
              <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform flex-shrink-0" />
              {!isSidebarMini && <span className="whitespace-nowrap overflow-hidden">Sair do Sistema</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {activeTab !== 'dashboard' && (
          <header className="h-16 flex items-center px-4 lg:px-8 flex-shrink-0 sticky top-0 z-[150] pointer-events-none">
            <div className="flex items-center gap-4 pointer-events-auto bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-rose-50 shadow-sm">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 text-gray-500 hover:bg-rose-50 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              {isSidebarMini && (
                <button 
                  onClick={() => setIsSidebarMini(false)}
                  className="hidden lg:flex p-2 text-rose-500 hover:bg-rose-50 rounded-lg items-center gap-2 transition-all group"
                >
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="text-xs font-black uppercase tracking-widest">Expandir Menu</span>
                </button>
              )}
            </div>
            <div className="ml-auto pointer-events-auto">
               {/* Bell moved to specific tab headers or floating if needed */}
            </div>
          </header>
        )}

            <AnimatePresence>
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[250]" 
                    onClick={() => setIsNotificationsOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-rose-50 z-[260] overflow-hidden"
                  >
                    <div className="p-4 border-b border-rose-50 bg-rose-50/30 flex items-center justify-between">
                      <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider">Histórico do Dia</h3>
                      <span className="text-[10px] font-bold text-rose-500 bg-white px-2 py-1 rounded-full border border-rose-100">
                        {notificationHistory.length}
                      </span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-hide">
                      {notificationHistory.length === 0 ? (
                        <div className="p-8 text-center">
                          <BellRing className="w-8 h-8 text-rose-100 mx-auto mb-2" />
                          <p className="text-xs font-bold text-gray-400 uppercase">Nenhuma notificação</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {notificationHistory.map((notif) => (
                            <div 
                              key={notif.id}
                              className="p-3 rounded-2xl hover:bg-rose-50 transition-colors flex gap-3 items-start"
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                                notif.type === 'error' ? "bg-red-500" :
                                notif.type === 'warning' ? "bg-amber-500" : "bg-blue-500"
                              )} />
                              <div>
                                <p className="text-xs font-bold text-gray-800 leading-tight mb-1">{notif.message}</p>
                                <p className="text-[10px] font-medium text-gray-400">
                                  {format(notif.date instanceof Date ? notif.date : (notif.date as any).toDate ? (notif.date as any).toDate() : new Date(notif.date), "HH:mm")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {notificationHistory.length > 0 && (
                      <div className="p-3 border-t border-rose-50 bg-gray-50/50">
                        <button 
                          onClick={() => setNotificationHistory([])}
                          className="w-full py-2 text-[10px] font-black uppercase text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          Limpar Histórico
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

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
