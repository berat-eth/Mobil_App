'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
            <div className={`max-w-2xl w-full text-center transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* 404 Animasyonlu Sayı */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] md:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 leading-none animate-pulse">
                        404
                    </h1>
                    <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse"></div>
                </div>

                {/* Mesaj */}
                <div className="space-y-4 mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                        Sayfa Bulunamadı
                    </h2>
                    <p className="text-lg text-gray-600 max-w-md mx-auto">
                        Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
                    </p>
                </div>

                {/* İkonlar */}
                <div className="flex justify-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '0ms' }}>
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '150ms' }}>
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center animate-bounce" style={{ animationDelay: '300ms' }}>
                        <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                {/* Butonlar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/"
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                        Ana Sayfaya Dön
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="px-8 py-4 bg-white text-gray-700 rounded-full font-semibold border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 transform hover:scale-105 transition-all duration-300"
                    >
                        Geri Git
                    </button>
                </div>
            </div>
        </div>
    );
}
