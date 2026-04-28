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
  phone: string;
  email?: string;
  observations?: string;
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
  photoBefore?: string;
  photoAfter?: string;
  ownerId?: string;
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
  clientLabel: 'Cliente' | 'Paciente' | 'Aluno' | 'Membro';
  ownerId?: string;
  plan?: 'free' | 'pro' | 'master';
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
  platform: 'instagram' | 'whatsapp';
  source?: 'direct' | 'ad' | 'referral' | 'other';
  estimatedValue?: number;
  lastMessageDate: string;
  status: 'novo' | 'follow-up-1' | 'follow-up-3' | 'follow-up-7' | 'convertido' | 'perdido';
  lastMessage: string;
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
  date: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  validUntil: string;
  ownerId?: string;
}

export interface FollowUp {
  id: string;
  clientName: string;
  procedureName: string;
  professionalName: string;
  date: string;
  status: 'Pendente' | 'Em andamento' | 'Concluído';
  observation: string;
  ownerId?: string;
}
