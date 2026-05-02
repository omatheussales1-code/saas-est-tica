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
    email: 'ana.silva@email.com',
    createdAt: daysAgo(30),
    preferences: { airConditioning: 'fresco', conversation: 'quieta', music: 'Lofi', beverage: 'Água com gás' }
  },
  { 
    id: 'c2', 
    name: 'Beatriz Santos', 
    phone: '(11) 97777-6666', 
    email: 'bia.santos@gmail.com',
    createdAt: daysAgo(25),
    preferences: { airConditioning: 'gelado', conversation: 'gosta', music: 'MPB', beverage: 'Chá gelado' }
  },
  { id: 'c3', name: 'Carla Oliveira', phone: '(11) 96666-5555', email: 'carla@oliveira.com.br', createdAt: daysAgo(20) },
  { id: 'c4', name: 'Daniela Lima', phone: '(11) 95555-4444', email: 'dani.lima92@uol.com.br', createdAt: daysAgo(15) },
  { id: 'c5', name: 'Eduarda Pereira', phone: '(11) 94444-3333', createdAt: daysAgo(10) },
  { id: 'c6', name: 'Fernanda Rocha', phone: '(11) 93333-2222', email: 'fernandinha@outlook.com', createdAt: daysAgo(5) },
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
  { id: 'l1', name: 'Mariana Costa', platform: 'Instagram', email: 'mari@email.com', phone: '(11) 91234-5678', lastMessage: 'Olá, qual o valor da drenagem?', status: 'novo', createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: 'l2', name: 'Fernanda Souza', platform: 'WhatsApp', email: 'fer@email.com', phone: '(11) 92345-6789', lastMessage: 'Vou ver com meu marido e te aviso.', status: 'follow-up-1', createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: 'l3', name: 'Juliana Paes', platform: 'Direct', lastMessage: 'Obrigada pelas informações.', status: 'novo', createdAt: daysAgo(7), updatedAt: daysAgo(7) },
  { id: 'l4', name: 'Patrícia Amorim', platform: 'WhatsApp', phone: '(11) 94444-5555', lastMessage: 'Não consigo ir esse mês.', status: 'perdido', createdAt: daysAgo(14), updatedAt: daysAgo(14) },
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
