import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Upload, Copy, Check, X, Trash2,
  FileText, Clock, ExternalLink, ChevronDown, Edit2
} from 'lucide-react';

export default function App() {
  // --- PERSISTENCIA LOCAL ---
  const [prompts, setPrompts] = useState(() => {
    const saved = localStorage.getItem('promptpad_data_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState(() => {
    const savedCats = localStorage.getItem('promptpad_categories_v4');
    return savedCats ? JSON.parse(savedCats) : ['General', 'Creativo', 'Código'];
  });

  // --- ESTADOS DE LA INTERFAZ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState('newest');
  const [copiedId, setCopiedId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', content: '', notes: '', author: '', link: '', category: 'General', newCategory: '', 
    date: new Date().toISOString().split('T')[0]
  });

  // Guardado automático
  useEffect(() => {
    localStorage.setItem('promptpad_data_v4', JSON.stringify(prompts));
    localStorage.setItem('promptpad_categories_v4', JSON.stringify(categories));
  }, [prompts, categories]);

  // --- LÓGICA DE FILTRADO ---
  const filteredPrompts = useMemo(() => {
    let result = [...prompts];

    // Filtro por búsqueda de texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term) ||
        (p.author && p.author.toLowerCase().includes(term))
      );
    }

    // Filtro por Categoría
    if (activeCategory !== 'Todas') {
      result = result.filter(p => p.category === activeCategory);
    }

    // Ordenación
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [prompts, searchTerm, activeCategory, sortBy]);

  // --- MANEJADORES ---
  const handleSavePrompt = (e) => {
    e.preventDefault();
    const finalCategory = formData.newCategory.trim() !== '' ? formData.newCategory : formData.category;
    
    if (formData.newCategory && !categories.includes(formData.newCategory)) {
      setCategories(prev => [...prev, formData.newCategory]);
    }

    const promptEntry = {
      id: editingPrompt ? editingPrompt.id : crypto.randomUUID(),
      title: formData.title,
      content: formData.content,
      notes: formData.notes,
      author: formData.author || 'Anónimo',
      link: formData.link,
      category: finalCategory,
      date: formData.date || new Date().toISOString().split('T')[0]
    };

    if (editingPrompt) {
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? promptEntry : p));
    } else {
      setPrompts([promptEntry, ...prompts]);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', notes: '', author: '', link: '', category: 'General', newCategory: '', date: new Date().toISOString().split('T')[0] });
    setEditingPrompt(null);
  };

  // --- EXPORTAR CSV (CON ACENTOS ESPAÑOLES) ---
  const exportToCSV = () => {
    if (prompts.length === 0) return;
    const headers = ["Nombre", "Prompt", "Notas", "Autor", "Enlace", "Categoria", "Fecha"];
    const rows = prompts.map(p => [
      p.title, p.content, p.notes, p.author, p.link, p.category, p.date
    ].map(v => `"${String(v || "").replace(/"/g, '""')}"`));

    // \uFEFF es el BOM para que Excel detecte acentos en español
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompts_promptpad.csv`;
    link.click();
  };

  // --- IMPORTADOR ROBUSTO (PARA PROMPTS COMPLEJOS) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const str = event.target.result;
      const result = []; let row = []; let col = ""; let inQuotes = false;
      for (let i = 0; i < str.length; i++) {
        const char = str[i], next = str[i+1];
        if (char === '"' && inQuotes && next === '"') { col += '"'; i++; }
        else if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { row.push(col); col = ""; }
        else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (col !== "" || row.length > 0) { row.push(col); result.push(row); }
          col = ""; row = []; if (char === '\r' && next === '\n') i++;
        } else col += char;
      }
      if (row.length > 0 || col !== "") { row.push(col); result.push(row); }

      const newItems = result.slice(1).map(p => ({
        id: crypto.randomUUID(), title: p[0], content: p[1], notes: p[2],
        author: p[3] || "Anónimo", link: p[4], category: p[5] || "General",
        date: p[6] || new Date().toISOString().split('T')[0]
      }));
      
      // Actualizar catálogo de categorías
      const newCats = [...new Set([...categories, ...newItems.map(i => i.category)])];
      setCategories(newCats);
      setPrompts(prev => [...newItems, ...prev]);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><FileText size={24} /></div>
            <h1 className="text-2xl font-black text-indigo-600 tracking-tight">PromptPad</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-bold shadow-md transition-all active:scale-95">
              <Plus size={20} /><span>Nuevo Prompt</span>
            </button>
            <div className="flex bg-slate-100 rounded-full p-1">
              <button onClick={exportToCSV} className="p-2 text-slate-500 hover:text-indigo-600 rounded-full transition-colors" title="Exportar CSV"><Download size={20} /></button>
              <label className="p-2 text-slate-500 hover:text-indigo-600 rounded-full cursor-pointer transition-colors" title="Importar CSV">
                <Upload size={20} /><input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-grow">
        {/* FILTROS Y BÚSQUEDA */}
        <section className="space-y-6 mb-10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar por título, contenido o autor..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative">
              <select className="appearance-none bg-white border border-slate-200 px-6 py-4 pr-12 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1"><Filter size={12} /> Filtrar:</span>
            <button onClick={() => setActiveCategory('Todas')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === 'Todas' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>Todas</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>{cat}</button>
            ))}
          </div>
        </section>

        {/* LISTADO DE PROMPTS */}
        {filteredPrompts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrompts.map(prompt => (
              <div key={prompt.id} className="group bg-white rounded-[32px] border border-slate-200 p-6 flex flex-col hover:shadow-2xl transition-all border-b-4 border-b-indigo-500">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{prompt.category}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingPrompt(prompt); setFormData({...prompt, newCategory: ''}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 size={16} /></button>
                    <button onClick={() => { if(confirm('¿Eliminar?')) setPrompts(prompts.filter(p => p.id !== prompt.id)) }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="text-xl font-black mb-3 text-slate-800 leading-tight">{prompt.title}</h3>
                <div className="relative bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100 flex-1">
                  <p className="text-slate-600 text-sm italic font-mono leading-relaxed line-clamp-6 whitespace-pre-wrap">"{prompt.content}"</p>
                  <button onClick={() => { navigator.clipboard.writeText(prompt.content); setCopiedId(prompt.id); setTimeout(()=>setCopiedId(null), 2000); }} className="absolute bottom-2 right-2 bg-white p-2.5 rounded-xl shadow-md border border-slate-100 active:scale-90 transition-transform">
                    {copiedId === prompt.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-slate-400" />}
                  </button>
                </div>
                {prompt.notes && <p className="text-xs text-slate-400 mb-4 line-clamp-2"><span className="font-bold text-indigo-500 uppercase text-[9px]">Notas:</span> {prompt.notes}</p>}
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1"><Clock size={12} /> {prompt.date}</div>
                  <div className="flex items-center gap-1">{prompt.author}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-slate-300">
            <Search size={80} strokeWidth={1} className="mb-4" />
            <h3 className="text-xl font-bold">No se encontraron prompts</h3>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-sm font-medium">
              Desarrollado por <a href="https://orioltic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">Oriol Borrás-Gené</a>
            </p>
            <a href="https://www.urjc.es" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase text-slate-300 hover:text-indigo-500 tracking-[0.2em] transition-colors">Universidad Rey Juan Carlos (URJC)</a>
          </div>
          <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Licencia:</span>
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-black hover:underline text-xs">CC-BY 4.0</a>
          </div>
        </div>
      </footer>

      {/* MODAL DE FORMULARIO COMPLETO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-8 flex flex-col max-h-[95vh] overflow-hidden border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-slate-800">{editingPrompt ? 'Actualizar Prompt' : 'Nuevo Prompt'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSavePrompt} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Título del Prompt *</label>
                  <input required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ej: Redactor Educativo" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Fecha de Creación</label>
                  <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Instrucciones (Cuerpo del Prompt) *</label>
                <textarea required rows={8} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-mono text-sm leading-relaxed" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="Escribe aquí el prompt completo..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Autor (Opcional)</label>
                  <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})} placeholder="Tu nombre o alias" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Enlace de Referencia</label>
                  <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Categoría Existente</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">O Crea una Nueva</label>
                  <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-600" value={formData.newCategory} onChange={(e) => setFormData({...formData, newCategory: e.target.value})} placeholder="Nueva categoría..." />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Notas Adicionales</label>
                <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Ej: Funciona mejor con GPT-4..." />
              </div>

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs">
                  {editingPrompt ? 'Actualizar Prompt' : 'Guardar Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}