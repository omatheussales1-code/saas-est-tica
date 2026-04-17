import { Client, Appointment, Procedure, FinancialEntry, Lead, Budget } from './types';

// Helper to get dates relative to now
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_PROCEDURES: Procedure[] = [
  { id: '1', name: 'Drenagem Linfática', price: 150, duration: 60 },
  { id: '2', name: 'Liberação Miofascial', price: 180, duration: 60 },
  { id: '3', name: 'Limpeza de Pele Profunda', price: 180, duration: 90 },
  { id: '4', name: 'Massagem Relaxante', price: 120, duration: 50 },
  { id: '5', name: 'Peeling Químico', price: 250, duration: 45 },
  { id: '6', name: 'Microagulhamento', price: 350, duration: 75 },
  { id: '7', name: 'Design de Sobrancelhas', price: 60, duration: 30 },
];

export const MOCK_CLIENTS: Client[] = [
  { 
    id: 'c1', 
    name: 'Ana Silva', 
    phone: '(11) 98888-7777', 
    createdAt: daysAgo(30),
    preferences: { airConditioning: 'fresco', conversation: 'quieta', music: 'Lofi', beverage: 'Água com gás' }
  },
  { 
    id: 'c2', 
    name: 'Beatriz Santos', 
    phone: '(11) 97777-6666', 
    createdAt: daysAgo(25),
    preferences: { airConditioning: 'gelado', conversation: 'gosta', music: 'MPB', beverage: 'Chá gelado' }
  },
  { id: 'c3', name: 'Carla Oliveira', phone: '(11) 96666-5555', createdAt: daysAgo(20) },
  { id: 'c4', name: 'Daniela Lima', phone: '(11) 95555-4444', createdAt: daysAgo(15) },
  { id: 'c5', name: 'Eduarda Pereira', phone: '(11) 94444-3333', createdAt: daysAgo(10) },
  { id: 'c6', name: 'Fernanda Rocha', phone: '(11) 93333-2222', createdAt: daysAgo(5) },
  { id: 'c7', name: 'Gabriela Alves', phone: '(11) 92222-1111', createdAt: daysAgo(2) },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1', clientId: 'c1', procedureId: '1', date: daysAgo(2), status: 'realizado', price: 150 },
  { id: 'a2', clientId: 'c2', procedureId: '2', date: daysAgo(1), status: 'realizado', price: 180 },
  { id: 'a3', clientId: 'c3', procedureId: '3', date: new Date().toISOString(), status: 'confirmado', price: 180 },
  { id: 'a4', clientId: 'c4', procedureId: '4', date: new Date(Date.now() + 3600000).toISOString(), status: 'confirmado', price: 120 },
  { id: 'a5', clientId: 'c5', procedureId: '5', date: inDays(1), status: 'confirmado', price: 250 },
  { id: 'a6', clientId: 'c6', procedureId: '6', date: inDays(2), status: 'confirmado', price: 350 },
  { id: 'a7', clientId: 'c1', procedureId: '7', date: inDays(3), status: 'pendente', price: 60 },
  { id: 'a8', clientId: 'c2', procedureId: '1', date: daysAgo(5), status: 'faltou', price: 150 },
];

export const MOCK_FINANCIAL: FinancialEntry[] = [
  { id: 'f1', description: 'Aluguel Sala', amount: 2000, date: daysAgo(16), type: 'despesa', category: 'Infraestrutura' },
  { id: 'f2', description: 'Insumos (Creme/Óleos)', amount: 450, date: daysAgo(12), type: 'despesa', category: 'Insumos' },
  { id: 'f3', description: 'Energia Elétrica', amount: 180, date: daysAgo(8), type: 'despesa', category: 'Contas' },
  { id: 'f4', description: 'Atendimento: Ana Silva', amount: 150, date: daysAgo(2), type: 'receita', category: 'Serviços' },
  { id: 'f5', description: 'Atendimento: Beatriz Santos', amount: 180, date: daysAgo(1), type: 'receita', category: 'Serviços' },
  { id: 'f6', description: 'Internet e Telefone', amount: 120, date: daysAgo(4), type: 'despesa', category: 'Contas' },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'l1', name: 'Mariana Costa', platform: 'instagram', lastMessageDate: daysAgo(1), status: 'novo', lastMessage: 'Olá, qual o valor da drenagem?' },
  { id: 'l2', name: 'Fernanda Souza', platform: 'whatsapp', lastMessageDate: daysAgo(3), status: 'follow-up-3', lastMessage: 'Vou ver com meu marido e te aviso.' },
  { id: 'l3', name: 'Juliana Paes', platform: 'instagram', lastMessageDate: daysAgo(7), status: 'follow-up-7', lastMessage: 'Obrigada pelas informações.' },
  { id: 'l4', name: 'Patrícia Amorim', platform: 'whatsapp', lastMessageDate: daysAgo(14), status: 'perdido', lastMessage: 'Não consigo ir esse mês.' },
];

export const MOCK_BUDGETS: Budget[] = [
  {
    id: 'b1',
    clientId: 'c1',
    items: [{ procedureId: '1', price: 150 }, { procedureId: '7', price: 60 }],
    total: 210,
    date: daysAgo(5),
    status: 'pendente',
    validUntil: inDays(10)
  },
  {
    id: 'b2',
    clientId: 'c5',
    items: [{ procedureId: '3', price: 180 }],
    total: 180,
    date: daysAgo(2),
    status: 'pendente',
    validUntil: inDays(5)
  }
];
