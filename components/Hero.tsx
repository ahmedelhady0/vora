'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-50 to-amber-50">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span className="text-amber-600 font-semibold text-sm">مجموعة استثنائية جديدة</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-stone-900 leading-tight">
              اكتشف توقيعك <span className="text-amber-600">العطري</span>
            </h1>

            <p className="text-xl text-stone-600 leading-relaxed max-w-lg">
              عطور فاخرة مستوردة من أفضل الماركات العالمية. كل رائحة تحكي قصة، كل عطر هوية فريدة تميزك.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/shop"
                className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition flex items-center justify-center gap-2 group"
              >
                تسوق الآن
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                href="/about"
                className="px-8 py-4 border-2 border-amber-600 text-amber-600 font-bold rounded-lg hover:bg-amber-50 transition"
              >
                تعرف على VORA
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-stone-200">
              <div>
                <p className="text-2xl font-bold text-amber-600">500+</p>
                <p className="text-sm text-stone-600">منتج فاخر</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">10K+</p>
                <p className="text-sm text-stone-600">عميل مسرور</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">24/7</p>
                <p className="text-sm text-stone-600">دعم عملاء</p>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative h-96 lg:h-full min-h-96 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-transparent rounded-3xl"></div>
            <div className="absolute top-12 right-12 w-48 h-64 bg-gradient-to-br from-amber-300 to-amber-500 rounded-2xl opacity-20 blur-3xl"></div>
            
            {/* Bottle SVG */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="24" y="4" width="16" height="8" rx="1.5" fill="#d97706" opacity="0.8" />
              <path
                d="M20 14 Q20 12 22 12 L42 12 Q44 12 44 14 L48 30 Q49 36 49 42 L49 56 Q49 60 45 60 L19 60 Q15 60 15 56 L15 42 Q15 36 16 30 Z"
                stroke="#d97706"
                strokeWidth="2"
                fill="none"
              />
              <line x1="15" y1="34" x2="49" y2="34" stroke="#d97706" strokeWidth="1.5" opacity="0.7" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}