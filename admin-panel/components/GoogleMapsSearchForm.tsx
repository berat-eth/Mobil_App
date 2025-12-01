'use client';

import { useState, FormEvent } from 'react';

interface GoogleMapsSearchFormProps {
  onSearch: (searchTerm: string, maxResults: number, excludeSector?: string) => Promise<void>;
  isLoading: boolean;
  onStop: () => void;
}

export default function GoogleMapsSearchForm({ onSearch, isLoading, onStop }: GoogleMapsSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [maxResults, setMaxResults] = useState(10000);
  const [excludeSector, setExcludeSector] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate non-empty search term
    if (!searchTerm.trim()) {
      setError('Lütfen bir arama terimi girin');
      return;
    }

    // Validate maxResults
    if (maxResults < 1 || maxResults > 10000) {
      setError('Sonuç sayısı 1 ile 10000 arasında olmalıdır');
      return;
    }

    setError('');
    await onSearch(searchTerm.trim(), maxResults, excludeSector.trim() || undefined);
  };

  const handleStop = () => {
    onStop();
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 sm:p-8">
        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Search Input - Takes more space */}
          <div className="lg:col-span-5">
            <label htmlFor="searchTerm" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Arama Terimi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="searchTerm"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Kafe, Restoran, Market, vb."
                disabled={isLoading}
                className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all ${
                  error ? 'border-red-500 dark:border-red-500' : ''
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-500'}`}
              />
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
          </div>

          {/* Max Results Input */}
          <div className="lg:col-span-2">
            <label htmlFor="maxResults" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Sonuç Sayısı
            </label>
            <input
              id="maxResults"
              type="number"
              min="1"
              max="10000"
              value={maxResults}
              onChange={(e) => {
                setMaxResults(parseInt(e.target.value) || 10000);
                if (error) setError('');
              }}
              disabled={isLoading}
              placeholder="10000"
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            />
          </div>

          {/* Exclude Sector Input */}
          <div className="lg:col-span-4">
            <label htmlFor="excludeSector" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
              Hariç Tutulacak Sektör <span className="text-slate-400 dark:text-gray-500 font-normal">(Opsiyonel)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <input
                id="excludeSector"
                type="text"
                value={excludeSector}
                onChange={(e) => {
                  setExcludeSector(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Gıda Ürünleri Tedarikçisi"
                disabled={isLoading}
                className={`w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-500'
                }`}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-gray-400">
              Bu sektördeki işletmeler atlanacak
            </p>
          </div>

          {/* Action Button */}
          <div className="lg:col-span-1 flex items-end">
            {!isLoading ? (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-base font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Ara
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStop}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-base font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Durdur
              </button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
            <div className="animate-spin h-5 w-5 border-2 border-slate-400 dark:border-gray-400 border-t-transparent rounded-full"></div>
            <span className="font-medium">Veriler toplanıyor...</span>
          </div>
        )}
      </form>
    </div>
  );
}

