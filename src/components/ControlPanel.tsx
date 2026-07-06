import { useMemo } from 'react';
import { getWeekdayName } from '../types';
import type { HospitalEvent } from '../types';
import { Clock, User, ClipboardList } from 'lucide-react';

interface ControlPanelProps {
  events: HospitalEvent[];
}

const getEventMeta = (dateStr: string) => {
  if (!dateStr) return { dayName: '', dateLabel: '' };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { dayName: '', dateLabel: dateStr };
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  
  return {
    dayName: getWeekdayName(dateObj),
    dateLabel: `${parts[2]}/${parts[1]}`
  };
};

export function ControlPanel({ events }: ControlPanelProps) {
  // Sort events chronologically descending
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => b.event_date.localeCompare(a.event_date));
  }, [events]);

  // Group events by date for elegant groupings
  const groupedEvents = useMemo(() => {
    const groups: Record<string, HospitalEvent[]> = {};
    sortedEvents.forEach(evt => {
      if (!groups[evt.event_date]) {
        groups[evt.event_date] = [];
      }
      groups[evt.event_date].push(evt);
    });
    return Object.entries(groups);
  }, [sortedEvents]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[620px] bg-transparent">
      
      {/* Header (High Contrast Activity Hub) */}
      <div className="flex items-center justify-between mb-6 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <h2 className="text-slate-200 font-bold tracking-wider text-xs uppercase">
            Centro de Atividades
          </h2>
          <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-md font-bold">
            {events.length}
          </span>
        </div>
      </div>

      {/* Feed Area: Hidden Scrollbar */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-6">
        {groupedEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 select-none">
            <ClipboardList size={32} className="stroke-[1.5] mb-2 text-slate-600 opacity-70" />
            <p className="text-xs font-bold text-slate-300">Nenhum evento registrado</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              Adicione eventos no cronograma para iniciar o feed de atividades.
            </p>
          </div>
        ) : (
          groupedEvents.map(([dateStr, dayEvents]) => {
            const { dayName, dateLabel } = getEventMeta(dateStr);

            return (
              <div key={dateStr} className="space-y-3">
                
                {/* High Contrast Day Header Divider */}
                <div className="text-purple-400 font-bold border-b border-white/10 pb-1 mt-6 mb-3 text-xs uppercase select-none tracking-wider">
                  {dayName} • {dateLabel}
                </div>

                {/* Day's Event Cards */}
                <div className="space-y-3">
                  {dayEvents.map(evt => (
                    <div
                      key={evt.id}
                      className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-3 hover:bg-slate-800 transition-all shadow-md flex items-start gap-3 group/card"
                    >
                      {/* Left icon wrapper */}
                      <div className="bg-slate-700/50 p-2 rounded-lg text-slate-300 shrink-0 group-hover/card:bg-slate-700 group-hover/card:text-white transition-colors border border-slate-600/30">
                        <ClipboardList size={14} className="stroke-[2.5]" />
                      </div>

                      {/* Main card content */}
                      <div className="min-w-0 flex-1">
                        {/* High Contrast Event Title */}
                        <h3 className="text-base font-bold text-white mb-1.5 leading-snug break-words truncate group-hover/card:text-purple-300 transition-colors" title={evt.title}>
                          {evt.title}
                        </h3>
                        
                        {/* High Contrast Legibility Metadata */}
                        <div className="text-sm text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Clock size={12} className="stroke-[2.5] text-slate-400 w-3 h-3 shrink-0" />
                            {evt.event_time} (S{evt.slot_number})
                          </span>
                          <span className="text-slate-500 font-bold">•</span>
                          <span className="text-slate-200 font-medium flex items-center gap-1 truncate max-w-[140px]" title={evt.responsible}>
                            <User size={12} className="stroke-[2.5] text-slate-400 w-3 h-3 shrink-0" />
                            Resp: {evt.responsible}
                          </span>
                        </div>

                        {/* High Legibility Description */}
                        {evt.description && (
                          <p className="text-xs text-slate-400 mt-2 italic leading-relaxed border-t border-slate-700/50 pt-2 select-none">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
