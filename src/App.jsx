import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Upload, Copy, Check, X, Trash2,
  FileText, Clock, ExternalLink, ChevronDown, Edit2, Sun, Moon
} from 'lucide-react';

export default function App() {
  // --- PERSISTENCIA ---
  const [prompts, setPrompts] = useState(() => {
    const saved = localStorage.getItem('promptpad_data_final_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState(() => {
    const savedCats = localStorage.getItem('promptpad_categories_v3');
    return savedCats ? JSON.parse(savedCats) : ['General'];
  });

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('promptpad_theme');
    return savedTheme === 'dark';
  });

  // --- MODO OSCURO (Corrección para Tailwind v4) ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('promptpad_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- ESTADOS INTERFAZ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [copiedId, setCopiedId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', content: '', notes: '', author: '', link: '', category: 'General', newCategory: '', date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    localStorage.setItem('promptpad_data_final_v3', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('promptpad_categories_v3', JSON.stringify(categories));
  }, [categories]);

  // --- FILTRADO ---
  const filteredPrompts = useMemo(() => {
    let result = [...prompts];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term)
      );
    }
    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.includes(p.category));
    }
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [prompts, searchTerm, selectedCategories, sortBy]);

  // --- ACCIONES ---
  const handleSavePrompt = (e) => {
    e.preventDefault();
    const finalCategory = formData.newCategory.trim() !== '' ? formData.newCategory : formData.category;
    
    if (formData.newCategory && !categories.includes(formData.newCategory)) {
      setCategories(prev => [...prev, formData.newCategory]);
    }

    const newEntry = {
      id: editingPrompt ? editingPrompt.id : crypto.randomUUID(),
      title: formData.title,
      content: formData.content,
      notes: formData.notes,
      author: formData.author || 'Anónimo',
      link: formData.link,
      category: finalCategory,
      date: formData.date || new Date().toISOString()
    };

    if (editingPrompt) {
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? newEntry : p));
    } else {
      setPrompts([newEntry, ...prompts]);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', notes: '', author: '', link: '', category: 'General', newCategory: '', date: new Date().toISOString().split('T')[0] });
    setEditingPrompt(null);
  };

  const exportToCSV = () => {
    const headers = ["Nombre", "Prompt", "Notas", "Autor", "Enlace", "Categoria", "Fecha"];
    const rows = prompts.map(p => [
      p.title, p.content, p.notes, p.author, p.link, p.category, p.date
    ].map(v => `"${String(v || "").replace(/"/g, '""')}"`));
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prompts_export.csv";
    link.click();
  };

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
      const newItems = result.slice(1).map(p => ({
        id: crypto.randomUUID(), title: p[0], content: p[1], notes: p[2],
        author: p[3], link: p[4], category: p[5], date: p[6]
      }));
      setPrompts(prev => [...newItems, ...prev]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><FileText size={24} /></div>
            <h1 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">PromptPad</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-full font-bold shadow-md hover:bg-indigo-700 transition-all">
              <Plus size={20} /><span>Nuevo Prompt</span>
            </button>
            <button onClick={exportToCSV} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" title="Exportar"><Download size={22} /></button>
            <label className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer" title="Importar">
              <Upload size={22} /><input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar por título o contenido..." className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-2xl outline-none font-bold" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguos</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPrompts.map(prompt => (
            <div key={prompt.id} className="group bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-6 flex flex-col hover:shadow-xl transition-all border-b-4 border-b-indigo-500">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{prompt.category}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingPrompt(prompt); setFormData({...prompt, newCategory: ''}); setIsModalOpen(true); }} className="text-slate-400 hover:text-indigo-500"><Edit2 size={18} /></button>
                  <button onClick={() => setPrompts(prompts.filter(p => p.id !== prompt.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
              <h3 className="text-xl font-black mb-3 text-slate-800 dark:text-slate-100">{prompt.title}</h3>
              <div className="relative bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 flex-1">
                <p className="text-slate-600 dark:text-slate-400 text-sm italic font-mono leading-relaxed line-clamp-6 whitespace-pre-wrap">"{prompt.content}"</p>
                <button onClick={() => { navigator.clipboard.writeText(prompt.content); setCopiedId(prompt.id); setTimeout(()=>setCopiedId(null), 2000); }} className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm">
                  {copiedId === prompt.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-400" />}
                </button>
              </div>
              {prompt.notes && <p className="text-xs text-slate-400 mb-4 line-clamp-2"><span className="font-bold text-indigo-500 uppercase text-[9px]">Notas:</span> {prompt.notes}</p>}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-bold text-slate-400">
                <div className="flex items-center gap-2"><Clock size={12} /> {prompt.date}</div>
                <div className="flex items-center gap-1 uppercase tracking-tighter">{prompt.author}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl p-8 border border-white/10 flex flex-col max-h-[95vh] overflow-hidden">
            <h2 className="text-3xl font-black mb-6 text-indigo-600 dark:text-indigo-400">{editingPrompt ? 'Actualizar Prompt' : 'Crear Nuevo Prompt'}</h2>
            <form onSubmit={handleSavePrompt} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Título *</label>
                  <input required className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 dark:text-white" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ej: Generador de Ideas" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Fecha</label>
                  <input type="date" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none dark:text-white" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cuerpo del Prompt *</label>
                <textarea required rows={6} className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none font-mono text-sm dark:text-white" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="Escribe aquí las instrucciones para la IA..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Autor (Opcional)</label>
                  <input className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none dark:text-white" value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})} placeholder="Tu nombre" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Enlace (Opcional)</label>
                  <input className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none dark:text-white" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Categoría</label>
                  <select className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none dark:text-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Añadir Categoría</label>
                  <input className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none dark:text-white" value={formData.newCategory} onChange={(e) => setFormData({...formData, newCategory: e.target.value})} placeholder="Nombre nueva..." />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Notas (Opcional)</label>
                <input className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none dark:text-white" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Consejos de uso..." />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="py-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Desarrollado por <a href="https://orioltic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Oriol Borrás-Gené</a>
            </p>
            <a href="https://www.urjc.es" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-500 tracking-widest transition-colors">Universidad Rey Juan Carlos (URJC)</a>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase">Licencia:</span>
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-black hover:underline text-xs">CC-BY 4.0</a>
          </div>
        </div>
      </footer>
    </div>
  );
}