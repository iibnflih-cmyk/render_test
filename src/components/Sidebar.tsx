import React, { useState } from 'react';
import { 
  Zap, 
  Home, 
  Compass, 
  ChevronDown,
  Crown,
  Sparkles,
  Gem,
  ShoppingBag,
  Star,
  Heart,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductCategory, ThemeMode, CategoryItem } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  selectedCategory: ProductCategory;
  onSelectCategory: (cat: ProductCategory) => void;
  activeNav: string;
  onSelectNav: (navId: string) => void;
  themeMode: ThemeMode;
  categories: CategoryItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  selectedCategory,
  onSelectCategory,
  activeNav,
  onSelectNav,
  themeMode,
  categories
}) => {
  const [isDiscoverExpanded, setIsDiscoverExpanded] = useState(true);
  const isDark = themeMode === 'dark';
  const { settings } = useStoreSettings();

  // Close the drawer on mobile only; keep the sidebar open on desktop
  const closeMobileOnly = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    onCloseMobile();
  };

  const renderLogoIcon = (iconId?: string) => {
    switch (iconId) {
      case 'crown': return <Crown className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'sparkles': return <Sparkles className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'gem': return <Gem className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'shopping-bag': return <ShoppingBag className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'star': return <Star className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'heart': return <Heart className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'shield': return <ShieldCheck className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'flame': return <Flame className="w-5 h-5 lg:w-7 lg:h-7" />;
      case 'zap':
      default:
        return <Zap className="w-5 h-5 lg:w-7 lg:h-7" />;
    }
  };

  const clothingCategories = categories && categories.length > 0
    ? categories
    : [
        { id: 'all', label: 'جميع التشكيلات' },
        { id: 'outerwear', label: 'السترات والمعاطف' },
        { id: 'hoodies', label: 'الهوديز والكنزات' },
        { id: 'tees', label: 'التيشرتات والقمصان' },
        { id: 'denim', label: 'الجينز والبنطلونات' },
        { id: 'knitwear', label: 'الملابس الصوفية' },
        { id: 'sneakers', label: 'الأحذية الرياضية' },
        { id: 'bags', label: 'الحقائب' },
        { id: 'accessories', label: 'الإكسسوارات' }
      ];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container (Right-docked for RTL) */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 lg:sticky lg:top-0 h-screen w-64 flex flex-col transition-all duration-300 border-l ${
          isOpen ? 'translate-x-0 shadow-2xl lg:shadow-none lg:w-72' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
        }`}
        style={{
          backgroundColor: 'var(--theme-nav, #0f1217)',
          borderColor: 'var(--theme-border, #262d38)',
          color: 'var(--theme-text, #f5f5f5)'
        }}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-transparent">
          <div className="flex items-center gap-3">
            {/* Logo Badge (Custom Image or Icon) */}
            <div 
              className="w-11 h-11 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center shadow-sm font-bold shrink-0 overflow-hidden"
              style={{
                backgroundColor: settings.logoUrl ? 'transparent' : 'var(--theme-primary, #f59e0b)',
                color: 'var(--theme-primary-text, #0a0a0a)'
              }}
            >
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.storeName || 'Logo'} 
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                renderLogoIcon(settings.logoIcon)
              )}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base lg:text-xl tracking-tight block truncate">
                {settings.storeName || 'أتيليه • ATELIER'}
              </span>
              <span className="text-[11px] lg:text-sm font-medium tracking-wide block truncate opacity-70">
                {settings.storeTagline || 'استوديو الأزياء والتصميم'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin">
          {/* Home Nav */}
          <button
            id="nav-home-btn"
            onClick={() => {
              onSelectNav('home');
              onSelectCategory('all');
              closeMobileOnly();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === 'home'
                ? 'font-bold shadow-inner'
                : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{
              color: activeNav === 'home' ? 'var(--theme-primary, #f59e0b)' : 'inherit',
              backgroundColor: activeNav === 'home' ? 'rgba(0,0,0,0.06)' : 'transparent'
            }}
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </button>

          {/* Discover Category with Expandable Subcategories */}
          <div>
            <button
              id="nav-discover-btn"
              onClick={() => {
                onSelectNav('discover');
                setIsDiscoverExpanded(!isDiscoverExpanded);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === 'discover'
                  ? 'font-bold'
                  : 'opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              style={{
                color: activeNav === 'discover' ? 'var(--theme-primary, #f59e0b)' : 'inherit'
              }}
            >
              <div className="flex items-center gap-3">
                <Compass className="w-4 h-4" />
                <span>استكشف</span>
              </div>
              <motion.div
                animate={{ rotate: isDiscoverExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 opacity-70" />
              </motion.div>
            </button>

            {/* Submenu with RTL active accent indicator */}
            <AnimatePresence initial={false}>
              {isDiscoverExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pr-7 pl-1 py-1 space-y-1"
                >
                  {clothingCategories.map((cat) => {
                    const isActive = selectedCategory === cat.id && activeNav === 'discover';
                    return (
                      <button
                        key={cat.id}
                        id={`subnav-${cat.id}`}
                        onClick={() => {
                          onSelectNav('discover');
                          onSelectCategory(cat.id);
                          closeMobileOnly();
                        }}
                        className={`w-full text-right relative flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'font-bold'
                            : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                        style={{
                          color: isActive ? 'var(--theme-primary, #f59e0b)' : 'inherit'
                        }}
                      >
                        {/* Active vertical accent bar placed on right for RTL */}
                        {isActive && (
                          <motion.div
                            layoutId="activeSubmenuIndicator"
                            className="absolute -right-2.5 top-1 bottom-1 w-1 rounded-full"
                            style={{ backgroundColor: 'var(--theme-primary, #f59e0b)' }}
                          />
                        )}
                        <span>{cat.label}</span>
                        {cat.id === 'all' && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              color: 'inherit'
                            }}
                          >
                            جديد
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </>
  );
};
