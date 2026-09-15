import React from 'react';
import { Search, Menu, X, ShoppingBag } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  themeMode?: string;
  onThemeToggle?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  searchQuery,
  onSearchChange,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const { settings } = useStoreSettings();

  return (
    <header 
      className="sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-colors duration-300 border-b backdrop-blur-md"
      style={{
        backgroundColor: 'var(--theme-nav, #0f1217)',
        borderColor: 'var(--theme-border, #262d38)',
        color: 'var(--theme-text, #f5f5f5)'
      }}
    >
      <div className="flex items-center justify-between gap-3 md:gap-6 w-full mx-auto">
        {/* Mobile Menu Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            id="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl border transition-all hover:opacity-85 cursor-pointer"
            style={{
              borderColor: 'var(--theme-border, #262d38)',
              color: 'var(--theme-text, #f5f5f5)'
            }}
            title="تبديل القائمة"
            aria-label="تبديل قائمة التصفح"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: Search Bar with RTL-aware positioning */}
        <div className="flex-1 max-w-xl">
          <div className="relative flex items-center">
            {/* Search Icon placed on right for RTL */}
            <Search className="absolute right-3.5 w-4 h-4 pointer-events-none opacity-50" />
            <input
              id="main-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث عن المنتجات، العبايات، الفساتين، التصاميم..."
              className="w-full pr-10 pl-4 py-2 text-sm rounded-full transition-all outline-none border focus:ring-2 focus:ring-amber-400/20"
              style={{
                backgroundColor: 'var(--theme-card, #151921)',
                borderColor: 'var(--theme-border, #262d38)',
                color: 'var(--theme-text, #f5f5f5)'
              }}
            />
          </div>
        </div>

        {/* Right side: Store Tagline or Cart Badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold opacity-75">
          <span>{settings.storeTagline || 'أحدث التشكيلات الحصرية'}</span>
        </div>
      </div>
    </header>
  );
};

