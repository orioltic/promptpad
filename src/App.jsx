import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Upload, Copy, Check, X, Trash2,
  FileText, Clock, ExternalLink, ChevronDown, Edit2, Sun, Moon
} from 'lucide-react';

export default function App() {
  // --- PERSISTENCIA LOCAL ---
  const [prompts, setPrompts] = useState(() => {
    const saved = localStorage.getItem('promptpad_data_final');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState(() => {
    const savedCats = localStorage.getItem('promptpad_categories_final');
    return savedCats ? JSON.parse(savedCats) : ['General', 'Creativo', 'Código', 'Productividad'];
  });

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('promptpad_theme');
    return savedTheme === 'dark';
  });

  // --- SOLUCIÓN MODO OSCURO (Tailwind v4) ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('promptpad_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- ESTADOS DE LA INTERFAZ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [copiedId, setCopiedId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '', content: '', notes: '', author: '', link: '', category: 'General', newCategory: ''
  });

  useEffect(() => {
    localStorage.setItem('promptpad_data_final', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('promptpad_categories_final', JSON.stringify(categories));
  }, [categories]);

  // --- FILTRADO Y BÚSQUEDA ---
  const filteredPrompts = useMemo(() => {
    let result = [...prompts];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term) ||
        (p.author && p.author.toLowerCase().includes(term))
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

  // --- MANEJADORES ---
  const handleSavePrompt = (e) => {
    e.preventDefault();
    const finalCategory = formData.newCategory.trim() !== '' ? formData.newCategory : formData.category;
    if (formData.newCategory && !categories.includes(formData.newCategory)) {
      setCategories(prev => [...prev, formData.newCategory]);
    }

    if (editingPrompt) {
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? {
        ...p,
        title: formData.title,
        content: formData.content,
        notes: formData.notes,
        author: formData.author || 'Anónimo',
        link: formData.link,
        category: finalCategory,
      } : p));
    } else {
      const newPrompt = {
        id: crypto.randomUUID(),
        title: formData.title,
        content: formData.content,
        notes: formData.notes,
        author: formData.author || 'Anónimo',
        link: formData.link,
        category: finalCategory,
        date: new Date().toISOString()
      };
      setPrompts([newPrompt, ...prompts]);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', notes: '', author: '', link: '', category: 'General', newCategory: '' });
    setEditingPrompt(null);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- SOLUCIÓN CSV: ACENTOS Y ESTRUCTURAS COMPLEJAS ---
  const exportToCSV = () => {
    if (prompts.length === 0) return;
    const headers = ["Nombre", "Prompt", "Notas", "Autor", "Enlace", "Categoria", "Fecha"];
    const rows = prompts.map(p => [
      p.title, p.content, p.notes, p.author, p.link, p.category, p.date
    ].map(val => `"${String(val || "").replace(/"/g, '""')}"`));

    // El \uFEFF fuerza a Excel a reconocer UTF-8 (acentos en español)
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompts_promptpad.csv`;
    link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      
      // Parseador de CSV robusto para prompts con comillas y saltos de línea
      const parseCSV = (str) => {
        const result = [];
        let row = [];
        let col = "";
        let inQuotes = false;
        for (let i = 0; i < str.length; i++) {
          const char = str[i], next = str[i+1];
          if (char === '"' && inQuotes && next === '"') { col += '"'; i++; }
          else if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { row.push(col); col = ""; }
          else if (char === '\n' && !inQuotes) { row.push(col); result.push(row); col = ""; row = []; }
          else col += char;
        }
        if (row.length > 0 || col !== "") { row.push(col); result.push(row); }
        return result;
      };

      const data = parseCSV(text).filter(r => r.length > 1);
      const newItems = data.slice(1).map(parts => ({
        id: crypto.randomUUID(),
        title: parts[0], content: parts[1], notes: parts[2],
        author: parts[3] || "Anónimo", link: parts[4], category: parts[5] || "Importado",
        date: parts[6] || new Date().toISOString()
      }));
      setPrompts(prev => [...newItems, ...prev]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
              <FileText size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">PromptPad</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg">
              <Plus size={20} /><span>Nuevo</span>
            </button>
            <button onClick={exportToCSV} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><Download size={20} /></button>
            <label className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
              <Upload size={20} /><input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-grow w-full">
        {/* Barra de búsqueda y filtros idéntica a la anterior... */}
        <section className="mb-10 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Buscar prompts..." className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        {filteredPrompts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPrompts.map(prompt => (
              <div key={prompt.id} className="group bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{prompt.category}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingPrompt(prompt); setFormData({...prompt, newCategory: ''}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-500"><Edit2 size={16} /></button>
                      <button onClick={() => setPrompts(prompts.filter(p => p.id !== prompt.id))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black mb-4 text-slate-800 dark:text-slate-100">{prompt.title}</h3>
                  <div className="relative bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 mb-5 border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-600 dark:text-slate-400 text-sm italic font-mono leading-relaxed line-clamp-6 whitespace-pre-wrap">"{prompt.content}"</p>
                    <button onClick={() => copyToClipboard(prompt.content, prompt.id)} className="absolute bottom-3 right-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-md text-slate-500 hover:text-indigo-600">
                      {copiedId === prompt.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{prompt.author}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {new Date(prompt.date).toLocaleDateString()}</span>
                  </div>
                  {prompt.link && <a href={prompt.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-500"><ExternalLink size={20} /></a>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <Search size={64} className="mx-auto text-slate-200 mb-6" />
            <h3 className="text-2xl font-black">Sin resultados</h3>
          </div>
        )}
      </main>

      <footer className="mt-12 pb-8 border-t border-slate-200 dark:border-slate-800 pt-8 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-500 text-sm text-left">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Desarrollado por <a href="https://orioltic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Oriol Borrás-Gené</a>
            </p>
            <div className="flex items-center gap-3 mt-1">
              <a href="https://www.urjc.es" target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-tighter hover:text-indigo-500 transition-colors">Universidad Rey Juan Carlos (URJC)</a>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl text-xs">
            <span className="opacity-70">Licencia:</span>
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-black hover:underline">CC-BY 4.0</a>
          </div>
        </div>
      </footer>

      {/* Modal igual al anterior pero asegurando que use colores dark: en los inputs... */}
      {isModalOpen && (
        /* ... mismo código de Modal ... */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[48px] shadow-2xl p-8 border border-white/10 flex flex-col max-h-[90vh]">
            <h2 className="text-3xl font-black mb-6">{editingPrompt ? 'Editar Prompt' : 'Nuevo Prompt'}</h2>
            <form onSubmit={handleSavePrompt} className="space-y-4 overflow-y-auto pr-2">
              <input required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl outline-none" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Título" />
              <textarea required rows={6} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl outline-none font-mono" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="Contenido del prompt..." />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-3xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}