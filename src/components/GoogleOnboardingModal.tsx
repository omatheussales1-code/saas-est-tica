import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Phone, MessageCircle, Building2, CheckCircle2 } from 'lucide-react';

interface GoogleOnboardingModalProps {
  isOpen: boolean;
  userName: string;
  onSave: (phone: string, profession: string) => Promise<void>;
}

export const GoogleOnboardingModal: React.FC<GoogleOnboardingModalProps> = ({
  isOpen,
  userName,
  onSave
}) => {
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('Estética');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhoneNumber = (value: string) => {
    // Basic Brazilian phone formatting (11) 99999-9999
    const number = value.replace(/\D/g, '');
    if (number.length <= 10) {
      return number.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return number.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatPhoneNumber(rawVal);
    if (rawVal.replace(/\D/g, '').length <= 11) {
      setPhone(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Por favor, digite um número de WhatsApp completo com DDD.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(phone, profession);
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao concluir seu cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#312525]/40 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-md p-6 sm:p-8 rounded-[36px] shadow-2xl border border-rose-50/50 overflow-hidden z-10"
          >
            {/* Header / Brand Icon */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-tr from-rose-500 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-100 mx-auto mb-4">
                <Sparkles className="text-white w-7 h-7 animate-pulse" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-850 leading-tight">
                Olá, {userName.split(' ')[0]}! ✨
              </h2>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
                Só mais um passo para liberar seu acesso!
              </p>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100/50 text-[11px] text-rose-700 font-bold leading-normal mb-6">
              Para ativarmos o envio de lembretes manuais, automáticos e o ditado inteligente por voz para o seu espaço, confirme os dados abaixo:
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* WhatsApp Field */}
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-2">
                  Seu WhatsApp
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400">
                    <MessageCircle className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Ex: (11) 98888-7777"
                    className="w-full bg-gray-50 border-none rounded-xl p-3.5 pl-11 text-xs font-bold text-gray-750 outline-none focus:ring-2 focus:ring-rose-400 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Specialty Field */}
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-2">
                  Sua Profissão ou Nicho
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <select
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl p-3.5 pl-11 text-xs font-bold text-gray-750 outline-none focus:ring-2 focus:ring-rose-400 transition-all cursor-pointer shadow-inner appearance-none"
                  >
                    <option value="Estética">Esteticista / Clínica de Estética</option>
                    <option value="Design_Cílios_Sobrancelhas">Lash Designer / Sobrancelhas</option>
                    <option value="Fisioterapia">Fisioterapeuta</option>
                    <option value="Nutrição">Nutricionista</option>
                    <option value="Manicure_Pedicure">Nail Designer / Manicure</option>
                    <option value="Cabeleireira">Cabeleireira / Salão</option>
                    <option value="Outro">Outro Nicho de Beleza/Saúde</option>
                  </select>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-left">
                  <p className="text-red-600 text-xs font-bold">{error}</p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Configurando seu Espaço...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 fill-emerald-300/20" /> Concluir e Entrar no Sistema
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
