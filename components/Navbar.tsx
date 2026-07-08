'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, Menu, X, Heart, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition">
              V
            </div>
            <span className="text-2xl font-bold text-stone-900 tracking-wider hidden sm:inline">VORA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/shop" className="text-stone-700 hover:text-amber-600 transition font-semibold">
              المتجر
            </Link>
            <Link href="/about" className="text-stone-700 hover:text-amber-600 transition font-semibold">
              عن الموقع
            </Link>
            <Link href="/contact" className="text-stone-700 hover:text-amber-600 transition font-semibold">
              التواصل
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-stone-100 rounded-lg transition"
            >
              <Search className="w-5 h-5 text-stone-700" />
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="p-2 hover:bg-stone-100 rounded-lg transition relative group"
            >
              <Heart className="w-5 h-5 text-stone-700 group-hover:text-red-500 transition" />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="p-2 hover:bg-stone-100 rounded-lg transition relative group"
            >
              <ShoppingCart className="w-5 h-5 text-stone-700 group-hover:text-amber-600 transition" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <Link
              href="/profile"
              className="p-2 hover:bg-stone-100 rounded-lg transition"
            >
              <User className="w-5 h-5 text-stone-700" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-stone-100 rounded-lg transition"
            >
              {isOpen ? (
                <X className="w-5 h-5 text-stone-700" />
              ) : (
                <Menu className="w-5 h-5 text-stone-700" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="pb-4 border-t border-stone-200 pt-4 animate-fade-in">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن عطرك المفضل..."
                className="w-full px-4 py-2 pr-10 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="absolute right-3 top-2.5 w-5 h-5 text-stone-400" />
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 animate-fade-in">
            <Link href="/shop" className="block px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg transition">
              المتجر
            </Link>
            <Link href="/about" className="block px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg transition">
              عن الموقع
            </Link>
            <Link href="/contact" className="block px-4 py-2 text-stone-700 hover:bg-stone-100 rounded-lg transition">
              التواصل
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}