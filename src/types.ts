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
}

export interface UserProfile {
  name: string;
  businessName: string;
  procedures: Procedure[];
  workingHours: {
    start: string; // "08:00"
    end: string;   // "18:00"
  };
}

export interface FinancialEntry {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'receita' | 'despesa';
  category: string;
  appointmentId?: string;
}

export interface Lead {
  id: string;
  name: string;
  platform: 'instagram' | 'whatsapp';
  lastMessageDate: string;
  status: 'novo' | 'follow-up-1' | 'follow-up-3' | 'follow-up-7' | 'convertido' | 'perdido';
  lastMessage: string;
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
}

export interface FollowUp {
  id: string;
  clientName: string;
  procedureName: string;
  professionalName: string;
  date: string;
  status: 'Pendente' | 'Em andamento' | 'Concluído';
  observation: string;
}
