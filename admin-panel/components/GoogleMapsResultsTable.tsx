'use client';

import { useState } from 'react';
import { BusinessData } from '@/lib/googleMapsTypes';
import { isMobileNumber, formatPhoneForWhatsApp } from '@/lib/googleMapsUtils';

interface GoogleMapsResultsTableProps {
  data: BusinessData[];
  onClear: () => void;
}

export default function GoogleMapsResultsTable({ data, onClear }: GoogleMapsResultsTableProps) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      console.error('Kopyalama hatası:', err);
    }
  };
  // Empty state
  if (data.length === 0) {
    return (
      <div className="w-full p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-gray-400">
            Henüz veri yok. Arama yaparak başlayın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[98vw]">
      {/* Header with count and clear button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            Sonuçlar
          </h2>
          <span className="text-sm text-slate-600 dark:text-gray-400">
            {data.length} kayıt
          </span>
        </div>
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-colors"
        >
          Temizle
        </button>
      </div>

      {/* Table container */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-8 py-4 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider w-[25%]">
                  Şirket İsmi
                </th>
                <th scope="col" className="px-8 py-4 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider w-[35%]">
                  Web Sitesi
                </th>
                <th scope="col" className="px-8 py-4 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider w-[25%]">
                  Telefon
                </th>
                <th scope="col" className="px-8 py-4 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider w-[15%]">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {data.map((business, index) => {
                const hasWebsite = !!business.website;
                const hasPhone = !!business.phoneNumber;
                const status = hasWebsite && hasPhone ? 'Tam' : hasWebsite ? 'Web' : hasPhone ? 'Telefon' : 'Eksik';
                const statusColor = hasWebsite && hasPhone 
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30' 
                  : hasWebsite 
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30' 
                  : hasPhone 
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30' 
                  : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30';
                
                return (
                  <tr key={business.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-700 dark:text-white font-semibold text-sm flex-shrink-0">
                          {business.businessName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white break-words">
                          {business.businessName}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm">
                      {business.website ? (
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline break-all"
                        >
                          {business.website}
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-sm">
                      {business.phoneNumber ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 dark:text-gray-300 break-words">{business.phoneNumber}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyPhone(business.phoneNumber!)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group"
                              title="Telefon numarasını kopyala"
                            >
                              {copiedPhone === business.phoneNumber ? (
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-slate-700 dark:group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                            
                            {/* WhatsApp Button (only for mobile numbers) */}
                            {isMobileNumber(business.phoneNumber) && (() => {
                              const whatsappNumber = formatPhoneForWhatsApp(business.phoneNumber);
                              const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber.replace('+', '')}` : '#';
                              return (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors group"
                                  title="WhatsApp ile aç"
                                >
                                  <svg className="w-4 h-4 text-green-600 dark:text-green-500 group-hover:text-green-700 dark:group-hover:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                  </svg>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: 'currentColor' }}></span>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

