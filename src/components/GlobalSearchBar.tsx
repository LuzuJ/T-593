import { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronRight, MapPin, UserRound } from 'lucide-react';
import { Sugerencia, buscarCatalogo, cargarCatalogo, type FilaPlan } from '../utils/catalogoPlanes';

interface GlobalSearchBarProps {
  onExplore: (item: Sugerencia) => void;
  placeholder?: string;
  className?: string;
}

export default function GlobalSearchBar({
  onExplore,
  placeholder = 'Ej: Chone, alcalde de Quito, prefectura de Bolívar',
  className = '',
}: GlobalSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filas, setFilas] = useState<FilaPlan[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const asegurar = () => {
    if (filas || cargando) return;
    setCargando(true);
    cargarCatalogo()
      .then((rows) => {
        setFilas(rows);
        setError('');
      })
      .catch(() => setError('No se pudo abrir el catálogo de planes.'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = filas ? buscarCatalogo(filas, query).slice(0, 8) : [];

  const elegir = (item: Sugerencia) => {
    setIsOpen(false);
    setQuery(item.titulo);
    onExplore(item);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const elegido = results[selectedIndex >= 0 ? selectedIndex : 0];
      if (elegido) elegir(elegido);
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            asegurar();
            if (query.trim().length >= 3) setIsOpen(true);
          }}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setSelectedIndex(-1);
            asegurar();
            setIsOpen(value.trim().length >= 3);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {cargando ? 'Cargando planes 2027…' : error || 'Lugares y candidaturas del proceso 140'}
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                {cargando ? 'Un momento…' : 'Prueba con Chone, alcalde de Quito o prefectura de Bolívar.'}
              </p>
            ) : (
              results.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => elegir(item)}
                  className={`w-full text-left px-3.5 py-3 flex items-center gap-3 border-t border-slate-100 ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {item.tipo === 'lugar' ? (
                    <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                  ) : (
                    <UserRound className="h-4 w-4 text-indigo-600 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-900 truncate">{item.titulo}</span>
                    <span className="block text-xs text-slate-500 truncate">{item.detalle}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
