/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppointmentStatus = 'confirmado' | 'realizado' | 'faltou' | 'pendente' | 'desmarcado' | 'atrasado';

export interface Procedure {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  ownerId?: string;
}

export interface Client {
  id: string;
  name: string;
  lastName?: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  birthday?: string;
  observations?: string;
  label?: string;
  labelColor?: string;
  createdAt: string;
  photoBefore?: string;
  photoAfter?: string;
  ownerId?: string;
  preferences?: {
    airConditioning?: 'gelado' | 'fresco' | 'natural';
    conversation?: 'gosta' | 'quieta' | 'neutra';
    music?: string;
    beverage?: string;
    other?: string;
  };
}

export interface Appointment {
  id: string;
  clientId: string;
  procedureId: string;
  date: string; // ISO string
  status: AppointmentStatus;
  notes?: string;
  price: number;
  paidAmount?: number;
  paymentMethod?: 'pix' | 'cartao' | 'dinheiro' | 'outro';
  photoBefore?: string;
  photoAfter?: string;
  ownerId?: string;
  isPaid?: boolean;
  sessionNumber?: number;
  totalSessions?: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  ownerId?: string;
  category?: 'agendamento' | 'lembrete' | 'outros';
  isDefault?: boolean;
}

export interface UserProfile {
  id?: string;
  name: string;
  businessName: string;
  specialty?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  workingHours: {
    start: string; // "08:00"
    end: string;   // "18:00"
  };
  workingDays: number[]; // 0-6 where 0 is Sunday
  budgetValidityDays?: number;
  whatsappPrefix?: string;
  confirmationMessageTemplate?: string;
  reminderMessageTemplate?: string;
  clientLabel: 'Cliente' | 'Paciente' | 'Aluno' | 'Membro';
  ownerId?: string;
  plan?: 'free' | 'pro' | 'master';
  accentColor?: string;
  createdAt?: string;
}

export interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'receita' | 'despesa';
  category: string;
  paymentMethod?: 'pix' | 'cartao' | 'dinheiro' | 'outro';
  appointmentId?: string;
  ownerId?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  platform?: string;
  origin?: string;
  status: 'novo' | 'contato' | 'proposta' | 'convertido' | 'perdido' | 'follow-up-1';
  lastMessage?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
}

export interface Budget {
  id: string;
  clientId: string;
  items: {
    procedureId: string;
    price: number;
  }[];
  total: number;
  paidAmount?: number;
  date: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  validUntil: string;
  ownerId?: string;
}

export interface FollowUp {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  procedureName: string;
  professionalName: string;
  date: string;
  status: 'Pendente' | 'Em andamento' | 'Concluído';
  observation: string;
  ownerId?: string;
}
