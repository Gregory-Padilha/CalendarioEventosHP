import { useState } from 'react';
import { Settings, Save, Trash2, ArrowLeft, Loader2, LayoutTemplate } from 'lucide-react';
import type { EventTemplate } from '../types';

interface TemplateManagerProps {
  templates: EventTemplate[];
  onBack: () => void;
  onSaveTemplate: (template: Omit<EventTemplate, 'id' | 'created_at'>) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  isSaving: boolean;
}

export function TemplateManager({
  templates,
  onBack,
  onSaveTemplate,
  onDeleteTemplate,
  isSaving
}: TemplateManagerProps) {
  const [formData, setFormData] = useState({
    template_name: '',
    title: '',
    responsible: '',
    description: '',
    estimated_duration: 60
  });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.template_name.trim() || !formData.title.trim() || !formData.responsible.trim()) return;

    await onSaveTemplate(formData);
    
    // Clear form after successful save
    setFormData({
      template_name: '',
      title: '',
      responsible: '',
      description: '',
      estimated_duration: 60
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este modelo?')) return;
    setIsDeleting(id);
    await onDeleteTemplate(id);
    setIsDeleting(null);
  };

  return (
    <div className="flex-1 w-full h-full bg-[#EFEFEF] py-8 px-8 flex flex-col relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gerenciador de Modelos</h1>
            <p className="text-sm font-medium text-gray-500">Crie templates para preencher rapidamente eventos repetitivos.</p>
          </div>
        </div>
        
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-lg border border-white/5 transition-all w-fit cursor-pointer"
        >
          <ArrowLeft size={18} />
          Voltar para o Calendário
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
        
        {/* Left Side: Create Form */}
        <div className="w-full lg:w-[450px] shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <LayoutTemplate size={20} className="text-indigo-600" />
            Criar Novo Modelo
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Nome de Identificação do Modelo
              </label>
              <input
                type="text"
                required
                value={formData.template_name}
                onChange={e => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium placeholder-gray-400"
                placeholder="Ex: Plantão Padrão Dom."
              />
            </div>

            <div className="h-[1px] bg-gray-100 my-2" />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Título do Evento
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium placeholder-gray-400"
                placeholder="Ex: PLANTÃO EMERGÊNCIA"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Responsável
              </label>
              <input
                type="text"
                required
                value={formData.responsible}
                onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium placeholder-gray-400"
                placeholder="Ex: Dr. Silva / Equipe B"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Tempo Estimado do Evento *
              </label>
              <select
                required
                value={formData.estimated_duration}
                onChange={e => setFormData({ ...formData, estimated_duration: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Descrição (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium placeholder-gray-400 min-h-[100px] resize-none"
                placeholder="Descrição que será inserida no evento..."
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-3.5 rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar Modelo
            </button>
          </form>
        </div>

        {/* Right Side: Templates List */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col overflow-hidden">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Modelos Salvos ({templates.length})</h2>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {templates.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <LayoutTemplate size={48} className="mb-4 opacity-30" />
                <p className="text-xl font-bold text-gray-500">Nenhum modelo cadastrado.</p>
                <p className="text-sm mt-2">Crie o seu primeiro modelo no formulário ao lado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {templates.map(template => (
                  <div key={template.id} className="border border-gray-200 bg-gray-50 rounded-xl p-5 hover:border-indigo-300 transition-colors group relative">
                    <button
                      onClick={() => template.id && handleDelete(template.id)}
                      disabled={isDeleting === template.id}
                      className="absolute top-4 right-4 p-2 bg-white rounded-md text-red-400 hover:text-white hover:bg-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Excluir Modelo"
                    >
                      {isDeleting === template.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                    
                    <div className="pr-10">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-black tracking-wider px-2 py-1 rounded uppercase">
                          {template.template_name}
                        </span>
                        <span className="inline-block bg-gray-155 text-gray-700 text-xs font-black tracking-wider px-2 py-1 rounded uppercase">
                          ⏱️ {template.estimated_duration === 30 ? '30 min' : template.estimated_duration === 120 ? '2 horas' : '1 hora'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{template.title}</h3>
                      <p className="text-sm font-medium text-gray-600 mb-2">🧑‍⚕️ {template.responsible}</p>
                      {template.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 bg-white p-2 rounded border border-gray-100 mt-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
