import React, { useState, useRef, useCallback, useEffect } from 'react';
import { COLUMN_COLORS, getWeekdayName, formatLocalDate, formatDayMonth, isPastDate } from '../types';
import type { HospitalEvent } from '../types';
import { Check, Bell, Plus, Lock, Maximize2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface SchedulePreviewProps {
  weekDays: Date[];
  eventsMap: Record<string, Record<number, HospitalEvent>>;
  onSlotClick: (dateStr: string, slotNum: number, event?: HospitalEvent) => void;
  onDayClick?: (dateStr: string, color: string, dayName: string, fullDateLabel: string) => void;
  onMoveEvent: (eventId: string, targetDate: string, targetSlot?: number) => void;
  isPublicMode?: boolean;
  onNavigateWeek?: (direction: 'prev' | 'next' | 'today') => void;
  isWeekLoading?: boolean;
  onLogoClick?: () => void;
}

interface MemoizedEventSlotProps {
  dateStr: string;
  slotNum: number;
  event?: HospitalEvent;
  isColPast: boolean;
  isPublicMode: boolean;
  color: string;
  dayName: string;
  dateLabel: string;
  onSlotClick: (dateStr: string, slotNum: number, event?: HospitalEvent) => void;
  onDayClick?: (dateStr: string, color: string, dayName: string, fullDateLabel: string) => void;
  onMoveEvent: (eventId: string, targetDate: string, targetSlot?: number) => void;
}

const MemoizedEventSlot = React.memo(function MemoizedEventSlot({
  dateStr, slotNum, event, isColPast, isPublicMode, color, dayName, dateLabel, onSlotClick, onDayClick, onMoveEvent
}: MemoizedEventSlotProps) {
  const isFilled = !!event;
  // Check if event belongs to a past day to disable editing/dragging
  const isPast = isFilled && isPastDate(event.event_date);

  if (isFilled) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isPublicMode) {
            if (onDayClick) {
              onDayClick(dateStr, color, dayName, dateLabel);
            }
          } else {
            onSlotClick(dateStr, slotNum, event);
          }
        }}
        draggable={!isPast && !isPublicMode}
        onDragStart={(e) => {
          if (isPublicMode) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('text/plain', JSON.stringify({ eventId: event.id }));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (isColPast || isPublicMode) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          if (isColPast || isPublicMode) return;
          e.preventDefault();
          e.stopPropagation();
          try {
            const rawData = e.dataTransfer.getData('text/plain');
            if (!rawData) return;
            const { eventId } = JSON.parse(rawData);
            if (eventId) {
              onMoveEvent(eventId, dateStr, slotNum);
            }
          } catch (err) {
            console.error('Failed to parse drag payload:', err);
          }
        }}
        className={`w-full max-w-full flex-1 min-h-[90px] rounded-2xl p-2 flex flex-col items-center justify-center transition-all duration-200 shadow-sm relative overflow-hidden group backdrop-blur-sm ${
          isPast && !isPublicMode
            ? 'bg-white/5 border border-white/10 opacity-70 cursor-default'
            : 'bg-white/12 hover:bg-white/22 border border-white/10 hover:border-white/40 hover:scale-[1.03]'
        }`}
        title={
          isPast && !isPublicMode
            ? `Consolidado: ${event.title}\nHorário: ${event.event_time}\nResponsável: ${event.responsible} (Apenas Leitura)`
            : `Slot ${slotNum}: ${event.title}\nHorário: ${event.event_time}\nResponsável: ${event.responsible}\n${event.description || ''}`
        }
      >
        <span className="absolute top-1.5 right-2.5 text-[8px] font-black tracking-widest text-white/30 uppercase select-none">
          S{slotNum}
        </span>
        {isPast && !isPublicMode && (
          <span className="absolute top-1.5 left-2.5 text-white/45 select-none animate-pulse" title="Time-Locked">
            <Lock size={10} />
          </span>
        )}
        <div className="flex flex-col items-center justify-center w-full space-y-1">
          <span className="text-white font-black text-sm md:text-base text-center leading-none tracking-tight block w-full">
            {event.event_time}
            <span className="text-[9px] opacity-75 font-extrabold align-middle ml-1">
              ({event.estimated_duration === 30 ? '30m' : event.estimated_duration === 120 ? '2h' : '1h'})
            </span>
          </span>
          <div className="w-8 h-[1px] bg-white/25 shrink-0" />
          <span className="text-white font-black text-xs md:text-sm tracking-wider uppercase text-center leading-tight block w-full truncate break-words px-1">
            {event.title}
          </span>
          {event.description && (
            <span className="text-slate-100 font-medium text-[9px] md:text-[10px] text-center leading-relaxed block w-full overflow-hidden text-ellipsis line-clamp-2 break-words px-1">
              {event.description}
            </span>
          )}
        </div>
      </button>
    );
  } else {
    if (isColPast || isPublicMode) {
      return <div className="w-full flex-1 min-h-[90px] bg-transparent rounded-2xl" />;
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSlotClick(dateStr, slotNum);
        }}
        onDragOver={(e) => {
          if (isColPast || isPublicMode) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          if (isColPast || isPublicMode) return;
          e.preventDefault();
          e.stopPropagation();
          try {
            const rawData = e.dataTransfer.getData('text/plain');
            if (!rawData) return;
            const { eventId } = JSON.parse(rawData);
            if (eventId) {
              onMoveEvent(eventId, dateStr, slotNum);
            }
          } catch (err) {
            console.error('Failed to parse drag payload:', err);
          }
        }}
        className="w-full flex-1 min-h-[90px] border-2 border-dashed rounded-2xl flex items-center justify-center transition-all duration-200 group border-white/15 hover:border-white/45 bg-transparent hover:bg-white/5"
        title={`Adicionar Evento no Slot ${slotNum}`}
      >
        <Plus size={16} className="text-white/20 transition-all duration-200 group-hover:text-white/70 group-hover:scale-110" />
      </button>
    );
  }
});

interface MemoizedDayColumnProps {
  dateStr: string;
  dateLabel: string;
  dayName: string;
  color: string;
  isTodayCol: boolean;
  isColPast: boolean;
  isPublicMode: boolean;
  dayEvents: Record<number, HospitalEvent>;
  isDayHovered: boolean;
  hasAnyEvent: boolean;
  onSlotClick: (dateStr: string, slotNum: number, event?: HospitalEvent) => void;
  onDayClick?: (dateStr: string, color: string, dayName: string, fullDateLabel: string) => void;
  onMoveEvent: (eventId: string, targetDate: string, targetSlot?: number) => void;
  dragOverDay: string | null;
  setDragOverDay: React.Dispatch<React.SetStateAction<string | null>>;
}

const MemoizedDayColumn = React.memo(function MemoizedDayColumn({
  dateStr, dateLabel, dayName, color, isTodayCol, isColPast, isPublicMode,
  dayEvents, isDayHovered, hasAnyEvent, onSlotClick, onDayClick, onMoveEvent, setDragOverDay
}: MemoizedDayColumnProps) {

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isColPast || isPublicMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [isColPast, isPublicMode]);

  const handleDragEnter = useCallback(() => {
    if (isColPast || isPublicMode) return;
    setDragOverDay(dateStr);
  }, [isColPast, isPublicMode, dateStr, setDragOverDay]);

  const handleDragLeave = useCallback(() => {
    if (isPublicMode) return;
    setDragOverDay(prev => prev === dateStr ? null : prev);
  }, [isPublicMode, dateStr, setDragOverDay]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isColPast || isPublicMode) return;
    e.preventDefault();
    setDragOverDay(null);
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { eventId } = JSON.parse(rawData);
      if (eventId) {
        onMoveEvent(eventId, dateStr);
      }
    } catch (err) {
      console.error('Failed to parse drag payload:', err);
    }
  }, [isColPast, isPublicMode, dateStr, onMoveEvent, setDragOverDay]);

  return (
    <div 
      className="w-[280px] min-w-[280px] max-w-[280px] flex flex-col items-center transition-all duration-200 snap-center shrink-0"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className={`w-full h-[calc(100vh-180px)] rounded-[1.75rem] p-3 flex flex-col justify-between items-center relative card-shadow-premium overflow-hidden border transition-all duration-300 ${
          isDayHovered
            ? 'ring-4 ring-emerald-400 ring-offset-2 scale-[1.02] shadow-2xl border-solid z-20'
            : isTodayCol
            ? 'ring-4 ring-white/30 border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.25)] scale-[1.01] z-10'
            : 'border-black/5'
        }`}
        style={{ backgroundColor: color }}
      >
        <div className="glass-reflection" />
        <div className="absolute top-0 left-0 w-full h-[3px] bg-white/20" />

        <div 
          className="w-full flex items-center justify-between px-1.5 mb-4 relative z-10 group/header"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-white/95 text-base font-black tracking-wider pt-0.5 group-hover/header:text-white transition-colors">
              {dateLabel}
            </span>
            {isTodayCol && (
              <span className="bg-white text-gray-900 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full select-none shadow animate-pulse shrink-0">
                HOJE
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onDayClick) {
                  onDayClick(dateStr, color, dayName, dateLabel);
                }
              }}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-all duration-300 hover:bg-white/30 hover:scale-110 cursor-pointer" 
              title="Expandir Visão do Dia"
            >
              <Maximize2 size={12} className="text-white" />
            </div>

            <div 
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ${
                hasAnyEvent ? 'alarm-glow-green' : 'alarm-glow-red'
              }`}
              title={hasAnyEvent ? 'Eventos Agendados' : 'Sem Evento (Alerta)'}
            >
              {hasAnyEvent ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              ) : (
                <Bell className="w-3 h-3 text-rose-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)] animate-bounce" />
              )}
            </div>
          </div>
        </div>

        <div className="w-full flex-1 flex flex-col space-y-2 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-10 pb-2">
          {[1, 2, 3, 4].map((slotNum) => (
            <MemoizedEventSlot
              key={`slot-${dateStr}-${slotNum}`}
              dateStr={dateStr}
              slotNum={slotNum}
              event={dayEvents[slotNum]}
              isColPast={isColPast}
              isPublicMode={isPublicMode}
              color={color}
              dayName={dayName}
              dateLabel={dateLabel}
              onSlotClick={onSlotClick}
              onDayClick={onDayClick}
              onMoveEvent={onMoveEvent}
            />
          ))}
        </div>
      </div>

      <div 
        className="mt-3 px-4 py-1.5 rounded-full text-white text-[0.62rem] font-extrabold tracking-[0.18em] uppercase shadow-lg z-20 transition-transform duration-300 hover:scale-105 select-none"
        style={{ backgroundColor: '#2E0821' }}
      >
        {dayName}
      </div>
    </div>
  );
});

export const SchedulePreview = React.memo(function SchedulePreview({ 
  weekDays, 
  eventsMap, 
  onSlotClick, 
  onDayClick,
  onMoveEvent,
  isPublicMode = false,
  onNavigateWeek,
  isWeekLoading = false,
  onLogoClick
}: SchedulePreviewProps) {
  // State to track which day column is currently hovered by a dragged item
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Helper to find initial active index (default to today, or 0)
  const getTodayIndex = useCallback(() => {
    const todayStr = formatLocalDate(new Date());
    const idx = weekDays.findIndex(d => formatLocalDate(d) === todayStr);
    return idx !== -1 ? idx : 0;
  }, [weekDays]);

  // Carousel ref
  const carouselRef = useRef<HTMLDivElement>(null);

  // Cooldown transition lock to avoid double triggers
  const isTransitioningRef = useRef(false);
  const prevFirstDayRef = useRef<Date | null>(null);

  // Scroll to today's column or handle positioning with Day-by-Day rolling math compensation
  useEffect(() => {
    if (!carouselRef.current) return;

    const prevFirstDay = prevFirstDayRef.current;
    const newFirstDay = weekDays[0];

    prevFirstDayRef.current = newFirstDay;

    if (prevFirstDay) {
      // Calculate how many days the window has shifted (e.g., +1, -1, or more if jumping)
      const diffDays = Math.round((newFirstDay.getTime() - prevFirstDay.getTime()) / (1000 * 60 * 60 * 24));

      if (Math.abs(diffDays) > 3) {
        // Large jump (like clicking "Hoje" / Today): reset to center position
        const todayIdx = getTodayIndex();
        carouselRef.current.scrollLeft = todayIdx * 296;
      } else if (diffDays !== 0) {
        // Continuous rolling shift compensation!
        // Subtract (diffDays * 296px) to keep active cards perfectly static in the viewport
        carouselRef.current.scrollLeft = carouselRef.current.scrollLeft - (diffDays * 296);

        // Lock transitions temporarily for 300ms to allow smooth mouse scroll release
        isTransitioningRef.current = true;
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 300);
      }
    } else {
      // First mount: center on "Hoje" (today)
      const todayIdx = getTodayIndex();
      carouselRef.current.scrollLeft = todayIdx * 296;
    }
  }, [weekDays, getTodayIndex]);

  const handleScroll = (direction: 'prev' | 'next') => {
    if (!onNavigateWeek) return;
    onNavigateWeek(direction);
  };

  const handleScrollEvent = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;

    // If already transitioning, don't trigger again
    if (isTransitioningRef.current || !onNavigateWeek) return;

    // Right edge reached: load next day (+1)
    if (scrollLeft + clientWidth >= scrollWidth - 10) {
      isTransitioningRef.current = true;
      onNavigateWeek('next');
    }
    // Left edge reached: load prev day (-1)
    else if (scrollLeft <= 10) {
      isTransitioningRef.current = true;
      onNavigateWeek('prev');
    }
  }, [onNavigateWeek]);
  return (
    <div 
      id="schedule-preview-container"
      className="bg-[#EFEFEF] flex-1 w-full h-full min-h-[720px] py-10 px-8 flex flex-col relative overflow-hidden font-sans select-none"
    >
      {/* Week Loading Overlay */}
      {isWeekLoading && (
        <div className="absolute inset-0 bg-[#EFEFEF]/40 backdrop-blur-[2px] z-50 flex items-center justify-center transition-all duration-300">
          <div className="bg-white/85 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/50 backdrop-blur-md animate-pulse">
            <Loader2 className="animate-spin text-purple-600" size={24} />
            <span className="font-extrabold text-sm text-gray-700 tracking-wider">Buscando dados da semana...</span>
          </div>
        </div>
      )}
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8 px-4">
        {/* Left: Logo */}
        <button
          onClick={onLogoClick}
          className="cursor-pointer hover:opacity-80 transition-opacity active:scale-95 outline-none border-0 bg-transparent p-0"
          title="Ir para o Início / Calendário"
        >
          <img 
            src="/HOSPITAL_GRANDE.webp" 
            alt="Hospital Cidade Grande" 
            className="h-24 w-auto object-contain transition-all hover:scale-105"
          />
        </button>

        {/* Center: Title */}
        <div className="flex flex-col items-center">
          <div className="text-3xl italic text-gray-500 font-serif mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Cronograma
          </div>
          <div className="text-xl font-black text-gray-900 tracking-[0.25em]">
            EVENTOS DO HOSPITAL
          </div>
        </div>

        {/* Right: Badge */}
        <div className="w-14 h-14 rounded-full border-[3px] border-gray-300 flex items-center justify-center text-gray-400 p-1">
          <div className="w-full h-full rounded-full border-[2px] border-gray-300 flex items-center justify-center">
            <span className="text-[10px] font-black">HCG</span>
          </div>
        </div>
      </div>

      {/* Carousel Navigation Buttons */}
      <button
        onClick={() => handleScroll('prev')}
        className="absolute left-2 top-[55%] -translate-y-1/2 z-20 bg-white/85 hover:bg-white text-gray-800 w-11 h-11 rounded-full shadow-lg border border-gray-200/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Deslizar para a esquerda"
      >
        <ChevronLeft size={24} className="stroke-[2.5]" />
      </button>
      <button
        onClick={() => handleScroll('next')}
        className="absolute right-2 top-[55%] -translate-y-1/2 z-20 bg-white/85 hover:bg-white text-gray-800 w-11 h-11 rounded-full shadow-lg border border-gray-200/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Deslizar para a direita"
      >
        <ChevronRight size={24} className="stroke-[2.5]" />
      </button>

      {/* Main Grid containing all 7 rolling days (left-to-right) */}
      <div 
        ref={carouselRef}
        onScroll={handleScrollEvent}
        className="flex-1 flex flex-row overflow-x-hidden gap-4 p-4 scroll-smooth snap-x snap-mandatory relative z-10 mb-6 select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {weekDays.map((dateObj, idx) => {
          const dateStr = formatLocalDate(dateObj);
          const dateLabel = formatDayMonth(dateObj);
          const dayName = getWeekdayName(dateObj);
          
          // Map colors to fixed column indexes (0 to 6) to preserve aesthetic palette
          const color = COLUMN_COLORS[idx];
          
          const todayStr = formatLocalDate(new Date());
          const isTodayCol = dateStr === todayStr;
          // Lock editing and creation for past columns using isPastDate
          const isColPast = isPastDate(dateStr);

          // Get events for this specific date
          const dayEvents = eventsMap[dateStr] || {};
          const filledSlots = Object.keys(dayEvents).map(Number);
          const hasAnyEvent = filledSlots.length > 0;
          
          // Hover highlighting state for the whole day card column
          const isDayHovered = dragOverDay === dateStr && !isColPast;

          return (
            <MemoizedDayColumn
              key={dateStr}
              dateStr={dateStr}
              dateLabel={dateLabel}
              dayName={dayName}
              color={color}
              isTodayCol={isTodayCol}
              isColPast={isColPast}
              isPublicMode={isPublicMode}
              dayEvents={dayEvents}
              isDayHovered={isDayHovered}
              hasAnyEvent={hasAnyEvent}
              onSlotClick={onSlotClick}
              onDayClick={onDayClick}
              onMoveEvent={onMoveEvent}
              dragOverDay={dragOverDay}
              setDragOverDay={setDragOverDay}
            />
          );
        })}
      </div>
    </div>
  );
});
