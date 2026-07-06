import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { formatLocalDate, checkScheduleCollision, isPastDate } from './types';
import type { HospitalEvent, EventTemplate } from './types';
import { ControlPanel } from './components/ControlPanel';
import { DayModal } from './components/DayModal';
import { DailyDashboardModal } from './components/DailyDashboardModal';
import { SchedulePreview } from './components/SchedulePreview';
import { TemplateManager } from './components/TemplateManager';
import { TemplateChoiceModal } from './components/TemplateChoiceModal';
import { 
  Loader2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Settings
} from 'lucide-react';

// Generates unique ids for fallback storage
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get the 7 rolling dates centered around the reference date (Index 3 = RefDate)
const getRollingDays = (refDate: Date): Date[] => {
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const day = new Date(refDate);
    day.setDate(refDate.getDate() + i);
    days.push(day);
  }
  return days;
};

function App() {
  const [events, setEvents] = useState<HospitalEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isWeekLoading, setIsWeekLoading] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Check if accessing in public view mode (Query parameter)
  const isPublicMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'public' || params.get('view') === 'true';
  }, []);

  // Collapsible sidebar state (forced closed in public mode)
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isPublicMode);

  useEffect(() => {
    if (isPublicMode) {
      setIsSidebarOpen(false);
    }
  }, [isPublicMode]);

  // Custom Toast Notification State & Auto-Dismiss Timer
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' }>({
    message: '',
    visible: false,
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, visible: true, type });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Modal controller states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string>('');
  const [modalSlot, setModalSlot] = useState<number>(1);
  const [modalEvent, setModalEvent] = useState<HospitalEvent | null>(null);
  const [modalIsGlobal, setModalIsGlobal] = useState<boolean>(false);

  // Daily Dashboard Modal state
  const [selectedDayExpanded, setSelectedDayExpanded] = useState<{
    dateStr: string;
    color: string;
    dayName: string;
    fullDateLabel: string;
  } | null>(null);

  // Template Manager & Choice Modal states
  const [currentView, setCurrentView] = useState<'calendar' | 'templates'>('calendar');
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [pendingCreateSlot, setPendingCreateSlot] = useState<{ dateStr: string, slotNum: number } | null>(null);
  const [pendingIsGlobal, setPendingIsGlobal] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  // Memoize week days based on currently selected reference date (Rolling Window centered on selectedDate)
  const weekDays = useMemo(() => getRollingDays(selectedDate), [selectedDate]);

  // Convert array of events into an O(1) nested dictionary
  const eventsMap = useMemo(() => {
    const map: Record<string, Record<number, HospitalEvent>> = {};
    events.forEach((evt) => {
      if (!map[evt.event_date]) {
        map[evt.event_date] = {};
      }
      map[evt.event_date][evt.slot_number] = evt;
    });
    return map;
  }, [events]);

  const fetchEvents = async () => {
    if (!isLoading) {
      setIsWeekLoading(true);
    }
    try {
      // Fetch only events within the 7-day rolling window range around selectedDate!
      const startRange = new Date(selectedDate);
      startRange.setDate(selectedDate.getDate() - 3);
      const endRange = new Date(selectedDate);
      endRange.setDate(selectedDate.getDate() + 3);

      const { data, error } = await supabase
        .from('hospital_events')
        .select('*')
        .gte('event_date', formatLocalDate(startRange))
        .lte('event_date', formatLocalDate(endRange));

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Erro ao conectar ao Supabase (hospital_events):', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsWeekLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('event_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao conectar ao Supabase (event_templates):', error);
      setTemplates([]);
    }
  };

  const handleSaveTemplate = async (temp: Omit<EventTemplate, 'id' | 'created_at'>) => {
    if (isPublicMode) {
      showToast("Acesso Negado: Você está no modo de visualização pública apenas leitura.", 'error');
      return;
    }
    setIsSavingTemplate(true);
    try {
      const payload = {
        template_name: temp.template_name,
        title: temp.title,
        description: temp.description,
        estimated_duration: Number(temp.estimated_duration) || 60,
        responsible: temp.responsible
      };

      const { data, error } = await supabase
        .from('event_templates')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates(prev => [data[0], ...prev]);
        showToast('Modelo salvo com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Erro ao salvar modelo no Supabase:', error);
      showToast('Erro ao salvar o modelo.', 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (isPublicMode) {
      showToast("Acesso Negado: Você está no modo de visualização pública apenas leitura.", 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('event_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Modelo removido com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover modelo no Supabase:', error);
      showToast('Erro ao remover o modelo.', 'error');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchTemplates();
  }, [selectedDate]);

  const resortEventsForDate = (date: string, list: HospitalEvent[]): HospitalEvent[] => {
    const dayEvts = list.filter(e => e.event_date === date);
    dayEvts.sort((a, b) => {
      const timeA = a.event_time || '00:00';
      const timeB = b.event_time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    const dayEvtsMapped = dayEvts.map((evt, idx) => ({
      ...evt,
      slot_number: idx + 1
    }));
    
    return list.map(e => {
      if (e.event_date === date) {
        const updated = dayEvtsMapped.find(u => u.id === e.id);
        return updated || e;
      }
      return e;
    });
  };

  const handleSaveEvent = async (eventData: Omit<HospitalEvent, 'id'> & { id?: string }): Promise<boolean> => {
    if (isPublicMode) {
      showToast("Acesso Negado: Você está no modo de visualização pública apenas leitura.", 'error');
      return false;
    }

    const durationVal = Number(eventData.estimated_duration) || 60;
    const hasCollision = checkScheduleCollision(
      eventData.event_date,
      eventData.event_time,
      durationVal,
      events,
      eventData.id
    );

    if (hasCollision) {
      showToast("Conflito de Agendamento: Já existe um evento ocupando este período de horário. Escolha um horário livre após o término do evento anterior.", 'error');
      return false;
    }

    const previousEvents = [...events];
    const targetId = eventData.id || `evt-${generateUUID()}`;
    const fullEvent: HospitalEvent = {
      ...eventData,
      id: targetId,
      updated_at: new Date().toISOString()
    };

    setEvents(prev => {
      const existingIdx = prev.findIndex(e => e.id === targetId);
      const newList = [...prev];
      if (existingIdx >= 0) {
        newList[existingIdx] = { ...newList[existingIdx], ...fullEvent };
      } else {
        newList.push(fullEvent);
      }
      return resortEventsForDate(eventData.event_date, newList);
    });

    try {
      const isEdit = !!eventData.id;
      const payload = {
        event_date: eventData.event_date,
        event_time: eventData.event_time,
        slot_number: eventData.slot_number,
        title: eventData.title,
        responsible: eventData.responsible,
        description: eventData.description,
        estimated_duration: Number(eventData.estimated_duration) || 60,
        updated_at: new Date().toISOString()
      };

      let error = null;
      let data = null;

      if (isEdit) {
        const { error: updateErr, data: updateData } = await supabase
          .from('hospital_events')
          .update(payload)
          .eq('id', eventData.id)
          .select();
        error = updateErr;
        data = updateData;
      } else {
        const { error: insertErr, data: insertData } = await supabase
          .from('hospital_events')
          .insert([{ ...payload, created_at: new Date().toISOString() }])
          .select();
        error = insertErr;
        data = insertData;
      }

      if (error) throw error;

      if (data && data.length > 0) {
        setEvents(prev => prev.map(e => {
          if (e.event_date === eventData.event_date && e.slot_number === eventData.slot_number) {
            return data[0];
          }
          return e;
        }));
      }

      showToast('Evento salvo com sucesso!', 'success');
      return true;
    } catch (error: any) {
      console.error('Erro ao salvar evento no Supabase:', error);
      showToast('Erro ao salvar o evento. As alterações foram desfeitas.', 'error');
      setEvents(previousEvents);
      return false;
    }
  };

  const handleDeleteEvent = async (id?: string) => {
    if (isPublicMode) {
      showToast("Acesso Negado: Você está no modo de visualização pública apenas leitura.", 'error');
      return;
    }
    if (id) {
      setEventToDelete(id);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    const targetEvent = events.find(e => e.id === eventToDelete);
    if (!targetEvent) {
      setEventToDelete(null);
      return;
    }

    const previousEvents = [...events];
    const dateStr = targetEvent.event_date;
    const idToDelete = eventToDelete;

    setEvents(prev => {
      const filtered = prev.filter(e => e.id !== idToDelete);
      return dateStr ? resortEventsForDate(dateStr, filtered) : filtered;
    });

    setEventToDelete(null);
    setModalOpen(false);

    try {
      const { error } = await supabase
        .from('hospital_events')
        .delete()
        .eq('id', idToDelete);

      if (error) throw error;

      // Re-sync slot numbers for the remaining events of that day
      const updatedList = events.filter(e => e.id !== idToDelete);
      const remaining = updatedList.filter(e => e.event_date === dateStr);

      const payload = remaining.map((e, idx) => ({
        id: e.id && !e.id.startsWith('default-') && !e.id.startsWith('evt-') ? e.id : undefined,
        event_date: e.event_date,
        event_time: e.event_time,
        slot_number: idx + 1,
        title: e.title,
        responsible: e.responsible,
        description: e.description,
        estimated_duration: Number(e.estimated_duration) || 60,
        updated_at: new Date().toISOString()
      }));

      if (payload.length > 0) {
        const { error: upsertError } = await supabase
          .from('hospital_events')
          .upsert(payload, { onConflict: 'event_date,slot_number' });
        if (upsertError) throw upsertError;
      }

      showToast('Evento excluído com sucesso!', 'success');
    } catch (error: any) {
      console.error('Erro ao excluir evento no Supabase:', error);
      showToast('Erro ao excluir o evento. As alterações foram desfeitas.', 'error');
      setEvents(previousEvents);
    }
  };

  const handleMoveEvent = useCallback(async (eventId: string, targetDate: string, targetSlot?: number) => {
    if (isPublicMode) {
      showToast("Acesso Negado: Você está no modo de visualização pública apenas leitura.", 'error');
      return;
    }
    const eventToMove = events.find(e => e.id === eventId);
    if (!eventToMove) return;

    const sourceDate = eventToMove.event_date;

    // Ensure targetDate is strictly formatted as standard Postgres ISO (YYYY-MM-DD)
    let destinationDate = targetDate;
    if (typeof destinationDate === 'string') {
      const parts = destinationDate.split('/');
      if (parts.length === 3) {
        destinationDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(destinationDate)) {
        try {
          destinationDate = formatLocalDate(new Date(destinationDate));
        } catch (e) {
          destinationDate = formatLocalDate(new Date());
        }
      }
    }

    let destinationSlot = targetSlot;
    if (destinationSlot === undefined || destinationSlot === null) {
      destinationSlot = eventToMove.slot_number || 1;
    }

    if (isPastDate(sourceDate) || isPastDate(destinationDate)) {
      showToast("Operação Inválida: Não é permitido mover ou agendar eventos em datas passadas.", 'error');
      return;
    }

    const targetCount = events.filter(e => e.event_date === destinationDate && e.id !== eventId).length;
    if (targetCount >= 4) {
      showToast("Operação Inválida: Este dia já possui o limite máximo de 4 eventos cadastrados.", 'error');
      return;
    }

    const durationVal = Number(eventToMove.estimated_duration) || 60;
    const hasCollision = checkScheduleCollision(
      destinationDate,
      eventToMove.event_time,
      durationVal,
      events,
      eventId
    );

    if (hasCollision) {
      showToast("Conflito de Agendamento: Já existe um evento ocupando este período de horário. Escolha um horário livre após o término do evento anterior.", 'error');
      return;
    }

    const previousEvents = [...events];

    let updatedList = events.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          event_date: destinationDate,
          slot_number: destinationSlot,
          updated_at: new Date().toISOString()
        };
      }
      return e;
    });

    updatedList = resortEventsForDate(destinationDate, updatedList);
    if (sourceDate !== destinationDate) {
      updatedList = resortEventsForDate(sourceDate, updatedList);
    }

    setEvents(updatedList);

    try {
      const { error } = await supabase
        .from('hospital_events')
        .update({
          event_date: destinationDate,
          slot_number: destinationSlot,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;
      showToast('Posição atualizada com sucesso!', 'success');
    } catch (err: any) {
      console.error("🛑 Falha ao mover evento no Supabase:", err);
      showToast('Erro ao mover o evento. O card voltou à posição original.', 'error');
      setEvents(previousEvents);
    }
  }, [events, isPublicMode]);

  const handleGoHome = useCallback(() => {
    setCurrentView('calendar');
    setSelectedDate(new Date());
    setModalOpen(false);
    setChoiceModalOpen(false);
    setSelectedDayExpanded(null);
    setEventToDelete(null);
    setPendingCreateSlot(null);
  }, []);

  // Day-by-Day rolling navigation handlers
  const handleNavigateWeek = (direction: 'prev' | 'next' | 'today') => {
    const nextDate = new Date(selectedDate);
    if (direction === 'prev') {
      // Subtrair 1 dia para retroceder
      nextDate.setDate(selectedDate.getDate() - 1);
    } else if (direction === 'next') {
      // Somar 1 dia para avançar
      nextDate.setDate(selectedDate.getDate() + 1);
    } else {
      setSelectedDate(new Date());
      return;
    }
    setSelectedDate(nextDate);
  };

  // Event modal openers
  const handleOpenCreateSlot = useCallback((dateStr: string, slotNum: number) => {
    if (isPublicMode) return;
    setPendingCreateSlot({ dateStr, slotNum });
    setPendingIsGlobal(false);
    setChoiceModalOpen(true);
  }, [isPublicMode]);

  const handleOpenGlobalCreate = () => {
    if (isPublicMode) return;
    setPendingCreateSlot({ dateStr: formatLocalDate(new Date()), slotNum: 1 });
    setPendingIsGlobal(true);
    setChoiceModalOpen(true);
  };

  const executeCreateScratch = () => {
    if (!pendingCreateSlot) return;
    setModalDate(pendingCreateSlot.dateStr);
    setModalSlot(pendingCreateSlot.slotNum);
    setModalEvent(null);
    setModalIsGlobal(pendingIsGlobal);
    setModalOpen(true);
    setChoiceModalOpen(false);
    setPendingCreateSlot(null);
  };

  const executeCreateFromTemplate = (template: EventTemplate) => {
    if (!pendingCreateSlot) return;
    setModalDate(pendingCreateSlot.dateStr);
    setModalSlot(pendingCreateSlot.slotNum);
    setModalEvent({
      event_date: pendingCreateSlot.dateStr,
      event_time: '',
      slot_number: pendingCreateSlot.slotNum,
      title: template.title || '',
      responsible: template.responsible || '',
      description: template.description || '',
      estimated_duration: template.estimated_duration || 60
    });
    setModalIsGlobal(pendingIsGlobal);
    setModalOpen(true);
    setChoiceModalOpen(false);
    setPendingCreateSlot(null);
  };

  const handleOpenEditSlot = useCallback((event: HospitalEvent) => {
    if (isPublicMode) return;
    setModalDate(event.event_date);
    setModalSlot(event.slot_number);
    setModalEvent(event);
    setModalIsGlobal(false);
    setModalOpen(true);
  }, [isPublicMode]);



  const handleSlotClick = useCallback((dateStr: string, slotNum: number, event?: HospitalEvent) => {
    if (event) {
      handleOpenEditSlot(event);
    } else {
      handleOpenCreateSlot(dateStr, slotNum);
    }
  }, [handleOpenEditSlot, handleOpenCreateSlot]);

  const handleDayClick = useCallback((dateStr: string, color: string, dayName: string, fullDateLabel: string) => {
    setSelectedDayExpanded({ dateStr, color, dayName, fullDateLabel });
  }, []);

  const handleShareLink = async () => {
    try {
      const publicUrl = window.location.origin + window.location.pathname + "?mode=public";
      await navigator.clipboard.writeText(publicUrl);
      showToast("Link de visualização pública copiado! Cole no canal do Discord para os funcionários.", 'success');
    } catch (err) {
      console.error('Erro ao copiar link:', err);
      showToast("Erro ao copiar o link para a área de transferência.", 'error');
    }
  };

  // Month range label for visual clarity
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    
    const startOption: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const endOption: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    
    return `${start.toLocaleDateString('pt-BR', startOption)} — ${end.toLocaleDateString('pt-BR', endOption)}`;
  }, [weekDays]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 animate-duration-1000" />
        <span className="text-gray-500 font-medium animate-pulse">Carregando cronograma de eventos...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50 text-gray-800 relative">
      {/* Toast Notification Alert (Placed outside the capture preview wrapper container) */}
      {toast.visible && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in duration-300 pointer-events-none select-none">
          <div className={`flex items-center gap-3 ${
            toast.type === 'error'
              ? 'bg-red-950/90 border border-red-800/60 text-red-200'
              : 'bg-emerald-950/90 border border-emerald-800/60 text-emerald-200'
          } px-4 py-3.5 rounded-xl shadow-xl max-w-sm backdrop-blur-md`}>
            <div className={`w-5 h-5 rounded-full ${
              toast.type === 'error'
                ? 'bg-red-900 border border-red-700/80 text-red-300'
                : 'bg-emerald-900 border border-emerald-700/80 text-emerald-300'
            } flex items-center justify-center font-bold shrink-0 text-[10px]`}>
              {toast.type === 'error' ? '!' : '✓'}
            </div>
            <p className="text-xs font-semibold leading-relaxed">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* Top Premium Navigation Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 
              onClick={handleGoHome}
              className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity active:scale-95 select-none"
              title="Ir para o Início / Calendário"
            >
              <CalendarIcon className="text-blue-600 w-6 h-6" />
              Hospital Event Manager
            </h1>
            <p className="text-xs text-gray-500 font-medium">Controle Avançado de Escalas e Cronogramas • V2</p>
          </div>
        </div>
        
        {/* Navigation & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Actions */}
          <div className="flex gap-4">
            {!isPublicMode && (
              <button
                onClick={() => setCurrentView('templates')}
                className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 h-11 rounded-xl transition-all font-bold shadow-sm shrink-0"
              >
                <Settings size={20} />
                <span className="hidden sm:inline">Gerenciar Modelos</span>
              </button>
            )}
              <button
                onClick={() => handleNavigateWeek('today')}
                className="px-4 h-11 flex items-center justify-center text-sm font-bold bg-white border border-gray-200 hover:bg-gray-50 hover:text-blue-600 rounded-xl shadow-sm transition-all text-gray-700 select-none shrink-0"
                title="Ir para a data de hoje"
              >
              Hoje
            </button>
            
            <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm p-0.5 h-11 shrink-0">
              <button
                onClick={() => handleNavigateWeek('prev')}
                className="p-1.5 hover:bg-gray-100 hover:text-blue-600 rounded-md transition-all text-gray-600"
                title="Dia Anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => handleNavigateWeek('next')}
                className="p-1.5 hover:bg-gray-100 hover:text-blue-600 rounded-md transition-all text-gray-600"
                title="Próximo Dia"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg shadow-sm hidden md:block select-none">
            {weekRangeLabel}
          </div>

          {/* "+ Novo Evento" Global Button */}
          {!isPublicMode && (
            <button
              onClick={handleOpenGlobalCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 h-11 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-md shadow-sm shrink-0"
            >
              <Plus size={18} className="stroke-[3]" />
              Novo Evento
            </button>
          )}

          {/* "🔗 Compartilhar Link" Button */}
          {!isPublicMode && (
            <button
              onClick={handleShareLink}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 h-11 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-md shadow-sm shrink-0"
            >
              <span className="text-sm">🔗</span>
              Compartilhar Link
            </button>
          )}
          

        </div>
      </header>

      {/* Closed Sidebar Floating Trigger */}
      {!isPublicMode && !isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-white/10 text-white w-8 h-8 rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all duration-300 hover:scale-110 focus:outline-none"
          title="Abrir Menu Lateral"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Main Content Area */}
      <main className={`h-[calc(100vh-80px)] p-6 flex flex-col xl:flex-row overflow-hidden transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'gap-6' : 'gap-0'
      }`}>
        {/* Left Side: Control Panel Overview (SaaS activity feed style) */}
        {!isPublicMode && (
          <div 
            className={`h-full transition-all duration-300 ease-in-out flex-shrink-0 flex flex-col relative bg-slate-900 border-r border-white/5 rounded-2xl ${
              isSidebarOpen 
                ? 'w-80 opacity-100 px-6 py-4' 
                : 'w-0 opacity-0 overflow-hidden p-0'
            }`}
          >
            {/* When Open, place the circular close button floating on the divider boundary */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-white/10 text-white w-8 h-8 rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all duration-300 hover:scale-110 focus:outline-none"
                title="Fechar Menu"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div className={`w-full h-full transition-all duration-200 ${
              isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'hidden opacity-0 pointer-events-none'
            }`}>
              <ControlPanel events={events} />
            </div>
          </div>
        )}

        {/* Right Side: Big Premium Preview Grid */}
        <div className="flex-1 min-w-0 h-full rounded-2xl border border-gray-200 shadow-inner overflow-x-auto overflow-y-hidden flex bg-[#EFEFEF]">
          {currentView === 'templates' && !isPublicMode ? (
            <TemplateManager
              templates={templates}
              onBack={() => setCurrentView('calendar')}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              isSaving={isSavingTemplate}
            />
          ) : (
            <div ref={previewRef} className="w-full min-w-[1250px] h-full flex flex-col">
                <SchedulePreview 
                  weekDays={weekDays}
                  eventsMap={eventsMap}
                  onSlotClick={handleSlotClick}
                  onDayClick={handleDayClick}
                  onMoveEvent={handleMoveEvent}
                  isPublicMode={isPublicMode}
                  onNavigateWeek={handleNavigateWeek}
                  isWeekLoading={isWeekLoading}
                  onLogoClick={handleGoHome}
                />
            </div>
          )}
        </div>
      </main>

      {choiceModalOpen && (
        <TemplateChoiceModal
          isOpen={choiceModalOpen}
          onClose={() => setChoiceModalOpen(false)}
          templates={templates}
          onChooseScratch={executeCreateScratch}
          onChooseTemplate={executeCreateFromTemplate}
        />
      )}

      {/* Reusable Event Dialog */}
      {modalOpen && (
        <DayModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          dateStr={modalDate}
          slotNumber={modalSlot}
          initialData={modalEvent}
          isGlobal={modalIsGlobal}
          allEvents={events}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          showToast={showToast}
        />
      )}

      {/* Daily Dashboard Expansion */}
      {selectedDayExpanded && (
        <DailyDashboardModal
          isOpen={!!selectedDayExpanded}
          onClose={() => setSelectedDayExpanded(null)}
          dateStr={selectedDayExpanded.dateStr}
          color={selectedDayExpanded.color}
          events={eventsMap[selectedDayExpanded.dateStr] ? Object.values(eventsMap[selectedDayExpanded.dateStr]) : []}
          dayName={selectedDayExpanded.dayName}
          fullDateLabel={selectedDayExpanded.fullDateLabel}
        />
      )}

      {/* Premium Deletion Confirmation Modal Pop-up */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-[2rem] max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xs font-bold tracking-[0.2em] text-red-400 uppercase mb-2">
              EXCLUIR PLANTÃO?
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Tem certeza que deseja remover este evento? Esta ação é permanente e excluirá o registro do banco de dados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white border border-red-500/30 text-sm font-semibold transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
