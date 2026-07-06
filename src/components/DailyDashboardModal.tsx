import { useEffect, useState } from 'react';
import { X, Clock, User } from 'lucide-react';
import type { HospitalEvent } from '../types';

interface DailyDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  color: string;
  events: HospitalEvent[];
  dayName: string;
  fullDateLabel: string;
}

export function DailyDashboardModal({
  isOpen,
  onClose,
  color,
  events,
  dayName,
  fullDateLabel
}: DailyDashboardModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.event_time) return 1;
    if (!b.event_time) return -1;
    return a.event_time.localeCompare(b.event_time);
  });

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-in-out p-4 ${isOpen ? 'opacity-100 backdrop-blur-md bg-slate-950/75' : 'opacity-0 backdrop-blur-none bg-slate-950/0 pointer-events-none'}`}>
      
      {/* Background Overlay to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div 
        className={`relative w-full max-w-4xl h-auto max-h-[85vh] bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-300 ease-in-out transform ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}
      >
        {/* Floating Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95 z-50 focus:outline-none border border-white/5"
          title="Fechar Briefing"
        >
          <X size={16} className="stroke-[2.5]" />
        </button>

        {/* Ambient Top Lighting Bar themed by day color */}
        <div className="absolute top-0 left-0 right-0 h-[4px] opacity-80" style={{ backgroundColor: color }} />

        {/* Header */}
        <div className="px-10 pt-12 pb-6 shrink-0 relative z-10">
          <div className="text-slate-400 uppercase tracking-[0.3em] text-xs mb-2 font-black">
            {dayName} — {fullDateLabel}
          </div>
          <div className="h-[1px] bg-white/10 w-full mt-4" />
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto px-10 pb-12 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none flex flex-col relative z-10">
          {sortedEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400 animate-pulse">
                <Clock size={28} />
              </div>
              <p className="text-lg font-black text-slate-300 tracking-wide uppercase text-center max-w-sm">
                Nenhum Evento Agendado
              </p>
              <p className="text-xs text-slate-500 font-bold tracking-widest text-center mt-1 uppercase">
                O departamento médico opera em rotina normal de plantão.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-y-12">
              {sortedEvents.map((event) => (
                <div key={event.id} className="relative flex flex-col border-b border-white/5 pb-10 last:border-0 last:pb-0">
                  
                  {/* Event Title (The Star of the Show) */}
                  <h3 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                    {event.title}
                  </h3>

                  {/* Horizontal Info Bar */}
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    {/* Time Badge */}
                    <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full border border-purple-500/30 flex items-center gap-2 text-xs font-bold">
                      <Clock size={12} className="stroke-[2.5]" />
                      <span>{event.event_time}</span>
                    </div>

                    {/* Responsible Badge */}
                    <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 flex items-center gap-2 text-xs font-bold text-slate-300">
                      <User size={12} className="text-slate-400 stroke-[2.5]" />
                      <span>Responsável: <span className="font-extrabold text-white">{event.responsible}</span></span>
                    </div>

                    {/* Slot Marker */}
                    <span className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-2">
                      Slot {event.slot_number}
                    </span>
                  </div>

                  {/* Description Box */}
                  {event.description && (
                    <div className="text-lg text-slate-200 leading-relaxed max-w-2xl pl-1 border-l-2 border-white/10 pl-4 py-1">
                      <p className="whitespace-pre-wrap">{event.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
