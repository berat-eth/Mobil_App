'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const SECURITY_CHECK_DURATION = 45 * 60 * 1000; // 45 dakika

export default function SecurityCheck() {
  const router = useRouter();
  const [canAccess, setCanAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Son kontrol zamanını kontrol et
    const lastCheck = localStorage.getItem('lastSecurityCheck');
    const now = Date.now();

    if (lastCheck && now - parseInt(lastCheck) < SECURITY_CHECK_DURATION) {
      // 45 dakika geçmemiş, direkt geçir
      router.push('/');
      return;
    }

    // Güvenlik kontrolü yap
    setTimeout(() => {
      setChecking(false);
      setCanAccess(true);
      localStorage.setItem('lastSecurityCheck', now.toString());
      
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }, 3000);
  }, [router]);

  if (!checking && canAccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600">Doğrulama başarılı, yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo/İkon */}
        <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
        
        {/* Başlık */}
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">
          Güvenlik Kontrolü
        </h1>
        
        {/* Açıklama */}
        <p className="text-gray-500 mb-8">
          Lütfen bekleyin, bağlantınız doğrulanıyor...
        </p>

        {/* Basit Progress */}
        <div className="w-full max-w-xs mx-auto">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Alt Bilgi */}
        <p className="text-xs text-gray-400 mt-8">
          Bu işlem otomatik olarak gerçekleştirilmektedir
        </p>
      </div>
    </div>
  );
}
