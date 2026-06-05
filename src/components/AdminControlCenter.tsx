import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, 
  Activity, 
  Sparkles, 
  Search, 
  Phone, 
  MessageCircle, 
  UserCheck, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight, 
  Plus, 
  X, 
  Settings, 
  Info, 
  Zap, 
  ExternalLink,
  Percent,
  Compass
} from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { format, parseISO, isToday, isWithinInterval, subDays } from 'date-fns';

interface Props {
  onClose: () => void;
}

interface UserProfileData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  profession?: string;
  cityState?: string;
  objective?: string;
  pain?: string;
  origin?: string;
  consentWhatsApp?: boolean;
  consentMeeting?: boolean;
  createdAt?: any; // Firestore timestamp or string
}

interface UserEventData {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  eventName: string;
  meta?: any;
  timestamp: any;
}

interface CustomMetricRule {
  id: string;
  name: string;
  targetEvent: string;
  description: string;
  createdAt: string;
}

export const AdminControlCenter: React.FC<Props> = ({ onClose }) => {
  const [profiles, setProfiles] = useState<UserProfileData[]>([]);
  const [events, setEvents] = useState<UserEventData[]>([]);
  const [customMetricRules, setCustomMetricRules] = useState<CustomMetricRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState('all');
  const [painFilter, setPainFilter] = useState('all');

  // Custom Metric Creator Modal/Form states
  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricEvent, setNewMetricEvent] = useState('voice_record_start');
  const [newMetricDesc, setNewMetricDesc] = useState('');

  // active menu sub-section
  const [subTab, setSubTab] = useState<'metrics' | 'users' | 'kiwify' | 'custom-kpis'>('metrics');

  // Load real-time data from Firestore
  useEffect(() => {
    setLoading(true);

    const unsubProfiles = onSnapshot(collection(db, 'userProfiles'), (snapshot) => {
      const prolist: UserProfileData[] = [];
      snapshot.forEach((doc) => {
        prolist.push({ id: doc.id, ...doc.data() } as UserProfileData);
      });
      // Sort profiles by creation time descending if possible
      prolist.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setProfiles(prolist);
      setLoading(false);
    }, (error) => {
      console.error("Error loading user profiles: ", error);
      setLoading(false);
    });

    const unsubEvents = onSnapshot(collection(db, 'userEvents'), (snapshot) => {
      const eventlist: UserEventData[] = [];
      snapshot.forEach((doc) => {
        eventlist.push({ id: doc.id, ...doc.data() } as UserEventData);
      });
      eventlist.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return timeB.getTime() - timeA.getTime();
      });
      setEvents(eventlist);
    }, (error) => {
      console.error("Error loading user events: ", error);
    });

    const unsubCustomMetrics = onSnapshot(collection(db, 'customMetrics'), (snapshot) => {
      const metricRules: CustomMetricRule[] = [];
      snapshot.forEach((doc) => {
        metricRules.push({ id: doc.id, ...doc.data() } as CustomMetricRule);
      });
      setCustomMetricRules(metricRules);
    }, (error) => {
      console.error("Error loading custom metric rules: ", error);
    });

    return () => {
      unsubProfiles();
      unsubEvents();
      unsubCustomMetrics();
    };
  }, []);

  // Compute stats metrics
  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    
    // Group events by name
    const eventCounts: Record<string, number> = {};
    events.forEach(e => {
      eventCounts[e.eventName] = (eventCounts[e.eventName] || 0) + 1;
    });

    // Count user activations: At least 1 event or registers
    // Activation rate: users with at least 1 action beyond register or user profiles checking
    const activatedUserIds = new Set<string>();
    events.forEach(e => {
      if (e.userId && e.eventName !== 'beta_register_success') {
        activatedUserIds.add(e.userId);
      }
    });
    
    const activatedUsersCount = activatedUserIds.size;
    const activationRate = totalUsers > 0 ? Math.round((activatedUsersCount / totalUsers) * 100) : 0;

    // Daily active users (DAU) & Weekly active users (WAU)
    const activeTodayIds = new Set<string>();
    const activeThisWeekIds = new Set<string>();
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sevenDaysAgo = subDays(today, 7);

    events.forEach(e => {
      if (!e.userId) return;
      const evDate = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || 0);
      
      if (evDate >= startOfToday) {
        activeTodayIds.add(e.userId);
      }
      if (evDate >= sevenDaysAgo) {
        activeThisWeekIds.add(e.userId);
      }
    });

    // Check professions
    const professions: Record<string, number> = {};
    profiles.forEach(p => {
      const prof = p.profession || 'Desconhecido';
      professions[prof] = (professions[prof] || 0) + 1;
    });

    // Check pain points
    const pains: Record<string, number> = {};
    profiles.forEach(p => {
      const pain = p.pain || 'Outros';
      pains[pain] = (pains[pain] || 0) + 1;
    });

    // Check origins
    const origins: Record<string, number> = {};
    profiles.forEach(p => {
      const orig = p.origin || 'Outros';
      origins[orig] = (origins[orig] || 0) + 1;
    });

    // Consents
    const consentWhatsApp = profiles.filter(p => p.consentWhatsApp).length;
    const consentMeeting = profiles.filter(p => p.consentMeeting).length;

    return {
      totalUsers,
      activatedUsersCount,
      activationRate,
      dau: activeTodayIds.size,
      wau: activeThisWeekIds.size,
      eventCounts,
      professions,
      pains,
      origins,
      consentWhatsApp,
      consentMeeting
    };
  }, [profiles, events]);

  // Handle adding custom metrics rule
  const handleCreateCustomMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetricName.trim() || !newMetricEvent.trim()) return;

    try {
      await addDoc(collection(db, 'customMetrics'), {
        name: newMetricName,
        targetEvent: newMetricEvent,
        description: newMetricDesc,
        createdAt: new Date().toISOString()
      });
      setNewMetricName('');
      setNewMetricDesc('');
      setIsAddingMetric(false);
    } catch (err) {
      console.error("Error creating custom metric rule:", err);
    }
  };

  const handleDeleteCustomMetric = async (id: string) => {
    if (window.confirm('Excluir essa métrica personalizada?')) {
      try {
        await deleteDoc(doc(db, 'customMetrics', id));
      } catch (err) {
        console.error("Error deleting custom metric:", err);
      }
    }
  };

  // Filtered profiles for inspecting table
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const matchesSearch = 
        (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.phone || '').includes(searchQuery) ||
        (p.cityState?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesProfession = professionFilter === 'all' || p.profession === professionFilter;
      const matchesPain = painFilter === 'all' || p.pain === painFilter;

      return matchesSearch && matchesProfession && matchesPain;
    });
  }, [profiles, searchQuery, professionFilter, painFilter]);

  return (
    <div className="bg-[#FFF9F9] min-h-screen p-4 sm:p-8 font-sans text-gray-805">
      {/* Centered Premium Container */}
      <div className="max-w-7xl mx-auto bg-white rounded-[40px] shadow-2xl border border-rose-50 overflow-hidden min-h-[85vh] flex flex-col">
        
        {/* Header Block with high contrast and neat layout */}
        <div className="border-b border-gray-100 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-linear-to-r from-white to-rose-50/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Settings className="text-white w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-850">Central de Controle</h1>
                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Admin</span>
              </div>
              <p className="text-xs text-gray-500 font-bold leading-normal mt-0.5">Métricas de ativação, comportamento e diagnósticos de usuárias da plataforma.</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-600 font-black px-5 py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95"
          >
            Voltar ao Sistema
          </button>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2 gap-2">
          <button 
            onClick={() => setSubTab('metrics')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${subTab === 'metrics' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Activity className="w-4 h-4" /> Métricas Ativas
          </button>
          
          <button 
            onClick={() => setSubTab('users')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${subTab === 'users' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users className="w-4 h-4" /> Usuárias Cadastradas ({profiles.length})
          </button>

          <button 
            onClick={() => setSubTab('custom-kpis')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${subTab === 'custom-kpis' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Zap className="w-4 h-4" /> KPI Sandbox ({customMetricRules.length})
          </button>

          <button 
            onClick={() => setSubTab('kiwify')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${subTab === 'kiwify' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Percent className="w-4 h-4" /> Monetização (Kiwify)
          </button>
        </div>

        {/* Active Content Display Area */}
        <div className="p-6 sm:p-8 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando métricas...</span>
            </div>
          ) : (
            <>
              {/* METRICS DASHBOARD VIEW */}
              {subTab === 'metrics' && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Key KPIs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-linear-to-br from-white to-gray-50 border border-gray-100 p-6 rounded-3xl relative overflow-hidden shadow-xs">
                      <p className="text-gray-400 font-extrabold text-[9px] uppercase tracking-widest">Usuárias Inscritas</p>
                      <h2 className="text-4xl font-black text-gray-850 tracking-tight mt-1">{stats.totalUsers}</h2>
                      <p className="text-[10px] text-gray-500 font-bold mt-2 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-rose-500" /> Cadastros Ativos
                      </p>
                    </div>

                    <div className="bg-linear-to-br from-white to-rose-50/20 border border-rose-100/50 p-6 rounded-3xl relative overflow-hidden shadow-xs">
                      <p className="text-rose-500/80 font-extrabold text-[9px] uppercase tracking-widest">Ativação de Usuário</p>
                      <h2 className="text-4xl font-black text-rose-600 tracking-tight mt-1">{stats.activationRate}%</h2>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${stats.activationRate}%` }}></div>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold mt-2">Profissionais que executaram ações</p>
                    </div>

                    <div className="bg-linear-to-br from-white to-gray-50 border border-gray-100 p-6 rounded-3xl relative overflow-hidden shadow-xs">
                      <p className="text-gray-400 font-extrabold text-[9px] uppercase tracking-widest">Usuárias Ativas Hoje (DAU)</p>
                      <h2 className="text-4xl font-black text-gray-850 tracking-tight mt-1">{stats.dau}</h2>
                      <p className="text-[10px] text-gray-500 font-bold mt-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Em atividade hoje
                      </p>
                    </div>

                    <div className="bg-linear-to-br from-white to-gray-50 border border-gray-100 p-6 rounded-3xl relative overflow-hidden shadow-xs">
                      <p className="text-gray-400 font-extrabold text-[9px] uppercase tracking-widest">Ativas na Semana (WAU)</p>
                      <h2 className="text-4xl font-black text-gray-850 tracking-tight mt-1">{stats.wau}</h2>
                      <p className="text-[10px] text-gray-500 font-bold mt-2">Engajamento nos últimos 7 dias</p>
                    </div>
                  </div>

                  {/* Onboarding Diagnostics Analysis (By Profession & Pain Challenges) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Professions Breakdown */}
                    <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-xs">
                      <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                        <Compass className="w-4 h-4 text-rose-500" /> Nicho de Profissão
                      </h3>
                      <div className="space-y-3.5">
                        {Object.entries(stats.professions).length > 0 ? (
                          Object.entries(stats.professions).map(([prof, val]) => {
                            const count = val as number;
                            const pct = Math.round((count / stats.totalUsers) * 100);
                            return (
                              <div key={prof} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-600">
                                  <span>{prof.replace(/_/g, ' ')}</span>
                                  <span>{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                                  <div className="bg-rose-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-400 font-bold py-6 text-center">Nenhum dado cadastrado.</p>
                        )}
                      </div>
                    </div>

                    {/* Challenges Breakdown */}
                    <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-xs">
                      <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                        <Activity className="w-4 h-4 text-rose-500" /> Desafio / Dor Principal
                      </h3>
                      <div className="space-y-3.5">
                        {Object.entries(stats.pains).length > 0 ? (
                          Object.entries(stats.pains).map(([pain, val]) => {
                            const count = val as number;
                            const pct = Math.round((count / stats.totalUsers) * 100);
                            return (
                              <div key={pain} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-gray-600">
                                  <span className="truncate max-w-[200px]" title={pain}>{pain}</span>
                                  <span>{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                                  <div className="bg-orange-400 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-400 font-bold py-6 text-center">Nenhum desafio registrado.</p>
                        )}
                      </div>
                    </div>

                    {/* Acquisition Traffic Channels */}
                    <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-xs">
                      <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                        <TrendingUp className="w-4 h-4 text-rose-500" /> Origem do Tráfego
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(stats.origins).length > 0 ? (
                          Object.entries(stats.origins).map(([orig, val]) => {
                            const count = val as number;
                            const pct = Math.round((count / stats.totalUsers) * 100);
                            return (
                              <div key={orig} className="flex items-center justify-between text-xs font-bold text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                                <span>{orig}</span>
                                <span className="text-rose-500">{count} contatos ({pct}%)</span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-gray-400 font-bold py-6 text-center">Nenhum dado de aquisição.</p>
                        )}
                        
                        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                          <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                            <span>Consentimento WhatsApp</span>
                            <span className="text-gray-700">{stats.consentWhatsApp} / {stats.totalUsers}</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                            <span>Autorização Reuniões</span>
                            <span className="text-gray-700">{stats.consentMeeting} / {stats.totalUsers}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Feature Telemetry Logs (Vocal search, schedule creation, client logs) */}
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                      <Sparkles className="text-rose-500 w-4.5 h-4.5" /> Popularidade das Funcionalidades & Telemetria AI
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Interactive comparison list */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-4">Engajamento acumulado por tipo de evento:</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-2xl">
                            <span className="font-bold text-gray-600">🎙️ Tentativa de Reconhecimento de Voz (`voice_record_start`)</span>
                            <span className="font-black text-rose-500">{stats.eventCounts['voice_record_start'] || 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-2xl">
                            <span className="font-bold text-gray-600">✅ Transcrições Inteligentes bem-sucedidas (`voice_record_success`)</span>
                            <span className="font-black text-green-600">{stats.eventCounts['voice_record_success'] || 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-2xl">
                            <span className="font-bold text-gray-600">🙋 Novas Fichas de Clientes salvas (`create_client`)</span>
                            <span className="font-black text-indigo-600">{stats.eventCounts['create_client'] || 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-2xl">
                            <span className="font-bold text-gray-600">📅 Agendamentos Feitos no Calendário (`create_appointment`)</span>
                            <span className="font-black text-orange-600">{stats.eventCounts['create_appointment'] || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Real time logs map */}
                      <div className="flex flex-col">
                        <p className="text-xs font-bold text-gray-500 mb-3">Últimas 5 ações coletadas em tempo real:</p>
                        <div className="bg-gray-50 p-4 rounded-3xl flex-1 space-y-2 overflow-y-auto max-h-[220px] border border-gray-100">
                          {events.length > 0 ? (
                            events.slice(0, 5).map((e) => {
                              const evDate = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp || 0);
                              return (
                                <div key={e.id} className="text-[11px] font-bold text-gray-650 bg-white p-2.5 rounded-xl border border-gray-100 flex items-start justify-between gap-2.5">
                                  <div>
                                    <span className="text-rose-500 font-extrabold">@{e.userEmail?.split('@')[0]}</span>
                                    <span className="text-gray-400"> disparou </span>
                                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[9px]">{e.eventName}</span>
                                  </div>
                                  <span className="text-[9px] text-gray-400 shrink-0">{format(evDate, 'HH:mm')}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-400 font-bold py-10 text-center">Nenhum evento registrado ainda.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* SEARCH & DETAILED USERS INSPECTION */}
              {subTab === 'users' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Search filters rail */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome, email ou WhatsApp..."
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>

                    <div>
                      <select 
                        value={professionFilter}
                        onChange={e => setProfessionFilter(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl p-3 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
                      >
                        <option value="all">Todas as Profissões</option>
                        <option value="Estética">Esteticistas</option>
                        <option value="Design_Cílios_Sobrancelhas">Lash Designers</option>
                        <option value="Fisioterapia">Fisioterapeutas</option>
                        <option value="Nutrição">Nutricionistas</option>
                        <option value="Manicure_Pedicure">Nail Designers</option>
                        <option value="Cabeleireira">Cabeleireiras</option>
                        <option value="Outro">Outras</option>
                      </select>
                    </div>

                    <div>
                      <select 
                        value={painFilter}
                        onChange={e => setPainFilter(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-150 rounded-2xl p-3 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
                      >
                        <option value="all">Todas as Dores</option>
                        <option value="Clientes esquecem e faltam">Clientes esquecem / faltas</option>
                        <option value="Perco muito tempo no WhatsApp">Perder tempo no WhatsApp</option>
                        <option value="Dificuldade de controlar o financeiro">Sem controle financeiro</option>
                        <option value="Quero agendar por voz rapidamente">Agendar por voz</option>
                        <option value="Dificuldade em reter ou atrair clientes">Atração e Retenção</option>
                        <option value="Outros">Outras dores</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto min-w-full">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-wider">Nome / E-mail</th>
                            <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-wider">Contato / Cidade</th>
                            <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-wider">Profissão</th>
                            <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-wider">Maior Dor / Desafio</th>
                            <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-gray-400 tracking-wider">Objetivo</th>
                            <th className="px-6 py-4 text-center text-[9px] font-black uppercase text-gray-400 tracking-wider">Ação WhatsApp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-650">
                          {filteredProfiles.length > 0 ? (
                            filteredProfiles.map((p) => {
                              const cleanPhone = p.phone ? p.phone.replace(/\D/g, '') : '';
                              const has55 = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
                              const waUrl = `https://api.whatsapp.com/send?phone=${has55}&text=Ol%C3%A1%20${encodeURIComponent(p.name || '')}%2C%20tudo%20bem%3F%20Aqui%20%C3%A9%20o%20 Mateus%20do%20OrbyFlow.%20Queria%20te%20dar%20boas%20vindas%20e%20te%20ouvir%20sobre%20sua%20experi%C3%AAncia%20no%20sistema%21`;

                              return (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="text-gray-800 font-extrabold text-sm">{p.name}</div>
                                    <div className="text-gray-400 text-[10px] lowercase">{p.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-gray-600">{p.phone}</div>
                                    <div className="text-gray-400 text-[10px]">{p.cityState || 'MG'}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wide">
                                      {p.profession?.replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate" title={p.pain}>
                                    {p.pain}
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 max-w-[150px] truncate" title={p.objective}>
                                    {p.objective}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <button 
                                      onClick={() => window.open(waUrl, '_blank')}
                                      className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-black px-3.5 py-2 rounded-xl text-[9px] uppercase tracking-widest leading-none shadow-sm transition-all"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 fill-white" /> Contatar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-gray-400 font-bold">Nenhuma usuária cadastrada atende aos filtros atuais.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* KPI SANDBOX */}
              {subTab === 'custom-kpis' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-linear-to-r from-gray-50 to-rose-50/30 p-6 rounded-3xl border border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                    <div>
                      <h4 className="text-sm font-black text-rose-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 fill-rose-500 text-rose-500" /> KPI Sandbox & Métricas Sob Demanda
                      </h4>
                      <p className="text-xs text-gray-500 font-bold leading-normal">
                        Defina novas regras de monitoramento. No futuro, os logs disparados pelos botões do app se unificarão sob esses filtros para calcular novas taxas de conversão ou engajamento!
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setIsAddingMetric(true)}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest px-4.5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-rose-200 transition-all shrink-0 active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Criar Regra de KPI
                    </button>
                  </div>

                  {/* Adding custom metric modal overlay inside the tab */}
                  {isAddingMetric && (
                    <div className="bg-white border-2 border-rose-100 p-6 rounded-3xl space-y-4 shadow-xl">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="font-black uppercase tracking-wider text-xs text-gray-700">Adicionar Regra de KPI</span>
                        <button onClick={() => setIsAddingMetric(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                      </div>
                      
                      <form onSubmit={handleCreateCustomMetric} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left text-xs">
                        <div>
                          <label className="block font-black text-gray-400 uppercase mb-1">Nome Amigável do KPI</label>
                          <input 
                            type="text" 
                            value={newMetricName}
                            onChange={e => setNewMetricName(e.target.value)}
                            placeholder="Ex: Usuários que Ditaram Voz"
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-none outline-none font-bold text-gray-700 focus:ring-2 focus:ring-rose-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-black text-gray-400 uppercase mb-1">Evento Monitorado (Exact ID)</label>
                          <select 
                            value={newMetricEvent}
                            onChange={e => setNewMetricEvent(e.target.value)}
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-none outline-none font-bold text-gray-750 focus:ring-2 focus:ring-rose-500 cursor-pointer"
                          >
                            <option value="voice_record_start">voice_record_start (Microfone aberto)</option>
                            <option value="voice_record_success">voice_record_success (Ditado processado)</option>
                            <option value="create_client">create_client (Cliente cadastrada)</option>
                            <option value="create_appointment">create_appointment (Agenda criada)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block font-black text-gray-400 uppercase mb-1">Descrição</label>
                          <input 
                            type="text" 
                            value={newMetricDesc}
                            onChange={e => setNewMetricDesc(e.target.value)}
                            placeholder="Métrica para avaliar aceitação de ditar os agendamentos na correria."
                            className="w-full bg-gray-50 p-3.5 rounded-xl border-none outline-none font-bold text-gray-700 focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div className="md:col-span-2 flex gap-2 pt-2">
                          <button 
                            type="button" 
                            onClick={() => setIsAddingMetric(false)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold px-4 py-3 rounded-xl uppercase tracking-wider text-[10px]"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="bg-rose-500 hover:bg-rose-600 text-white font-black px-5 py-3 rounded-xl uppercase tracking-wider text-[10px]"
                          >
                            Salvar KPI
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Custom Metrics display block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customMetricRules.map((rule) => {
                      const count = stats.eventCounts[rule.targetEvent] || 0;
                      return (
                        <div key={rule.id} className="bg-white border border-gray-100 p-5 rounded-3xl relative overflow-hidden shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                Evento: {rule.targetEvent}
                              </span>
                              <button 
                                onClick={() => handleDeleteCustomMetric(rule.id)}
                                className="text-gray-300 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <h4 className="text-sm font-black text-gray-800 mt-2">{rule.name}</h4>
                            <p className="text-[10px] text-gray-450 font-bold mt-1 leading-normal">{rule.description}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Disparos Totais</span>
                            <span className="text-xl font-black text-rose-600 font-mono">{count}</span>
                          </div>
                        </div>
                      );
                    })}

                    {customMetricRules.length === 0 && !isAddingMetric && (
                      <div className="col-span-full bg-gray-50 p-10 rounded-3xl text-center">
                        <p className="text-xs text-gray-450 font-bold leading-normal">
                          Nenhum KPI customizado criado. Clique em "Criar Regra de KPI" para criar regras de testes rápidos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* KIWIFY MONETIZATION Free-to-Paid Plan */}
              {subTab === 'kiwify' && (
                <div className="space-y-6 text-left max-w-4xl mx-auto animate-fadeIn leading-relaxed">
                  
                  {/* Strategic Intro */}
                  <div className="bg-linear-to-r from-gray-50 to-rose-50/40 border border-rose-100 p-6 sm:p-8 rounded-[36px]">
                    <h3 className="text-base font-black text-gray-800 uppercase tracking-tight flex items-center gap-2 mb-2">
                      <Sparkles className="text-rose-500 w-5 h-5" /> Estratégia de Transição: Plano de Parceria para Cobrança (Finanças & Kiwify)
                    </h3>
                    <p className="text-xs text-gray-600 font-bold leading-normal">
                      Sua lógica de Lean Startup permite que as clientes testem o OrbyFlow gratuitamente por 6 meses para gerar feedback real e validação. Depois disso, você pode começar a cobrar de forma transparente e flexível utilizando a Kiwify!
                    </p>
                  </div>

                  {/* Implementation Pillars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-100 p-6 rounded-3xl space-y-3 shadow-xs">
                      <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 1. Como tratar no Firebase?
                      </h4>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        Ao se registrar, o perfil do usuário recebe os campos <code className="bg-gray-105 px-1 py-0.5 rounded font-mono">activePlan: "Gratuito"</code> e <code className="bg-gray-105 px-1 py-0.5 rounded font-mono">expiresAt: "2026-12-04"</code> (calculado 6 meses adicionados). 
                      </p>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        Durante este período de experimentação, o sistema não faz bloqueios funcionais. No painel de configurações, será exibido de forma discreta o tempo restante do período de testes gratuitas.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-100 p-6 rounded-3xl space-y-3 shadow-xs">
                      <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2. O Momento da Cobrança
                      </h4>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        Ao expirar os 6 meses, no login o usuário visualiza um modal bloqueador premium explicando: <strong>"Seu período de avaliação gratuita de 6 meses terminou! Parabéns por evoluir seu negócio!"</strong>
                      </p>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        Disponibilize o botão <strong>"Ativar Assinatura Mensal"</strong>. Esse botão redireciona o usuário para o seu link de checkout da Kiwify.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-100 p-6 rounded-3xl space-y-3 shadow-xs">
                      <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3. Integração Prática (Webhooks)
                      </h4>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        No painel da Kiwify, configure um <strong>Webhook de Vendas</strong> apontando para um endpoint da sua API (ex: <code className="bg-gray-105 px-1 py-0.5 rounded font-mono">/api/webhooks/kiwify</code>).
                      </p>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        Quando a Kiwify enviar o evento <code className="bg-gray-105 px-1 py-0.5 rounded font-mono">order_approved</code>, encontre a usuária pelo e-mail e atualize o Firestore <code className="bg-gray-105 px-1 py-0.5 rounded font-mono">activePlan: "Profissional"</code>, estendendo ou removendo a expiração!
                      </p>
                    </div>

                    <div className="bg-white border border-gray-100 p-6 rounded-3xl space-y-3 shadow-xs">
                      <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 4. Sem Atrito Inicial
                      </h4>
                      <p className="text-[11px] text-gray-500 font-bold leading-normal">
                        Essa abordagem Lean não bloqueia ninguém de entrar hoje. Você não gasta nada integrando APIs complexas agora, e garante que as 6 primeiras semanas sejam focadas 100% em <strong>satisfação, usabilidade e indicação</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-150 p-5 rounded-2xl flex items-start gap-3 mt-4 text-xs font-bold text-gray-500">
                    <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      A Kiwify possui uma API de Webhooks fantástica e de fácil implementação! Quando você estiver pronto para encerrar o beta, poderei escrever o roteador do webhook diretamente no arquivo de rotas Express no backend.
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
