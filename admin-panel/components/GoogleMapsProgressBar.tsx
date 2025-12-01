'use client';

interface GoogleMapsProgressBarProps {
  current: number;
  total: number;
  status: string;
  totalFound?: number; // Toplam bulunan sonuç sayısı
}

export default function GoogleMapsProgressBar({ current, total, status, totalFound }: GoogleMapsProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full"></div>
            <span className="text-sm text-slate-700 dark:text-gray-300">{status}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
            <span>
              {current} / {total}
            </span>
            {totalFound && totalFound > 0 && (
              <span className="text-slate-900 dark:text-white font-medium">
                (Toplam: {totalFound})
              </span>
            )}
          </div>
        </div>

        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

