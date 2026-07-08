'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: string;
  isNew?: boolean;
  badge?: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { addItem } = useCart();
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  return (
    <Link href={`/product/${product.id}`}>
      <div className="group cursor-pointer">
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-stone-50 h-80 flex items-center justify-center mb-6 transition-all duration-300">
          {/* Badges */}
          {product.isNew && (
            <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-10 animate-fade-in">
              جديد ✨
            </div>
          )}
          {discount > 0 && (
            <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-10">
              -{discount}%
            </div>
          )}

          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            className="absolute top-4 bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'text-stone-400 hover:text-red-500'
              }`}
            />
          </button>

          {/* Image */}
          <div className="relative w-full h-full">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              handleAddToCart();
            }}
            className="absolute bottom-4 left-4 right-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 hover:shadow-lg"
          >
            <ShoppingCart className="w-4 h-4" />
            إضافة للسلة
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="inline-block text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">
              {product.category}
            </span>
            {product.badge && (
              <span className="text-xs font-bold text-stone-500">{product.badge}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-stone-900 line-clamp-2 group-hover:text-amber-600 transition">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(product.rating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-stone-500">({product.reviews})</span>
          </div>

          {/* Price Section */}
          <div className="bg-gradient-to-r from-stone-100 to-stone-50 rounded-xl p-4 space-y-2 pt-4 border border-stone-200">
            <div className="flex items-end justify-between">
              <div>
                {product.originalPrice && (
                  <p className="text-xs text-stone-400 line-through">{product.originalPrice} ج.م</p>
                )}
                <p className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {product.price} ج.م
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleAddToCart();
                }}
                className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg"
              >
                🛍️
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}