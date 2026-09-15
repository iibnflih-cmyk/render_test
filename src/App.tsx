/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ShoppingBag,
  MessageCircle,
  Loader2
} from 'lucide-react';

import { CATEGORY_TABS } from './data/products';
import { ProductCategory, ThemeMode, Product, CategoryItem, ProductInquiryContext } from './types';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ProductCard } from './components/ProductCard';
import { AdminPanel } from './components/AdminPanel';
import { CustomerChatModal } from './components/CustomerChatModal';
import { useStoreSettings } from './context/StoreSettingsContext';

// Shuffle array items (Fisher-Yates) to randomize the storefront product order
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const { settings } = useStoreSettings();
  // Customer Chat & Product Inquiry state
  const [isCustomerChatOpen, setIsCustomerChatOpen] = useState(false);
  const [productInquiry, setProductInquiry] = useState<ProductInquiryContext | null>(null);
  const [clientUnreadCount, setClientUnreadCount] = useState(0);

  // Helper to check if URL or hash is /adminpanel
  const checkIsAdminRoute = () => {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const hash = window.location.hash.toLowerCase().replace(/\/+$/, '');
    return (
      path === '/adminpanel' ||
      hash === '#adminpanel' ||
      hash === '#/adminpanel' ||
      path === '/admin' ||
      hash === '#admin' ||
      hash === '#/admin'
    );
  };

  // Route State: Check if URL is /adminpanel or hash is #adminpanel
  const [isAdminView, setIsAdminView] = useState<boolean>(checkIsAdminRoute);

  // Store Data States (loaded from /api/data)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(CATEGORY_TABS);
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  // Navigation & Category Filtering
  const [activeNav, setActiveNav] = useState<string>('discover');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Fetch Store Data from API
  const fetchStoreData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setProducts(shuffleArray(data.products));
        }
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.warn('Using local fallback data while server starts:', err);
    } finally {
      setIsStoreLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // Handle browser back/forward and URL route changes (popstate & hashchange)
  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminView(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const navigateToStore = () => {
    window.history.pushState({}, '', '/');
    setIsAdminView(false);
  };

  // Open chat with product inquiry context
  const handleBuyProduct = (product: Product) => {
    setProductInquiry({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      category: product.subcategory || product.category
    });
    setIsCustomerChatOpen(true);
  };

  // Poll for customer's unread messages count from shop owner
  useEffect(() => {
    const checkClientUnread = async () => {
      try {
        const userRaw = localStorage.getItem('atelier_client_chat_user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw);
        if (!user?.id) return;
        const res = await fetch(`/api/chat/conversation/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setClientUnreadCount(data.conversation?.unreadByClient || 0);
        }
      } catch {
        // ignore
      }
    };

    checkClientUnread();
    const interval = setInterval(checkClientUnread, 4500);
    return () => clearInterval(interval);
  }, [isCustomerChatOpen]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Category filter
    if (activeNav === 'discover' && selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.material && p.material.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery, activeNav]);

  // Dynamic breadcrumb label in Arabic
  const categoryLabel = useMemo(() => {
    if (activeNav === 'home' || selectedCategory === 'all') return 'جميع التشكيلات';
    const found = categories.find((c) => c.id === selectedCategory);
    return found ? found.label : 'تشكيلة الأزياء';
  }, [selectedCategory, activeNav, categories]);

  // If in Admin Panel view, render the dedicated AdminPanel component
  if (isAdminView) {
    return (
      <AdminPanel
        themeMode="dark"
        onNavigateToStore={navigateToStore}
        onStoreUpdated={fetchStoreData}
      />
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col font-['Alexandria','Cairo','Plus_Jakarta_Sans',sans-serif] transition-colors duration-300"
      style={{
        backgroundColor: 'var(--theme-bg, #0d1015)',
        color: 'var(--theme-text, #f5f5f5)'
      }}
    >
      {/* Top Announcement Bar Ribbon */}
      {settings.announcementBar?.enabled && (
        <div 
          id="top-announcement-ribbon"
          className="py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
          style={{
            backgroundColor: 'var(--theme-primary, #f59e0b)',
            color: 'var(--theme-primary-text, #0a0a0a)'
          }}
        >
          {settings.announcementBar.badge && (
            <span className="px-2 py-0.5 rounded-full bg-black/15 text-[10px] font-extrabold">
              {settings.announcementBar.badge}
            </span>
          )}
          <span>{settings.announcementBar.text}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Layout Area: Sidebar + Scrollable View */}
      <div className="flex-1 flex w-full mx-auto">
        {/* Right-docked Sidebar for RTL */}
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setActiveNav('discover');
          }}
          activeNav={activeNav}
          onSelectNav={setActiveNav}
          themeMode="dark"
          categories={categories}
        />

        {/* Center Main Stage */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="space-y-6">
            {/* Breadcrumb row */}
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-70">
              <button
                onClick={() => {
                  setActiveNav('discover');
                  setSelectedCategory('all');
                }}
                className="hover:opacity-100 transition-opacity cursor-pointer font-bold"
                style={{ color: 'var(--theme-primary, #f59e0b)' }}
              >
                استكشف
              </button>
              <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
              <span className="font-bold">
                {categoryLabel}
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                {settings.heroTitle || 'تشكيلة الأزياء الحصرية'}
              </h1>
              <p className="text-xs sm:text-sm mt-1.5 opacity-75">
                {settings.heroSubtitle || 'تصاميم استثنائية بخامات فاخرة وجودة ملكية مصممة خصيصاً لذوقك الرفيع.'}
              </p>
            </div>

            {/* Product Grid Area */}
            {isStoreLoading && products.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center py-24 rounded-3xl border"
                style={{
                  backgroundColor: 'var(--theme-card, #151921)',
                  borderColor: 'var(--theme-border, #262d38)'
                }}
              >
                <Loader2 className="w-10 h-10 animate-spin"
                  style={{ color: 'var(--theme-primary, #f59e0b)' }}
                />
                <p className="text-xs mt-3 opacity-70">جاري تحميل المنتجات...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div 
                className="text-center py-20 rounded-3xl border"
                style={{
                  backgroundColor: 'var(--theme-card, #151921)',
                  borderColor: 'var(--theme-border, #262d38)'
                }}
              >
                <ShoppingBag className="w-12 h-12 opacity-40 mx-auto mb-3" />
                <h3 className="text-base font-bold">لم يتم العثور على قطع تطابق بحثك</h3>
                <p className="text-xs mt-1.5 max-w-sm mx-auto opacity-70">
                  لا توجد نتائج تطابق "{searchQuery}" في {categoryLabel}. جرب إعادة ضبط الفلاتر أو البحث عن كلمة أخرى.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setActiveNav('discover');
                  }}
                  className="mt-4 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-primary, #f59e0b)',
                    color: 'var(--theme-primary-text, #0a0a0a)'
                  }}
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={selectedCategory + (searchQuery ? `_${searchQuery}` : '')}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6"
                >
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      themeMode="dark"
                      onBuy={handleBuyProduct}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>

      {/* Floating Chat Button for Customers */}
      <button
        id="floating-customer-chat-btn"
        onClick={() => setIsCustomerChatOpen(true)}
        className="fixed bottom-6 left-6 z-40 p-3.5 sm:px-4 sm:py-3 rounded-full font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2.5 transition-all active:scale-95 cursor-pointer border-2 border-white/20 group"
        style={{
          backgroundColor: 'var(--theme-primary, #f59e0b)',
          color: 'var(--theme-primary-text, #0a0a0a)'
        }}
        title="محادثاتي مع صاحب المتجر"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
          {clientUnreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
              {clientUnreadCount}
            </span>
          )}
        </div>
        <span className="hidden sm:inline">محادثة صاحب المتجر</span>
      </button>

      {/* Customer Chat Modal */}
      <CustomerChatModal
        isOpen={isCustomerChatOpen}
        onClose={() => {
          setIsCustomerChatOpen(false);
          setClientUnreadCount(0);
        }}
        productInquiry={productInquiry}
        onClearProductInquiry={() => setProductInquiry(null)}
        themeMode="dark"
      />
    </div>
  );
}
