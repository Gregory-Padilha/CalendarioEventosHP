import { useState, useEffect } from 'react';
import { X, Save, Trash2, Loader2, Calendar, AlertTriangle, User, Lock, Clock } from 'lucide-react';
import { checkScheduleCollision, isPastDate } from '../types';
import type { HospitalEvent } from '../types';

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  slotNumber: number;
  initialData: HospitalEvent | null;
  isGlobal: boolean;
  allEvents: HospitalEvent[];
  onSave: (data: Omit<HospitalEvent, 'id'> & { id?: string }) => Promise<boolean | void>;
  onDelete: (id?: string, dateStr?: string, slotNum?: number) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

// Find first empty slot (1 to 4) for a date, ignoring a specific event id
const getFirstVacantSlot = (date: string, events: HospitalEvent[], ignoreId?: string): number => {
  const occupiedSlots = events
    .filter(e => e.event_date === date && e.id !== ignoreId)
    .map(e => e.slot_number);
  
  for (let i = 1; i <= 4; i++) {
    if (!occupiedSlots.includes(i)) {
      return i;
    }
  }
  return 1; // Default to 1 if completely full
};

// Check if all slots are occupied for a date
const isDateFullyOccupied = (date: string, events: HospitalEvent[], ignoreId?: string): boolean => {
  const occupiedSlots = events
    .filter(e => e.event_date === date && e.id !== ignoreId)
    .map(e => e.slot_number);
  return occupiedSlots.length >= 4;
};

const getFriendlyDateLabel = (dateString: string) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}`;
};

export function DayModal({ 
  isOpen, 
  onClose, 
  dateStr, 
  slotNumber, 
  initialData, 
  isGlobal, 
  allEvents, 
  onSave, 
  onDelete,
  showToast
}: DayModalProps) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [responsible, setResponsible] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(1);
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number>(60);
  
  const [isSaving, setIsSaving] = useState(false);

  // Initialize fields on open or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setEditingEventId(initialData.id || null);
        setTitle(initialData.title || '');
        setResponsible(initialData.responsible || (initialData as any).responsavel || '');
        setDescription(initialData.description || '');
        setDate(initialData.event_date || '');
        setSlot(initialData.slot_number || 1);
        setTime(initialData.event_time || (initialData as any).horario || '');
        setDuration(initialData.estimated_duration || 60);
      } else {
        // Clean slate! Clear all states immediately when creating from scratch / empty slot
        setEditingEventId(null);
        setTitle('');
        setResponsible('');
        setDescription('');
        setDate(dateStr || '');
        setTime('');
        setDuration(60);
        
        // If global trigger, recommend the first vacant slot
        if (isGlobal && dateStr) {
          const suggestedSlot = getFirstVacantSlot(dateStr, allEvents);
          setSlot(suggestedSlot);
        } else {
          setSlot(slotNumber || 1);
        }
      }
    }
  }, [isOpen, initialData, dateStr, slotNumber, isGlobal]);

  if (!isOpen) return null;

  // Reactively calculate vacant slots when user edits the date picker (Global Mode)
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const suggestedSlot = getFirstVacantSlot(newDate, allEvents, initialData?.id);
    setSlot(suggestedSlot);
  };

  // Determine if the loaded event is in the past (Time-Locked)
  const isPast = isPastDate(date);

  const isFull = isDateFullyOccupied(date, allEvents, initialData?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPast) return; // Prevent any submission for locked events

    // Validate that the target date/time is not in the past - Disabled to allow retroactive events
    // const isTargetPast = isEventPast(date, time);
    // if (isTargetPast) {
    //   showToast('Operação Inválida: Não é permitido agendar ou mover eventos para datas e horários que já passaram.', 'error');
    //   return;
    // }

    if (!title.trim() || !responsible.trim()) {
      showToast('Nome do evento e responsável são obrigatórios.', 'error');
      return;
    }

    const durationVal = Number(duration) || 60;
    const hasCollision = checkScheduleCollision(
      date,
      time,
      durationVal,
      allEvents,
      initialData?.id
    );

    if (hasCollision) {
      showToast("Conflito de Agendamento: Já existe um evento ocupando este período de horário. Escolha um horário livre após o término do evento anterior.", 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      const success = await onSave({
        id: editingEventId || undefined,
        event_date: date,
        event_time: time,
        slot_number: slot,
        title: title.trim(),
        responsible: responsible.trim(),
        description: description.trim(),
        estimated_duration: durationVal,
      });
      if (success !== false) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Erro ao salvar o evento.', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 select-none">
              <Calendar className="text-blue-600 w-5 h-5" />
              {editingEventId ? 'Editar Evento' : 'Novo Agendamento'}
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5 select-none">
              {!isGlobal 
                ? `Data: ${getFriendlyDateLabel(date)} • Slot ${slot} • Horário: ${time}`
                : 'Defina a data e detalhes gerais do evento'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Time-Lock Banner notification */}
          {isPast && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 font-semibold select-none">
              <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                Este evento pertence a uma data passada e não pode ser modificado.
              </div>
            </div>
          )}

          {/* Main Info Fields */}
          <div>
            <label htmlFor="title" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 select-none">
              Nome do Evento *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPast}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-gray-700 placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-150"
              placeholder="Ex: Plantão Geral UTI"
              required
            />
          </div>

          <div>
            <label htmlFor="responsible" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1 select-none">
              <User size={12} />
              Responsável *
            </label>
            <input
              id="responsible"
              type="text"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              disabled={isPast}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-gray-700 placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-150"
              placeholder="Ex: Dr. Fulano / Enf. Ciclana"
              required
            />
          </div>

          {/* Time Field: Inline creation mode only */}
          {!isGlobal && (
            <div>
              <label htmlFor="time" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1 select-none">
                <Clock size={12} />
                Horário do Evento *
              </label>
              <input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isPast}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-gray-700 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-150"
                required
              />
            </div>
          )}

          {/* Estimated Duration Field - Visible in all modes */}
          <div>
            <label htmlFor="duration" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1 select-none">
              <Clock size={12} />
              Tempo Estimado do Evento *
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isPast}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-150"
              required
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 select-none">
              Descrição / Detalhes Adicionais
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPast}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none text-sm font-medium text-gray-600 placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-150"
              placeholder="Ex: Equipe A e B de retaguarda médica..."
            />
          </div>

          {/* Conditional Date, Slot, and Time Picker: Only visible if in Global trigger Mode */}
          {isGlobal && (
            <div className={`grid ${!initialData ? 'grid-cols-2' : 'grid-cols-3'} gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 select-none`}>
              <div>
                <label htmlFor="modalDate" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Data
                </label>
                <input
                  id="modalDate"
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  disabled={isPast}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs font-semibold text-gray-750 disabled:bg-gray-50 disabled:text-gray-400"
                  required
                />
              </div>

              {initialData && (
                <div>
                  <label htmlFor="modalSlot" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Slot
                  </label>
                  <select
                    id="modalSlot"
                    value={slot}
                    onChange={(e) => setSlot(Number(e.target.value))}
                    disabled={isPast}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs font-semibold text-gray-750 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value={1}>Slot 1</option>
                    <option value={2}>Slot 2</option>
                    <option value={3}>Slot 3</option>
                    <option value={4}>Slot 4</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="modalTime" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Horário
                </label>
                <input
                  id="modalTime"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isPast}
                  className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs font-semibold text-gray-750 disabled:bg-gray-50 disabled:text-gray-400"
                  required
                />
              </div>

              {/* Warning when all 4 slots are occupied on the chosen day */}
              {isFull && (
                <div className={`${!initialData ? 'col-span-2' : 'col-span-3'} mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-medium`}>
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    Atenção: Todos os 4 slots desta data já possuem eventos programados. Salvar agora substituirá o slot selecionado.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            
            {/* Read-Only action button footer */}
            {isPast ? (
              <div className="flex justify-end w-full">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md select-none"
                >
                  Fechar Evento (Apenas Leitura)
                </button>
              </div>
            ) : (
              // Standard editable action button footer
              <>
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingEventId) {
                        onDelete(editingEventId);
                        onClose();
                      }
                    }}
                    disabled={isSaving}
                    className="px-4 py-2.5 text-sm font-bold text-rose-600 hover:text-white bg-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 select-none"
                    title="Excluir evento definitivamente"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                ) : (
                  <div /> // alignment spacer
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-all disabled:opacity-50 select-none"
                    disabled={isSaving}
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 select-none"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {editingEventId ? 'Atualizar' : 'Agendar'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
