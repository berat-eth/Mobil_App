'use client';

import { BusinessData } from '@/lib/googleMapsTypes';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useState } from 'react';

interface GoogleMapsExportButtonProps {
  data: BusinessData[];
  disabled: boolean;
}

export default function GoogleMapsExportButton({ data, disabled }: GoogleMapsExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    // Prepare data for CSV export with column headers
    const csvData = data.map((item) => ({
      'Şirket İsmi': item.businessName,
      'Web Sitesi': item.website || '',
      'Telefon': item.phoneNumber || '',
      'Kazıma Zamanı': new Date(item.scrapedAt).toLocaleString('tr-TR'),
    }));

    // Generate CSV using papaparse
    const csv = Papa.unparse(csvData, {
      header: true,
      delimiter: ',',
    });

    // Create blob and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `musteri-bulucu-data-${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const handleExportExcel = () => {
    if (data.length === 0) return;

    // Prepare data for Excel export
    const excelData = data.map((item) => ({
      'Şirket İsmi': item.businessName,
      'Web Sitesi': item.website || '',
      'Telefon': item.phoneNumber || '',
      'Kazıma Zamanı': new Date(item.scrapedAt).toLocaleString('tr-TR'),
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'İşletmeler');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 40 }, // Şirket İsmi
      { wch: 40 }, // Web Sitesi
      { wch: 20 }, // Telefon
      { wch: 20 }, // Kazıma Zamanı
    ];

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `musteri-bulucu-data-${Date.now()}.xlsx`);
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-colors
          ${disabled 
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-gray-500 cursor-not-allowed border border-slate-300 dark:border-slate-600' 
            : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Rapor İndir
      </button>

      {/* Dropdown Menu */}
      {showMenu && !disabled && (
        <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <button
            onClick={handleExportCSV}
            className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV İndir
          </button>
          <button
            onClick={handleExportExcel}
            className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Excel İndir
          </button>
        </div>
      )}

      {/* Backdrop to close menu */}
      {showMenu && !disabled && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}

