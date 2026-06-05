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
  ChevronDown,
  ChevronUp, 
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
  Upload,
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
  X,
  CreditCard,
  RefreshCcw,
  Mail,
  Mic
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
  addWeeks,
  getDay,
  isValid,
  addDays,
  addMinutes
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
import { db, auth, googleProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from './firebase';
import { cn } from './lib/utils';
import { AdminControlCenter } from './components/AdminControlCenter';
import { GoogleOnboardingModal } from './components/GoogleOnboardingModal';
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
  MOCK_BUDGETS,
  MOCK_MESSAGE_TEMPLATES
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
const UPGRADE_URL = 'https://orbyflow.site/#depoimentos';
const RAISE_WEBSITE_URL = 'https://raiseestruturadigital.site';

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
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh] border border-rose-50 my-auto"
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
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-rose-50 max-h-[90vh] overflow-y-auto my-auto"
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

const PartialPaymentModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  appointment, 
  procedure 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: (amount: number, method: any, isPartial: boolean) => void, 
  appointment: Appointment | null,
  procedure: Procedure | null
}) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<any>('pix');
  const [isPartial, setIsPartial] = useState(false);

  useEffect(() => {
    if (appointment) {
      const paid = appointment.paidAmount || 0;
      const remaining = appointment.price - paid;
      setAmount(remaining > 0 ? remaining : 0);
      setIsPartial(false);
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const alreadyPaid = appointment.paidAmount || 0;
  const remainingTotal = appointment.price - alreadyPaid;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-5 sm:p-6 rounded-[32px] w-full max-w-md shadow-2xl border border-rose-50 max-h-[90vh] overflow-y-auto scrollbar-none my-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Registrar Pagamento</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor Total</p>
              <p className="text-sm font-black text-gray-700">{formatCurrency(appointment.price)}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-right">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Já Pago</p>
              <p className="text-sm font-black text-emerald-600">{formatCurrency(alreadyPaid)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border-2 border-rose-100 shadow-inner">
            <div>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-0.5">SALDO RESTANTE</p>
              <p className="text-xl font-black text-rose-600 tracking-tight">{formatCurrency(remainingTotal)}</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="pt-1">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Valor a Receber Agora</label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-base">R$</span>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-3.5 pl-11 font-black text-xl text-rose-600 outline-none focus:border-rose-200 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          <div 
            className={cn(
              "flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2",
              isPartial ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-transparent hover:bg-gray-100"
            )}
            onClick={() => setIsPartial(!isPartial)}
          >
            <div className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm shrink-0",
              isPartial ? "bg-amber-500 border-amber-500" : "bg-white border-gray-200"
            )}>
              {isPartial && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-900 leading-none mb-1">Pagamento Parcial</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">
                {amount === remainingTotal ? 'Marque se não for pagar tudo agora' : `Restará ${formatCurrency(remainingTotal - amount)} para depois`}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Método</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'pix', label: 'PIX' },
                { id: 'cartao', label: 'Cartão' },
                { id: 'dinheiro', label: 'Dinheiro' },
                { id: 'outro', label: 'Outro' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setMethod(opt.id)}
                  className={cn(
                    "py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                    method === opt.id ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-100" : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => onConfirm(amount, method, isPartial)}
            className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-rose-100 transition-all hover:bg-rose-600 active:scale-98"
          >
            {isPartial ? 'Confirmar Parcial' : 'Confirmar Pagamento'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PagamentosTab = ({ 
  appointments, 
  clients, 
  procedures, 
  onMarkAsPaid, 
  onUndoMarkAsPaid,
  onSendWhatsApp,
  onOpenNewAppointment,
  onEditAppointment,
  onDeleteAppointment
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onMarkAsPaid: (id: string) => void, 
  onUndoMarkAsPaid: (id: string) => void,
  onSendWhatsApp: (app: Appointment, type: 'payment') => void,
  onOpenNewAppointment: (date: Date) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void
}) => {
  const [filter, setFilter] = useState('all'); // all, paid, pending, partial
  const [groupByPackage, setGroupByPackage] = useState(true); // default to true grouped
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filteredApps = useMemo(() => {
    return appointments.filter(app => {
      if (filter === 'paid') return app.isPaid;
      if (filter === 'pending') return !app.isPaid && (!app.paidAmount || app.paidAmount === 0);
      if (filter === 'partial') return !app.isPaid && app.paidAmount && app.paidAmount > 0;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, filter]);

  // Group appointments by Client and Procedure
  const groupedData = useMemo(() => {
    if (!groupByPackage) return [];

    const map: Record<string, Appointment[]> = {};
    filteredApps.forEach(app => {
      const key = `${app.clientId}_${app.procedureId}`;
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(app);
    });

    return Object.entries(map).map(([key, apps]) => {
      // Sort appointments by session number ascending (1, 2, 3...)
      const sortedApps = [...apps].sort((a, b) => (a.sessionNumber || 1) - (b.sessionNumber || 1));
      
      const totalCount = sortedApps.length;
      const paidCount = sortedApps.filter(a => a.isPaid).length;
      
      const totalPrice = sortedApps.reduce((sum, a) => sum + a.price, 0);
      const totalPaid = sortedApps.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
      const remaining = totalPrice - totalPaid;
      
      const isPaid = sortedApps.every(a => a.isPaid);
      const isPartial = totalPaid > 0 && !isPaid;

      // The active appointment is the first one that is NOT paid, 
      // or the last one if all are paid.
      const activeApp = sortedApps.find(a => !a.isPaid) || sortedApps[sortedApps.length - 1];

      return {
        key,
        activeApp,
        appointments: sortedApps,
        totalCount,
        paidCount,
        totalPrice,
        totalPaid,
        remaining,
        isPaid,
        isPartial
      };
    }).sort((a, b) => {
      // Sort groups by the date of their active or newest appointment (descending)
      return new Date(b.activeApp.date).getTime() - new Date(a.activeApp.date).getTime();
    });
  }, [filteredApps, groupByPackage]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-gray-900 uppercase tracking-tight">Pagamentos</h2>
            <p className="text-sm font-medium text-gray-500">Gestão de parcelamentos e saldos pendentes</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onOpenNewAppointment(new Date())}
              className="p-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
              title="Novo Registro / Adicionar Pessoa"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            {/* Grouping Toggle */}
            <div className="flex items-center gap-1 bg-rose-50/50 border border-rose-100/30 rounded-2xl p-1 shadow-inner">
              <button
                onClick={() => setGroupByPackage(true)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  groupByPackage ? "bg-white text-rose-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Agrupar Pacotes
              </button>
              <button
                onClick={() => setGroupByPackage(false)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  !groupByPackage ? "bg-white text-rose-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                Ver Todas as Sessões
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-[20px] overflow-x-auto no-scrollbar self-start md:self-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'partial', label: 'Parciais' },
            { id: 'pending', label: 'Pendentes' },
            { id: 'paid', label: 'Pagos' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={cn(
                "px-4 lg:px-6 py-2 lg:py-2.5 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filter === opt.id ? "bg-white text-rose-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-rose-50 overflow-hidden">
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-rose-50/30 font-black text-rose-400 uppercase tracking-widest text-[10px] border-b border-rose-100">
                {groupByPackage && <th className="px-4 py-4 w-12"></th>}
                <th className="px-4 py-4">Data</th>
                <th className="px-4 py-4">Cliente</th>
                <th className="px-4 py-4">Procedimento / {groupByPackage ? 'Pacote' : 'Sessão'}</th>
                <th className="px-4 py-4">Valor Total</th>
                <th className="px-4 py-4">Pago</th>
                <th className="px-4 py-4">Restante</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupByPackage ? (
                groupedData.map(group => {
                  const client = clients.find(c => c.id === group.activeApp.clientId);
                  const proc = getAppProcedure(group.activeApp, procedures);
                  const isExpanded = expandedGroups[group.key];
                  const nextUnpaidApp = group.appointments.find(a => !a.isPaid);

                  return (
                    <React.Fragment key={group.key}>
                      <tr className={cn(
                        "group hover:bg-rose-50/20 transition-colors cursor-pointer",
                        isExpanded && "bg-rose-50/10"
                      )} onClick={() => toggleGroup(group.key)}>
                        <td className="px-4 py-4 text-center">
                          <button 
                            type="button"
                            className="p-1 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">
                              {group.activeApp.date ? format(parseISO(group.activeApp.date), "dd/MM/yyyy") : '-'}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase">
                              {group.activeApp.date ? format(parseISO(group.activeApp.date), "HH:mm") : '--:--'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-[10px] font-black text-rose-600 shrink-0">
                              {client?.name?.substring(0, 2).toUpperCase() || '??'}
                            </div>
                            <span className="text-sm font-bold text-gray-900 truncate max-w-[150px]" title={client?.name}>{client?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-600">{proc?.name || 'Venda Direta / Outro'}</span>
                            <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                              Sessões: <span className="text-rose-400 font-extrabold">{group.paidCount} de {group.totalCount}</span> completas
                            </span>
                            
                            {/* Visual bullet points representing sessions */}
                            <div className="flex gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                              {group.appointments.map((a, idx) => {
                                const isAppPaid = a.isPaid;
                                const hasPart = (a.paidAmount || 0) > 0 && !isAppPaid;
                                return (
                                  <span 
                                    key={a.id} 
                                    title={`Sessão ${a.sessionNumber || (idx + 1)} de ${group.totalCount}: ${isAppPaid ? 'Paga' : hasPart ? 'Pago Parcial' : 'Pendente'}`}
                                    className={cn(
                                      "w-2 h-2 rounded-full transition-all",
                                      isAppPaid ? "bg-emerald-500" : hasPart ? "bg-amber-400 animate-pulse" : "bg-gray-200"
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-black text-gray-900">{formatCurrency(group.totalPrice)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "text-sm font-black",
                            group.totalPaid > 0 ? "text-emerald-600" : "text-gray-300"
                          )}>{formatCurrency(group.totalPaid)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "text-sm font-black text-rose-600",
                            group.remaining <= 0 && "text-gray-200"
                          )}>{formatCurrency(Math.max(0, group.remaining))}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                            group.isPaid ? "bg-emerald-100 text-emerald-600" :
                            group.isPartial ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                          )}>
                            {group.isPaid ? 'Pago' : group.isPartial ? 'Parcial' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleGroup(group.key)}
                              className="p-1 px-2.5 text-[10px] font-black text-rose-500 bg-rose-50/50 hover:bg-rose-50 rounded-xl transition-all uppercase tracking-wider"
                              title="Ver Detalhes das Sessões"
                            >
                              {isExpanded ? 'Ocultar' : `Ver ${group.totalCount} Sessões`}
                            </button>
                            {nextUnpaidApp ? (
                              <button
                                onClick={() => onMarkAsPaid(nextUnpaidApp.id)}
                                className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:-translate-y-0.5 hover:bg-emerald-600 transition-all outline-none"
                              >
                                Receber S.{nextUnpaidApp.sessionNumber || 1}
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 bg-emerald-50 rounded-xl">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section inside desktop table */}
                      {isExpanded && (
                        <tr className="bg-rose-50/10" onClick={(e) => e.stopPropagation()}>
                          <td colSpan={9} className="px-8 py-4 bg-gray-50/50 border-y border-gray-100">
                            <div className="pl-6 border-l-4 border-rose-400 space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">Cronograma de Sessões do Pacote</h4>
                              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden shadow-xs">
                                {group.appointments.map((app, index) => {
                                  const paid = app.paidAmount || 0;
                                  const remaining = app.price - paid;
                                  const isPart = paid > 0 && !app.isPaid;
                                  return (
                                    <div key={app.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-rose-50/10 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className={cn(
                                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black uppercase",
                                          app.isPaid ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                                        )}>
                                          S{app.sessionNumber || (index + 1)}
                                        </div>
                                        <div>
                                          <p className="font-bold text-gray-800 text-xs">Sessão {app.sessionNumber || (index + 1)} de {group.totalCount}</p>
                                          <p className="text-[10px] text-gray-400 font-semibold uppercase">
                                            {app.date ? format(parseISO(app.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-3 gap-6 text-xs text-center md:text-left">
                                        <div>
                                          <p className="text-[9px] font-black uppercase text-gray-400">Preço</p>
                                          <p className="font-black text-gray-800">{formatCurrency(app.price)}</p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] font-black uppercase text-gray-400">Recebido</p>
                                          <p className={cn("font-black", paid > 0 ? "text-emerald-600" : "text-gray-300")}>{formatCurrency(paid)}</p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] font-black uppercase text-gray-400">Restante</p>
                                          <p className={cn("font-black text-rose-600", remaining <= 0 && "text-gray-200")}>{formatCurrency(Math.max(0, remaining))}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-3 self-end md:self-auto">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mr-2",
                                          app.isPaid ? "bg-emerald-100 text-emerald-600" :
                                          isPart ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                                        )}>
                                          {app.isPaid ? 'Pago' : isPart ? 'Parcial' : 'Pendente'}
                                        </span>
                                        {!app.isPaid && (
                                          <button
                                            onClick={() => onSendWhatsApp(app, 'payment')}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                            title="Cobrar via WhatsApp"
                                          >
                                            <MessageCircle className="w-4 h-4" />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => onEditAppointment(app)}
                                          className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                          title="Editar Sessão"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => onDeleteAppointment(app.id)}
                                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                          title="Excluir Sessão"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        {!app.isPaid ? (
                                          <button
                                            onClick={() => onMarkAsPaid(app.id)}
                                            className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all"
                                          >
                                            Receber S.{app.sessionNumber || (index + 1)}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => onUndoMarkAsPaid(app.id)}
                                            className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                                            title="Estornar Sessão"
                                          >
                                            <RefreshCcw className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                filteredApps.map(app => {
                  const client = clients.find(c => c.id === app.clientId);
                  const proc = getAppProcedure(app, procedures);
                  const paid = app.paidAmount || 0;
                  const remaining = app.price - paid;
                  const isPartial = paid > 0 && !app.isPaid;

                  return (
                    <tr key={app.id} className="group hover:bg-rose-50/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{app.date ? format(parseISO(app.date), "dd/MM/yyyy") : '-'}</span>
                          <span className="text-[10px] font-medium text-gray-400 uppercase">{app.date ? format(parseISO(app.date), "HH:mm") : '--:--'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-[10px] font-black text-rose-600 shrink-0">
                            {client?.name?.substring(0, 2).toUpperCase() || '??'}
                          </div>
                          <span className="text-sm font-bold text-gray-900 truncate max-w-[150px]" title={client?.name}>{client?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-600">{proc?.name || 'Venda Direta / Outro'}</span>
                          <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                            Sessão {app.sessionNumber || 1} de {app.totalSessions || 1}
                            {((app.totalSessions || 1) - (app.sessionNumber || 1) > 0) ? (
                              <span className="text-rose-400 ml-1">({(app.totalSessions || 1) - (app.sessionNumber || 1)} restando)</span>
                            ) : (
                              <span className="text-emerald-500 ml-1">(Concluído)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-black text-gray-900">{formatCurrency(app.price)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "text-sm font-black",
                          paid > 0 ? "text-emerald-600" : "text-gray-300"
                        )}>{formatCurrency(paid)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "text-sm font-black text-rose-600",
                          remaining <= 0 && "text-gray-200"
                        )}>{formatCurrency(Math.max(0, remaining))}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          app.isPaid ? "bg-emerald-100 text-emerald-600" :
                          isPartial ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                        )}>
                          {app.isPaid ? 'Pago' : isPartial ? 'Parcial' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!app.isPaid && (
                            <button
                              onClick={() => onSendWhatsApp(app, 'payment')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Cobrar via WhatsApp"
                            >
                              <MessageCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditAppointment(app)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Editar Registro"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteAppointment(app.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {!app.isPaid ? (
                            <button
                              onClick={() => onMarkAsPaid(app.id)}
                              className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:-translate-y-0.5 transition-all outline-none"
                            >
                              {isPartial ? 'Completar' : 'Receber'}
                            </button>
                          ) : (
                            <button
                              onClick={() => onUndoMarkAsPaid(app.id)}
                              className="p-1.5 text-gray-300 hover:text-rose-500 transition-colors"
                              title="Estornar Pagamento"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {((groupByPackage && groupedData.length === 0) || (!groupByPackage && filteredApps.length === 0)) && (
            <div className="p-20 text-center">
               <DollarSign className="w-12 h-12 text-rose-100 mx-auto mb-4" />
               <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
            </div>
          )}
        </div>

        {/* Mobile View for Pagamentos */}
        <div className="lg:hidden divide-y divide-rose-50">
          {groupByPackage ? (
            groupedData.length > 0 ? (
              groupedData.map(group => {
                const client = clients.find(c => c.id === group.activeApp.clientId);
                const proc = getAppProcedure(group.activeApp, procedures);
                const isExpanded = expandedGroups[group.key];
                const nextUnpaidApp = group.appointments.find(a => !a.isPaid);

                return (
                  <div key={group.key} className="p-6 space-y-4 hover:bg-rose-50/10 transition-colors">
                    <div className="flex justify-between items-start" onClick={() => toggleGroup(group.key)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 font-bold shrink-0">
                          {client?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{client?.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <span>Sessão {group.paidCount} de {group.totalCount}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          group.isPaid ? "bg-emerald-100 text-emerald-600" :
                          group.isPartial ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                        )}>
                          {group.isPaid ? 'Pago' : group.isPartial ? 'Parcial' : 'Pendente'}
                        </span>
                        
                        <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
                          {group.appointments.map((a, idx) => (
                            <span 
                              key={a.id} 
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                a.isPaid ? "bg-emerald-500" : (a.paidAmount || 0) > 0 ? "bg-amber-400" : "bg-gray-200"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50/50 rounded-2xl flex items-center justify-between text-xs font-semibold text-gray-500">
                      <span>Procimento: <span className="text-gray-800 font-bold">{proc?.name || 'Outro'}</span></span>
                      <button 
                        onClick={() => toggleGroup(group.key)}
                        className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-500"
                      >
                        {isExpanded ? 'Ocultar Detalhes' : 'Detalhar Sessões'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-gray-50 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Total Pacote</p>
                        <p className="text-sm font-black text-gray-900">{formatCurrency(group.totalPrice)}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider mb-0.5">Pago Total</p>
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(group.totalPaid)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Pendente</p>
                        <p className="text-base font-black text-rose-600">{formatCurrency(Math.max(0, group.remaining))}</p>
                      </div>
                      <div className="flex gap-2">
                        {nextUnpaidApp ? (
                          <button
                            onClick={() => onMarkAsPaid(nextUnpaidApp.id)}
                            className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                          >
                            Receber S.{nextUnpaidApp.sessionNumber || 1}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-wider py-2 px-3 bg-emerald-50 rounded-xl">
                            <CheckCircle className="w-4 h-4" /> Concluído
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable sub-sessions panel for mobile */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-gray-100 space-y-3">
                        <p className="text-[9px] font-black uppercase text-rose-400 tracking-widest">Sessões Individuais</p>
                        <div className="space-y-2.5">
                          {group.appointments.map((app, index) => {
                            const paid = app.paidAmount || 0;
                            const remaining = app.price - paid;
                            const isPart = paid > 0 && !app.isPaid;
                            return (
                              <div key={app.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xs font-black text-gray-800">Sessão {app.sessionNumber || (index + 1)} de {group.totalCount}</span>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase">
                                      {app.date ? format(parseISO(app.date), "dd/MM/yyyy HH:mm") : '-'}
                                    </p>
                                  </div>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                    app.isPaid ? "bg-emerald-100 text-emerald-600" :
                                    isPart ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                                  )}>
                                    {app.isPaid ? 'Pago' : isPart ? 'Parcial' : 'Pendente'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                  <span>Preço: <strong className="text-gray-800">{formatCurrency(app.price)}</strong></span>
                                  <span>Restante: <strong className="text-rose-500">{formatCurrency(remaining)}</strong></span>
                                </div>
                                <div className="flex gap-1.5 justify-end pt-1">
                                  {!app.isPaid && (
                                    <button
                                      onClick={() => onSendWhatsApp(app, 'payment')}
                                      className="p-1.5 bg-white text-emerald-600 rounded-lg border border-gray-100 text-[10px] font-bold"
                                    >
                                      Cobrar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onEditAppointment(app)}
                                    className="p-1.5 bg-white text-gray-400 rounded-lg border border-gray-100"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteAppointment(app.id)}
                                    className="p-1.5 bg-white text-gray-300 rounded-lg border border-gray-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {!app.isPaid ? (
                                    <button
                                      onClick={() => onMarkAsPaid(app.id)}
                                      className="px-3 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider"
                                    >
                                      Receber S.{app.sessionNumber || (index + 1)}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => onUndoMarkAsPaid(app.id)}
                                      className="p-1.5 bg-white text-gray-400 rounded-lg border border-gray-100"
                                    >
                                      <RefreshCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                Nenhum registro de pagamento encontrado.
              </div>
            )
          ) : (
            filteredApps.length > 0 ? (
              filteredApps.map(app => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = getAppProcedure(app, procedures);
                const paid = app.paidAmount || 0;
                const remaining = app.price - paid;
                const isPartial = paid > 0 && !app.isPaid;

                return (
                  <div key={app.id} className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 font-bold">
                          {client?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{client?.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {app.date ? format(parseISO(app.date), 'dd/MM/yyyy') : '-'}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                        app.isPaid ? "bg-emerald-100 text-emerald-600" :
                        isPartial ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                      )}>
                        {app.isPaid ? 'Pago' : isPartial ? 'Parcial' : 'Pendente'}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl">
                      <p className="text-[10px] text-gray-400 font-bold">Procedimento: <span className="text-gray-800">{proc?.name || 'Outro'}</span></p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Sessão {app.sessionNumber || 1} de {app.totalSessions || 1}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-gray-50 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Total</p>
                        <p className="text-sm font-black text-gray-900">{formatCurrency(app.price)}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-emerald-400 tracking-wider mb-0.5">Pago</p>
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(paid)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Restante</p>
                        <p className="text-lg font-black text-rose-600">{formatCurrency(Math.max(0, remaining))}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditAppointment(app)}
                          className="p-3 bg-gray-50 text-gray-400 rounded-xl"
                          title="Editar Registro"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onDeleteAppointment(app.id)}
                          className="p-3 bg-gray-50 text-gray-300 hover:text-red-500 rounded-xl"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {!app.isPaid && (
                          <button
                            onClick={() => onSendWhatsApp(app, 'payment')}
                            className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                        )}
                        {!app.isPaid ? (
                          <button
                            onClick={() => onMarkAsPaid(app.id)}
                            className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                          >
                            {isPartial ? 'Completar' : 'Receber'}
                          </button>
                        ) : (
                          <button
                            onClick={() => onUndoMarkAsPaid(app.id)}
                            className="p-3 bg-gray-50 text-gray-400 rounded-xl"
                          >
                            <RefreshCcw className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                Nenhum registro de pagamento encontrado.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};


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

const generateWhatsAppUrl = (phone: string, message: string, prefix: string = '55') => {
  const phoneRaw = (phone || '').replace(/\D/g, '');
  // Se o número tem 10 ou 11 dígitos e ainda não tem o prefixo do país, adiciona o prefixo
  const formattedPhone = (phoneRaw.length === 11 || phoneRaw.length === 10) && !phoneRaw.startsWith(prefix) 
    ? `${prefix}${phoneRaw}` 
    : phoneRaw;
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
};

const openWhatsApp = (phone: string, message: string, prefix: string = '55') => {
  const url = generateWhatsAppUrl(phone, message, prefix);
  window.open(url, '_blank', 'noopener,noreferrer');
};

const LoadingScreen = () => (
  <div className="fixed inset-0 z-[1000] bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-white p-12 rounded-[48px] shadow-2xl border-4 border-white flex flex-col items-center gap-8">
      <div className="relative">
        <div className="w-24 h-24 bg-rose-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-rose-200 animate-bounce">
          <ShieldCheck className="text-white w-12 h-12" />
        </div>
        <div className="absolute -inset-4 border-2 border-dashed border-rose-200 rounded-[40px] animate-spin-slow" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Preparando Tudo...</h2>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest animate-pulse">Organizando seu espaço com segurança.</p>
      </div>
    </div>
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
  onNavigateToConfig,
  notificationHistory,
  csLabel,
  user,
  userProfile,
  setIsNotificationsOpen,
  isNotificationsOpen,
  onSendWhatsApp
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onNavigateToAgenda: () => void, 
  onNavigateToConfig: () => void,
  notificationHistory: { id: string, message: string, type: 'info' | 'warning' | 'error', date: Date }[],
  csLabel: string,
  user: User | null,
  userProfile: UserProfile | null,
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
      {(!userProfile?.name || !userProfile?.businessName || !userProfile?.specialty) && (
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/60 rounded-[28px] p-6 mb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-xl shrink-0">
              ✨
            </div>
            <div>
              <p className="font-black text-sm text-gray-900 uppercase tracking-tight">Experimente com seus dados reais!</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Cadastre o seu <strong>Nome do Estúdio</strong>, <strong>Nome Completo</strong> e <strong>Especialidade</strong> nas Configurações para simular os envios de WhatsApp em tempo real!</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onNavigateToConfig} 
            className="px-5 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all self-start md:self-auto shrink-0 shadow-lg shadow-amber-200 border-none outline-none cursor-pointer"
          >
            Configurar Perfil
          </button>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
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
                const proc = getAppProcedure(app, procedures);
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
                const proc = getAppProcedure(app, procedures);
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
                const proc = getAppProcedure(app, procedures);
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
  onEditClient,
  cLabel,
  csLabel,
  userProfile,
  onSendWhatsApp
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
  onEditClient: (client: Client) => void,
  cLabel: string,
  csLabel: string,
  userProfile: UserProfile | null,
  onSendWhatsApp: (app: Appointment, type: 'confirmation' | 'reminder') => void
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [clientSearch, setClientSearch] = useState('');
  
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

  const filteredSidebarClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.label || '').toLowerCase().includes(clientSearch.toLowerCase())
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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
        {/* Centro: Calendário */}
        <div className="lg:col-span-9 bg-white p-6 rounded-3xl shadow-sm border border-rose-50 flex flex-col">
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
                    "bg-white min-h-[70px] md:min-h-[100px] p-2 text-left transition-all hover:bg-rose-50/50 flex flex-col gap-1 relative group",
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
                        {(() => {
                          const client = clients.find(c => c.id === app.clientId);
                          return (
                            <>
                              <span className="text-[10px] font-medium text-gray-500 truncate">
                                {client?.name?.split(' ')[0] || cLabel}
                              </span>
                              {client?.labelColor && (
                                <div 
                                  className="w-1 h-1 rounded-full shrink-0" 
                                  style={{ backgroundColor: client.labelColor }} 
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lateral Direita: Detalhes do Dia */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-rose-50 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-rose-50/30">
            <h3 className="font-black text-gray-900 mb-1 text-sm uppercase tracking-widest">Agenda do Dia</h3>
            <p className="text-xs text-rose-600 font-bold uppercase tracking-widest">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {dayAppointments.length > 0 ? (
              dayAppointments.map((app, index) => {
                const client = clients.find(c => c.id === app.clientId);
                const proc = getAppProcedure(app, procedures);
                const isLate = app.status === 'atrasado';
                const isRealized = app.status === 'realizado';

                return (
                  <motion.div 
                    key={app.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-5 rounded-[28px] border transition-all duration-300 group relative overflow-hidden",
                      isLate 
                        ? "bg-red-50 border-red-100 shadow-lg shadow-red-100/30" 
                        : isRealized
                        ? "bg-emerald-50/50 border-emerald-100/50 grayscale-[0.3]"
                        : "bg-white border-rose-50 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100/20"
                    )}
                  >
                    {/* Faixa Colorida da Etiqueta */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5 opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: client?.labelColor || '#f43f5e' }}
                    />

                    {/* Action Bar Floating */}
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                      <button 
                        onClick={() => onEditAppointment(app)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-blue-100 transition-all font-bold"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteAppointment(app.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-all font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-4 pl-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm",
                        isLate ? "bg-red-500 text-white" : "bg-rose-100 text-rose-600"
                      )}>
                        {client?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-gray-900 text-xs flex items-center gap-1.5 truncate uppercase tracking-tight">
                          {client?.name || `${cLabel} Excluída`}
                          {isRealized && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <div className="flex items-center gap-1 text-rose-500">
                            <Clock className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-black uppercase tracking-wider">
                              {(() => {
                                const start = parseISO(app.date);
                                const end = addMinutes(start, proc?.duration || 60);
                                return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
                              })()}
                            </span>
                          </div>
                          {client?.label && (
                            <span 
                              className="text-[8px] font-black uppercase tracking-widest"
                              style={{ color: client.labelColor || '#f43f5e' }}
                            >
                              • {client.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-gray-50 pl-1">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSendWhatsApp(app, 'confirmation')}
                          className="flex-1 bg-blue-50 text-blue-600 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-blue-100 hover:bg-blue-100 transition-all"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Confirmar
                        </button>
                        <button
                          onClick={() => onSendWhatsApp(app, 'reminder')}
                          className="flex-1 bg-amber-50 text-amber-600 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-amber-100 hover:bg-amber-100 transition-all"
                        >
                          <BellRing className="w-3 h-3" />
                          Lembrete
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-1 px-1">
                        <div className="flex items-center gap-1">
                          <Activity className="w-2.5 h-2.5 text-gray-300" />
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                        </div>
                        <select 
                          value={app.status}
                          onChange={(e) => onUpdateStatus(app.id, e.target.value as AppointmentStatus)}
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest bg-transparent p-1 rounded transition-all outline-none",
                            statusColors[app.status]
                          )}
                        >
                          {(['confirmado', 'realizado', 'faltou', 'pendente', 'desmarcado', 'atrasado'] as AppointmentStatus[]).map(s => (
                            <option key={s} value={s} className="bg-white text-gray-900">{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="pt-2">
                        {app.status !== 'realizado' ? (
                          <button
                            onClick={() => onMarkAsFinished(app.id)}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Finalizar Atendimento
                          </button>
                        ) : !app.isPaid ? (
                          <button
                            onClick={() => onMarkAsPaid(app.id)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                          >
                            <DollarSign className="w-3 h-3" />
                            Cobrar Agora
                          </button>
                        ) : (
                          <div className="bg-emerald-50 text-emerald-600 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100/50">
                            <CheckCircle2 className="w-3 h-3" />
                            Finalizado e Pago
                          </div>
                        )}

                        {app.status === 'realizado' && !app.isPaid && (
                          <div className="mt-2 flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                             <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                             <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Aguardando Pagamento</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 px-8">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                  <CalendarIcon className="w-6 h-6 text-rose-200" />
                </div>
                <h4 className="text-gray-900 font-black text-[10px] uppercase tracking-widest mb-1">Dia Tranquilo</h4>
                <p className="text-gray-400 text-[9px] font-bold uppercase">Nenhum agendamento para hoje.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedClients: Omit<Client, 'id'>[]) => Promise<void>;
  existingClients: Client[];
  cLabel: string;
  csLabel: string;
}

const ImportClientsModal = ({
  isOpen,
  onClose,
  onImport,
  existingClients,
  cLabel,
  csLabel
}: ImportClientsModalProps) => {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [parsedClients, setParsedClients] = useState<Omit<Client, 'id'>[]>([]);
  
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<Record<string, string>>({
    name: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    observations: ''
  });
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Parse pasted text in real-time
  useEffect(() => {
    if (activeTab === 'text') {
      const text = pastedText.trim();
      if (!text) {
        setParsedClients([]);
        return;
      }
      
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const result: Omit<Client, 'id'>[] = [];
      
      lines.forEach(line => {
        let parts: string[] = [];
        if (line.includes('\t')) {
          parts = line.split('\t');
        } else if (line.includes(';')) {
          parts = line.split(';');
        } else if (line.includes(',')) {
          parts = line.split(',');
        }
        
        let name = '';
        let phone = '';
        let email = '';
        let city = '';
        let observations = '';
        
        if (parts.length >= 2) {
          name = parts[0].trim();
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            if (part.includes('@')) {
              email = part;
            } else if (/[0-9]/.test(part) && part.replace(/\D/g, '').length >= 8) {
              phone = part;
            } else if (city === '') {
              city = part;
            } else {
              if (observations) observations += ' | ' + part;
              else observations = part;
            }
          }
        } else {
          // Attempt smart parse for a single line listing e.g. "Name (11) 99999-9999" or "Name 11999999999"
          const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g;
          const matchPhone = line.match(phoneRegex);
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}/g;
          const matchEmail = line.match(emailRegex);
          
          if (matchPhone && matchPhone.length > 0) {
            phone = matchPhone[0];
            let cleanedLine = line.replace(phone, '');
            if (matchEmail && matchEmail.length > 0) {
              email = matchEmail[0];
              cleanedLine = cleanedLine.replace(email, '');
            }
            name = cleanedLine.replace(/[;,\-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
          } else {
            if (matchEmail && matchEmail.length > 0) {
              email = matchEmail[0];
              name = line.replace(email, '').replace(/[;,\-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
            } else {
              name = line;
            }
          }
        }
        
        if (name) {
          result.push({
            name: name,
            phone: phone ? phone.replace(/\D/g, '') : '',
            email: email,
            city: city,
            observations: observations || 'Importado via colagem',
            createdAt: new Date().toISOString()
          });
        }
      });
      
      setParsedClients(result);
    }
  }, [pastedText, activeTab]);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length === 0) return;
        
        const headers = (json[0] as string[]).map(h => String(h || '').trim()).filter(Boolean);
        const rows = json.slice(1) as any[][];
        
        const formattedRows = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        }).filter(row => Object.values(row).some(v => v !== undefined && v !== null && v !== ''));
        
        setFileHeaders(headers);
        setFileData(formattedRows);
        
        const mapping: Record<string, string> = {
          name: '',
          phone: '',
          email: '',
          city: '',
          state: '',
          observations: ''
        };
        
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('nome') || lower.includes('name') || lower.includes('cliente')) {
            if (!mapping.name) mapping.name = h;
          } else if (lower.includes('tel') || lower.includes('cel') || lower.includes('whats') || lower.includes('fone') || lower.includes('phone') || lower.includes('número') || lower.includes('numero')) {
            if (!mapping.phone) mapping.phone = h;
          } else if (lower.includes('mail')) {
            if (!mapping.email) mapping.email = h;
          } else if (lower.includes('cidade') || lower.includes('city') || lower.includes('munic')) {
            if (!mapping.city) mapping.city = h;
          } else if (lower.includes('estado') || lower.includes('uf') || lower.includes('state')) {
            if (!mapping.state) mapping.state = h;
          } else if (lower.includes('obs') || lower.includes('nota') || lower.includes('desc') || lower.includes('observ')) {
            if (!mapping.observations) mapping.observations = h;
          }
        });
        
        setSelectedMapping(mapping);
        setIsFileLoaded(true);
      } catch (err) {
        console.error("Erro ao importar planilha:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const cleanPhone = (phoneStr: string) => {
    return phoneStr.replace(/\D/g, '');
  };

  const getMappedClients = (): Omit<Client, 'id'>[] => {
    if (activeTab === 'text') {
      return parsedClients;
    }
    
    return fileData.map(row => {
      const nameVal = selectedMapping.name ? row[selectedMapping.name] : '';
      const phoneVal = selectedMapping.phone ? row[selectedMapping.phone] : '';
      const emailVal = selectedMapping.email ? row[selectedMapping.email] : '';
      const cityVal = selectedMapping.city ? row[selectedMapping.city] : '';
      const stateVal = selectedMapping.state ? row[selectedMapping.state] : '';
      const obsVal = selectedMapping.observations ? row[selectedMapping.observations] : '';
      
      const nameStr = nameVal ? String(nameVal).trim() : '';
      if (!nameStr) return null;
      
      return {
        name: nameStr,
        phone: phoneVal ? cleanPhone(String(phoneVal)) : '',
        email: emailVal ? String(emailVal).trim() : '',
        city: cityVal ? String(cityVal).trim() : '',
        state: stateVal ? String(stateVal).trim() : '',
        observations: obsVal ? String(obsVal).trim() : 'Importado via planilha',
        createdAt: new Date().toISOString()
      };
    }).filter((c): c is Omit<Client, 'id'> => c !== null);
  };

  const handleConfirmImport = async () => {
    const rawClients = getMappedClients();
    if (rawClients.length === 0) return;
    
    let finalClients = rawClients;
    if (ignoreDuplicates) {
      finalClients = rawClients.filter(c => {
        const phoneMatch = c.phone && existingClients.some(existing => 
          existing.phone && cleanPhone(existing.phone) === cleanPhone(c.phone)
        );
        const nameMatch = c.name && existingClients.some(existing => 
          existing.name.toLowerCase().trim() === c.name.toLowerCase().trim()
        );
        return !phoneMatch && !nameMatch;
      });
    }

    if (finalClients.length === 0) {
      onClose();
      return;
    }

    setIsImporting(true);
    try {
      await onImport(finalClients);
      setPastedText('');
      setParsedClients([]);
      setFileData([]);
      setFileHeaders([]);
      setIsFileLoaded(false);
      onClose();
    } catch (err) {
      console.error("Erro ao executar importação:", err);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  const currentParsed = getMappedClients();
  const totalDuplicates = currentParsed.filter(c => {
    const phoneMatch = c.phone && existingClients.some(existing => 
      existing.phone && cleanPhone(existing.phone) === cleanPhone(c.phone)
    );
    const nameMatch = c.name && existingClients.some(existing => 
      existing.name.toLowerCase().trim() === c.name.toLowerCase().trim()
    );
    return phoneMatch || nameMatch;
  }).length;

  const finalCount = ignoreDuplicates ? currentParsed.length - totalDuplicates : currentParsed.length;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-6 rounded-[32px] w-full max-w-2xl shadow-2xl border border-rose-50 max-h-[90vh] overflow-y-auto my-auto flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Importar Lista de Clientes</h2>
            <p className="text-xs text-gray-400 font-bold mt-1">Carregue uma planilha ou cole textos para povoar seu CRM rapidamente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1.5 bg-gray-50 rounded-2xl mb-6">
          <button 
            type="button"
            onClick={() => { setActiveTab('file'); }}
            className={`py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'file' ? 'bg-white shadow-sm text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            📂 Planilha (Excel/CSV)
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab('text'); }}
            className={`py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'text' ? 'bg-white shadow-sm text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
          >
            ✏️ Colar Texto (Rápido)
          </button>
        </div>

        {/* Tab 1: Excel/CSV File upload */}
        {activeTab === 'file' && !isFileLoaded && (
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${dragActive ? 'border-rose-400 bg-rose-50/30' : 'border-gray-200 hover:border-rose-200 bg-gray-50/50'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileInput} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <p className="font-bold text-gray-900 text-lg">Arraste seu arquivo aqui</p>
            <p className="text-sm text-gray-500 mt-1">Ou clique para procurar em seu computador</p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Formatos aceitos: xlsx, xls, csv
            </div>
          </div>
        )}

        {/* Excel Loaded Mapping View */}
        {activeTab === 'file' && isFileLoaded && (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <span className="text-xs font-black text-rose-600 uppercase tracking-widest pl-1">Planilha carregada ({fileData.length} linhas)</span>
              <button 
                type="button"
                onClick={() => { setIsFileLoaded(false); setFileData([]); setFileHeaders([]); }}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Trocar arquivo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-3xl">
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">Mapear Colunas</h4>
                <p className="text-[10px] text-gray-500 font-semibold mb-3">Selecione quais colunas do seu Excel correspondem aos dados da cliente:</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome Completo (Obrigatório)</label>
                    <select 
                      value={selectedMapping.name} 
                      onChange={e => setSelectedMapping(m => ({ ...m, name: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-100 text-sm font-semibold bg-white outline-none focus:border-rose-300"
                    >
                      <option value="">-- Ignorar ou Não Encontrado --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">WhatsApp / Telefone</label>
                    <select 
                      value={selectedMapping.phone} 
                      onChange={e => setSelectedMapping(m => ({ ...m, phone: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-100 text-sm font-semibold bg-white outline-none focus:border-rose-300"
                    >
                      <option value="">-- Ignorar ou Não Encontrado --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">E-mail</label>
                    <select 
                      value={selectedMapping.email} 
                      onChange={e => setSelectedMapping(m => ({ ...m, email: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-100 text-sm font-semibold bg-white outline-none focus:border-rose-300"
                    >
                      <option value="">-- Ignorar --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cidade</label>
                    <select 
                      value={selectedMapping.city} 
                      onChange={e => setSelectedMapping(m => ({ ...m, city: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-100 text-sm font-semibold bg-white outline-none focus:border-rose-300"
                    >
                      <option value="">-- Ignorar --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Observações Gerais</label>
                    <select 
                      value={selectedMapping.observations} 
                      onChange={e => setSelectedMapping(m => ({ ...m, observations: e.target.value }))}
                      className="w-full p-2.5 rounded-xl border border-gray-100 text-sm font-semibold bg-white outline-none focus:border-rose-300"
                    >
                      <option value="">-- Ignorar --</option>
                      {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">Pré-visualização</h4>
                <div className="space-y-2 border border-gray-100 bg-white p-3 rounded-2xl max-h-[300px] overflow-y-auto">
                  {currentParsed.slice(0, 5).map((u, i) => (
                    <div key={i} className="pb-2 border-b border-gray-50 last:border-b-0 text-xs">
                      <p className="font-extrabold text-gray-800">{u.name || '[Sem Nome]'}</p>
                      {u.phone && <span className="font-medium text-gray-500 mr-2 block">📞 {u.phone}</span>}
                      {u.email && <span className="font-medium text-gray-500 block">✉️ {u.email}</span>}
                      {u.city && <span className="font-medium text-gray-400 block">📍 {u.city}</span>}
                    </div>
                  ))}
                  {currentParsed.length === 0 && (
                    <p className="text-xs text-gray-400 font-bold text-center py-10">Mapeie ao menos a coluna de Nome para ver o preview</p>
                  )}
                  {currentParsed.length > 5 && (
                    <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-widest pt-2 border-t border-gray-50">E mais {currentParsed.length - 5} contatos...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Text pasting list */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase block mb-2 font-black tracking-wider">Cole sua lista de clientes abaixo</label>
              <p className="text-[10px] text-gray-400 font-bold mb-3 uppercase tracking-wider">
                COLE LINHAS CONTENDO TEXTO DESORGANIZADO OU DE OUTROS SISTEMAS. ANALISAREMOS OS NOMES E CONTATOS AUTOMATICAMENTE!
              </p>
              <textarea 
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Exemplo:&#10;Lucia Silva, (11) 98765-4321, lucia@gmail.com&#10;Claudia Regina Santana; 19999887766; claudia@uol.com.br&#10;Renata Antunes 21977778888"
                className="w-full h-44 p-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-mono text-xs text-gray-700 resize-none"
              />
            </div>

            {currentParsed.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">Linhas Identificadas ({currentParsed.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-2xl">
                  {currentParsed.map((client, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-xl border border-gray-100 flex flex-col text-xs">
                      <span className="font-extrabold text-gray-800">{client.name}</span>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-gray-400 font-bold mt-1">
                        {client.phone && <span>📞 {client.phone}</span>}
                        {client.email && <span>✉️ {client.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* General Options & Actions */}
        {currentParsed.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-2xl gap-3">
              <div 
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => setIgnoreDuplicates(!ignoreDuplicates)}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${ignoreDuplicates ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-gray-200'}`}>
                  {ignoreDuplicates && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-800 leading-none mb-1">Ignorar Contatos Duplicados</p>
                  <p className="text-[10px] text-gray-400 font-bold">Evita cadastrar nomes ou números de telefone que já existem ({totalDuplicates} duplicados detectados)</p>
                </div>
              </div>
              <div className="text-right w-full sm:w-auto shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">A ser importado</span>
                <span className="text-lg font-black text-rose-500">{finalCount} de {currentParsed.length}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleConfirmImport}
              disabled={isImporting || finalCount === 0}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg flex items-center justify-center gap-2 ${finalCount === 0 ? 'bg-gray-200 shadow-none cursor-not-allowed text-gray-400' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-100 hover:scale-98'}`}
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando clientes...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Importação ({finalCount})
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
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
  csLabel,
  onImportClients,
  lastImportedCount = 0,
  onUndoImport,
  onClearUndo
}: { 
  clients: Client[], 
  appointments: Appointment[], 
  procedures: Procedure[], 
  onOpenNewClient: () => void,
  onEditClient: (client: Client) => void,
  onDeleteClient: (id: string) => void,
  cLabel: string,
  csLabel: string,
  onImportClients: (importedClients: Omit<Client, 'id'>[]) => Promise<void>,
  lastImportedCount?: number,
  onUndoImport?: () => void,
  onClearUndo?: () => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
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
                  const proc = getAppProcedure(app, procedures);
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
            type="button"
            onClick={exportClientsCSV}
            className="flex-1 md:flex-none border-2 border-rose-100 text-rose-500 hover:bg-rose-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm"
          >
            <Download className="w-4 h-4" />
            CRM Completo
          </button>
          <button 
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-none border-2 border-dashed border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm"
          >
            <Upload className="w-4 h-4" />
            Importar Lista
          </button>
          <button 
            type="button"
            onClick={onOpenNewClient}
            className="flex-1 md:flex-none bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-200 font-bold"
          >
            <Plus className="w-5 h-5" />
            Nova Cliente
          </button>
        </div>
      </div>

      {lastImportedCount > 0 && onUndoImport && onClearUndo && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100/80 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800 leading-tight">
                Importação Recente: {lastImportedCount} {cLabel.toLowerCase()}s adicionadas!
              </p>
              <p className="text-xs text-gray-500 font-bold mt-1">
                Se você importou a lista por engano ou deseja corrigir, pode reverter agora.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button 
              type="button"
              onClick={onClearUndo}
              className="px-3.5 py-2 text-xs font-black text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all uppercase tracking-wider"
            >
              Dispensar
            </button>
            <button 
              type="button"
              onClick={onUndoImport}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-100 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer Importação
            </button>
          </div>
        </motion.div>
      )}

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

      <ImportClientsModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportClients}
        existingClients={clients}
        cLabel={cLabel}
        csLabel={csLabel}
      />
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
  userProfile,
  onSendWhatsApp
}: { 
  appointments: Appointment[], 
  clients: Client[], 
  procedures: Procedure[], 
  onUpdateStatus: (id: string, status: AppointmentStatus) => void,
  onEditAppointment: (app: Appointment) => void,
  onDeleteAppointment: (id: string) => void,
  cLabel: string,
  userProfile: UserProfile | null,
  onSendWhatsApp: (app: Appointment, type: 'confirmation' | 'reminder') => void
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
          <div className="flex flex-wrap gap-2 bg-white p-1 rounded-2xl border border-rose-50 shadow-sm overflow-x-auto no-scrollbar">
          {(['todos', 'pendente', 'confirmado', 'atrasado', 'realizado', 'faltou'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0",
                filter === s ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "text-gray-400 hover:text-rose-500 bg-gray-50"
              )}
            >
              {s === 'todos' ? 'Ver Todos' : statusLabels[s as AppointmentStatus] || s}
            </button>
          ))}
        </div>
      </div>
    </div>

      <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-rose-50 overflow-hidden text-left">
        <div className="overflow-x-auto hidden lg:block">
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
                const proc = getAppProcedure(app, procedures);
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
                            onClick={() => onSendWhatsApp(app, 'confirmation')}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Confirmação WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => onSendWhatsApp(app, 'reminder')}
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

        {/* Mobile View */}
        <div className="lg:hidden divide-y divide-rose-50">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map(app => {
              const client = clients.find(c => c.id === app.clientId);
              const proc = getAppProcedure(app, procedures);
              return (
                <div key={app.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 font-bold">
                        {client?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{client?.name || `${cLabel} Excluída`}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {app.date ? format(parseISO(app.date), 'dd/MM/yyyy • HH:mm') : '-'}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                      statusColors[app.status]
                    )}>
                      {statusLabels[app.status]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Serviço</p>
                      <p className="text-sm font-bold text-gray-700">{proc?.name || 'Não definido'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-0.5">Valor</p>
                      <p className="text-sm font-black text-rose-600">{formatCurrency(app.price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onSendWhatsApp(app, 'confirmation')}
                        className="p-3 bg-blue-50 text-blue-500 rounded-xl"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onSendWhatsApp(app, 'reminder')}
                        className="p-3 bg-amber-50 text-amber-500 rounded-xl"
                      >
                        <BellRing className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEditAppointment(app)}
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onDeleteAppointment(app.id)}
                        className="p-3 bg-red-50 text-red-400 rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
              Nenhum agendamento encontrado no período.
            </div>
          )}
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
  onEditBudget,
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
  onEditBudget: (b: Budget) => void,
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
    openWhatsApp(client.phone || '', text, userProfile?.whatsappPrefix || '55');
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
                  onClick={() => onEditBudget(budget.id as any)}
                  className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  title="Editar Orçamento"
                >
                  <Pencil className="w-4 h-4" />
                </button>
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl border border-rose-50 max-h-[90vh] overflow-y-auto my-auto"
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
  onAddLead,
  userProfile
}: { 
  leads: Lead[], 
  onUpdateStatus: (id: string, status: Lead['status']) => void, 
  onDelete: (id: string) => void,
  onAddLead: (lead: Lead) => void,
  userProfile: UserProfile | null
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
              onClick={() => window.open(RAISE_WEBSITE_URL, '_blank')}
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
              onClick={() => window.open(RAISE_WEBSITE_URL, '_blank')}
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
            onClick={() => window.open(RAISE_WEBSITE_URL, '_blank')}
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
          <div className="overflow-x-auto hidden md:block">
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
                        onClick={() => openWhatsApp(lead.phone, `Olá ${lead.name}! Vi seu interesse no Instagram sobre nossos serviços. Como posso te ajudar? ✨`, userProfile?.whatsappPrefix || '55')}
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

          {/* Cards for Mobile */}
          <div className="md:hidden divide-y divide-slate-50">
            {leads.length > 0 ? leads.map(lead => (
              <div key={lead.id} className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{lead.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lead.origin || 'Instagram'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDelete(lead.id)}
                    className="p-2 text-slate-300 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => openWhatsApp(lead.phone, `Olá ${lead.name}! Vi seu interesse no Instagram sobre nossos serviços. Como posso te ajudar? ✨`, userProfile?.whatsappPrefix || '55')}
                    className="flex items-center gap-3 bg-green-50 text-green-600 font-bold p-3 rounded-2xl text-sm"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {lead.phone}
                  </button>
                  <div className="relative">
                    <select 
                      value={lead.status}
                      onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)}
                      className={cn(
                        "w-full px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 outline-none cursor-pointer appearance-none",
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
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum lead encontrado para gerenciar.</div>
            )}
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
  cLabel,
  userProfile
}: { 
  followUps: FollowUp[], 
  onOpenNewFollowUp: () => void,
  onUpdateStatus: (id: string, status: FollowUp['status']) => void,
  onDelete: (id: string) => void,
  onEdit?: (fu: FollowUp) => void,
  cLabel: string,
  userProfile: UserProfile | null
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
    <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-rose-50 overflow-hidden mb-8">
      {/* Desktop Table */}
      <div className="overflow-x-auto hidden lg:block">
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
                            openWhatsApp(phone, text, userProfile?.whatsappPrefix || '55');
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

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-rose-50">
        {list.length > 0 ? (
          list.map(fu => (
            <div key={fu.id} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold text-rose-600">
                    {fu.clientName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block">{fu.clientName || 'Cliente'}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{fu.date ? format(parseISO(fu.date), 'dd/MM/yyyy') : '-'}</span>
                  </div>
                </div>
                <button
                  onClick={() => fu.status !== 'Concluído' && onUpdateStatus(fu.id, 'Concluído')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5",
                    fu.status === 'Pendente' ? "bg-amber-100 text-amber-700" :
                    fu.status === 'Concluído' ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", fu.status === 'Pendente' ? "bg-amber-500" : "bg-green-500")} />
                  {fu.status}
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm font-bold text-gray-800 mb-1">{fu.procedureName}</p>
                {fu.observation && <p className="text-xs text-gray-500">{fu.observation}</p>}
              </div>

              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    const phone = fu.clientPhone ? fu.clientPhone.replace(/\D/g, '') : '';
                    const text = `Olá ${fu.clientName}! Tudo bem? Gostaria de saber como você está se sentindo após o procedimento de ${fu.procedureName}...`;
                    openWhatsApp(phone, text, userProfile?.whatsappPrefix || '55');
                  }}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-green-100"
                >
                  <MessageCircle className="w-4 h-4" />
                  Conversar no WhatsApp
                </button>
                <div className="flex gap-1">
                  <button onClick={() => onEdit && onEdit(fu)} className="p-3 text-gray-400 hover:text-rose-500"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => onDelete(fu.id)} className="p-3 text-gray-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
            {emptyMessage}
          </div>
        )}
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
          <div className="overflow-x-auto flex-1 hidden md:block">
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

          {/* Cards for Mobile */}
          <div className="md:hidden divide-y divide-gray-50">
            {filteredEntries.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 font-medium">Nenhum lançamento no período filtrado.</div>
            ) : (
              [...filteredEntries].sort((a,b) => (b.date || '').localeCompare(a.date || '')).map(entry => (
                <div key={entry.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{entry.description}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{entry.date ? format(parseISO(entry.date), 'dd/MM/yyyy') : '-'}</div>
                    </div>
                    <div className={cn("text-sm font-black", entry.type === 'receita' ? "text-green-600" : "text-red-500")}>
                      {entry.type === 'receita' ? '+' : '-'} {formatCurrency(entry.amount)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">{entry.category || 'Geral'}</span>
                      <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">{entry.paymentMethod}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onEditEntry(entry)} className="p-2 text-gray-400 hover:text-rose-500 bg-gray-50 rounded-xl transition-all"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => onDeleteEntry(entry.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white p-6 sm:p-10 rounded-[40px] w-full max-w-md shadow-2xl relative border border-rose-50 max-h-[90vh] overflow-y-auto my-auto"
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
  isDemo,
  onNavigateToMessages,
  activePlan
}: { 
  userProfile: UserProfile | null,
  onUpdateProfile: (updates: Partial<UserProfile>) => void,
  onResetMocks: () => void,
  isDemo?: boolean,
  onNavigateToMessages: () => void,
  activePlan?: string | null
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
      
      {/* Informações da Assinatura e Integração com Kiwify */}
      <div className="bg-gradient-to-tr from-rose-50/50 to-rose-100/20 p-8 rounded-[32px] border border-rose-100/50 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Status da Assinatura • Integrado com Kiwify</span>
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">
              {activePlan === 'Administrador' ? (
                <span>Acesso Administrador 👑 <span className="text-rose-500 font-bold text-sm">(Ilimitado)</span></span>
              ) : activePlan?.toLowerCase()?.includes('anual') ? (
                <span>OrbyFlow - Plano Anual ✨ <span className="text-rose-600 font-bold text-sm">(Ativo)</span></span>
              ) : isDemo ? (
                <span>OrbyFlow - Modo de Demonstração <span className="text-rose-500 font-medium text-sm">(Demo)</span></span>
              ) : (
                <span>OrbyFlow - Plano Mensal ⚡ <span className="text-emerald-600 font-bold text-sm">(Ativo)</span></span>
              )}
            </h3>
          </div>
          <p className="text-xs font-semibold text-gray-500 max-w-3xl leading-relaxed">
            Sua conta OrbyFlow é atualizada de forma segura e automatizada por meio de Webhooks da Kiwify. 
            Em caso de expiração do plano, cancelamento, reembolso ou cobranças pendentes, as frentes de validação do sistema bloquearão o acesso imediatamente de forma automatizada.
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-rose-100 p-4 rounded-2xl flex items-center gap-3">
          <div className="bg-rose-500/10 p-2.5 rounded-xl">
            <span className="text-rose-500 text-lg font-black">KW</span>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Faturamento</p>
            <p className="text-xs font-bold text-gray-700 mt-1">Garantido por Kiwify</p>
          </div>
        </div>
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
                    <label className="text-xs font-bold text-gray-400 uppercase ml-4">Cod. País (Opcional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">+</span>
                      <input 
                        type="text" 
                        placeholder="55"
                        value={profile.whatsappPrefix || ''} 
                        onChange={e => setProfile(p => ({ ...p, whatsappPrefix: e.target.value }))}
                        className="w-full p-4 pl-10 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold text-gray-700" 
                      />
                    </div>
                  </div>
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
  const [isDefault, setIsDefault] = useState(false);
  
  useEffect(() => {
    if (isAdding || isEditing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isAdding, isEditing]);

  const handleOpenEdit = (t: MessageTemplate) => {
    setIsEditing(t);
    setName(t.name || '');
    setContent(t.content || '');
    setCategory(t.category || 'outros');
    setIsDefault(t.isDefault || false);
  };

  const handleSave = () => {
    if (isEditing) {
      onUpdateTemplate(isEditing.id, { name, content, category, isDefault });
      setIsEditing(null);
    } else {
      onAddTemplate({
        id: Math.random().toString(36).substr(2, 9),
        name,
        content,
        category,
        isDefault
      });
      setIsAdding(false);
    }
    setName('');
    setContent('');
    setCategory('outros');
    setIsDefault(false);
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
            <MessageCircle className="w-8 h-8 text-rose-500" /> Mensagens Automáticas
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

      <div className="px-4 space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Sugestões de Modelos Prontos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'sug-1', name: '💖 Boas-vindas Acolhedor', category: 'outros', content: 'Olá, {cliente_nome} ✨ Seja muito bem-vinda! Ficamos radiantes com seu interesse em nossos cuidados. Preparamos tudo com muito carinho para que você tenha um momento de relaxamento e renovação único. Se tiver qualquer dúvida sobre o procedimento {procedimento}, estou aqui para te ajudar, viu? Um beijo e até breve! 🌸' },
            { id: 'sug-2', name: '✨ Confirmação de Horário', category: 'agendamento', content: 'Olá, {cliente_nome}! ✨ Que alegria ter você conosco! Seu momento de cuidado para {procedimento} está confirmadíssimo no dia {data} às {hora}. 🌸\n\nPreparamos tudo com muito carinho para que você tenha uma experiência de relaxamento e renovação única aqui no {nome_espaco}.\n\nSe precisar desmarcar ou tiver qualquer dúvida, é só me chamar, tá bom? Estamos ansiosas para te receber! Um beijo! 💖\n\n📍 Endereço: {endereco}' },
            { id: 'sug-3', name: '🌸 Lembrete de Carinho', category: 'lembrete', content: 'Oi, {cliente_nome}! 🌸 Passando para lembrar com todo carinho do nosso encontro amanhã, dia {data}, às {hora}.\n\nEstamos preparando seu momento de {procedimento} com muito amor e mal podemos esperar para te ver! ✨\n\nCaso precise de qualquer alteração no seu horário, nos avise por favor com um pouquinho de antecedência para liberarmos a vaga para outra cliente querida. Até amanhã! 💖' }
          ].map(sug => {
            const isAlreadyAdded = templates.some(t => t.content === sug.content);
            return (
              <div key={sug.id} className="bg-rose-50/50 p-6 rounded-[32px] border border-rose-100/50 space-y-4 relative group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-gray-800">{sug.name}</h3>
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">{sug.category}</span>
                  </div>
                  {!isAlreadyAdded && (
                    <button 
                      onClick={() => onAddTemplate({
                        id: Math.random().toString(36).substr(2, 9),
                        name: sug.name,
                        content: sug.content,
                        category: sug.category as any,
                        isDefault: false
                      })}
                      className="p-2 bg-white text-rose-500 rounded-xl shadow-sm hover:scale-110 transition-transform active:scale-95"
                      title="Clique para adicionar aos seus modelos"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  {isAlreadyAdded && (
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-3 italic">"{sug.content}"</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4 mb-4">Meus Modelos Salvos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <h3 className="text-lg font-black text-gray-900 leading-tight truncate flex items-center gap-2">
                  {t.name}
                  {t.isDefault && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {t.category === 'agendamento' ? 'Confirmação' : t.category === 'lembrete' ? 'Lembrete' : 'Outros'}
                  </span>
                  {t.isDefault && (
                    <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Padrão</span>
                  )}
                </div>
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
    </div>

      {(isAdding || isEditing) && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[48px] shadow-2xl w-full max-w-6xl overflow-hidden border border-rose-50 flex flex-col lg:flex-row h-[92vh] relative mt-10 mb-4"
          >
            {/* Editor Side */}
            <div className="flex-1 p-6 lg:p-10 overflow-y-auto overscroll-contain space-y-8 border-r border-rose-50 pb-32 pt-20">
              <div className="sticky top-0 bg-white z-20 pb-6 flex justify-between items-center border-b border-rose-50 -mx-6 lg:-mx-10 px-6 lg:px-10 mb-8">
                <h2 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
                  {isAdding ? 'Novo Modelo' : 'Editar Modelo'}
                </h2>
                <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Sugestões Rápidas */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Sugestões de Modelos</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: '💖 Boas-vindas', content: 'Olá, {cliente_nome} ✨ Seja muito bem-vinda! Ficamos radiantes com seu interesse em nossos cuidados. Preparamos tudo com muito carinho para que você tenha um momento de relaxamento e renovação único. Se tiver qualquer dúvida sobre o procedimento {procedimento}, estou aqui para te ajudar, viu? Um beijo e até breve! 🌸' },
                      { name: '✨ Confirmação', content: 'Olá, {cliente_nome}! ✨ Que alegria ter você conosco! Seu momento de cuidado para {procedimento} está confirmadíssimo no dia {data} às {hora}. 🌸\n\nPreparamos tudo com muito carinho para que você tenha uma experiência de relaxamento e renovação única aqui no {nome_espaco}.\n\nSe precisar desmarcar ou tiver qualquer dúvida, é só me chamar, tá bom? Estamos ansiosas para te receber! Um beijo! 💖\n\n📍 Endereço: {endereco}' },
                      { name: '🌸 Lembrete', content: 'Oi, {cliente_nome}! 🌸 Passando para lembrar com todo carinho do nosso encontro amanhã, dia {data}, às {hora}.\n\nEstamos preparando seu momento de {procedimento} com muito amor e mal podemos esperar para te ver! ✨\n\nCaso precise de qualquer alteração no seu horário, nos avise por favor com um pouquinho de antecedência para liberarmos a vaga para outra cliente querida. Até amanhã! 💖' }
                    ].map(sug => (
                      <button
                        key={sug.name}
                        onClick={() => { setName(sug.name); setContent(sug.content); }}
                        className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-rose-100 transition-all border border-rose-100"
                      >
                        {sug.name}
                      </button>
                    ))}
                  </div>
                </div>

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
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          category === cat ? "bg-white text-rose-500 shadow-sm" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-4">
                  <button 
                    onClick={() => setIsDefault(!isDefault)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                      isDefault 
                        ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-200" 
                        : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <CheckCircle2 className={cn("w-4 h-4", isDefault ? "text-white" : "text-gray-200")} />
                    Definir como Padrão da Agenda
                  </button>
                  <p className="text-[10px] font-medium text-gray-400 leading-tight">
                    Este modelo será usado automaticamente nos botões de Confirmação/Lembrete.
                  </p>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">Conteúdo da Mensagem</label>
                  <textarea 
                    id="template-textarea"
                    rows={8}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Sua mensagem aqui... Use as tags para personalizar!"
                    className="w-full p-8 rounded-[40px] bg-gray-50 border-none outline-none focus:ring-4 focus:ring-rose-100 font-medium text-gray-700 text-lg leading-relaxed shadow-inner resize-none min-h-[300px]"
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

const stripUserProfile = (profile: any): any => {
  if (!profile) return {};
  const clean: any = {};
  
  if (profile.id !== undefined) clean.id = String(profile.id || '');
  if (profile.name !== undefined) clean.name = String(profile.name || '');
  if (profile.businessName !== undefined) clean.businessName = String(profile.businessName || '');
  if (profile.specialty !== undefined) clean.specialty = String(profile.specialty || '');
  if (profile.phone !== undefined) clean.phone = String(profile.phone || '');
  if (profile.address !== undefined) clean.address = String(profile.address || '');
  if (profile.instagram !== undefined) clean.instagram = String(profile.instagram || '');
  
  if (profile.workingHours && typeof profile.workingHours === 'object') {
    clean.workingHours = {
      start: String(profile.workingHours.start || '08:00'),
      end: String(profile.workingHours.end || '18:00')
    };
  }
  
  if (Array.isArray(profile.workingDays)) {
    clean.workingDays = profile.workingDays.map((d: any) => Number(d));
  }
  
  if (profile.budgetValidityDays !== undefined) clean.budgetValidityDays = Number(profile.budgetValidityDays || 7);
  if (profile.whatsappPrefix !== undefined) clean.whatsappPrefix = String(profile.whatsappPrefix || '');
  if (profile.confirmationMessageTemplate !== undefined) clean.confirmationMessageTemplate = String(profile.confirmationMessageTemplate || '');
  if (profile.reminderMessageTemplate !== undefined) clean.reminderMessageTemplate = String(profile.reminderMessageTemplate || '');
  if (profile.welcomeMessageTemplate !== undefined) clean.welcomeMessageTemplate = String(profile.welcomeMessageTemplate || '');
  if (profile.clientLabel !== undefined) clean.clientLabel = String(profile.clientLabel || 'Cliente');
  if (profile.ownerId !== undefined) clean.ownerId = String(profile.ownerId || '');
  if (profile.plan !== undefined) clean.plan = String(profile.plan || 'free');
  if (profile.accentColor !== undefined) clean.accentColor = String(profile.accentColor || 'rose');
  if (profile.createdAt !== undefined) clean.createdAt = String(profile.createdAt || '');
  if (profile.setupComplete !== undefined) clean.setupComplete = Boolean(profile.setupComplete);

  return clean;
};

const safeJsonStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object') {
      if (seen.has(value)) {
        return undefined;
      }
      seen.add(value);
      const protoName = value.constructor?.name || '';
      if (
        protoName.includes('Firestore') ||
        protoName.includes('DocumentReference') ||
        protoName.includes('CollectionReference') ||
        protoName.includes('Query') ||
        protoName.includes('Transaction') ||
        protoName.includes('WriteBatch') ||
        typeof value.withConverter === 'function' ||
        key === 'db' ||
        key === '_db' ||
        key === 'firestore'
      ) {
        return undefined;
      }
    }
    return value;
  });
};

const DEFAULT_CONFIRMATION_TEMPLATE = 'Olá, {cliente_nome}! ✨ Que alegria ter você conosco! Seu momento de cuidado para {procedimento} está confirmadíssimo no dia {data} às {hora}. 🌸\n\nPreparamos tudo com muito carinho para que você tenha uma experiência de relaxamento e renovação única aqui no {nome_espaco}.\n\nSe precisar desmarcar ou tiver qualquer dúvida, é só me chamar, tá bom? Estamos ansiosas para te receber! Um beijo! 💖\n\n📍 Endereço: {endereco}';
const DEFAULT_REMINDER_TEMPLATE = 'Oi, {cliente_nome}! 🌸 Passando para lembrar com todo carinho do nosso encontro amanhã, dia {data}, às {hora}.\n\nEstamos preparando seu momento de {procedimento} com muito amor e mal podemos esperar para te ver! ✨\n\nCaso precise de qualquer alteração no seu horário, nos avise por favor com um pouquinho de antecedência para liberarmos a vaga para outra cliente querida. Até amanhã! 💖';
const DEFAULT_WELCOME_TEMPLATE = 'Olá, {cliente_nome} ✨ Seja muito bem-vinda! Ficamos radiantes com seu interesse em nossos cuidados. Preparamos tudo com muito carinho para que você tenha um momento de relaxamento e renovação único. Se tiver qualquer dúvida sobre o procedimento {procedimento}, estou aqui para te ajudar, viu? Um beijo e até breve! 🌸';

const getDemoUserProfile = () => {
  const defaultDemoProfile = {
    id: 'demo-user',
    name: '',
    businessName: '',
    specialty: '',
    phone: '',
    address: '',
    instagram: '',
    workingHours: { start: '08:00', end: '19:00' },
    workingDays: [1, 2, 3, 4, 5, 6],
    budgetValidityDays: 15,
    clientLabel: 'Paciente' as const,
    confirmationMessageTemplate: DEFAULT_CONFIRMATION_TEMPLATE,
    reminderMessageTemplate: DEFAULT_REMINDER_TEMPLATE,
    welcomeMessageTemplate: DEFAULT_WELCOME_TEMPLATE,
    whatsappPrefix: '55',
    ownerId: 'demo-user',
    email: 'demo@demo.com',
    plan: 'pro' as const,
    accentColor: 'rose',
    createdAt: new Date().toISOString()
  };

  try {
    const cached = localStorage.getItem('last_saved_user_profile');
    if (cached) {
      const parsed = JSON.parse(cached);
      
      const cleanDemoVal = (val: any, defaultStale: string) => {
        if (typeof val !== 'string') return '';
        const trimmed = val.trim();
        if (trimmed === defaultStale || trimmed.toLowerCase() === defaultStale.toLowerCase()) return '';
        if (trimmed.includes('Usuária Demo') || trimmed.includes('Clínica de Estética Especializada') || trimmed.includes('Estética Avançada') || trimmed.includes('Lookalike')) return '';
        return trimmed;
      };

      const parsedName = cleanDemoVal(parsed.name, 'Usuária Demo (Lookalike)');
      const parsedBusinessName = cleanDemoVal(parsed.businessName, 'Clínica de Estética Especializada');
      const parsedSpecialty = cleanDemoVal(parsed.specialty, 'Estética Avançada');
      const parsedPhone = cleanDemoVal(parsed.phone, '(11) 99999-9999');
      const parsedAddress = cleanDemoVal(parsed.address, 'Rua da Estética, 123');
      const parsedInstagram = cleanDemoVal(parsed.instagram, '@marketing_estetico');

      return {
        ...defaultDemoProfile,
        name: parsedName,
        businessName: parsedBusinessName,
        specialty: parsedSpecialty,
        phone: parsedPhone,
        address: parsedAddress,
        instagram: parsedInstagram,
        workingHours: parsed.workingHours || defaultDemoProfile.workingHours,
        workingDays: parsed.workingDays || defaultDemoProfile.workingDays,
        budgetValidityDays: parsed.budgetValidityDays || defaultDemoProfile.budgetValidityDays,
        clientLabel: parsed.clientLabel || defaultDemoProfile.clientLabel,
        accentColor: parsed.accentColor || defaultDemoProfile.accentColor,
        confirmationMessageTemplate: parsed.confirmationMessageTemplate || defaultDemoProfile.confirmationMessageTemplate,
        reminderMessageTemplate: parsed.reminderMessageTemplate || defaultDemoProfile.reminderMessageTemplate,
        welcomeMessageTemplate: parsed.welcomeMessageTemplate || defaultDemoProfile.welcomeMessageTemplate,
        whatsappPrefix: parsed.whatsappPrefix || defaultDemoProfile.whatsappPrefix,
      };
    }
  } catch (e) {
    console.error('[DemoCheck] Error parsing cached profile for demo:', e);
  }
  return defaultDemoProfile;
};

const IS_DEMO_INITIAL = checkIsDemo();

interface ObrigadoPageProps {
  addNotification: (message: string, type?: 'info' | 'warning' | 'error') => void;
  setCurrentPage: (page: 'app' | 'obrigado') => void;
  setIsAuthorized: (auth: boolean | null) => void;
}

const ObrigadoPage = ({ addNotification, setCurrentPage, setIsAuthorized }: ObrigadoPageProps) => {
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const emailParam = params.get('email') || params.get('customer_email');
    // Fix: check if it's a literal template string from Kiwify (common mistake)
    if (emailParam && !emailParam.includes('${')) setReqEmail(emailParam);
    
    const nameParam = params.get('name') || params.get('customer_name');
    if (nameParam && !nameParam.includes('${')) setReqName(nameParam);
  }, []);

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const newUser = userCredential.user;
      const finalEmail = newUser.email?.toLowerCase()?.trim() || '';

      const profileRef = doc(db, 'userProfiles', newUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          name: reqName || newUser.displayName || finalEmail.split('@')[0],
          businessName: 'Minha Estética',
          ownerId: newUser.uid,
          email: finalEmail,
          role: 'user',
          plan: 'free',
          accentColor: 'rose',
          createdAt: new Date().toISOString(),
          setupComplete: true
        });
      }

      // Salvar na coleção authorized_emails para dar acesso permanente (não-bloqueante)
      try {
        await setDoc(doc(db, 'authorized_emails', finalEmail), {
          email: finalEmail,
          createdAt: new Date().toISOString(),
          createdBy: 'obrigado_page_google_signup'
        });
      } catch (authEmailErr) {
        console.warn('Non-blocking authorized_emails error:', authEmailErr);
      }

      // Explicitly authorize session and notify
      setIsAuthorized(true);
      addNotification('Acesso ativado com sucesso! Bem-vinda!', 'info');
      
      // Remove 'page' from URL safely so they aren't stuck on the obrigado page
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.pushState({}, '', url);

      setCurrentPage('app'); // Go inside the system directly
    } catch (err: any) {
      console.error(err);
      setError('Erro ao ativar acesso com Google: ' + (err.message || 'Verifique seus dados ou tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const finalEmail = reqEmail.toLowerCase().trim();
      const finalPassword = reqPassword;

      // 1. Create the Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, finalPassword);
      const newUser = userCredential.user;

      // 2. Initialize User Profile
      await setDoc(doc(db, 'userProfiles', newUser.uid), {
        name: reqName || finalEmail.split('@')[0],
        businessName: 'Minha Estética',
        ownerId: newUser.uid,
        email: finalEmail,
        role: 'user',
        plan: 'free',
        accentColor: 'rose',
        createdAt: new Date().toISOString(),
        setupComplete: true
      });

      // Salvar na coleção authorized_emails para dar acesso permanente (não-bloqueante)
      try {
        await setDoc(doc(db, 'authorized_emails', finalEmail), {
          email: finalEmail,
          createdAt: new Date().toISOString(),
          createdBy: 'obrigado_page_signup'
        });
      } catch (authEmailErr) {
        console.warn('Non-blocking authorized_emails error:', authEmailErr);
      }

      // Explicitly authorize session and notify
      setIsAuthorized(true);
      addNotification('Acesso ativado com sucesso! Seja muito bem-vinda!', 'info');
      
      // Remove 'page' from URL safely so user stays inside instead of being logged out
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.pushState({}, '', url);
      
      setCurrentPage('app'); // Go inside the system directly
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma conta cadastrada no OrbyFlow. Se você não lembra sua senha, use a opção "Esqueci a Senha" na tela de login.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta: ' + (err.message || 'Verifique os dados ou tente novamente.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F9] p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 sm:p-10 rounded-[40px] shadow-2xl border border-rose-50 w-full max-w-xl text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-rose-500 to-rose-300" />
        
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-100 mx-auto mb-6">
          <CheckCircle className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tighter bg-linear-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
          Pagamento Aprovado!
        </h1>
        <p className="text-gray-500 font-bold mb-8 text-sm">Crie sua senha ou ative seu acesso usando o Gmail.</p>
        
        {/* Google Activation Option */}
        <div className="mb-6">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleSignup}
            className="w-full bg-white border border-gray-200 p-5 rounded-3xl font-black flex items-center justify-center gap-3 shadow-md hover:bg-gray-50 transition-all active:scale-95 text-gray-700 text-sm uppercase tracking-wider disabled:opacity-50"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            Ativar Acesso com Google (Recomendado)
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-white px-4 text-gray-400">Ou use e-mail e senha</span>
          </div>
        </div>

        <form onSubmit={handleCreateAccount} className="space-y-4 text-left">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Nome Completo</label>
            <input 
              type="text" 
              required
              value={reqName}
              onChange={e => setReqName(e.target.value)}
              placeholder="Seu nome"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">E-mail de Acesso</label>
            <input 
              type="email" 
              required
              value={reqEmail}
              onChange={e => setReqEmail(e.target.value)}
              placeholder="exemplo@gmail.com"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Crie uma Senha</label>
            <input 
              type="password" 
              required
              min={6}
              value={reqPassword}
              onChange={e => setReqPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-rose-600 text-white p-5 rounded-3xl font-black uppercase tracking-wider text-sm shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {isSubmitting ? 'Gerando Acesso...' : 'Ativar Meu Acesso Agora'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="text-center mt-6 pt-6 border-t border-rose-50 flex flex-col gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Já ativou seu acesso? Ou esqueceu a senha?</p>
            <button 
              type="button"
              onClick={() => setCurrentPage('app')}
              className="text-rose-500 font-black text-xs uppercase tracking-widest hover:underline py-2"
            >
              Voltar para o Login
            </button>
          </div>
        </form>
        
        <p className="mt-8 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
          Bem-vinda ao OrbyFlow Systems
        </p>
      </motion.div>
    </div>
  );
};

const getAppProcedure = (app: Appointment | undefined, proceduresList: Procedure[]) => {
  if (!app) return undefined;
  if (app.procedureIds && app.procedureIds.length > 0) {
    const matchedProcs = app.procedureIds.map(id => proceduresList.find(p => p.id === id)).filter(Boolean) as Procedure[];
    if (matchedProcs.length > 0) {
      return {
        id: app.procedureId,
        name: matchedProcs.map(p => p.name).join(' + '),
        price: app.price || matchedProcs.reduce((sum, p) => sum + p.price, 0),
        duration: matchedProcs.reduce((sum, p) => sum + p.duration, 0)
      };
    }
  }
  return proceduresList.find(p => p.id === app.procedureId);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(IS_DEMO_INITIAL ? ({ uid: 'demo-user' } as any) : null);
  const [isAuthReady, setIsAuthReady] = useState(IS_DEMO_INITIAL);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(IS_DEMO_INITIAL ? true : null);
  const [activePlan, setActivePlan] = useState<string | null>(IS_DEMO_INITIAL ? 'orbyflow' : null);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [isRecheckingAccess, setIsRecheckingAccess] = useState(false);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAppId, setPaymentAppId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>(IS_DEMO_INITIAL ? MOCK_CLIENTS : []);
  const [lastImportedClientIds, setLastImportedClientIds] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>(IS_DEMO_INITIAL ? MOCK_APPOINTMENTS : []);
  const [procedures, setProcedures] = useState<Procedure[]>(IS_DEMO_INITIAL ? MOCK_PROCEDURES : []);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>(IS_DEMO_INITIAL ? MOCK_FINANCIAL : []);
  const [leads, setLeads] = useState<Lead[]>(IS_DEMO_INITIAL ? MOCK_LEADS : []);
  const [budgets, setBudgets] = useState<Budget[]>(IS_DEMO_INITIAL ? MOCK_BUDGETS : []);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(IS_DEMO_INITIAL ? getDemoUserProfile() as any : null);
  const [isInitialLoading, setIsInitialLoading] = useState(!IS_DEMO_INITIAL);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [justCreatedAppointment, setJustCreatedAppointment] = useState<{app: Appointment, client: Client} | null>(null);

  // --- DEMO MODE LOGIC ---
  const isDemo = useMemo(() => {
    if (user && user.uid !== 'demo-user') {
      return false;
    }
    return IS_DEMO_INITIAL;
  }, [user]);

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
      setMessageTemplates(MOCK_MESSAGE_TEMPLATES);
      
      // Force user state for demo
      setUser({ 
        uid: 'demo-user', 
        displayName: '', 
        email: 'demo@demo.com',
        emailVerified: true 
      } as any);
      
      setUserProfile(getDemoUserProfile() as any);
      
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
        const lowerEmail = u.email?.toLowerCase()?.trim() || '';
        if (lowerEmail === 'brefer@gmail.com' || lowerEmail === 'teus.rma@gmail.com') {
          setIsAuthorized(true);
          setActivePlan('Administrador');
        } else {
          try {
            // Check if user is signing up on the thank-you / transaction-complete page
            const isObrigadoUrl = window.location.search.includes('page=obrigado');
            
            const authRef = doc(db, 'authorized_emails', lowerEmail);
            const authSnap = await getDoc(authRef);
            let hasAccess = false;
            let planName: string | null = null;

            if (authSnap.exists()) {
              const authData = authSnap.data();
              const authStatus = authData?.status;
              const isBlocked = authData?.blocked === true;
              
              if (authStatus !== 'canceled' && authStatus !== 'refunded' && authStatus !== 'chargedback' && authStatus !== 'blocked' && !isBlocked) {
                hasAccess = true;
                planName = authData?.productName || 'orbyflow';
              }
            } else if (isObrigadoUrl) {
              hasAccess = true;
              planName = 'orbyflow';
            }

            // Fallback checking of userProfiles should ONLY be allowed if the email is not explicitly blocked/canceled in Firestore
            if (!hasAccess && !authSnap.exists()) {
              const profileRef = doc(db, 'userProfiles', u.uid);
              const profileSnap = await getDoc(profileRef);
              hasAccess = profileSnap.exists();
              if (hasAccess) {
                planName = 'orbyflow';
              }
            }
            setIsAuthorized(hasAccess);
            setActivePlan(hasAccess ? (planName || 'orbyflow') : null);
          } catch (e) {
            console.error('Error checking authorization:', e);
            const isObrigadoUrl = window.location.search.includes('page=obrigado');
            setIsAuthorized(isObrigadoUrl ? true : false);
            setActivePlan(isObrigadoUrl ? 'orbyflow' : null);
          }
        }
      } else {
        setIsAuthorized(null);
        setActivePlan(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, [isDemo]);

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
          const defaults: Omit<MessageTemplate, 'id'>[] = [
            { 
              name: '💖 Boas-vindas Acolhedor', 
              content: 'Olá, {cliente_nome} ✨ Seja muito bem-vinda! Ficamos radiantes com seu interesse em nossos cuidados. Preparamos tudo com muito carinho para que você tenha um momento de relaxamento e renovação único. Se tiver qualquer dúvida sobre o procedimento {procedimento}, estou aqui para te ajudar, viu? Um beijo e até breve! 🌸', 
              category: 'outros', 
              ownerId: user.uid,
              isDefault: false
            },
            { 
              name: '✨ Confirmação de Horário', 
              content: 'Olá, {cliente_nome}! ✨ Que alegria ter você conosco! Seu momento de cuidado para {procedimento} está confirmadíssimo no dia {data} às {hora}. 🌸\n\nPreparamos tudo com muito carinho para que você tenha uma experiência de relaxamento e renovação única aqui no {nome_espaco}.\n\nSe precisar desmarcar ou tiver qualquer dúvida, é só me chamar, tá bom? Estamos ansiosas para te receber! Um beijo! 💖\n\n📍 Endereço: {endereco}', 
              category: 'agendamento', 
              ownerId: user.uid,
              isDefault: true
            },
            { 
              name: '🌸 Lembrete de Carinho', 
              content: 'Oi, {cliente_nome}! 🌸 Passando para lembrar com todo carinho do nosso encontro amanhã, dia {data}, às {hora}.\n\nEstamos preparando seu momento de {procedimento} com muito amor e mal podemos esperar para te ver! ✨\n\nCaso precise de qualquer alteração no seu horário, nos avise por favor com um pouquinho de antecedência para liberarmos a vaga para outra cliente querida. Até amanhã! 💖', 
              category: 'lembrete', 
              ownerId: user.uid,
              isDefault: true
            }
          ];
          defaults.forEach(async data => {
            await addDoc(collection(db, 'messageTemplates'), data);
          });
        }
        setMessageTemplates(templates);
      }, (e) => handleFirestoreError(e, OperationType.LIST, 'messageTemplates')),
      onSnapshot(doc(db, 'userProfiles', user.uid), (s) => {
        if (s.exists()) {
          const profileData = { id: s.id, ...s.data() } as UserProfile;
          setUserProfile(profileData);
          try {
            localStorage.setItem('last_saved_user_profile', safeJsonStringify(stripUserProfile(profileData)));
          } catch (e) {
            console.error('Error saving user profile to local cache:', e);
          }
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
          try {
            localStorage.setItem('last_saved_user_profile', safeJsonStringify(stripUserProfile(defaultProfile)));
          } catch (e) {
            console.error('Error saving default user profile to local cache:', e);
          }
        }
        // After loading profile and setting up listeners, we can stop loading
        setTimeout(() => setIsInitialLoading(false), 800);
      }, (e) => handleFirestoreError(e, OperationType.GET, 'userProfile')),
    ];

    return () => unsubscribers.forEach(u => u());
  }, [user, isAuthorized]);

  const signOutUser = async () => {
    try {
      localStorage.removeItem('demo_mode_active');
      await signOut(auth);
      if (isDemo) {
        window.location.href = window.location.origin + window.location.pathname;
      }
    } catch (e) { console.error(e); }
  };

  const handleGoogleLogin = async (isRegisteringFlow: boolean = false) => {
    setIsGoogleLoggingIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userObj = result.user;
      const lowerEmail = userObj.email?.toLowerCase()?.trim() || '';
      
      // Check if they have a profile or authorized_email
      const authRef = doc(db, 'authorized_emails', lowerEmail);
      const authSnap = await getDoc(authRef);
      
      const profileRef = doc(db, 'userProfiles', userObj.uid);
      const profileSnap = await getDoc(profileRef);
      
      const hasAccess = authSnap.exists() || profileSnap.exists();
      
      if (!hasAccess) {
        // This is a new user!
        if (isRegisteringFlow) {
          // If they came from the "Criar Conta Grátis" Google login button:
          // We can automatically authorize them!
          try {
            await setDoc(doc(db, 'authorized_emails', lowerEmail), {
              email: lowerEmail,
              createdAt: new Date().toISOString(),
              createdBy: 'google_signup',
              productName: 'Plano Profissional',
              status: 'active'
            });
          } catch (err) {
            console.error('Error auto-authorizing Google signup:', err);
          }
          
          // Build default user profile (without phone, since we will collect it via GoogleOnboardingModal)
          const defaultProfile = {
            name: userObj.displayName || '',
            businessName: (userObj.displayName || '') + ' Estética',
            specialty: 'Estética',
            phone: '', // Will be registered with the modal as soon as they log in
            address: '',
            instagram: '',
            workingHours: { start: '08:00', end: '18:00' },
            workingDays: [1, 2, 3, 4, 5],
            budgetValidityDays: 7,
            clientLabel: 'Cliente',
            ownerId: userObj.uid,
            email: lowerEmail,
            plan: 'Plano Profissional',
            accentColor: 'rose',
            createdAt: new Date().toISOString(),
            setupComplete: false
          };
          
          await setDoc(doc(db, 'userProfiles', userObj.uid), defaultProfile);
          
          // Track event
          const eventId = Math.random().toString(36).substr(2, 9) + '_' + Date.now();
          await setDoc(doc(db, 'userEvents', eventId), {
            userId: userObj.uid,
            userEmail: lowerEmail,
            userName: userObj.displayName || '',
            eventType: 'google_registration_started',
            timestamp: new Date().toISOString(),
            details: {
              origin: 'Google Button'
            }
          });
          
          setIsAuthorized(true);
          setActivePlan('Plano Profissional');
          setUserProfile(defaultProfile as any);
          addNotification('Cadastro iniciado com sucesso! Confirme os dados abaixo para concluir seu acesso.', 'info');
        } else {
          // If they came from the "Entrar" tab (Login flow) but do NOT have an account yet:
          // We sign them out, show an error/warning message, and redirect them to the register tab!
          await signOut(auth);
          setIsRegisterMode(true);
          setAuthError('Você ainda não possui uma conta criada com o Google. Preencha seus dados abaixo ou use o botão do Google na aba "Criar Conta Grátis" para se cadastrar gratuitamente!');
        }
      } else {
        // They already have an account! Just log them in. 
        setIsAuthorized(true);
        setActivePlan(profileSnap.exists() ? (profileSnap.data()?.plan || 'Plano Profissional') : 'Plano Profissional');
        addNotification('Bem-vinda de volta ao OrbyFlow!', 'info');
      }
    } catch (e: any) {
      console.error(e);
      if (e.code !== 'auth/popup-closed-by-user') {
        setAuthError('Falha ao entrar com Google: ' + (e.message || 'Verifique seus dados ou tente novamente.'));
      }
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  const handleReCheckAccess = async () => {
    if (!user) return;
    setIsRecheckingAccess(true);
    const lowerEmail = user.email?.toLowerCase()?.trim() || '';
    try {
      const authRef = doc(db, 'authorized_emails', lowerEmail);
      const authSnap = await getDoc(authRef);
      let hasAccess = false;

      if (authSnap.exists()) {
        const authData = authSnap.data();
        const authStatus = authData?.status;
        const isBlocked = authData?.blocked === true;
        
        if (authStatus !== 'canceled' && authStatus !== 'refunded' && authStatus !== 'chargedback' && authStatus !== 'blocked' && !isBlocked) {
          hasAccess = true;
        }
      }

      // Fallback allowed only if they aren't explicitly blocked/canceled in Firestore
      if (!hasAccess && !authSnap.exists()) {
        const profileRef = doc(db, 'userProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        hasAccess = profileSnap.exists();
      }
      
      if (hasAccess) {
        setIsAuthorized(true);
        if (authSnap.exists()) {
          setActivePlan(authSnap.data()?.productName || 'orbyflow');
        } else {
          setActivePlan('orbyflow');
        }
        addNotification('Acesso liberado com sucesso! Bem-vinda!', 'info');
      } else {
        addNotification('Seu acesso ainda está sendo processado. Se já comprou, aguarde de 1 a 2 minutos ou contate o suporte.', 'warning');
      }
    } catch (e: any) {
      console.error('Erro ao re-verificar acesso:', e);
      addNotification('Erro ao verificar acesso: ' + (e.message || 'Tente novamente.'), 'error');
    } finally {
      setIsRecheckingAccess(false);
    }
  };
  
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [selectedNewAppProcedureIds, setSelectedNewAppProcedureIds] = useState<string[]>([]);
  
  // Voice confirmation states
  const [isVoiceConfirmModalOpen, setIsVoiceConfirmModalOpen] = useState(false);
  const [voiceParsedData, setVoiceParsedData] = useState<{
    clientName: string;
    procedureIds: string[];
    date: string;
    time: string;
    notes: string;
    reasoning?: string;
    isNewClient: boolean;
    matchedClientId?: string;
  } | null>(null);
  
  useEffect(() => {
    if (isNewAppModalOpen) {
      setSelectedNewAppProcedureIds([]);
    }
  }, [isNewAppModalOpen]);

  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceRecognitionRef, setVoiceRecognitionRef] = useState<any>(null);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState('');

  const stopAndProcessVoice = () => {
    if (voiceRecognitionRef) {
      voiceRecognitionRef.stop();
    }
  };

  const handleVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addNotification('Reconhecimento de voz não é suportado pelo seu navegador.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    setVoiceRecognitionRef(recognition);
    setIsListeningVoice(true);
    setLiveVoiceTranscript('');
    
    // Track voice feature engagement
    logUserEvent('voice_record_start');

    let finalTranscript = '';
    let hasError = false;

    recognition.onstart = () => {};

    recognition.onresult = (event: any) => {
      let currentResult = '';
      for (let i = 0; i < event.results.length; ++i) {
        currentResult += event.results[i][0].transcript + ' ';
      }
      finalTranscript = currentResult.trim();
      setLiveVoiceTranscript(finalTranscript);
    };

    recognition.onerror = (e: any) => {
      hasError = true;
      setIsListeningVoice(false);
      if (e.error === 'not-allowed') {
        addNotification('Acesso ao microfone recusado. Libere a permissão para ditar.', 'warning');
      } else {
        addNotification('Gravação interrompida ou microfone não detectado.', 'warning');
      }
    };

    recognition.onend = async () => {
      setIsListeningVoice(false);
      
      if (hasError) {
        return;
      }

      if (!finalTranscript) {
        addNotification('Nenhuma voz detectada. Por favor, fale seu agendamento.', 'warning');
        return;
      }

      setVoiceProcessing(true);
      logUserEvent('voice_record_success', { textLength: finalTranscript.length });

      try {
        const today = new Date();
        const ptDays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        const currentDayStr = ptDays[today.getDay()];
        const currentTimeStr = today.toTimeString().split(' ')[0].substring(0, 5);

        const response = await fetch('/api/gemini/parse-scheduling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: finalTranscript,
            contextDate: format(today, 'yyyy-MM-dd'),
            contextDayOfWeek: currentDayStr,
            contextTime: currentTimeStr
          })
        });

        const resData = await response.json();
        if (resData.status === 'success' && resData.data) {
          const { clientName, procedureName, procedureNames, date, time, notes } = resData.data;

          // Find the matching procedures in procedures list
          const parsedProcs: string[] = [];
          if (procedureNames && Array.isArray(procedureNames)) {
            procedureNames.forEach((pName: string) => {
              const found = procedures.find(p => (p.name || '').toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes((p.name || '').toLowerCase()));
              if (found) {
                parsedProcs.push(found.id);
              }
            });
          } else if (procedureName) {
            const found = procedures.find(p => (p.name || '').toLowerCase().includes(procedureName.toLowerCase()) || procedureName.toLowerCase().includes((p.name || '').toLowerCase()));
            if (found) {
              parsedProcs.push(found.id);
            }
          }

          // Check if it's an existing client
          let matchedClientId = '';
          let isNewClient = true;
          if (clientName) {
            const matchedClient = clients.find(c => (c.name || '').toLowerCase().includes(clientName.toLowerCase()) || clientName.toLowerCase().includes((c.name || '').toLowerCase()));
            if (matchedClient) {
              matchedClientId = matchedClient.id;
              isNewClient = false;
            }
          }

          // Fill in voiceParsedData state to open our custom Voice Confirmation dialog
          setVoiceParsedData({
            clientName: clientName || '',
            procedureIds: parsedProcs,
            date: date || format(today, 'yyyy-MM-dd'),
            time: time || format(today, 'HH:mm'),
            notes: notes || '',
            isNewClient: isNewClient,
            matchedClientId: matchedClientId,
            reasoning: resData.data.reasoning || ''
          });
          
          setIsVoiceConfirmModalOpen(true);

          const rReason = resData.data.reasoning || 'Ditado interpretado com sucesso! Revise os dados abaixo.';
          addNotification('IA: ' + rReason, 'info');
        } else {
          addNotification(resData.message || 'Erro ao processar áudio.', 'warning');
        }
      } catch (err) {
        addNotification('Erro ao comunicar com a IA para estruturar agendamento.', 'error');
      } finally {
        setVoiceProcessing(false);
      }
    };

    recognition.start();
  };
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewFollowUpModalOpen, setIsNewFollowUpModalOpen] = useState(false);
  const [clientStep, setClientStep] = useState(1);
  const [selectedDateForNewApp, setSelectedDateForNewApp] = useState(new Date());
  
  // Recurrence States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]); // 0-6
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date' | 'never'>('count');
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(addMonths(new Date(), 1));
  
  const [emailInput, setEmailInput] = useState('');

  // Onboarding Beta Registration States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regProfession, setRegProfession] = useState('Estética');
  const [regCityState, setRegCityState] = useState('');
  const [regObjective, setRegObjective] = useState('');
  const [regPain, setRegPain] = useState('');
  const [regOrigin, setRegOrigin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [consentWhatsApp, setConsentWhatsApp] = useState(true);
  const [consentMeeting, setConsentMeeting] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Behavioral telemetries (Lean Startup tracking)
  const logUserEvent = async (eventType: string, details: any = {}) => {
    if (isDemo || !user) return;
    try {
      const eventId = Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      await setDoc(doc(db, 'userEvents', eventId), {
        userId: user.uid,
        userEmail: user.email,
        userName: userProfile?.name || user.displayName || '',
        eventType,
        timestamp: new Date().toISOString(),
        details
      });
    } catch (err) {
      console.warn('Silent warning - Failed to log event:', err);
    }
  };

  const handleBetaRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsRegistering(true);

    if (regPassword.length < 6) {
      setAuthError('A senha cadastrada deve conter no mínimo 6 caracteres.');
      setIsRegistering(false);
      return;
    }

    try {
      const email = regEmail.toLowerCase().trim();
      const password = regPassword;

      // 1. Create firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // 2. Build initial user profile
      const defaultProfile = {
        name: regName,
        businessName: regName + ' Estética',
        specialty: regProfession,
        phone: regPhone,
        address: regCityState,
        instagram: '',
        workingHours: { start: '08:00', end: '18:00' },
        workingDays: [1, 2, 3, 4, 5],
        budgetValidityDays: 7,
        clientLabel: 'Cliente',
        ownerId: newUser.uid,
        email: email,
        plan: 'Plano Profissional',
        accentColor: 'rose',
        createdAt: new Date().toISOString(),
        setupComplete: true,
        
        // Onboarding feedback context:
        betaProfession: regProfession,
        betaCityState: regCityState,
        betaObjective: regObjective,
        betaPain: regPain,
        betaOrigin: regOrigin,
        consentWhatsApp,
        consentMeeting,
      };

      await setDoc(doc(db, 'userProfiles', newUser.uid), defaultProfile);

      // 3. Mark authorized_emails directly so access is clean
      try {
        await setDoc(doc(db, 'authorized_emails', email), {
          email,
          createdAt: new Date().toISOString(),
          createdBy: 'beta_onboarding',
          productName: 'Plano Profissional',
          status: 'active'
        });
      } catch (authEmailErr) {
        console.warn('Authorized email registration warning:', authEmailErr);
      }

      // 4. Log behavioral tracking metrics
      const eventId = Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      await setDoc(doc(db, 'userEvents', eventId), {
        userId: newUser.uid,
        userEmail: email,
        userName: regName,
        eventType: 'completed_registration',
        timestamp: new Date().toISOString(),
        details: {
          profession: regProfession,
          cityState: regCityState,
          objective: regObjective,
          pain: regPain,
          origin: regOrigin,
          consentWhatsApp,
          consentMeeting,
        }
      });

      setIsAuthorized(true);
      setActivePlan('Plano Profissional');
      setUserProfile(defaultProfile as any);
      addNotification('Cadastro concluído com sucesso! Bem-vinda ao OrbyFlow!', 'info');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está sendo utilizado por outro usuário.');
      } else {
        setAuthError('Erro ao cadastrar. ' + (error.message || 'Verifique seus dados.'));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Detect email from URL (useful for Kiwify redirects)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || params.get('customer_email');
    if (emailParam) {
      setEmailInput(emailParam);
    }
  }, []);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isKiwifyFlow, setIsKiwifyFlow] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Parse URL for pre-filled email
  useEffect(() => {
    const savedEmail = localStorage.getItem('last_login_email');
    if (savedEmail) {
      setEmailInput(savedEmail);
    }

    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam && !emailParam.includes('${')) {
      setEmailInput(emailParam.toLowerCase().trim());
      setIsKiwifyFlow(true);
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const email = emailInput.toLowerCase().trim();
    const password = passwordInput; 
    
    if (password.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      if (rememberMe) {
        localStorage.setItem('last_login_email', email);
      } else {
        localStorage.removeItem('last_login_email');
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setAuthError('Usuário não encontrado ou senha incorreta. Se você é novo, aguarde a liberação do seu acesso.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('O login por e-mail não está ativado no Firebase Console.');
      } else {
        setAuthError('Erro ao entrar. ' + error.message);
      }
    }
  };

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [isResetSending, setIsResetSending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleOpenResetModal = () => {
    setResetEmailInput(emailInput || '');
    setResetError(null);
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPasswordWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmailInput.toLowerCase().trim();
    if (!email) {
      setResetError('Por favor, digite o seu e-mail.');
      return;
    }
    setIsResetSending(true);
    setResetError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      addNotification('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam.', 'info');
      setIsResetPasswordModalOpen(false);
      setResetEmailInput('');
    } catch (error: any) {
      let friendlyError = error.message;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        friendlyError = 'Este e-mail não está cadastrado ou liberado no sistema.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyError = 'Por favor, insira um e-mail válido.';
      }
      setResetError('Erro ao enviar e-mail: ' + friendlyError);
    } finally {
      setIsResetSending(false);
    }
  };

  const [currentPage, setCurrentPage] = useState<'app' | 'obrigado'>('app');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'obrigado') {
      setCurrentPage('obrigado');
    }
  }, []);

const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
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

  const handleMarkAsPaid = (id: string) => {
    setPaymentAppId(id);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (amount: number, method: any = 'pix', isPartial: boolean = false) => {
    if (!paymentAppId || (!user && !isDemo)) return;
    const id = paymentAppId;
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const client = clients.find(c => c.id === app.clientId);
    const proc = getAppProcedure(app, procedures);

    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { 
        ...a, 
        isPaid: !isPartial, 
        paidAmount: (a.paidAmount || 0) + amount,
        paymentMethod: method
      } : a));
      
      const entry: FinancialEntry = {
        id: Math.random().toString(36).substr(2, 9),
        description: `Pagamento ${isPartial ? 'Parcial' : ''}: ${client?.name} (${proc?.name})`,
        amount: amount,
        date: new Date().toISOString(),
        type: 'receita',
        category: 'Serviços',
        appointmentId: id,
        paymentMethod: method,
        ownerId: 'demo-user'
      };
      setFinancialEntries(prev => [...prev, entry]);
      setIsPaymentModalOpen(false);
      setPaymentAppId(null);
      addNotification(`Pagamento de ${formatCurrency(amount)} registrado!`, 'info');
      return;
    }

    try {
      const newPaidAmount = (app.paidAmount || 0) + amount;
      const isActuallyPaid = !isPartial && newPaidAmount >= app.price;
      
      await updateDoc(doc(db, 'appointments', id), { 
        isPaid: isActuallyPaid,
        paidAmount: newPaidAmount,
        paymentMethod: method
      });

      await addDoc(collection(db, 'financialEntries'), {
        description: `Pagamento ${isPartial ? 'Parcial' : ''}: ${client?.name} (${proc?.name})`,
        amount: amount,
        date: new Date().toISOString(),
        type: 'receita',
        category: 'Serviços',
        appointmentId: id,
        paymentMethod: method,
        ownerId: user.uid
      });
      
      addNotification(`Pagamento de ${formatCurrency(amount)} registrado!`, 'info');
      setIsPaymentModalOpen(false);
      setPaymentAppId(null);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'payment'); }
  };

  const handleUndoMarkAsPaid = async (id: string) => {
    if (isDemo) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmado', isPaid: false, paidAmount: 0 } : a));
      setFinancialEntries(prev => prev.filter(e => e.appointmentId !== id));
      return;
    }
    try {
      await updateDoc(doc(db, 'appointments', id), { status: 'confirmado', isPaid: false, paidAmount: 0 });
      const entries = financialEntries.filter(e => e.appointmentId === id);
      for (const entry of entries) {
        await deleteDoc(doc(db, 'financialEntries', entry.id));
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'undo-payment'); }
  };

  const handleAddAppointment = async (app: Appointment) => {
    await handleAddAppointments([app]);
  };

  const handleAddAppointments = async (apps: Appointment[], preResolvedClient?: Client) => {
    if (apps.length === 0) return;
    const client = preResolvedClient || clients.find(c => c.id === apps[0].clientId);
    
    if (isDemo) {
      const newApps = apps.map(app => ({ ...app, id: Math.random().toString(36).substr(2, 9) }));
      setAppointments(prev => [...prev, ...newApps]);
      setIsNewAppModalOpen(false);
      addNotification(`${apps.length > 1 ? `${apps.length} agendamentos salvos` : 'Agendamento salvo'} com sucesso! (Modo Demo)`, 'info');
      if (client) setJustCreatedAppointment({ app: newApps[0], client });
      return;
    }
    if (!user) return;
    try {
      const promises = apps.map(app => {
        const { id, ...data } = app;
        return addDoc(collection(db, 'appointments'), { ...data, ownerId: user.uid, createdAt: new Date().toISOString() });
      });
      const docRefs = await Promise.all(promises);
      setIsNewAppModalOpen(false);
      addNotification(`${apps.length > 1 ? `${apps.length} agendamentos salvos` : 'Agendamento salvo'} com sucesso!`, 'info');
      if (client) setJustCreatedAppointment({ app: { ...apps[0], id: docRefs[0].id }, client });
      
      // Track retention/behavior metric
      await logUserEvent('create_appointment', { count: apps.length });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'appointments'); }
  };

  const handleAddClient = async (client: Client) => {
    if (isDemo) {
      const ensuredId = client.id || Math.random().toString(36).substr(2, 9);
      setClients(prev => [...prev, { ...client, id: ensuredId }]);
      setIsNewClientModalOpen(false);
      addNotification('Registro criado com sucesso! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = client;
      const ensuredId = id || Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'clients', ensuredId), { ...data, ownerId: user.uid });
      setIsNewClientModalOpen(false);
      addNotification('Registro criado com sucesso!', 'info');
      
      // Track registration/behavior metric
      await logUserEvent('create_client');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'clients'); }
  };

  const handleImportClients = async (importedClients: Omit<Client, 'id'>[]) => {
    if (isDemo) {
      const newClients: Client[] = importedClients.map(c => ({
        ...c,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: c.createdAt || new Date().toISOString()
      }));
      setClients(prev => [...prev, ...newClients]);
      setLastImportedClientIds(newClients.map(c => c.id));
      addNotification(`${newClients.length} ${cLabel.toLowerCase()}s importadas com sucesso! (Modo Demo)`, 'info');
      return;
    }
    if (!user) return;
    try {
      const dbCollection = collection(db, 'clients');
      // For performance and limits safety, import in concurrent batches of size 30
      const chunks: Omit<Client, 'id'>[][] = [];
      for (let i = 0; i < importedClients.length; i += 30) {
        chunks.push(importedClients.slice(i, i + 30));
      }
      
      const importedIds: string[] = [];
      for (const chunk of chunks) {
        const batchIds = await Promise.all(chunk.map(async (c) => {
          const { id, ...data } = c as any;
          const docRef = await addDoc(dbCollection, {
            ...data,
            ownerId: user.uid,
            createdAt: c.createdAt || new Date().toISOString()
          });
          return docRef.id;
        }));
        importedIds.push(...batchIds);
      }
      setLastImportedClientIds(importedIds);
      addNotification(`${importedClients.length} ${cLabel.toLowerCase()}s importadas com sucesso!`, 'info');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'clients');
      throw e;
    }
  };

  const handleUndoImport = async () => {
    if (lastImportedClientIds.length === 0) return;
    
    showConfirm(
      'Desfazer Importação',
      `Tem certeza que deseja remover as ${lastImportedClientIds.length} ${cLabel.toLowerCase()}s importadas na última sessão?`,
      async () => {
        if (isDemo) {
          setClients(prev => prev.filter(c => !lastImportedClientIds.includes(c.id)));
          addNotification(`${lastImportedClientIds.length} ${cLabel.toLowerCase()}s removidas de sua lista. (Modo Demo)`, 'warning');
          setLastImportedClientIds([]);
          return;
        }
        
        try {
          const chunks: string[][] = [];
          for (let i = 0; i < lastImportedClientIds.length; i += 30) {
            chunks.push(lastImportedClientIds.slice(i, i + 30));
          }
          
          for (const chunk of chunks) {
            await Promise.all(chunk.map(async (id) => {
              await deleteDoc(doc(db, 'clients', id));
            }));
          }
          
          addNotification(`${lastImportedClientIds.length} ${cLabel.toLowerCase()}s importadas foram removidas.`, 'warning');
          setLastImportedClientIds([]);
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, 'clients/undo_batch');
        }
      }
    );
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
      const newTemplate = { ...template, id: Math.random().toString(36).substr(2, 9) };
      setMessageTemplates(prev => {
        let list = prev;
        if (newTemplate.isDefault) {
          list = list.map(t => t.category === newTemplate.category ? { ...t, isDefault: false } : t);
        }
        return [...list, newTemplate];
      });
      return;
    }
    if (!user) return;
    try {
      const { id, ...data } = template;
      if (template.isDefault) {
        const others = messageTemplates.filter(t => t.category === template.category && t.isDefault);
        for (const other of others) {
          await updateDoc(doc(db, 'messageTemplates', other.id), { isDefault: false });
        }
      }
      await addDoc(collection(db, 'messageTemplates'), { ...data, ownerId: user.uid });
      addNotification('Modelo de mensagem criado!', 'info');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'messageTemplates'); }
  };

  const handleUpdateMessageTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    if (isDemo) {
      setMessageTemplates(prev => {
        let list = prev;
        if (updates.isDefault) {
          const current = prev.find(t => t.id === id);
          const cat = updates.category || current?.category;
          list = list.map(t => t.category === cat ? { ...t, isDefault: false } : t);
        }
        return list.map(t => t.id === id ? { ...t, ...updates } : t);
      });
      return;
    }
    try {
      if (updates.isDefault) {
        const current = messageTemplates.find(t => t.id === id);
        const cat = updates.category || current?.category;
        const others = messageTemplates.filter(t => t.id !== id && t.category === cat && t.isDefault);
        for (const other of others) {
          await updateDoc(doc(db, 'messageTemplates', other.id), { isDefault: false });
        }
      }
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
      try {
        const currentLocal = localStorage.getItem('last_saved_user_profile');
        const currentParsed = currentLocal ? JSON.parse(currentLocal) : {};
        localStorage.setItem('last_saved_user_profile', safeJsonStringify(stripUserProfile({ ...currentParsed, ...updates })));
      } catch (err) {
        console.error('Error caching demo profile updates:', err);
      }
      addNotification('Configurações salvas! (Modo Demo)', 'info');
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'userProfiles', user.uid), updates, { merge: true });
      try {
        const currentLocal = localStorage.getItem('last_saved_user_profile');
        const currentParsed = currentLocal ? JSON.parse(currentLocal) : {};
        localStorage.setItem('last_saved_user_profile', safeJsonStringify(stripUserProfile({ ...currentParsed, ...updates })));
      } catch (err) {
        console.error('Error caching profile updates:', err);
      }
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
    const proc = getAppProcedure(app, procedures);
    if (!client) return;

    let template = '';
    if (type === 'confirmation') {
      const t = messageTemplates.find(mt => mt.category === 'agendamento' && mt.isDefault) || messageTemplates.find(mt => mt.category === 'agendamento');
      template = t?.content || userProfile?.confirmationMessageTemplate || DEFAULT_CONFIRMATION_TEMPLATE;
    } else if (type === 'reminder') {
      const t = messageTemplates.find(mt => mt.category === 'lembrete' && mt.isDefault) || messageTemplates.find(mt => mt.category === 'lembrete');
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

    openWhatsApp(client.phone || '', message, userProfile?.whatsappPrefix || '55');
  };

  const isAdminUser = useMemo(() => {
    const email = user?.email?.toLowerCase()?.trim() || '';
    return email === 'teus.rma@gmail.com' || email === 'brefer@gmail.com';
  }, [user]);

  const menuItems = useMemo(() => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
      { id: 'clientes', label: csLabel, icon: Users },
      { id: 'prospeccao', label: 'Crescimento', icon: TrendingUp },
      { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
      { id: 'servicos', label: 'Serviços', icon: Activity },
      { id: 'orcamentos', label: 'Orçamentos', icon: FileText },
      { id: 'follow-up', label: 'Follow-up', icon: BellRing },
      { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
      { id: 'pagamentos', label: 'Controle de Pagamentos', icon: CreditCard },
      { id: 'mensagens', label: 'Mensagens Automáticas', icon: MessageCircle },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ];

    if (isAdminUser) {
      baseItems.push({ id: 'central-controle', label: 'Central de Controle 👑', icon: Settings });
    }

    return baseItems;
  }, [csLabel, isAdminUser]);

  const renderContent = () => {
    switch (activeTab) {
      case 'central-controle': return (
        <AdminControlCenter onClose={() => setActiveTab('dashboard')} />
      );
      case 'dashboard': return (
        <Dashboard 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          onNavigateToAgenda={() => setActiveTab('agenda')} 
          onNavigateToConfig={() => setActiveTab('configuracoes')} 
          notificationHistory={notificationHistory}
          csLabel={csLabel}
          user={user}
          userProfile={userProfile}
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
          onEditClient={setEditingClient}
          cLabel={cLabel}
          csLabel={csLabel}
          userProfile={userProfile}
          onSendWhatsApp={handleSendWhatsApp}
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
          onImportClients={handleImportClients}
          lastImportedCount={lastImportedClientIds.length}
          onUndoImport={handleUndoImport}
          onClearUndo={() => setLastImportedClientIds([])}
        />
      );
      case 'prospeccao': return (
        <LeadsTab 
          leads={leads} 
          onUpdateStatus={handleUpdateLeadStatus} 
          onDelete={handleDeleteLead} 
          onAddLead={handleAddLead}
          userProfile={userProfile}
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
          onSendWhatsApp={handleSendWhatsApp}
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
          onEditBudget={setEditingBudget}
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
          userProfile={userProfile}
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
      case 'pagamentos': return (
        <PagamentosTab 
          appointments={appointments}
          clients={clients}
          procedures={procedures}
          onMarkAsPaid={handleMarkAsPaid}
          onUndoMarkAsPaid={handleUndoMarkAsPaid}
          onSendWhatsApp={handleSendWhatsApp}
          onOpenNewAppointment={(date) => {
            setSelectedDateForNewApp(date);
            setIsNewAppModalOpen(true);
          }}
          onEditAppointment={setEditingAppointment}
          onDeleteAppointment={handleDeleteAppointment}
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
          onNavigateToMessages={() => setActiveTab('mensagens')}
          activePlan={activePlan}
        />
      );
      default: return (
        <Dashboard 
          appointments={appointments} 
          clients={clients} 
          procedures={procedures} 
          onNavigateToAgenda={() => setActiveTab('agenda')} 
          onNavigateToConfig={() => setActiveTab('configuracoes')} 
          notificationHistory={notificationHistory}
          csLabel={csLabel}
          user={user}
          userProfile={userProfile}
          setIsNotificationsOpen={setIsNotificationsOpen}
          isNotificationsOpen={isNotificationsOpen}
          onSendWhatsApp={handleSendWhatsApp}
        />
      );
    }
  };

  if (currentPage === 'obrigado') {
    return <ObrigadoPage addNotification={addNotification} setCurrentPage={setCurrentPage} setIsAuthorized={setIsAuthorized} />;
  }

  // Smooth Loading Screen
  if ((!isAuthReady || (user && isInitialLoading)) && !isDemo) {
    return <LoadingScreen />;
  }

  if (!user && !isDemo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF9F9] p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-6 sm:p-10 rounded-[40px] shadow-2xl border border-rose-50 w-full max-w-md transition-all duration-300"
        >
          {/* Brand logo & title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-200 mx-auto mb-4">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black mb-1 uppercase tracking-tighter bg-linear-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent">
              OrbyFlow
            </h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
              Sua Agenda Inteligente 🚀
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-8 border border-gray-100/50">
            <button 
              type="button"
              onClick={() => { setIsRegisterMode(false); setAuthError(null); }}
              className={cn(
                "w-1/2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                !isRegisterMode ? "bg-white text-gray-850 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Entrar
            </button>
            <button 
              type="button"
              onClick={() => { setIsRegisterMode(true); setAuthError(null); }}
              className={cn(
                "w-1/2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                isRegisterMode ? "bg-white text-rose-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Criar Conta Grátis
            </button>
          </div>

          {isRegisterMode ? (
            <div className="space-y-6 text-left">
              {/* Google Register Button */}
              <button 
                type="button"
                disabled={isGoogleLoggingIn}
                onClick={() => handleGoogleLogin(true)}
                className="w-full bg-white border border-gray-150 hover:bg-gray-50 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xs active:scale-95 disabled:opacity-50 text-xs sm:text-sm text-gray-700"
              >
                {isGoogleLoggingIn ? (
                  <RefreshCcw className="w-5 h-5 animate-spin text-rose-500" />
                ) : (
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
                )}
                {isGoogleLoggingIn ? 'Iniciando Google...' : 'Cadastrar Grátis com Google'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-white px-4 text-gray-400 font-extrabold">Ou cadastrar com E-mail</span>
                </div>
              </div>

              <form onSubmit={handleBetaRegister} className="space-y-6">
                <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100/70 flex items-start gap-3.5">
                  <Sparkles className="text-rose-500 w-5 h-5 shrink-0 mt-1" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed">
                      Você terá acesso livre para organizar sua agenda, enviar lembretes e ditar agendamentos por voz. Como contrapartida, você concorda em nos fornecer feedbacks reais de uso pelo WhatsApp para co-criarmos a melhor ferramenta de estética do mercado! 💕
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-rose-400" /> Dados da Conta
                  </h3>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Nome Completo</label>
                    <input 
                      type="text" 
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Ex: Amanda Silva"
                      className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">WhatsApp de contato</label>
                    <input 
                      type="tel" 
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="Ex: (11) 98888-7777"
                      className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Seu melhor E-mail</label>
                    <input 
                      type="email" 
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="Ex: amanda@gmail.com"
                      className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Defina uma Senha</label>
                    <input 
                      type="password" 
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-inner"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Profissão ou Nicho</label>
                    <select 
                      value={regProfession}
                      onChange={e => setRegProfession(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer shadow-inner"
                    >
                      <option value="Estética">Esteticista / Clínica de Estética</option>
                      <option value="Design_Cílios_Sobrancelhas">Lash Designer / Sobrancelhas</option>
                      <option value="Fisioterapia">Fisioterapeuta</option>
                      <option value="Nutrição">Nutricionista</option>
                      <option value="Manicure_Pedicure">Nail Designer / Manicure</option>
                      <option value="Cabeleireira">Cabeleireira / Salão</option>
                      <option value="Outro">Outro Nicho de Negócio</option>
                    </select>
                  </div>
                </div>

                {/* Checkbox consents */}
                <div className="space-y-3 bg-gray-50 p-4 sm:p-5 rounded-3xl border border-gray-100">
                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={consentWhatsApp}
                      onChange={e => setConsentWhatsApp(e.target.checked)}
                      className="mt-0.5 rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-xs font-semibold text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
                      Concordo em fornecer feedbacks reais de uso pelo WhatsApp para co-criarmos a melhor ferramenta de estética do mercado! 💕
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={consentMeeting}
                      onChange={e => setConsentMeeting(e.target.checked)}
                      className="mt-0.5 rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-xs font-semibold text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
                      Aceito receber convites para bate-papo de melhoria e atualizações do sistema para evoluir a ferramenta.
                    </span>
                  </label>
                </div>

                {authError && (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <p className="text-rose-600 text-xs font-bold">{authError}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isRegistering}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isRegistering ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Finalizar Cadastro e Experimentar Grátis
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Google Button */}
              <button 
                type="button"
                disabled={isGoogleLoggingIn}
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-gray-150 hover:bg-gray-50 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                {isGoogleLoggingIn ? (
                  <RefreshCcw className="w-5 h-5 animate-spin text-rose-500" />
                ) : (
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
                )}
                {isGoogleLoggingIn ? 'Iniciando Google...' : 'Continuar com Google'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-white px-4 text-gray-400 font-black">Ou use seu e-mail</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="text-left">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-4">E-mail</label>
                  <input 
                    type="email" 
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="amanda@gmail.com"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs"
                    required
                  />
                </div>
                <div className="text-left">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-4">Senha</label>
                  <input 
                    type="password" 
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Sua senha secreta"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs"
                    required
                  />
                </div>

                {authError && (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-left">
                    <p className="text-rose-600 text-xs font-bold">{authError}</p>
                  </div>
                )}

                <div className="flex items-center justify-between px-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center",
                        rememberMe ? "bg-rose-500 border-rose-500" : "border-gray-200 bg-gray-50"
                      )}>
                        {rememberMe && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Lembrar-me</span>
                  </label>
                  <button 
                    type="button"
                    onClick={handleOpenResetModal}
                    className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-rose-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-rose-200 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-white" /> Entrar no Painel
                </button>
              </form>
            </div>
          )}

          {/* Cal.com / Appointments Invitation Block */}
          <div className="mt-8 bg-linear-to-r from-gray-50 to-rose-50/50 p-5 rounded-[28px] border border-rose-100/75 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Quer acelerar a evolução?
              </h4>
              <p className="text-[9px] text-gray-500 font-bold leading-normal">
                Clique aqui para conversar direto no WhatsApp do criador do OrbyFlow e compartilhar suas ideias de novas funções!
              </p>
            </div>
            <button 
              onClick={() => window.open('https://wa.me/5521969457083?text=Olá!+Gostaria+de+agendar+uma+conversa+sobre+o+OrbyFlow.', '_blank')}
              className="bg-white border hover:border-rose-400 hover:text-rose-600 text-rose-500 font-black px-4.5 py-3 rounded-xl text-[9px] uppercase tracking-widest transition-all shrink-0 shadow-xs active:scale-95"
            >
              Agendar Conversa 📆
            </button>
          </div>
        </motion.div>

        {isResetPasswordModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white p-8 rounded-[36px] shadow-2xl border border-rose-50 w-full max-w-sm relative text-center"
            >
              <button 
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
                id="close-reset-modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-sm">
                <Mail className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-2">Recuperar Senha</h3>
              <p className="text-xs text-gray-500 font-bold mb-6 leading-relaxed px-2">
                Digite o seu e-mail cadastrado. Um link seguro para redefinição de senha será enviado na hora.
              </p>

              <form onSubmit={handleResetPasswordWithEmail} className="space-y-4">
                <div className="text-left">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-4">E-mail Cadastrado</label>
                  <input 
                    type="email" 
                    value={resetEmailInput}
                    onChange={e => setResetEmailInput(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
                    required
                  />
                </div>

                {resetError && (
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-left">
                    <p className="text-rose-600 text-xs font-bold leading-normal">{resetError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-4 rounded-2xl text-xs uppercase tracking-wider transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={isResetSending}
                    className="w-1/2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isResetSending ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : 'Enviar Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
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
            className="w-full bg-rose-500 text-white p-4 rounded-2xl font-bold mb-3 shadow-lg shadow-rose-100 transition-all hover:bg-rose-600 active:scale-95"
          >
            Comprar Licença agora
          </button>

          <button 
            type="button"
            disabled={isRecheckingAccess}
            onClick={handleReCheckAccess}
            className="w-full bg-white border border-gray-200 text-gray-700 p-4 rounded-2xl font-bold mb-6 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
          >
            <RefreshCcw className={`w-4 h-4 ${isRecheckingAccess ? 'animate-spin' : ''}`} />
            {isRecheckingAccess ? 'Verificando...' : 'Verificar Acesso Novamente'}
          </button>

          <button 
            onClick={signOutUser}
            className="text-gray-400 text-xs font-bold uppercase hover:text-gray-600 transition-all block mx-auto"
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
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-white/90 backdrop-blur-xl px-6 sm:px-8 py-3.5 sm:py-4 rounded-[28px] sm:rounded-[32px] border border-blue-50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-8 duration-700 w-[90%] sm:w-auto max-w-md sm:max-w-none">
          <div className="flex flex-col gap-0.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Modo Demonstração</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Os dados serão resetados ao sair</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-slate-100" />
          <button 
            type="button"
            onClick={() => window.open(UPGRADE_URL, '_blank')}
            className="group relative overflow-hidden bg-[#050b1a] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-200/50 w-full sm:w-auto"
          >
            <span className="relative z-10 transition-colors group-hover:text-blue-200">Adquirir Versão Completa</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
          </button>
        </div>
      )}
      <NotificationCenter alerts={alerts} />
      {/* Modals (Placeholders for reconstruction) */}
      {isNewAppModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-8 pb-4 border-b border-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black text-gray-900">Novo Agendamento</h2>
              <button 
                onClick={() => setIsNewAppModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-8 pt-6 overflow-y-auto custom-scrollbar">
              {/* Intelligent Voice Dictation Bar */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-rose-500/5 to-amber-500/5 border border-rose-100 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center justify-center shrink-0">
                      {isListeningVoice ? (
                        <>
                          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                          <div className="bg-rose-500 text-white p-2 rounded-xl relative z-10">
                            <Mic className="w-4 h-4 animate-bounce" />
                          </div>
                        </>
                      ) : voiceProcessing ? (
                        <div className="bg-amber-500 text-white p-2 rounded-xl">
                          <Sparkles className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="bg-rose-100 text-rose-500 p-2 rounded-xl">
                          <Mic className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        Agendamento por Voz Inteligente
                      </h4>
                      <p className="text-[10px] text-gray-500 font-bold leading-tight">
                        {isListeningVoice ? (
                          liveVoiceTranscript ? (
                            <span className="italic text-rose-600 font-bold">“{liveVoiceTranscript}”</span>
                          ) : (
                            "Ouvindo... Fale agora e toque em Finalizar ao terminar."
                          )
                        ) : voiceProcessing ? (
                          "Analisando voz com Inteligência Artificial..."
                        ) : (
                          "Diga ex: \"Agendar Maria Silva amanhã às 14h para Limpeza de Pele\""
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={voiceProcessing}
                    onClick={isListeningVoice ? stopAndProcessVoice : handleVoiceDictation}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-xs",
                      isListeningVoice 
                        ? "bg-rose-500 text-white animate-pulse" 
                        : voiceProcessing
                          ? "bg-amber-100 text-amber-600 cursor-not-allowed"
                          : "bg-white text-gray-800 hover:bg-gray-50 border border-gray-100 shadow-sm active:scale-95"
                    )}
                  >
                    {isListeningVoice ? "Finalizar" : voiceProcessing ? "Lendo..." : "Gravar"}
                  </button>
                </div>

                {isListeningVoice && (
                  <div className="flex items-center gap-1 justify-center py-2 bg-rose-500/5 rounded-xl border border-rose-100/40">
                    <div className="h-3 w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="h-4.5 w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                    <div className="h-6 w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.5s]" />
                    <div className="h-4.5 w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="h-3 w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-2 animate-pulse">Sintonizando voz... fale agora</span>
                  </div>
                )}
              </div>

              <form 
                onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const notesStr = formData.get('notes') as string || '';
                const dateStr = formData.get('date') as string;
                const timeStr = formData.get('time') as string;
                let clientId = formData.get('clientId') as string;
                const clientSearch = formData.get('clientSearch') as string;
                
                if (!clientId && clientSearch) {
                  const match = clients.find(c => (c.name || '').toLowerCase() === clientSearch.toLowerCase());
                  if (match) clientId = match.id;
                }
                
                const sessionNumber = parseInt(formData.get('sessionNumber') as string) || 1;
                const totalSessions = parseInt(formData.get('totalSessions') as string) || (parseInt(formData.get('repeatCount') as string) || 1);
                
                if (!clientId) {
                  addNotification('Por favor, selecione uma cliente da lista.', 'error');
                  return;
                }
                
                const primaryProcedureId = selectedNewAppProcedureIds[0];
                if (!primaryProcedureId) {
                  addNotification('Por favor, selecione pelo menos um procedimento.', 'error');
                  return;
                }

                if (!dateStr || !timeStr) {
                  addNotification('Por favor, preencha todos os campos do agendamento.', 'error');
                  return;
                }

                // Update Client Label if provided
                const newLabel = formData.get('clientLabel') as string;
                const newLabelColor = formData.get('clientLabelColor') as string;
                if (newLabel || newLabelColor) {
                  const client = clients.find(c => c.id === clientId);
                  if (client && (client.label !== newLabel || client.labelColor !== newLabelColor)) {
                    await handleUpdateClient(clientId, { label: newLabel, labelColor: newLabelColor });
                  }
                }

                const baseDate = parseISO(`${dateStr}T${timeStr}:00`);
                if (!isValid(baseDate)) {
                  addNotification('Data ou horário inválido.', 'error');
                  return;
                }

                const calculatedTotalPrice = selectedNewAppProcedureIds.reduce((sum, pid) => {
                  const p = procedures.find(proc => proc.id === pid);
                  return sum + (p ? p.price : 0);
                }, 0);

                const appsToCreate: Appointment[] = [];

                if (isRecurring) {
                  // Generate multiple dates
                  let current = new Date(baseDate);
                  const maxTotal = recurrenceEndType === 'count' ? recurrenceCount : 50; 
                  const stopDate = recurrenceEndType === 'date' ? recurrenceEndDate : addMonths(baseDate, 12);

                  while (appsToCreate.length < maxTotal) {
                    let shouldAdd = false;
                    if (recurrenceFreq === 'daily') {
                      shouldAdd = true;
                    } else if (recurrenceFreq === 'weekly') {
                      const d = getDay(current);
                      if (recurrenceDays.length === 0 || recurrenceDays.includes(d)) {
                        shouldAdd = true;
                      }
                    } else if (recurrenceFreq === 'monthly') {
                      shouldAdd = true;
                    }

                    if (shouldAdd) {
                      appsToCreate.push({
                        id: Math.random().toString(36).substr(2, 9),
                        clientId,
                        procedureId: primaryProcedureId,
                        procedureIds: selectedNewAppProcedureIds,
                        date: current.toISOString(),
                        status: 'confirmado',
                        price: calculatedTotalPrice,
                        sessionNumber: appsToCreate.length + 1,
                        totalSessions: maxTotal,
                        notes: notesStr
                      });
                    }

                    // Increment
                    if (recurrenceFreq === 'daily') {
                      current = addDays(current, recurrenceInterval);
                    } else if (recurrenceFreq === 'weekly') {
                      current = addDays(current, 1);
                      if (getDay(current) === getDay(baseDate)) {
                         if (recurrenceInterval > 1) {
                           current = addWeeks(current, recurrenceInterval - 1);
                         }
                      }
                    } else {
                      current = addMonths(current, recurrenceInterval);
                    }

                    if (recurrenceEndType === 'date' && current > stopDate) break;
                    if (appsToCreate.length >= maxTotal) break;
                    if (recurrenceEndType === 'never' && appsToCreate.length >= 12) break;
                  }
                } else {
                  appsToCreate.push({
                    id: Math.random().toString(36).substr(2, 9),
                    clientId,
                    procedureId: primaryProcedureId,
                    procedureIds: selectedNewAppProcedureIds,
                    date: baseDate.toISOString(),
                    status: 'confirmado',
                    price: calculatedTotalPrice,
                    sessionNumber,
                    totalSessions,
                    notes: notesStr
                  });
                }

                handleAddAppointments(appsToCreate);
                setIsNewAppModalOpen(false);
                setIsRecurring(false); // Reset recurrence
              }}
              className="space-y-4"
              id="new-appointment-form"
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
                      const labelInput = document.getElementById('client-label-input') as HTMLInputElement;
                      const labelColorInputs = document.getElementsByName('clientLabelColor') as NodeListOf<HTMLInputElement>;
                      
                      if (hiddenInput) {
                        hiddenInput.value = selected ? selected.id : '';
                      }
                      if (selected && labelInput) {
                        labelInput.value = selected.label || '';
                      }
                      if (selected && selected.labelColor) {
                        labelColorInputs.forEach(input => {
                          if (input.value === selected.labelColor) input.checked = true;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      // Se o usuário digitou mas não selecionou, tentamos encontrar uma correspondência exata
                      if (!(document.getElementById('selected-client-id') as HTMLInputElement).value) {
                         const match = clients.find(c => (c.name || '').toLowerCase() === (e.target.value || '').toLowerCase());
                         if (match) {
                           (document.getElementById('selected-client-id') as HTMLInputElement).value = match.id;
                           e.target.value = match.name;
                           
                           const labelInput = document.getElementById('client-label-input') as HTMLInputElement;
                           const labelColorInputs = document.getElementsByName('clientLabelColor') as NodeListOf<HTMLInputElement>;
                           if (labelInput) labelInput.value = match.label || '';
                           if (match.labelColor) {
                             labelColorInputs.forEach(input => {
                               if (input.value === match.labelColor) input.checked = true;
                             });
                           }
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase flex justify-between items-center">
                  <span>Procedimentos (Selecione um ou mais)</span>
                  {selectedNewAppProcedureIds.length > 0 && (
                    <span className="text-[10px] font-black text-rose-500 uppercase">
                      {selectedNewAppProcedureIds.length} selecionado(s)
                    </span>
                  )}
                </label>
                
                {/* Scrollable list of selectable procedures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1.5 border border-gray-100 rounded-2xl bg-gray-50/50">
                  {procedures.map(p => {
                    const isSelected = selectedNewAppProcedureIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedNewAppProcedureIds(prev => prev.filter(id => id !== p.id));
                          } else {
                            setSelectedNewAppProcedureIds(prev => [...prev, p.id]);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs font-bold shrink-0",
                          isSelected 
                            ? "bg-rose-50/70 border-rose-400 text-rose-700 shadow-xs" 
                            : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 active:scale-97"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn(
                            "w-3.5 h-3.5 rounded-md border flex items-center justify-center text-[8px] font-bold text-white shrink-0",
                            isSelected ? "bg-rose-500 border-rose-500" : "bg-white border-gray-300"
                          )}>
                            {isSelected && "✓"}
                          </div>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded-lg",
                          isSelected ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {formatCurrency(p.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Combined Total Display */}
                {selectedNewAppProcedureIds.length > 0 && (
                  <div className="flex justify-between items-center px-2 py-2 bg-rose-500/5 border border-rose-100/40 rounded-xl">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Valor Total Combinado:</span>
                    <span className="text-sm font-black text-rose-700">
                      {formatCurrency(
                        selectedNewAppProcedureIds.reduce((sum, pid) => {
                          const p = procedures.find(proc => proc.id === pid);
                          return sum + (p ? p.price : 0);
                        }, 0)
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Observações do Agendamento</label>
                <textarea 
                  name="notes" 
                  rows={2}
                  placeholder="Ex: Preferência por cor clara, trazer referência de design..." 
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 resize-none text-[11px] font-bold text-gray-700 placeholder:text-gray-300"
                />
              </div>

              <div className="pt-2 border-t border-gray-50">
                <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 block">Etiqueta & Personalização (Opcional)</label>
                <div className="space-y-3">
                  <input 
                    id="client-label-input"
                    name="clientLabel" 
                    type="text" 
                    placeholder="Ex: VIP, Fiel, Bronze..." 
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-xs font-bold uppercase tracking-tight"
                  />
                  <div className="flex gap-2 justify-between px-1">
                    {[
                      { name: 'Rose', color: '#f43f5e' },
                      { name: 'Azul', color: '#3b82f6' },
                      { name: 'Verde', color: '#10b981' },
                      { name: 'Aguardando', color: '#f59e0b' },
                      { name: 'Roxo', color: '#8b5cf6' },
                      { name: 'Cinza', color: '#6b7280' }
                    ].map((c) => (
                      <label key={c.color} className="relative cursor-pointer group">
                        <input type="radio" name="clientLabelColor" value={c.color} className="peer hidden" />
                        <div className="w-8 h-8 rounded-full transition-all border-2 border-transparent peer-checked:border-rose-500 peer-checked:scale-110 shadow-sm" style={{ backgroundColor: c.color }} />
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Número da Sessão</label>
                  <input 
                    name="sessionNumber" 
                    type="number" 
                    min={1}
                    defaultValue={1}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Total de Sessões</label>
                  <input 
                    name="totalSessions" 
                    type="number" 
                    min={1}
                    defaultValue={1}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" 
                  />
                </div>
              </div>

              {/* Repetição Section */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={cn(
                    "flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all",
                    isRecurring ? "text-rose-500" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <RotateCcw className={cn("w-4 h-4", isRecurring && "animate-spin-slow")} />
                  Repetir Agendamento
                </button>

                <AnimatePresence>
                  {isRecurring && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 mt-4"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Frequência</label>
                        <select 
                          value={recurrenceFreq}
                          onChange={(e) => setRecurrenceFreq(e.target.value as any)}
                          className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-sm font-bold"
                        >
                          <option value="daily">Repetir Diariamente</option>
                          <option value="weekly">Repetir Semanalmente</option>
                          <option value="monthly">Repetir Mensalmente</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase shrink-0">Repetir a cada</label>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 p-1">
                          <button 
                            type="button"
                            onClick={() => setRecurrenceInterval(Math.max(1, recurrenceInterval - 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-black text-sm">{recurrenceInterval}</span>
                          <button 
                            type="button"
                            onClick={() => setRecurrenceInterval(recurrenceInterval + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase">
                          {recurrenceFreq === 'daily' ? 'Dia(s)' : recurrenceFreq === 'weekly' ? 'Semana(s)' : 'Mês(es)'}
                        </span>
                      </div>

                      {recurrenceFreq === 'weekly' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase">Selecione os dias</label>
                          <div className="flex gap-1">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setRecurrenceDays(prev => 
                                    prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
                                  );
                                }}
                                className={cn(
                                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                                  recurrenceDays.includes(idx) 
                                    ? "bg-rose-500 text-white shadow-lg shadow-rose-100" 
                                    : "bg-gray-50 text-gray-400 border border-transparent hover:border-rose-100"
                                )}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Duração</label>
                        
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="radio" 
                              checked={recurrenceEndType === 'count'}
                              onChange={() => setRecurrenceEndType('count')}
                              className="hidden"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              recurrenceEndType === 'count' ? "border-rose-500 bg-rose-500" : "border-gray-200"
                            )}>
                              {recurrenceEndType === 'count' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 uppercase">Repetir por</span>
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-2 py-1 ml-auto">
                              <button 
                                type="button"
                                onClick={() => setRecurrenceCount(Math.max(1, recurrenceCount - 1))}
                                className="w-6 h-6 flex items-center justify-center text-gray-400"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-black">{recurrenceCount}</span>
                              <button 
                                type="button"
                                onClick={() => setRecurrenceCount(recurrenceCount + 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400">agendamentos</span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="radio" 
                              checked={recurrenceEndType === 'date'}
                              onChange={() => setRecurrenceEndType('date')}
                              className="hidden"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              recurrenceEndType === 'date' ? "border-rose-500 bg-rose-500" : "border-gray-200"
                            )}>
                              {recurrenceEndType === 'date' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 uppercase">Até uma data</span>
                            {recurrenceEndType === 'date' && (
                              <input 
                                type="date"
                                value={format(recurrenceEndDate, 'yyyy-MM-dd')}
                                onChange={(e) => setRecurrenceEndDate(parseISO(e.target.value))}
                                className="ml-auto bg-white border border-gray-100 rounded-lg p-1 text-[10px] font-bold"
                              />
                            )}
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="radio" 
                              checked={recurrenceEndType === 'never'}
                              onChange={() => setRecurrenceEndType('never')}
                              className="hidden"
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              recurrenceEndType === 'never' ? "border-rose-500 bg-rose-500" : "border-gray-200"
                            )}>
                              {recurrenceEndType === 'never' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <span className="text-[11px] font-bold text-gray-600 uppercase">Sem data final</span>
                            <Info className="w-3 h-3 text-gray-300 ml-auto" />
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
            </div>
          </motion.div>
        </div>
      )}

      {isVoiceConfirmModalOpen && voiceParsedData && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-8 pb-4 border-b border-gray-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-rose-100 text-rose-500 p-2.5 rounded-2xl">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 leading-tight">Confirmar Agendamento</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Inteligência Artificial por Voz</p>
                </div>
              </div>
              <button 
                onClick={() => setIsVoiceConfirmModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-8 pt-6 overflow-y-auto custom-scrollbar space-y-5">
              {voiceParsedData.reasoning && (
                <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-100/30 text-[10px] text-rose-600 font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Resumo do entendimento: <strong>{voiceParsedData.reasoning}</strong></span>
                </div>
              )}

              {/* Cliente Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Cliente</label>
                <div className="relative">
                  <input
                    type="text"
                    list="voice-clients-list"
                    value={voiceParsedData.clientName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const matched = clients.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
                      setVoiceParsedData(prev => prev ? {
                        ...prev,
                        clientName: name,
                        isNewClient: !matched,
                        matchedClientId: matched ? matched.id : ''
                      } : null);
                    }}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-sm font-bold placeholder:text-gray-300"
                    placeholder="Nome da cliente..."
                  />
                  <datalist id="voice-clients-list">
                    {clients.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  
                  {voiceParsedData.isNewClient ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-500/5 px-2.5 py-1 rounded-lg font-black border border-amber-500/10 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Não cadastrada: Criará nova cliente ao salvar
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-emerald-600 bg-emerald-500/5 px-2.5 py-1 rounded-lg font-black border border-emerald-500/10 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      ✓ Associar à Cliente cadastrada
                    </div>
                  )}
                </div>
              </div>

              {/* Data & Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                  <input
                    type="date"
                    value={voiceParsedData.date}
                    onChange={(e) => setVoiceParsedData(prev => prev ? { ...prev, date: e.target.value } : null)}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-sm font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Horário</label>
                  <input
                    type="time"
                    value={voiceParsedData.time}
                    onChange={(e) => setVoiceParsedData(prev => prev ? { ...prev, time: e.target.value } : null)}
                    className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-sm font-bold text-gray-700"
                  />
                </div>
              </div>

              {/* Procedimentos list with checks */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase flex justify-between items-center">
                  <span>Procedimentos Selecionados</span>
                  {voiceParsedData.procedureIds.length > 0 && (
                    <span className="text-[10px] font-black text-rose-500 uppercase">
                      {voiceParsedData.procedureIds.length} selecionado(s)
                    </span>
                  )}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1.5 border border-gray-100 rounded-2xl bg-gray-50/50">
                  {procedures.map(p => {
                    const isSelected = voiceParsedData.procedureIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const currentlySelected = voiceParsedData.procedureIds;
                          const nextSelected = isSelected
                            ? currentlySelected.filter(id => id !== p.id)
                            : [...currentlySelected, p.id];
                          setVoiceParsedData(prev => prev ? { ...prev, procedureIds: nextSelected } : null);
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs font-bold shrink-0",
                          isSelected 
                            ? "bg-rose-50/70 border-rose-400 text-rose-700 shadow-xs" 
                            : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 active:scale-97"
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn(
                            "w-3.5 h-3.5 rounded-md border flex items-center justify-center text-[8px] font-bold text-white shrink-0",
                            isSelected ? "bg-rose-500 border-rose-500" : "bg-white border-gray-300"
                          )}>
                            {isSelected && "✓"}
                          </div>
                          <span className="truncate">{p.name}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded-lg",
                          isSelected ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {formatCurrency(p.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Combined Total Display */}
                {voiceParsedData.procedureIds.length > 0 && (
                  <div className="flex justify-between items-center px-3 py-2.5 bg-rose-500/5 border border-rose-100/40 rounded-xl">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Valor total:</span>
                    <span className="text-sm font-black text-rose-700">
                      {formatCurrency(
                        voiceParsedData.procedureIds.reduce((sum, pid) => {
                          const p = procedures.find(proc => proc.id === pid);
                          return sum + (p ? p.price : 0);
                        }, 0)
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Observações do Agendamento</label>
                <textarea 
                  value={voiceParsedData.notes}
                  onChange={(e) => setVoiceParsedData(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={2}
                  placeholder="Se necessário, digite observações adicionais..." 
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 resize-none text-[11px] font-bold text-gray-700 placeholder:text-gray-300"
                />
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 flex flex-col sm:flex-row gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsVoiceConfirmModalOpen(false)} 
                className="flex-1 py-3 text-sm rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-150"
              >
                Cancelar
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  if (!voiceParsedData) return;
                  // Pre-fill the standard uncontrolled form elements
                  setSelectedNewAppProcedureIds(voiceParsedData.procedureIds);
                  
                  setTimeout(() => {
                    const formEl = document.getElementById('new-appointment-form');
                    if (formEl) {
                      if (voiceParsedData.date) {
                        const dateInput = formEl.querySelector('input[name="date"]') as HTMLInputElement;
                        if (dateInput) {
                          dateInput.value = voiceParsedData.date;
                          dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }
                      if (voiceParsedData.time) {
                        const timeInput = formEl.querySelector('input[name="time"]') as HTMLInputElement;
                        if (timeInput) {
                          timeInput.value = voiceParsedData.time;
                          timeInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }
                      if (voiceParsedData.clientName) {
                        const clientSearchInput = formEl.querySelector('input[name="clientSearch"]') as HTMLInputElement;
                        if (clientSearchInput) {
                          clientSearchInput.value = voiceParsedData.clientName;
                          clientSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
                          
                          if (voiceParsedData.matchedClientId) {
                            const hiddenInput = formEl.querySelector('#selected-client-id') as HTMLInputElement;
                            if (hiddenInput) {
                              hiddenInput.value = voiceParsedData.matchedClientId;
                              hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                          }
                        }
                      }
                      if (voiceParsedData.notes) {
                        const notesInput = formEl.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
                        if (notesInput) {
                          notesInput.value = voiceParsedData.notes;
                          notesInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }
                    }
                  }, 50);

                  setIsVoiceConfirmModalOpen(false);
                  addNotification('Campos preenchidos! Prossiga com ajustes manuais no formulário principal.', 'info');
                }} 
                className="flex-1 py-3 text-sm rounded-xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-100"
              >
                Editar Manualmente
              </button>

              <button 
                type="button" 
                onClick={async () => {
                  if (!voiceParsedData) return;
                  if (!voiceParsedData.clientName.trim()) {
                    addNotification('O nome da cliente é obrigatório.', 'warning');
                    return;
                  }
                  if (voiceParsedData.procedureIds.length === 0) {
                    addNotification('Por favor, selecione pelo menos um procedimento.', 'warning');
                    return;
                  }

                  try {
                    let finalClientId = '';
                    let tempClient: Client | undefined = undefined;
                    if (voiceParsedData.isNewClient) {
                      finalClientId = Math.random().toString(36).substr(2, 9);
                      const newClient: Client = {
                        id: finalClientId,
                        name: voiceParsedData.clientName,
                        lastName: '',
                        phone: '',
                        email: '',
                        city: '',
                        state: '',
                        country: 'BR',
                        birthday: '',
                        observations: 'Cadastrada por Voz Inteligente',
                        label: '',
                        labelColor: '',
                        createdAt: new Date().toISOString(),
                        preferences: {}
                      };
                      tempClient = newClient;
                      await handleAddClient(newClient);
                    } else {
                      finalClientId = voiceParsedData.matchedClientId || '';
                      tempClient = clients.find(c => c.id === finalClientId);
                    }

                    const baseDate = parseISO(`${voiceParsedData.date}T${voiceParsedData.time}:00`);
                    if (!isValid(baseDate)) {
                      addNotification('Data ou horário inválidos.', 'error');
                      return;
                    }

                    const totalPrice = voiceParsedData.procedureIds.reduce((sum, pid) => {
                      const p = procedures.find(proc => proc.id === pid);
                      return sum + (p ? p.price : 0);
                    }, 0);

                    const app: Appointment = {
                      id: Math.random().toString(36).substr(2, 9),
                      clientId: finalClientId,
                      procedureId: voiceParsedData.procedureIds[0] || '',
                      procedureIds: voiceParsedData.procedureIds,
                      date: baseDate.toISOString(),
                      status: 'confirmado',
                      price: totalPrice,
                      sessionNumber: 1,
                      totalSessions: 1,
                      notes: voiceParsedData.notes
                    };

                    await handleAddAppointments([app], tempClient);
                    setIsVoiceConfirmModalOpen(false);
                    setVoiceParsedData(null);
                  } catch (e: any) {
                    addNotification('Erro ao agendar: ' + (e.message || e), 'error');
                  }
                }}
                className="flex-1 bg-rose-500 text-white py-3 text-sm rounded-xl font-bold shadow-lg shadow-rose-200 active:scale-95 transition-all text-center"
              >
                Confirmar e Agendar
              </button>
            </div>
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
                  const proc = getAppProcedure(app, procedures);
                  
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

                  openWhatsApp(client.phone || '', message, userProfile?.whatsappPrefix || '55');
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl border border-rose-50 max-h-[90vh] overflow-y-auto my-auto"
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
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
                  label: formData.get('label') as string,
                  labelColor: formData.get('labelColor') as string,
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

                <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 duration-300", clientStep !== 1 && "hidden")}>
                  <div className="border-t border-gray-50 pt-4">
                    <label className="text-xs font-bold text-gray-400 uppercase block mb-3">Etiqueta do Cliente</label>
                    <div className="flex flex-col gap-3">
                      <input 
                        name="label" 
                        type="text" 
                        placeholder="Ex: Cliente Fixo, Bronze, VIP..." 
                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-sm font-bold"
                      />
                      <div className="flex gap-2">
                        {[
                          { name: 'Rose', color: '#f43f5e' },
                          { name: 'Azul', color: '#3b82f6' },
                          { name: 'Verde', color: '#10b981' },
                          { name: 'Aguardando', color: '#f59e0b' },
                          { name: 'Roxo', color: '#8b5cf6' },
                          { name: 'Cinza', color: '#6b7280' }
                        ].map((c) => (
                          <label key={c.color} className="relative cursor-pointer group">
                            <input type="radio" name="labelColor" value={c.color} className="peer hidden" defaultChecked={c.name === 'Rose'} />
                            <div className="w-8 h-8 rounded-full transition-all border-2 border-transparent peer-checked:border-rose-500 peer-checked:scale-110" style={{ backgroundColor: c.color }} />
                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
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

      <PartialPaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentAppId(null);
        }}
        onConfirm={handleConfirmPayment}
        appointment={appointments.find(a => a.id === paymentAppId) || null}
        procedure={procedures.find(p => p.id === (appointments.find(a => a.id === paymentAppId)?.procedureId)) || null}
      />

      {/* Edit Client Modal */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
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
                    label: formData.get('label') as string,
                    labelColor: formData.get('labelColor') as string,
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
                
                <div className="border-t border-gray-50 pt-4">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-3">Etiqueta do Cliente</label>
                  <div className="flex flex-col gap-3">
                    <input 
                      name="label" 
                      type="text" 
                      defaultValue={editingClient.label}
                      placeholder="Ex: Cliente Fixo, VIP..." 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 text-sm font-bold"
                    />
                    <div className="flex gap-2">
                      {[
                        { name: 'Rose', color: '#f43f5e' },
                        { name: 'Azul', color: '#3b82f6' },
                        { name: 'Verde', color: '#10b981' },
                        { name: 'Ambar', color: '#f59e0b' },
                        { name: 'Roxo', color: '#8b5cf6' },
                        { name: 'Cinza', color: '#6b7280' }
                      ].map((c) => (
                        <label key={c.color} className="relative cursor-pointer group">
                          <input type="radio" name="labelColor" value={c.color} className="peer hidden" defaultChecked={editingClient.labelColor === c.color || (!editingClient.labelColor && c.name === 'Rose')} />
                          <div className="w-8 h-8 rounded-full transition-all border-2 border-transparent peer-checked:border-rose-500 peer-checked:scale-110" style={{ backgroundColor: c.color }} />
                        </label>
                      ))}
                    </div>
                  </div>
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
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6">Editar Registro / Pagamento</h2>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const date = formData.get('date') as string;
                  const time = formData.get('time') as string;
                  const price = parseFloat(formData.get('price') as string) || 0;
                  const paidAmount = parseFloat(formData.get('paidAmount') as string) || 0;
                  const isPaid = formData.get('isPaid') === 'true' || paidAmount >= price;
                  
                  handleUpdateAppointment(editingAppointment.id, {
                    clientId: formData.get('clientId') as string,
                    date: `${date}T${time}:00`,
                    procedureId: formData.get('procedureId') as string,
                    status: formData.get('status') as AppointmentStatus,
                    sessionNumber: parseInt(formData.get('sessionNumber') as string) || 1,
                    totalSessions: parseInt(formData.get('totalSessions') as string) || 1,
                    price: price,
                    paidAmount: paidAmount,
                    isPaid: isPaid,
                    paymentMethod: formData.get('paymentMethod') as any
                  });
                  setEditingAppointment(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Cliente</label>
                  <select name="clientId" required defaultValue={editingAppointment?.clientId} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold">
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Serviço / Procedimento</label>
                    <select name="procedureId" required defaultValue={editingAppointment.procedureId} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold">
                      {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Status do Agendamento</label>
                    <select name="status" required defaultValue={editingAppointment.status} className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold">
                      <option value="pendente">Aguardando</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="realizado">Realizado</option>
                      <option value="faltou">Faltou (Follow-up)</option>
                      <option value="desmarcado">Desmarcado</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Sessão Atual</label>
                    <input 
                      name="sessionNumber" 
                      type="number" 
                      min={1} 
                      defaultValue={editingAppointment.sessionNumber || 1} 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Total Sessões</label>
                    <input 
                      name="totalSessions" 
                      type="number" 
                      min={1} 
                      defaultValue={editingAppointment.totalSessions || 1} 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Valor Total (R$)</label>
                    <input 
                      name="price" 
                      type="number" 
                      step="0.01" 
                      required 
                      defaultValue={editingAppointment.price || 0} 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold text-gray-900" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Valor Pago (R$)</label>
                    <input 
                      name="paidAmount" 
                      type="number" 
                      step="0.01" 
                      required 
                      defaultValue={editingAppointment.paidAmount || 0} 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold text-gray-900" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Status do Pagamento</label>
                    <select 
                      name="isPaid" 
                      required 
                      defaultValue={editingAppointment.isPaid ? 'true' : 'false'} 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold"
                    >
                      <option value="false">Pendente / Parcial</option>
                      <option value="true">Pago</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Forma de Pagamento</label>
                    <select 
                      name="paymentMethod" 
                      required 
                      defaultValue={editingAppointment.paymentMethod || 'pix'} 
                      className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:border-rose-300 font-bold"
                    >
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 sm:p-10 rounded-[40px] w-full max-w-md shadow-2xl relative border border-rose-50 max-h-[90vh] overflow-y-auto my-auto"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 sm:p-8 rounded-[40px] w-full max-w-md shadow-2xl relative border border-rose-50 max-h-[90vh] overflow-y-auto my-auto"
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

    <div className="flex flex-col w-full h-screen bg-[#fafafa] overflow-hidden">
      {/* Top Navigation Header */}
      <header className="h-16 lg:h-24 flex-shrink-0 bg-white border-b border-rose-50 flex items-center justify-between px-4 lg:px-10 z-[50] shadow-sm">
        <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-rose-600 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 flex-shrink-0 cursor-pointer hover:rotate-6 transition-transform" onClick={() => setActiveTab('dashboard')}>
            <ShieldCheck className="text-white w-5 h-5 lg:w-7 lg:h-7" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base lg:text-xl font-black tracking-tight text-gray-900 leading-none truncate">{userProfile?.businessName || 'MEU SISTEMA'}</span>
            <span className="text-[8px] lg:text-[10px] font-bold text-rose-500 uppercase tracking-[0.2em] mt-1 truncate">{userProfile?.specialty || 'OrbyFlow'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden lg:flex items-center gap-2 bg-gray-50 p-2 rounded-[28px] border border-gray-100 py-2">
            {menuItems.map((item) => (
              <div key={item.id} className="relative group/nav">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 rounded-2xl text-sm font-bold transition-all relative",
                    activeTab === item.id 
                      ? "bg-rose-500 text-white shadow-xl shadow-rose-200 scale-105" 
                      : "text-gray-400 hover:bg-white hover:text-rose-500 hover:shadow-md"
                  )}
                >
                  <item.icon className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
                </button>
                {/* Tooltip on Hover */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-[200] translate-y-1 group-hover/nav:translate-y-0 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl whitespace-nowrap shadow-2xl relative">
                    {item.label}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                </div>
              </div>
            ))}
          </nav>

          <div className="h-10 w-px bg-gray-100 mx-4 hidden lg:block" />

          <div className="relative group/logout">
            <button 
              onClick={signOutUser}
              className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl text-gray-300 hover:bg-rose-50 hover:text-red-500 hover:border-red-100 border border-transparent transition-all"
            >
              <Trash2 className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible transition-all duration-200 z-[200] translate-y-1 group-hover/logout:translate-y-0 pointer-events-none">
              <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl whitespace-nowrap shadow-2xl relative">
                Sair do Sistema
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-20 lg:pb-0">

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

        <div className="flex-1 overflow-y-auto p-6 lg:p-14 lg:pt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Google Onboarding completion modal if phone is missing and they logged in through Google auth */}
      <GoogleOnboardingModal
        isOpen={!!(user && isAuthorized && userProfile && !userProfile.phone && !isDemo)}
        userName={userProfile?.name || user?.displayName || ''}
        onSave={async (phone, profession) => {
          await handleUpdateProfile({
            phone,
            specialty: profession,
            businessName: (userProfile?.name || user?.displayName || '') + ' Estética'
          });
        }}
      />

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-rose-50 z-[180] lg:hidden flex items-center justify-around px-2 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] rounded-t-[32px]">
        {menuItems.slice(0, 4).concat(menuItems.slice(-1)).map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-2xl transition-all relative",
                isActive 
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200" 
                  : "text-gray-400 hover:text-rose-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter",
                isActive ? "text-white" : "text-gray-400"
              )}>
                {item.id === 'configuracoes' ? 'Menu' : item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  </div>
);
}
