import React, { useState, useRef, useCallback } from 'react';
import { COLUMN_COLORS, getWeekdayName, formatLocalDate, formatDayMonth, isEventPast } from '../types';
import type { HospitalEvent } from '../types';
import { Check, Bell, Plus, Lock, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

interface SchedulePreviewProps {
  weekDays: Date[];
  eventsMap: Record<string, Record<number, HospitalEvent>>;
  onSlotClick: (dateStr: string, slotNum: number, event?: HospitalEvent) => void;
  onDayClick?: (dateStr: string, color: string, dayName: string, fullDateLabel: string) => void;
  onMoveEvent: (eventId: string, targetDate: string) => void;
  isPublicMode?: boolean;
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
}

const MemoizedEventSlot = React.memo(function MemoizedEventSlot({
  dateStr, slotNum, event, isColPast, isPublicMode, color, dayName, dateLabel, onSlotClick, onDayClick
}: MemoizedEventSlotProps) {
  const isFilled = !!event;
  const isPast = isFilled && isEventPast(event!.event_date, event!.event_time);

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
          e.dataTransfer.setData('text/plain', JSON.stringify({ eventId: event!.id }));
          e.dataTransfer.effectAllowed = 'move';
        }}
        className={w-full flex-1 min-h-[110px] rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-200 shadow-sm relative overflow-hidden group }
        title={
          isPast && !isPublicMode
            ? "Consolidado:  + event!.title + \nHorário:  + event!.event_time + \nResponsável:  + event!.responsible +  (Apenas Leitura)"
            : "Slot  + slotNum + :  + event!.title + \nHorário:  + event!.event_time + \nResponsável:  + event!.responsible + \n + (event!.description || '') + "
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
        <div className="flex flex-col items-center justify-center w-full space-y-2">
          <span className="text-white font-black text-lg md:text-xl text-center leading-none tracking-tight block w-full">
            {event!.event_time}
            <span className="text-[10px] opacity-75 font-extrabold align-middle ml-1">
              ({event!.estimated_duration === 30 ? '30m' : event!.estimated_duration === 120 ? '2h' : '1h'})
            </span>
          </span>
          <div className="w-12 h-[1px] bg-white/25 shrink-0" />
          <span className="text-white font-black text-base md:text-lg tracking-wider uppercase text-center leading-tight block w-full">
            {event!.title}
          </span>
          {event!.description && (
            <span className="text-slate-100 font-medium text-xs md:text-sm text-center leading-relaxed block w-full">
              {event!.description}
            </span>
          )}
        </div>
      </button>
    );
  } else {
    if (isColPast || isPublicMode) {
      return (
        <div className="w-full flex-1 min-h-[110px] bg-transparent rounded-2xl" />
      );
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSlotClick(dateStr, slotNum);
        }}
        className="w-full flex-1 min-h-[110px] border-2 border-dashed rounded-2xl flex items-center justify-center transition-all duration-200 group border-white/15 hover:border-white/45 bg-transparent hover:bg-white/5"
        title={Adicionar Evento no Slot }
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
  onMoveEvent: (eventId: string, targetDate: string) => void;
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
      className="w-[320px] min-w-[320px] max-w-[320px] flex flex-col items-center transition-all duration-200 snap-center shrink-0"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        onClick={() => {
          if (onDayClick) {
            onDayClick(dateStr, color, dayName, dateLabel);
          }
        }}
        className={w-full h-full min-h-[680px] h-auto rounded-[1.75rem] py-6 px-3 flex flex-col justify-between items-center relative card-shadow-premium overflow-hidden border transition-all duration-300 cursor-pointer }
        style={{ backgroundColor: color }}
      >
        <div className="glass-reflection" />
        <div className="absolute top-0 left-0 w-full h-[3px] bg-white/20" />

        <div 
          className="w-full flex items-center justify-between px-1.5 mb-4 relative z-10 group/header cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (onDayClick) {
              onDayClick(dateStr, color, dayName, dateLabel);
            }
          }}
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
              className={w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 }
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

        <div className="w-full flex-1 flex flex-col gap-y-3 relative z-10 justify-between pb-4">
          {[1, 2, 3, 4].map((slotNum) => (
            <MemoizedEventSlot
              key={slot--}
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
            />
          ))}
        </div>
      </div>

      <div 
        className="mt-4 px-4 py-1.5 rounded-full text-white text-[0.62rem] font-extrabold tracking-[0.18em] uppercase shadow-lg z-20 transition-transform duration-300 hover:scale-105 select-none"
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
  isPublicMode = false
}: SchedulePreviewProps) {

  // State to track which day column is currently hovered by a dragged item
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Carousel & Drag-to-Scroll refs and states
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setStartX(e.pageX - (carouselRef.current?.offsetLeft || 0));
    setScrollLeftState(carouselRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    carouselRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleScroll = (direction: 'prev' | 'next') => {
    if (!carouselRef.current) return;
    const scrollAmount = direction === 'prev' ? -340 : 340;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div 
      id="schedule-preview-container"
      className="bg-[#EFEFEF] flex-1 w-full h-full min-h-[720px] py-10 px-8 flex flex-col relative overflow-hidden font-sans select-none"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between mb-8 px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-700 to-purple-400 rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-lg relative overflow-hidden">
            <span className="relative z-10">+</span>
            <div className="absolute inset-0 bg-white/10 opacity-50"></div>
          </div>
          <div className="leading-tight">
            <div className="text-gray-500 text-[10px] font-extrabold tracking-widest">HOSPITAL</div>
            <div className="text-gray-800 text-xs font-black tracking-widest">CIDADE GRANDE</div>
          </div>
        </div>

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
        className="flex-1 flex flex-row overflow-x-auto gap-4 p-4 scroll-smooth snap-x snap-mandatory relative z-10 mb-6 select-none cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {weekDays.map((dateObj, idx) => {
          const dateStr = formatLocalDate(dateObj);
          const dateLabel = formatDayMonth(dateObj);
          const dayName = getWeekdayName(dateObj);
          
          // Map colors to fixed column indexes (0 to 6) to preserve aesthetic palette
          const color = COLUMN_COLORS[idx];
          
          const todayStr = formatLocalDate(new Date());
          const isTodayCol = dateStr === todayStr;
          const isColPast = dateStr < todayStr;


          // Get events for this specific date
          const dayEvents = eventsMap[dateStr] || {};
          const filledSlots = Object.keys(dayEvents).map(Number);
          const hasAnyEvent = filledSlots.length > 0;
          
          // Hover highlighting state for the whole day card column
          const isDayHovered = dragOverDay === dateStr && !isColPast;

          return (
            <div 
              key={dateStr} 
              className="w-[320px] min-w-[320px] max-w-[320px] flex flex-col items-center transition-all duration-200 snap-center shrink-0"
              
              // Column-level drop listeners
              onDragOver={(e) => {
                if (isColPast || isPublicMode) return; // Disallow dragging to past days or in public mode
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDragEnter={() => {
                if (isColPast || isPublicMode) return;
                setDragOverDay(dateStr);
              }}
              onDragLeave={() => {
                if (isPublicMode) return;
                setDragOverDay(prev => prev === dateStr ? null : prev);
              }}
              onDrop={(e) => {
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
              }}
            >
              {/* The Card with glowing borders for Dia Atual (Index 3) */}
              <div 
                onClick={() => {
                  if (onDayClick) {
                    onDayClick(dateStr, color, dayName, dateLabel);
                  }
                }}
                className={`w-full h-full min-h-[680px] h-auto rounded-[1.75rem] py-6 px-3 flex flex-col justify-between items-center relative card-shadow-premium overflow-hidden border transition-all duration-300 cursor-pointer ${
                  isDayHovered
                    ? 'ring-4 ring-emerald-400 ring-offset-2 scale-[1.02] shadow-2xl border-solid z-20'
                    : isTodayCol
                    ? 'ring-4 ring-white/30 border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.25)] scale-[1.01] z-10'
                    : 'border-black/5'
                }`}
                style={{ backgroundColor: color }}
              >
                {/* Metallic/Glass Highlight Effect */}
                <div className="glass-reflection" />
                
                {/* Inner subtle top border accent */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-white/20" />

                {/* Day Card Header with Date, "HOJE" badge, and Mini-Alarm */}
                <div 
                  className="w-full flex items-center justify-between px-1.5 mb-4 relative z-10 group/header cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDayClick) {
                      onDayClick(dateStr, color, dayName, dateLabel);
                    }
                  }}
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
                    {/* Expand Dashboard Icon Trigger */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDayClick) {
                          onDayClick(dateStr, color, dayName, dateLabel);
                        }
                      }}
                      className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-all duration-300 hover:bg-white/30 hover:scale-110 cursor-pointer" 
                      title="Expandir VisÃ£o do Dia"
                    >
                      <Maximize2 size={12} className="text-white" />
                    </div>

                    {/* Glowing alarm ring to indicate day status */}
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

                {/* Vertical Stack of exactly 4 Slots */}
                <div className="w-full flex-1 flex flex-col gap-y-3 relative z-10 justify-between pb-4">
                  {[1, 2, 3, 4].map((slotNum) => {
                    const event = dayEvents[slotNum];
                    const isFilled = !!event;
                    
                    // Determine if this event is time-locked (past)
                    const isPast = isFilled && isEventPast(event.event_date, event.event_time);

                    if (isFilled) {
                      return (
                        <button
                          key={`slot-${dateStr}-${slotNum}`}
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
                          
                          // Native Drag and Drop properties - blocked if event belongs in the past (Time-Locked) or in public mode
                          draggable={!isPast && !isPublicMode}
                          onDragStart={(e) => {
                            if (isPublicMode) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('text/plain', JSON.stringify({ eventId: event.id }));
                            e.dataTransfer.effectAllowed = 'move';
                          }}

                          // Centered visual typographic redesign with focus on huge time
                          className={`w-full flex-1 min-h-[110px] rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-200 shadow-sm relative overflow-hidden group ${
                            isPast && !isPublicMode
                              ? 'bg-white/5 border border-white/10 opacity-70 cursor-default'
                              : 'bg-white/12 hover:bg-white/22 border border-white/20 hover:border-white/40 hover:scale-[1.03]'
                          }`}
                          title={
                            isPast && !isPublicMode
                              ? `Consolidado: ${event.title}\nHorÃ¡rio: ${event.event_time}\nResponsÃ¡vel: ${event.responsible} (Apenas Leitura)`
                              : `Slot ${slotNum}: ${event.title}\nHorÃ¡rio: ${event.event_time}\nResponsÃ¡vel: ${event.responsible}\n${event.description || ''}`
                          }
                        >
                          {/* Discrete slot indicator in corner */}
                          <span className="absolute top-1.5 right-2.5 text-[8px] font-black tracking-widest text-white/30 uppercase select-none">
                            S{slotNum}
                          </span>

                          {/* Time-Lock Indicator lock icon (hidden in public mode) */}
                          {isPast && !isPublicMode && (
                            <span className="absolute top-1.5 left-2.5 text-white/45 select-none animate-pulse" title="Time-Locked">
                              <Lock size={10} />
                            </span>
                          )}
                          
                          <div className="flex flex-col items-center justify-center w-full space-y-2">
                            {/* Huge prominent Time Display with Estimated Duration label */}
                            <span className="text-white font-black text-lg md:text-xl text-center leading-none tracking-tight block w-full">
                              {event.event_time}
                              <span className="text-[10px] opacity-75 font-extrabold align-middle ml-1">
                                ({event.estimated_duration === 30 ? '30m' : event.estimated_duration === 120 ? '2h' : '1h'})
                              </span>
                            </span>

                            {/* Ultra-sutil horizontal line divider */}
                            <div className="w-12 h-[1px] bg-white/25 shrink-0" />

                            {/* Centered Event Title (Max contrast and weight) */}
                            <span className="text-white font-black text-base md:text-lg tracking-wider uppercase text-center leading-tight block w-full">
                              {event.title}
                            </span>

                            {/* Centered Event Description (Highly legible body) */}
                            {event.description && (
                              <span className="text-slate-100 font-medium text-xs md:text-sm text-center leading-relaxed block w-full">
                                {event.description}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    } else {
                      // Empty Slot: If column belongs to the past (idx < 3) OR public mode, render clean blank space
                      if (isColPast || isPublicMode) {
                        return (
                          <div 
                            key={`slot-${dateStr}-${slotNum}`}
                            className="w-full flex-1 min-h-[110px] bg-transparent rounded-2xl"
                          />
                        );
                      }

                      // Empty Slot: standard interactive mode with dotted border
                      return (
                        <button
                          key={`slot-${dateStr}-${slotNum}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotClick(dateStr, slotNum);
                          }}
                          className="w-full flex-1 min-h-[110px] border-2 border-dashed rounded-2xl flex items-center justify-center transition-all duration-200 group border-white/15 hover:border-white/45 bg-transparent hover:bg-white/5"
                          title={`Adicionar Evento no Slot ${slotNum}`}
                        >
                          <Plus size={16} className="text-white/20 transition-all duration-200 group-hover:text-white/70 group-hover:scale-110" />
                        </button>
                      );
                    }
                  })}
                </div>
              </div>

              {/* Day Pill: Dynamic weekday name in Portuguese */}
              <div 
                className="mt-4 px-4 py-1.5 rounded-full text-white text-[0.62rem] font-extrabold tracking-[0.18em] uppercase shadow-lg z-20 transition-transform duration-300 hover:scale-105 select-none"
                style={{ backgroundColor: '#2E0821' }}
              >
                {dayName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Timeline */}
      <div className="absolute bottom-14 left-0 w-full px-10 flex justify-between z-0">
        {/* Timeline line */}
        <div className="absolute top-1/2 left-10 right-10 h-[2px] -translate-y-1/2 bg-gray-300/40 z-0 border-t border-dashed border-gray-400/50"></div>
        
        {/* Timeline dots mapped to fixed column colors */}
        {weekDays.map((dateObj, idx) => {
          return (
            <div key={`dot-${dateObj}`} className="relative z-10 flex-1 flex justify-center">
              <div 
                className="w-3.5 h-3.5 rounded-full border-[3px] border-[#EFEFEF] shadow-sm transition-transform duration-300 hover:scale-125"
                style={{ backgroundColor: COLUMN_COLORS[idx] }}
              ></div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

