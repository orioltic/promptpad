import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  User, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  X, 
  Trash2,
  FileText,
  Clock,
  ExternalLink,
  ChevronDown,
  Edit2,
  Sun,
  Moon
} from 'lucide-react';

/**
 * PromptPad Pro
 * Desarrollado por Oriol Borrás-Gené (@OriolTIC)
 * Una herramienta visual para organizar, filtrar y persistir prompts de IA.
 */
export default function App() {
  // --- PERSISTENCIA LOCAL (Prompts y Categorías) ---
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

  // --- ESTADOS DE LA INTERFAZ ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [copiedId, setCopiedId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    notes: '',
    author: '',
    link: '',
    category: 'General',
    newCategory: ''
  });

  // --- EFECTOS DE GUARDADO AUTOMÁTICO ---
  useEffect(() => {
    localStorage.setItem('promptpad_data_final', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('promptpad_categories_final', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('promptpad_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- FILTRADO Y BÚSQUEDA ---
  const filteredPrompts = useMemo(() => {
    let result = [...prompts];

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term) ||
        (p.author && p.author.toLowerCase().includes(term))
      );
    }

    // Filtro por categorías (OR)
    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.includes(p.category));
    }

    // Orden cronológico
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [prompts, searchTerm, selectedCategories, sortBy]);

  // --- MANEJADORES DE ACCIONES ---
  const handleSavePrompt = (e) => {
    e.preventDefault();
    const finalCategory = formData.newCategory.trim() !== '' ? formData.newCategory : formData.category;
    
    // Si hay categoría nueva, añadirla al catálogo
    if (formData.newCategory && !categories.includes(formData.newCategory)) {
      setCategories(prev => [...prev, formData.newCategory]);
    }

    if (editingPrompt) {
      // Edición de existente
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
      // Creación de nuevo
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

  const deletePrompt = (id) => {
    if (confirm('¿Eliminar este prompt definitivamente?')) {
      setPrompts(prompts.filter(p => p.id !== id));
    }
  };

  const copyToClipboard = (text, id) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- GESTIÓN CSV ---
  const exportToCSV = () => {
    if (prompts.length === 0) return;
    const headers = ["Nombre", "Prompt", "Notas", "Autor", "Enlace", "Categoria", "Fecha"];
    const rows = prompts.map(p => [
      `"${p.title.replace(/"/g, '""')}"`,
      `"${p.content.replace(/"/g, '""')}"`,
      `"${p.notes.replace(/"/g, '""')}"`,
      `"${p.author.replace(/"/g, '""')}"`,
      `"${p.link}"`,
      `"${p.category}"`,
      `"${p.date}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prompts_padlet_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const newItems = lines.slice(1).map(line => {
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const clean = (str) => str?.replace(/^"|"$/g, '').replace(/""/g, '"') || '';
        return {
          id: crypto.randomUUID(),
          title: clean(parts[0]),
          content: clean(parts[1]),
          notes: clean(parts[2]),
          author: clean(parts[3]),
          link: clean(parts[4]),
          category: clean(parts[5]) || 'Importado',
          date: clean(parts[6]) || new Date().toISOString()
        };
      });
      const allCats = [...new Set([...categories, ...newItems.map(i => i.category)])];
      setCategories(allCats);
      setPrompts(prev => [...newItems, ...prev]);
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col">
        
        {/* NAVEGACIÓN PRINCIPAL */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <FileText size={24} />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                PromptPad
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                title="Cambiar tema"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-transform active:scale-95"
              >
                <Plus size={20} />
                <span>Nuevo</span>
              </button>
              <button onClick={exportToCSV} className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full" title="Exportar CSV">
                <Download size={20} />
              </button>
              <label className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer" title="Importar CSV">
                <Upload size={20} />
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-grow w-full">
          {/* BARRA DE FILTROS */}
          <section className="mb-10 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar prompts..."
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <select 
                  className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 pr-12 rounded-3xl font-bold text-sm cursor-pointer outline-none"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mr-2 flex items-center gap-1">
                <Filter size={12} /> Filtrar por categoría:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedCategories.includes(cat) 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {selectedCategories.length > 0 && (
                <button onClick={() => setSelectedCategories([])} className="text-xs font-black text-indigo-600 ml-2 hover:underline">LIMPIAR</button>
              )}
            </div>
          </section>

          {/* TABLERO DE PROMPTS */}
          {filteredPrompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPrompts.map(prompt => (
                <div key={prompt.id} className="group bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col hover:-translate-y-1">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                        {prompt.category}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingPrompt(prompt);
                            setFormData({
                              title: prompt.title,
                              content: prompt.content,
                              notes: prompt.notes || '',
                              author: prompt.author || '',
                              link: prompt.link || '',
                              category: prompt.category,
                              newCategory: ''
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => deletePrompt(prompt.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black mb-4 text-slate-800 dark:text-slate-100 leading-tight">
                      {prompt.title}
                    </h3>
                    
                    <div className="relative bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 mb-5 border border-slate-100 dark:border-slate-800">
                      <p className="text-slate-600 dark:text-slate-400 text-sm italic font-mono leading-relaxed line-clamp-6 whitespace-pre-wrap">
                        "{prompt.content}"
                      </p>
                      <button 
                        onClick={() => copyToClipboard(prompt.content, prompt.id)}
                        className="absolute bottom-3 right-3 bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-md text-slate-500 hover:text-indigo-600 border border-slate-100 dark:border-slate-700 active:scale-90 transition-transform"
                      >
                        {copiedId === prompt.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                    </div>

                    {prompt.notes && (
                      <div className="px-1">
                        <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                          <span className="font-black text-[9px] uppercase mr-1 opacity-60">Notas:</span> {prompt.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[10px] font-black">
                        {prompt.author.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{prompt.author}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold tracking-tight">
                          <Clock size={10} /> {new Date(prompt.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {prompt.link && (
                      <a href={prompt.link.startsWith('http') ? prompt.link : `https://${prompt.link}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-500 p-2.5 rounded-2xl transition-all border border-transparent hover:border-slate-200">
                        <ExternalLink size={20} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-[60px] border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Search size={64} className="text-slate-200 dark:text-slate-800 mb-6" />
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">Sin resultados</h3>
              <p className="text-slate-500 mt-2 mb-8">Añade un prompt o ajusta los filtros de búsqueda.</p>
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-3xl font-black shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-105 transition-transform">
                Crear mi primer prompt
              </button>
            </div>
          )}
        </main>

        {/* MODAL FORMULARIO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-white/10 animate-in zoom-in duration-300">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">
                  {editingPrompt ? 'Editar Prompt' : 'Nuevo Prompt'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={28} /></button>
              </div>
              
              <form onSubmit={handleSavePrompt} className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título *</label>
                    <input required type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ej. Guía de Redacción" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Autor</label>
                    <input type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white" value={formData.author} onChange={(e) => setFormData({...formData, author: e.target.value})} placeholder="Tu nombre" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenido *</label>
                  <textarea required rows={6} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono text-sm dark:text-white" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} placeholder="Escribe aquí el cuerpo del prompt..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notas Opcionales</label>
                  <textarea rows={2} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Instrucciones adicionales..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-3xl focus:border-indigo-500 outline-none cursor-pointer dark:text-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">O nueva categoría</label>
                    <input type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white" value={formData.newCategory} onChange={(e) => setFormData({...formData, newCategory: e.target.value})} placeholder="Crear nueva..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enlace Externo</label>
                  <input type="url" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all dark:text-white" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
                </div>
                <div className="pt-8 flex gap-4 sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t border-slate-50 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 px-6 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-3xl transition-all uppercase text-xs tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-1 py-5 px-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest">
                    {editingPrompt ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FOOTER CON AUTORÍA Y LICENCIA */}
        <footer className="mt-12 pb-8 border-t border-slate-200 dark:border-slate-800 pt-8 px-4 text-center">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Info de Autoría */}
            <div className="text-slate-500 text-sm">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Desarrollado por <span className="text-indigo-600 dark:text-indigo-400 font-bold">Oriol Borrás-Gené</span>
              </p>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-1">
                <a 
                  href="https://twitter.com/OriolTIC" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-indigo-500 flex items-center gap-1 transition-colors font-bold text-slate-600 dark:text-slate-400"
                >
                  <span>@OriolTIC</span>
                </a>
                <span className="opacity-30">•</span>
                <span className="text-xs uppercase tracking-tighter">Universidad Rey Juan Carlos (URJC)</span>
              </div>
            </div>

            {/* Licencia */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              <span className="font-bold uppercase tracking-tighter opacity-70">Licencia:</span>
              <a 
                href="https://creativecommons.org/licenses/by/4.0/deed.es" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-black"
              >
                CC-BY 4.0
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Contador */}
            <div className="bg-slate-800 dark:bg-indigo-900/50 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-lg shadow-indigo-500/10 tracking-tight">
              {prompts.length} Prompts guardados localmente
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}