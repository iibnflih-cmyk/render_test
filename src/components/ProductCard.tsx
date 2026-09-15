import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag } from 'lucide-react';
import { Product, ThemeMode } from '../types';

interface ProductCardProps {
  product: Product;
  themeMode: ThemeMode;
  onBuy?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onBuy
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 border flex flex-col shadow-sm hover:shadow-md"
      style={{
        backgroundColor: 'var(--theme-card, #151921)',
        borderColor: 'var(--theme-border, #262d38)',
        color: 'var(--theme-text, #f5f5f5)'
      }}
    >
      {/* Product Image Area */}
      <div 
        className="relative aspect-[4/3] w-full overflow-hidden flex items-center justify-center bg-black/10 dark:bg-white/5"
      >
        <motion.img
          src={product.image}
          alt={product.title}
          animate={{ scale: isHovered ? 1.04 : 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full h-full object-cover object-center"
          loading="lazy"
        />

        {/* Optional Badge */}
        {product.badge && (
          <span 
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs"
            style={{
              backgroundColor: 'var(--theme-primary, #f59e0b)',
              color: 'var(--theme-primary-text, #0a0a0a)'
            }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Card Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Product Category Tag */}
          <div className="mb-1.5">
            <span 
              className="text-[11px] font-medium tracking-wide opacity-65"
            >
              {product.subcategory || product.category}
            </span>
          </div>

          {/* Product Title */}
          <h3 
            className="text-sm font-semibold tracking-tight line-clamp-2 transition-colors leading-snug"
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Price in Algerian Dinar (DZD) & Purchase Action */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
            <div className="flex items-baseline gap-1.5">
              <span 
                className="font-extrabold text-lg"
                style={{ color: 'var(--theme-accent, #fbbf24)' }}
              >
                {product.price.toLocaleString('fr-DZ')}
              </span>
              <span 
                className="text-xs font-bold"
                style={{ color: 'var(--theme-accent, #fbbf24)' }}
              >
                د.ج
              </span>
            </div>

            {onBuy && (
              <button
                id={`buy-btn-${product.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onBuy(product);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl active:scale-95 font-bold text-xs transition-all shadow-xs cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-primary, #f59e0b)',
                  color: 'var(--theme-primary-text, #0a0a0a)'
                }}
                title="تواصل مع صاحب المتجر لشراء هذا المنتج"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>شراء</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
