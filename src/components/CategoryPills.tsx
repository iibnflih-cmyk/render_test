import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ProductCategory, ThemeMode, CategoryItem } from '../types';
import { CATEGORY_TABS } from '../data/products';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryPillsProps {
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  themeMode: ThemeMode;
  categories?: CategoryItem[];
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  themeMode,
  categories
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDark = themeMode === 'dark';

  const categoryList = categories && categories.length > 0 ? categories : CATEGORY_TABS;

  const scroll = (direction: 'forward' | 'backward') => {
    if (scrollContainerRef.current) {
      // In RTL, forward moves leftwards (negative), backward moves rightwards (positive)
      const offset = direction === 'forward' ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center group">
      {/* Right Scroll Button (Back to Start in RTL) */}
      <button
        onClick={() => scroll('backward')}
        className={`hidden sm:flex absolute -right-3 z-10 p-1.5 rounded-full border shadow-sm transition-all opacity-0 group-hover:opacity-100 ${
          isDark 
            ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800' 
            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
        }`}
        aria-label="تمرير التصنيفات لليمين"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Scrollable Pill Container */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none scroll-smooth w-full pl-8 pr-1"
      >
        {categoryList.map((tab) => {
          const isActive = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              id={`pill-${tab.id}`}
              onClick={() => onSelectCategory(tab.id)}
              className={`relative px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap outline-none select-none ${
                isActive
                  ? isDark 
                    ? 'text-neutral-950 font-bold' 
                    : 'text-white font-bold'
                  : isDark
                    ? 'text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800/80'
                    : 'text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/60'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryPill"
                  className={`absolute inset-0 rounded-full shadow-sm ${
                    isDark ? 'bg-amber-400' : 'bg-neutral-900'
                  }`}
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Left Scroll Button (Forward in RTL) */}
      <button
        onClick={() => scroll('forward')}
        className={`hidden sm:flex absolute -left-3 z-10 p-1.5 rounded-full border shadow-sm transition-all opacity-0 group-hover:opacity-100 ${
          isDark 
            ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800' 
            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
        }`}
        aria-label="تمرير التصنيفات لليسار"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
