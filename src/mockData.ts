import { Client, Appointment, Procedure, FinancialEntry, Lead, Budget } from './types';

export const MOCK_PROCEDURES: Procedure[] = [
  { id: '1', name: 'Drenagem Linfática', price: 150, duration: 60 },
  { id: '2', name: 'Liberação Miofascial', price: 180, duration: 60 },
  { id: '3', name: 'Limpeza de Pele', price: 120, duration: 90 },
  { id: '4', name: 'Massagem Relaxante', price: 100, duration: 50 },
];

export const MOCK_CLIENTS: Client[] = [
  { 
    id: 'c1', 
    name: 'Ana Silva', 
    phone: '(11) 98888-7777', 
    createdAt: new Date().toISOString(),
    preferences: { airConditioning: 'fresco', conversation: 'quieta', music: 'Lofi', beverage: 'Água com gás' }
  },
  { 
    id: 'c2', 
    name: 'Beatriz Santos', 
    phone: '(11) 97777-6666', 
    createdAt: new Date().toISOString(),
    preferences: { airConditioning: 'gelado', conversation: 'gosta', music: 'MPB', beverage: 'Chá gelado' }
  },
  { id: 'c3', name: 'Carla Oliveira', phone: '(11) 96666-5555', createdAt: new Date().toISOString() },
  { id: 'c4', name: 'Daniela Lima', phone: '(11) 95555-4444', createdAt: new Date().toISOString() },
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    clientId: 'c1',
    procedureId: '1',
    date: new Date().toISOString(),
    status: 'realizado',
    price: 150
  },
  {
    id: 'a2',
    clientId: 'c2',
    procedureId: '2',
    date: new Date(Date.now() + 3600000).toISOString(),
    status: 'confirmado',
    price: 120
  },
  {
    id: 'a3',
    clientId: 'c3',
    procedureId: '3',
    date: new Date(Date.now() + 7200000).toISOString(),
    status: 'confirmado',
    price: 100
  },
  {
    id: 'a4',
    clientId: 'c4',
    procedureId: '4',
    date: new Date(Date.now() + 300000).toISOString(), // 5 min
    status: 'confirmado',
    price: 100
  },
  {
    id: 'a5',
    clientId: 'c1',
    procedureId: '1',
    date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Amanhã
    status: 'confirmado',
    price: 150
  },
  {
    id: 'a6',
    clientId: 'c2',
    procedureId: '2',
    date: new Date(Date.now() - 600000).toISOString(), // 10 min atrás
    status: 'confirmado',
    price: 180
  }
];

export const MOCK_FINANCIAL: FinancialEntry[] = [
  { id: 'f1', description: 'Aluguel Sala', amount: 2000, date: '2026-04-01', type: 'despesa', category: 'Infraestrutura' },
  { id: 'f2', description: 'Produtos Estética', amount: 450, date: '2026-04-05', type: 'despesa', category: 'Insumos' },
  { id: 'f3', description: 'Energia Elétrica', amount: 180, date: '2026-04-10', type: 'despesa', category: 'Contas' },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'l1', name: 'Mariana Costa', platform: 'instagram', lastMessageDate: new Date(Date.now() - 86400000).toISOString(), status: 'novo', lastMessage: 'Olá, qual o valor da drenagem?' },
  { id: 'l2', name: 'Fernanda Souza', platform: 'whatsapp', lastMessageDate: new Date(Date.now() - 259200000).toISOString(), status: 'follow-up-3', lastMessage: 'Vou ver com meu marido e te aviso.' },
  { id: 'l3', name: 'Juliana Paes', platform: 'instagram', lastMessageDate: new Date(Date.now() - 604800000).toISOString(), status: 'follow-up-7', lastMessage: 'Obrigada pelas informações.' },
];

export const MOCK_BUDGETS: Budget[] = [
  {
    id: 'b1',
    clientId: 'c1',
    items: [{ procedureId: '1', price: 150 }],
    total: 150,
    date: new Date().toISOString(),
    status: 'pendente',
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString()
  }
];
