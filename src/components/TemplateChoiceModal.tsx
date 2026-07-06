import { useState, useRef, useEffect } from 'react';
import { X, FilePlus, CopyPlus, ChevronDown, FileText } from 'lucide-react';
import type { EventTemplate } from '../types';

interface TemplateChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: EventTemplate[];
  onChooseScratch: () => void;
  onChooseTemplate: (template: EventTemplate) => void;
}

export function TemplateChoiceModal({
  isOpen,
  onClose,
  templates,
  onChooseScratch,
  onChooseTemplate
}: TemplateChoiceModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Reset dropdown state when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setDropdownOpen(false);
      setSelectedTemplateId('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-auto max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden relative flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header (Sticky Header) */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Novo Agendamento</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content (Scrollable Internal Content) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
          
          {/* Option 1: From Scratch */}
          <button
            onClick={onChooseScratch}
            className="w-full p-4 rounded-2xl border-2 border-purple-500/30 bg-purple-500/[0.02] flex items-center gap-4 hover:bg-purple-500/[0.05] transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 flex items-center justify-center text-purple-500 transition-colors shrink-0">
              <FilePlus size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">Criar do Zero</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Iniciar um formulário em branco.</p>
            </div>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
            </div>
            <div className="relative bg-white dark:bg-slate-900 px-4 text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              OU
            </div>
          </div>

          {/* Option 2: From Template */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <CopyPlus size={16} className="text-indigo-500" />
              Usar um Modelo
            </h4>
            
            <div className="flex flex-col gap-3 relative" ref={dropdownRef}>
              {/* Custom Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-slate-900/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-all shadow-inner text-left"
              >
                <span className={`text-sm font-medium ${selectedTemplateId ? 'text-slate-200' : 'text-slate-400'}`}>
                  {selectedTemplateId 
                    ? templates.find(t => t.id === selectedTemplateId)?.template_name 
                    : '-- Selecione um modelo --'}
                </span>
                <ChevronDown 
                  className={`text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} 
                  size={18} 
                />
              </button>

              {/* Custom Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-60 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
                    {templates.map(t => {
                      const isActive = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id || '');
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                            isActive 
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                              : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                          }`}
                        >
                          <FileText className="text-slate-500 w-4 h-4 shrink-0" />
                          <span>{t.template_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="p-6 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const t = templates.find(temp => temp.id === selectedTemplateId);
              if (t) onChooseTemplate(t);
            }}
            disabled={!selectedTemplateId}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:dark:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md text-sm"
          >
            Usar Modelo Selecionado
          </button>
        </div>

      </div>
    </div>
  );
}
