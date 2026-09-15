import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  ShieldAlert, 
  Plus, 
  X, 
  Crop, 
  Image as ImageIcon, 
  Upload, 
  FolderPlus, 
  CheckSquare, 
  Square, 
  LogOut, 
  Store, 
  Package, 
  Tags, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FolderTree,
  MessageCircle,
  Send,
  User,
  Clock,
  ShoppingBag,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';
import { Product, CategoryItem, ThemeMode, Conversation, ChatMessage } from '../types';
import { ImageCropperModal } from './ImageCropperModal';
import { BulkProductModal } from './BulkProductModal';
import { StoreCustomizerTab } from './admin/StoreCustomizerTab';

interface AdminPanelProps {
  themeMode: ThemeMode;
  onNavigateToStore: () => void;
  onStoreUpdated: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  themeMode,
  onNavigateToStore,
  onStoreUpdated
}) => {
  const isDark = themeMode === 'dark';

  // Auth States - never persist token in storage so password is required every single visit
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [retryAfterMinutes, setRetryAfterMinutes] = useState<number>(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Store Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'new-product' | 'categories' | 'messages' | 'customizer'>('products');

  // Messages / Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const adminChatContainerRef = useRef<HTMLDivElement>(null);
  const isAdminAtBottomRef = useRef(true);
  const prevSelectedConvoRef = useRef<string | null>(null);
  const prevConvoMsgCountRef = useRef<number>(0);

  const handleAdminScroll = () => {
    const el = adminChatContainerRef.current;
    if (!el) return;
    const threshold = 70;
    isAdminAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  // New Product Form State
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('outerwear');
  const [newImage, setNewImage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropTargetImage, setCropTargetImage] = useState('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productSuccessMessage, setProductSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Category Form State
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categorySuccessMessage, setCategorySuccessMessage] = useState<string | null>(null);

  // Bulk Product Creator State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedProductIdsForDelete, setSelectedProductIdsForDelete] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Assign items to category state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [targetAssignCategory, setTargetAssignCategory] = useState('');
  const [assignFilterTab, setAssignFilterTab] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  // Check IP rate limit on mount & ensure no stored token exists
  useEffect(() => {
    try {
      localStorage.removeItem('atelier_admin_token');
      sessionStorage.removeItem('atelier_admin_token');
    } catch {
      // ignore
    }
    checkStatus();

    // Security cleanup on unmount: invalidate memory token when leaving adminpanel
    return () => {
      setAuthToken(null);
      try {
        localStorage.removeItem('atelier_admin_token');
        sessionStorage.removeItem('atelier_admin_token');
      } catch {
        // ignore
      }
    };
  }, []);

  // Fetch conversations for admin
  const fetchConversations = async (silent = false) => {
    if (!authToken) return;
    if (!silent) setIsLoadingConversations(true);
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const convos: Conversation[] = data.conversations || [];
        setConversations((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(convos)) {
            return prev;
          }
          return convos;
        });
        setSelectedConversationId((prev) => {
          if (prev && convos.some(c => c.id === prev)) return prev;
          return convos.length > 0 ? convos[0].id : null;
        });
      }
    } catch (err) {
      console.warn('Could not fetch conversations:', err);
    } finally {
      if (!silent) setIsLoadingConversations(false);
    }
  };

  const markConversationRead = async (clientId: string) => {
    if (!authToken || !clientId) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ clientId, reader: 'admin' })
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, unreadByAdmin: 0 } : c))
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (authToken) {
      loadData();
      fetchConversations();

      const interval = setInterval(() => {
        fetchConversations(true);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [authToken]);

  // When selected conversation changes or new messages arrive, handle scrolling smartly
  useEffect(() => {
    if (selectedConversationId && authToken) {
      const active = conversations.find(c => c.id === selectedConversationId);
      if (active && active.unreadByAdmin > 0) {
        markConversationRead(selectedConversationId);
      }

      const isSwitchingConvo = prevSelectedConvoRef.current !== selectedConversationId;
      const currentCount = active?.messages?.length || 0;
      const hasNewMessage = currentCount > prevConvoMsgCountRef.current;

      prevSelectedConvoRef.current = selectedConversationId;
      prevConvoMsgCountRef.current = currentCount;

      if (isSwitchingConvo) {
        isAdminAtBottomRef.current = true;
        setTimeout(() => {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      } else if (hasNewMessage && isAdminAtBottomRef.current) {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [selectedConversationId, conversations, authToken]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      setIsLocked(!data.allowed);
      setRemainingAttempts(data.remainingAttempts ?? 3);
      setRetryAfterMinutes(data.retryAfterMinutes ?? 0);
    } catch (err) {
      console.error('Failed to check status', err);
    }
  };

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        const fetchedProducts: Product[] = data.products || [];
        const fetchedCategories: CategoryItem[] = data.categories || [];
        
        setProducts(fetchedProducts);
        setCategories(fetchedCategories);

        if (fetchedCategories.length > 0) {
          const currentCat = targetAssignCategory && fetchedCategories.some(c => c.id === targetAssignCategory)
            ? targetAssignCategory
            : (fetchedCategories.find(c => c.id !== 'all')?.id || fetchedCategories[0]?.id);
          
          setTargetAssignCategory(currentCat);
          setNewCategory(currentCat);

          // Auto-select all products that already belong to this category
          const matchingIds = fetchedProducts.filter(p => p.category === currentCat).map(p => p.id);
          setSelectedProductIds(matchingIds);
        }
      }
    } catch (err) {
      console.error('Failed to load store data', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Send admin reply in chat
  const handleSendAdminReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = (customText || adminReplyText).trim();
    if (!text || !selectedConversationId || !authToken || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          clientId: selectedConversationId,
          sender: 'admin',
          senderName: 'صاحب المتجر',
          text
        })
      });

      if (res.ok) {
        setAdminReplyText('');
        fetchConversations(true);
        isAdminAtBottomRef.current = true;
        setTimeout(() => {
          chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chat/conversation/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== clientId));
        if (selectedConversationId === clientId) {
          setSelectedConversationId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Keep token in volatile React memory only for this visit (never in storage)
        setAuthToken(data.token);
        setPassword('');
        setAuthError(null);
        setIsLocked(false);
        setRemainingAttempts(3);
        await loadData();
      } else {
        setAuthError(data.error || 'فشل تسجيل الدخول');
        if (data.locked) {
          setIsLocked(true);
          setRetryAfterMinutes(data.retryAfterMinutes || 60);
          setRemainingAttempts(0);
        } else if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
      }
    } catch (err) {
      setAuthError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (err) {
        console.error(err);
      }
    }
    setAuthToken(null);
    setPassword('');
    try {
      localStorage.removeItem('atelier_admin_token');
      sessionStorage.removeItem('atelier_admin_token');
    } catch {
      // ignore
    }
  };

  const handleBackToStore = async () => {
    await handleLogout();
    onNavigateToStore();
  };

  // Image Upload handler (supports file upload or paste URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setNewImage(result);
        setImagePreview(result);
        setCropTargetImage(result);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Product Handler
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrice || !newImage) {
      alert('يرجى ملء اسم المنتج، السعر، والصورة');
      return;
    }

    setIsSavingProduct(true);
    setProductSuccessMessage(null);

    try {
      const selectedCatObj = categories.find(c => c.id === newCategory);
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          price: parseFloat(newPrice),
          category: newCategory,
          subcategory: selectedCatObj ? selectedCatObj.label : 'أزياء',
          image: newImage
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProductSuccessMessage('تمت إضافة المنتج وحفظه بنجاح!');
        setNewTitle('');
        setNewPrice('');
        setNewImage('');
        setImagePreview('');
        await loadData();
        onStoreUpdated();
        setTimeout(() => {
          setProductSuccessMessage(null);
          setActiveTab('products');
        }, 1500);
      } else {
        alert(data.error || 'حدث خطأ أثناء حفظ المنتج');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
        setSelectedProductIdsForDelete(prev => prev.filter(item => item !== id));
        await loadData();
        onStoreUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to delete product:', data);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  // Bulk Delete Products Handler
  const handleBulkDelete = async () => {
    if (selectedProductIdsForDelete.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedProductIdsForDelete.length} منتج محدد نهائياً؟`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ productIds: selectedProductIdsForDelete })
      });

      if (res.ok) {
        setSelectedProductIdsForDelete([]);
        await loadData();
        onStoreUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'فشل حذف المنتجات');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectProductForDelete = (id: string) => {
    setSelectedProductIdsForDelete(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllForDelete = () => {
    if (selectedProductIdsForDelete.length === products.length) {
      setSelectedProductIdsForDelete([]);
    } else {
      setSelectedProductIdsForDelete(products.map(p => p.id));
    }
  };

  // Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;

    setIsSavingCategory(true);
    setCategorySuccessMessage(null);

    try {
      const slug = `cat-${Date.now()}`;
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          id: slug,
          label: newCategoryLabel.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCategorySuccessMessage(`تم إنشاء تصنيف "${newCategoryLabel}" وحفظه بنجاح!`);
        setNewCategoryLabel('');
        await loadData();
        onStoreUpdated();
        setTimeout(() => setCategorySuccessMessage(null), 3000);
      } else {
        alert(data.error || 'فشل إنشاء التصنيف');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async (id: string, label: string) => {
    if (id === 'all') {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        await loadData();
        onStoreUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to delete category:', data);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  // Change active category in assignment manager & automatically select its current products
  const handleSelectTargetCategory = (catId: string, currentProducts = products) => {
    setTargetAssignCategory(catId);
    // Find all products that currently belong to this category and check them
    const matchingIds = currentProducts.filter(p => p.category === catId).map(p => p.id);
    setSelectedProductIds(matchingIds);
  };

  // Assign items to category Handler
  const handleAssignCategory = async () => {
    if (!targetAssignCategory) {
      alert('يرجى اختيار التصنيف المستهدف');
      return;
    }

    setIsAssigning(true);
    setAssignSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/categories/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          productIds: selectedProductIds,
          targetCategoryId: targetAssignCategory,
          syncMode: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const catLabel = categories.find(c => c.id === targetAssignCategory)?.label || targetAssignCategory;
        setAssignSuccessMessage(`تم بنجاح حفظ وتحديث منتجات تصنيف "${catLabel}" (يحتوي الآن على ${selectedProductIds.length} منتج)!`);
        await loadData();
        onStoreUpdated();
        setTimeout(() => setAssignSuccessMessage(null), 4000);
      } else {
        alert(data.error || 'فشل تخصيص التصنيف');
      }
    } catch (err) {
      alert('فشل الاتصال بالخادم');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map(p => p.id));
    }
  };

  const selectOnlyCurrentCategoryProducts = () => {
    if (!targetAssignCategory) return;
    const matchingIds = products.filter(p => p.category === targetAssignCategory).map(p => p.id);
    setSelectedProductIds(matchingIds);
  };

  // -------------------------------------------------------------
  // RENDER: LOGIN FORM (If not authenticated)
  // -------------------------------------------------------------
  if (!authToken) {
    return (
      <div className={`admin-panel min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        isDark ? 'bg-[#0d1015] text-neutral-100' : 'bg-[#f8f9fa] text-neutral-900'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full p-6 sm:p-8 rounded-3xl border shadow-xl ${
            isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200'
          }`}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-neutral-950 flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-400/20">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              لوحة التحكم الخاصة
            </h1>
            <p className={`text-xs sm:text-sm mt-1.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              المسار الخاص: <span className="font-mono bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-amber-500 font-bold">/adminpanel</span>
            </p>
          </div>

          {/* Security Notice & IP Rate Limit Tracker */}
          <div className={`p-4 rounded-2xl mb-6 text-xs flex items-start gap-3 border ${
            isLocked
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : isDark
                ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
                : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}>
            <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${isLocked ? 'text-rose-500' : 'text-amber-400'}`} />
            <div>
              <div className="font-bold mb-1">
                {isLocked ? 'العنوان محظور مؤقتاً' : 'حماية ضد التخمين (IP Rate Limit)'}
              </div>
              <p className="leading-relaxed">
                {isLocked ? (
                  `تم تجاوز الحد الأقصى (3 محاولات خاطئة خلال ساعة). يرجى الانتظار لنهاية فترة الحظر بعد ${retryAfterMinutes} دقيقة تقريباً.`
                ) : (
                  `يسمح النظام بـ 3 محاولات فقط لكل ساعة لعنوان IP الخاص بك (متبقي: ${remainingAttempts} محاولات). يلزم إدخال كلمة المرور في كل مرة يُفتح فيها هذا الرابط لضمان أمان المتجر.`
                )}
              </p>
            </div>
          </div>

          {/* Auth Error Message */}
          {authError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5">
                كلمة مرور لوحة التحكم
              </label>
              <input
                type="password"
                value={password}
                disabled={isLocked || isLoggingIn}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className={`w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-400'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-400'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLocked || isLoggingIn || !password.trim()}
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ التحقق...</span>
                </>
              ) : (
                <span>دخول لوحة التحكم</span>
              )}
            </button>
          </form>

          {/* Back to Store Button */}
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <button
              onClick={handleBackToStore}
              className={`text-xs font-semibold hover:text-amber-500 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>العودة إلى واجهة المتجر الرئيسية</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className={`admin-panel min-h-screen flex flex-col font-['Alexandria','Cairo',sans-serif] transition-colors duration-300 ${
      isDark ? 'bg-[#0d1015] text-neutral-100' : 'bg-[#fcfcfd] text-neutral-900'
    }`}>
      {/* Admin Navigation Bar */}
      <header className={`sticky top-0 z-40 border-b px-4 sm:px-8 py-3.5 backdrop-blur-md transition-colors ${
        isDark ? 'bg-[#15181e]/90 border-neutral-800' : 'bg-white/90 border-neutral-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base">لوحة تحكم المتجر</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-500 font-bold px-2 py-0.5 rounded-full">
                  /adminpanel
                </span>
              </div>
              <span className={`text-[11px] block ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                مخزون المنتجات والتصنيفات (حفظ دائم)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToStore}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark 
                  ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' 
                  : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معاينة المتجر</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>قائمة المنتجات ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new-product')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'new-product'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>التصنيفات وتوزيع المنتجات ({categories.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('messages');
              fetchConversations();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'messages'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>رسائل ومحادثات العملاء ({conversations.length})</span>
            {conversations.reduce((acc, c) => acc + (c.unreadByAdmin || 0), 0) > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                {conversations.reduce((acc, c) => acc + (c.unreadByAdmin || 0), 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customizer')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'customizer'
                ? 'bg-amber-400 text-neutral-950 shadow-sm'
                : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>تخصيص المظهر والهوية (🎨)</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ALL PRODUCTS LIST */}
        {/* ========================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">جميع المنتجات المتوفرة ({products.length})</h2>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  يمكنك استعراض كل المنتجات، تعديل تصنيفها، أو إدارتها وحذفها مباشرة
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-neutral-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  title="إضافة 5، 10، 20 أو 50 منتج تجريبي دفعة واحدة"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>إضافة منتجات متعددة دفعة واحدة</span>
                </button>

                <button
                  onClick={() => setActiveTab('new-product')}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    isDark ? 'bg-neutral-900 border-neutral-700 hover:bg-neutral-800' : 'bg-white border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <Plus className="w-4 h-4 text-amber-500" />
                  <span>إضافة منتج فردي</span>
                </button>
              </div>
            </div>

            {/* Bulk Selection Actions Bar */}
            {selectedProductIdsForDelete.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500">
                    تم تحديد ({selectedProductIdsForDelete.length}) من أصل ({products.length}) منتج
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllForDelete}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {selectedProductIdsForDelete.length === products.length ? 'إلغاء تحديد الكل' : 'تحديد كل المنتجات'}
                  </button>

                  <button
                    type="button"
                    disabled={isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isBulkDeleting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>حذف المنتجات المحددة ({selectedProductIdsForDelete.length})</span>
                  </button>
                </div>
              </div>
            )}

            {isLoadingData ? (
              <div className="py-12 text-center text-xs font-semibold">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                <span>جارٍ تحميل المنتجات...</span>
              </div>
            ) : products.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl border ${
                isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <Package className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold">لا يوجد أي منتجات حالياً</h3>
                <p className="text-xs text-neutral-400 mt-1 mb-4">يمكنك توليد حزمة منتجات تجريبية فوراً لاختبار الموقع</p>
                
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-neutral-950 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>توليد مجموعة منتجات تجريبية دفعة واحدة</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('new-product')}
                    className={`px-4 py-2 border text-xs font-bold rounded-xl cursor-pointer ${
                      isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-300'
                    }`}
                  >
                    إضافة منتج يدوي
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod) => {
                  const catLabel = categories.find(c => c.id === prod.category)?.label || prod.category;
                  const isSelected = selectedProductIdsForDelete.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className={`p-3.5 rounded-2xl border transition-all flex gap-3 relative overflow-hidden ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 shadow-xs'
                          : isDark 
                            ? 'bg-[#15181e] border-neutral-800 hover:border-neutral-700' 
                            : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
                      }`}
                    >
                      {/* Multi-select checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelectProductForDelete(prod.id)}
                        className="self-start text-amber-500 cursor-pointer pt-1"
                        title={isSelected ? 'إلغاء التحديد' : 'تحديد للحذف أو العمليات الجماعية'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 fill-amber-400 text-neutral-950" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400 hover:text-amber-500" />
                        )}
                      </button>

                      <img
                        src={prod.image}
                        alt={prod.title}
                        className="w-20 h-20 rounded-xl object-cover shrink-0 bg-neutral-200 dark:bg-neutral-800 border border-neutral-200/40 dark:border-neutral-700/40"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="flex-1 flex flex-col justify-between overflow-hidden min-w-0">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-bold text-amber-500 truncate">
                              {catLabel}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteProduct(prod.id, prod.title);
                              }}
                              className="text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="حذف المنتج"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className="text-xs font-bold line-clamp-1 leading-snug" title={prod.title}>
                            {prod.title}
                          </h4>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800">
                          <span className="text-xs font-extrabold text-amber-500">
                            {prod.price.toLocaleString('fr-DZ')} د.ج
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            ID: {prod.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ADD A NEW PRODUCT FORM */}
        {/* ========================================================= */}
        {activeTab === 'new-product' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">إضافة منتج جديد إلى المتجر</h2>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  أدخل اسم المنتج، السعر بالدينار الجزائري، الصورة (رابط أو رفع من جهازك)، واختر التصنيف المناسب
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Upload className="w-4 h-4" />
                <span>رفع عدة منتجات بالصور</span>
              </button>
            </div>

            {/* Bulk Upload Callout Banner */}
            <div 
              onClick={() => setIsBulkModalOpen(true)}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                isDark ? 'bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/15' : 'bg-amber-50 border-amber-200 hover:bg-amber-100/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-400 text-neutral-950 font-black shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-500">هل ترغب في إضافة عدة منتجات دفعة واحدة؟</h4>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    يمكنك رفع 5 أو 10 أو 20 صورة في وقت واحد، وقص كل صورة وضبط اسمها وسعرها وقسمها بسرعة.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-xl bg-amber-400 text-neutral-950 text-xs font-bold shrink-0">
                فتح الرفع الجماعي
              </span>
            </div>

            {productSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{productSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddProduct} className={`p-6 rounded-3xl border space-y-5 ${
              isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}>
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  اسم المنتج <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: سترة جينز معتقة أو هودي قطن ثقيل..."
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                  }`}
                />
              </div>

              {/* Price (in DZD) & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    السعر بالدينار الجزائري (د.ج) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="مثال: 12500"
                      className={`w-full pr-3.5 pl-14 py-2.5 text-sm rounded-xl border outline-none ${
                        isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                      }`}
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-500">
                      د.ج
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    التصنيف <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none ${
                      isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400 text-neutral-100' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400 text-neutral-900'
                    }`}
                  >
                    {categories.filter(c => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Input: URL or File Upload */}
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  صورة المنتج <span className="text-rose-500">*</span>
                </label>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="text"
                      value={newImage}
                      onChange={(e) => {
                        setNewImage(e.target.value);
                        setImagePreview(e.target.value);
                      }}
                      placeholder="أدخل رابط صورة (URL) أو ارفع من جهازك..."
                      className={`flex-1 min-w-[200px] px-3.5 py-2.5 text-xs rounded-xl border outline-none ${
                        isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                      }`}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        isDark ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700' : 'bg-neutral-100 border-neutral-300 hover:bg-neutral-200'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>رفع صورة</span>
                    </button>

                    {(imagePreview || newImage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCropTargetImage(imagePreview || newImage);
                          setIsCropperOpen(true);
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                        title="تحديد وقص أبعاد ومساحة الصورة"
                      >
                        <Crop className="w-4 h-4" />
                        <span>قص وتحديد المساحة</span>
                      </button>
                    )}
                  </div>

                  {/* Image Preview Box with Quick Crop Action */}
                  {imagePreview && (
                    <div className="flex items-start gap-4 p-3 rounded-2xl border border-dashed border-amber-400/50 bg-amber-400/5 w-fit">
                      <div className="relative group w-32 h-32 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950/20">
                        <img
                          src={imagePreview}
                          alt="معاينة الصورة"
                          className="w-full h-full object-cover"
                          onError={() => setImagePreview('')}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCropTargetImage(imagePreview);
                            setIsCropperOpen(true);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <Crop className="w-5 h-5 text-amber-400" />
                          <span>تعديل القص</span>
                        </button>
                      </div>
                      <div className="flex flex-col justify-between self-stretch py-1">
                        <div>
                          <span className="text-xs font-bold text-amber-500 block mb-1">تم تجهيز صورة المنتج</span>
                          <p className="text-[11px] text-neutral-400 max-w-xs">
                            يمكنك النقر على زر "قص وتحديد المساحة" أو النقر المباشر على الصورة لتعديل الإطار وتحديد المنطقة المناسبة للعرض.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCropTargetImage(imagePreview);
                            setIsCropperOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 w-fit cursor-pointer"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>تعديل وقص الإطار الآن</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSavingProduct}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingProduct ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>حفظ المنتج في المتجر</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CATEGORIES & ASSIGN ITEMS */}
        {/* ========================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-8">
            {/* Top Row: Create New Category Form */}
            <div className={`p-6 rounded-3xl border ${
              isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">إنشاء تصنيف جديد</h3>
              </div>

              {categorySuccessMessage && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{categorySuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={newCategoryLabel}
                  onChange={(e) => setNewCategoryLabel(e.target.value)}
                  placeholder="اسم التصنيف الجديد (مثال: ملابس السهرة، أوشحة صوفية، أزياء رسمية)..."
                  className={`flex-1 px-4 py-2.5 text-sm rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isSavingCategory || !newCategoryLabel.trim()}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة التصنيف</span>
                </button>
              </form>

              {/* Existing Categories Badges */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h4 className="text-xs font-bold text-neutral-400">
                    التصنيفات الحالية في المتجر (انقر على أي تصنيف لإدارة منتجاته وتحديدها فوراً):
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.id !== 'all').map((cat) => {
                    const count = products.filter(p => p.category === cat.id).length;
                    const isActive = targetAssignCategory === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectTargetCategory(cat.id)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all select-none ${
                          isActive
                            ? 'border-amber-400 bg-amber-400/15 text-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                            : isDark
                              ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                              : 'bg-neutral-100 border-neutral-200 hover:border-neutral-300 text-neutral-800'
                        }`}
                      >
                        <span className="font-bold">{cat.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-amber-400 text-neutral-950' : 'bg-amber-400/20 text-amber-500'
                        }`}>
                          {count} منتج
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id, cat.label);
                          }}
                          className="text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 p-1 rounded transition-colors cursor-pointer mr-0.5"
                          title="حذف هذا التصنيف"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Section: Select Items & Assign to a Category */}
            <div className={`p-6 rounded-3xl border ${
              isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Tags className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold">
                      إدارة وتحديد المنتجات التابعة لتصنيف: <span className="text-amber-500 underline decoration-amber-400/50 underline-offset-4">{categories.find(c => c.id === targetAssignCategory)?.label || 'اختر تصنيف'}</span>
                    </h3>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    عند اختيار التصنيف، يتم تحديد جميع المنتجات التابعة له مسبقاً تلقائياً بعلامة الصح. يمكنك إضافة أو إزالة منتجات ثم الضغط على حفظ.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start">
                  <button
                    type="button"
                    onClick={selectOnlyCurrentCategoryProducts}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10' : 'border-amber-400/60 text-amber-600 hover:bg-amber-50'
                    }`}
                    title="إعادة تحديد منتجات هذا التصنيف فقط"
                  >
                    منتجات هذا التصنيف فقط
                  </button>

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'
                    }`}
                  >
                    {selectedProductIds.length === products.length ? 'إلغاء تحديد الكل' : 'تحديد كل المنتجات'}
                  </button>
                </div>
              </div>

              {assignSuccessMessage && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignSuccessMessage}</span>
                </div>
              )}

              {/* Assign Action Bar */}
              <div className={`p-4 rounded-2xl mb-4 flex flex-col sm:flex-row items-center gap-3 border ${
                isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold">
                    التصنيف المستهدف:
                  </span>
                </div>

                <select
                  value={targetAssignCategory}
                  onChange={(e) => handleSelectTargetCategory(e.target.value)}
                  className={`flex-1 px-3.5 py-2.5 text-xs font-bold rounded-xl border outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-800 focus:border-amber-400' : 'bg-white border-neutral-300 focus:border-amber-400'
                  }`}
                >
                  {categories.filter(c => c.id !== 'all').map((cat) => {
                    const catCount = products.filter(p => p.category === cat.id).length;
                    return (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({catCount} منتج)
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  disabled={isAssigning || !targetAssignCategory}
                  onClick={handleAssignCategory}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  {isAssigning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckSquare className="w-4 h-4" />
                  )}
                  <span>حفظ وتثبيت المنتجات ({selectedProductIds.length})</span>
                </button>
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setAssignFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    assignFilterTab === 'all'
                      ? 'bg-amber-400 text-neutral-950'
                      : isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  جميع المنتجات ({products.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAssignFilterTab('assigned')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    assignFilterTab === 'assigned'
                      ? 'bg-amber-400 text-neutral-950'
                      : isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  التابعة لهذا التصنيف حالياً ({products.filter(p => p.category === targetAssignCategory).length})
                </button>

                <button
                  type="button"
                  onClick={() => setAssignFilterTab('unassigned')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    assignFilterTab === 'unassigned'
                      ? 'bg-amber-400 text-neutral-950'
                      : isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  منتجات تصنيفات أخرى ({products.filter(p => p.category !== targetAssignCategory).length})
                </button>
              </div>

              {/* Selectable Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products
                  .filter((prod) => {
                    if (assignFilterTab === 'assigned') return prod.category === targetAssignCategory;
                    if (assignFilterTab === 'unassigned') return prod.category !== targetAssignCategory;
                    return true;
                  })
                  .map((prod) => {
                    const isSelected = selectedProductIds.includes(prod.id);
                    const isBelongingToCurrentCategory = prod.category === targetAssignCategory;
                    const currentCategoryLabel = categories.find(c => c.id === prod.category)?.label || prod.category;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleSelectProduct(prod.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none relative overflow-hidden ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 shadow-xs'
                            : isDark
                              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                              : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="text-amber-500 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 fill-amber-400 text-neutral-950" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>

                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-neutral-200 dark:bg-neutral-800 border border-neutral-200/40 dark:border-neutral-700/40"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] text-amber-500 font-bold truncate">
                              {currentCategoryLabel}
                            </span>
                            {isBelongingToCurrentCategory ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                                منتمٍ لهذا التصنيف
                              </span>
                            ) : isSelected ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-400 font-bold">
                                سيتم نقله له
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs font-bold truncate">
                            {prod.title}
                          </div>
                          <div className="text-[11px] font-extrabold text-neutral-400">
                            {prod.price.toLocaleString('fr-DZ')} د.ج
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CUSTOMER MESSAGES / CHAT */}
        {/* ========================================================= */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">محادثات ورسائل العملاء</h2>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  تواصل مباشرة مع الزبائن حول أسعار المنتجات، التوصيل لمختلف الولايات، وتأكيد الطلبات
                </p>
              </div>

              <button
                onClick={() => fetchConversations()}
                disabled={isLoadingConversations}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer ${
                  isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingConversations ? 'animate-spin' : ''}`} />
                <span>تحديث المحادثات</span>
              </button>
            </div>

            {conversations.length === 0 ? (
              <div className={`p-12 text-center rounded-3xl border ${
                isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200'
              }`}>
                <div className="w-16 h-16 rounded-3xl bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base mb-1">لا توجد رسائل واردة من العملاء حتى الآن</h3>
                <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  عندما يضغط أي عميل في المتجر على زر "شراء" لأي منتج، سيتم فتح محادثة فورية معك تظهر هنا للتفاوض حول السعر والتوصيل.
                </p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-3xl border overflow-hidden h-[calc(100vh-200px)] min-h-[580px] ${
                isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
              }`}>
                {/* Conversations List Column */}
                <div className={`lg:col-span-4 border-b lg:border-b-0 lg:border-l flex flex-col min-h-0 ${
                  isDark ? 'border-neutral-800 bg-[#12151b]' : 'border-neutral-200 bg-neutral-50/60'
                }`}>
                  <div className={`p-4 border-b flex items-center justify-between ${
                    isDark ? 'border-neutral-800' : 'border-neutral-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">قائمة الزبائن</h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-500 font-bold">
                        {conversations.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                    {conversations.map((convo) => {
                      const isSelected = convo.id === selectedConversationId;
                      const hasUnread = (convo.unreadByAdmin || 0) > 0;
                      return (
                        <div
                          key={convo.id}
                          onClick={() => setSelectedConversationId(convo.id)}
                          className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 select-none relative group ${
                            isSelected
                              ? isDark
                                ? 'bg-amber-400/10 border-r-4 border-amber-400 text-white'
                                : 'bg-amber-50 border-r-4 border-amber-400 text-neutral-900'
                              : isDark
                                ? 'hover:bg-neutral-800/60 text-neutral-300'
                                : 'hover:bg-neutral-100/80 text-neutral-700'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold shrink-0 text-sm shadow-xs">
                            {convo.clientUsername ? convo.clientUsername.slice(0, 2).toUpperCase() : 'ع'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-xs truncate">
                                {convo.clientUsername || 'عميل'}
                              </span>
                              <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                                {new Date(convo.updatedAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {convo.product && (
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-amber-500 font-bold truncate">
                                <ShoppingBag className="w-3 h-3 shrink-0" />
                                <span className="truncate">{convo.product.title}</span>
                              </div>
                            )}

                            <p className={`text-xs truncate ${hasUnread ? 'font-bold text-amber-500' : isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                              {convo.lastMessageText || 'محادثة جديدة'}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {hasUnread && (
                              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {convo.unreadByAdmin}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteConversation(convo.id, e);
                              }}
                              className="p-1 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="حذف المحادثة"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Chat Column */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-0">
                  {(() => {
                    const currentConvo = conversations.find(c => c.id === selectedConversationId);
                    if (!currentConvo) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                          <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-sm font-semibold">اختر محادثة من القائمة لعرض الرسائل والرد على الزبون</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {/* Top Bar */}
                        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
                          isDark ? 'bg-[#181b22] border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-neutral-950 flex items-center justify-center font-bold">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">
                                  {currentConvo.clientUsername || 'عميل'}
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-500 font-mono">
                                  ID: {currentConvo.id.slice(-6)}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-0.5">
                                المحادثة جارية حول تفاصيل الشراء والتوصيل
                              </p>
                            </div>
                          </div>

                          {currentConvo.product && (
                            <div className={`p-2 px-3 rounded-xl border flex items-center gap-2 max-w-xs ${
                              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
                            }`}>
                              <img 
                                src={currentConvo.product.image} 
                                alt={currentConvo.product.title} 
                                className="w-9 h-9 rounded-lg object-cover shrink-0" 
                              />
                              <div className="min-w-0 text-right">
                                <p className="text-[11px] font-bold truncate">{currentConvo.product.title}</p>
                                <span className="text-[11px] font-extrabold text-amber-500">
                                  {currentConvo.product.price.toLocaleString('fr-DZ')} د.ج
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Chat Messages Feed */}
                        <div 
                          ref={adminChatContainerRef}
                          onScroll={handleAdminScroll}
                          className="flex-1 p-4 overflow-y-auto space-y-3.5"
                        >
                          {currentConvo.messages.map((msg) => {
                            const isClient = msg.sender === 'client';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                              >
                                <span className={`text-[10px] mb-1 px-1 font-semibold ${
                                  isClient ? 'text-amber-500' : 'text-neutral-400'
                                }`}>
                                  {isClient ? (currentConvo.clientUsername || 'الزبون') : 'أنت (صاحب المتجر)'}
                                </span>

                                <div
                                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                                    !isClient
                                      ? isDark
                                        ? 'bg-amber-400 text-neutral-950 font-medium rounded-bl-sm'
                                        : 'bg-amber-400 text-neutral-950 font-medium rounded-bl-sm'
                                      : isDark
                                        ? 'bg-neutral-800/90 text-neutral-100 border border-neutral-700/80 rounded-br-sm'
                                        : 'bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-br-sm'
                                  }`}
                                >
                                  {msg.productContext && (
                                    <div className={`p-2 rounded-xl mb-2 flex items-center gap-2.5 border text-right ${
                                      !isClient
                                        ? 'bg-neutral-950/10 border-neutral-950/10'
                                        : isDark
                                          ? 'bg-neutral-900 border-neutral-700'
                                          : 'bg-white border-neutral-200'
                                    }`}>
                                      <img 
                                        src={msg.productContext.image} 
                                        alt={msg.productContext.title} 
                                        className="w-10 h-10 rounded-lg object-cover" 
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold truncate">{msg.productContext.title}</p>
                                        <span className="text-[11px] font-extrabold text-amber-500">
                                          {msg.productContext.price.toLocaleString('fr-DZ')} د.ج
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <p className="whitespace-pre-wrap">{msg.text}</p>

                                  <div className={`text-[9px] mt-1 text-left ${
                                    !isClient ? 'text-neutral-800/70 font-semibold' : 'text-neutral-400'
                                  }`}>
                                    {new Date(msg.createdAt).toLocaleTimeString('ar-DZ', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={chatMessagesEndRef} />
                        </div>

                        {/* Input Reply Box */}
                        <div className={`p-3 sm:p-4 border-t shrink-0 ${
                          isDark ? 'bg-[#15181e] border-neutral-800' : 'bg-white border-neutral-200'
                        }`}>
                          <form onSubmit={handleSendAdminReply} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={adminReplyText}
                              onChange={(e) => setAdminReplyText(e.target.value)}
                              placeholder="اكتب ردك للزبون حول السعر والتوصيل..."
                              disabled={isSendingReply}
                              className={`flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-2xl border outline-none transition-all ${
                                isDark
                                  ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400'
                                  : 'bg-neutral-100 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-amber-400'
                              }`}
                            />
                            <button
                              type="submit"
                              disabled={isSendingReply || !adminReplyText.trim()}
                              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              {isSendingReply ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>إرسال الرد</span>
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: STORE & THEME CUSTOMIZER */}
        {/* ========================================================= */}
        {activeTab === 'customizer' && authToken && (
          <StoreCustomizerTab
            themeMode={themeMode}
            authToken={authToken}
            products={products}
            onSettingsSaved={() => {
              onStoreUpdated();
            }}
          />
        )}
      </main>

      {/* Interactive Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropTargetImage}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={(croppedDataUrl) => {
          setNewImage(croppedDataUrl);
          setImagePreview(croppedDataUrl);
        }}
        themeMode={themeMode}
      />

      {/* Bulk Product Addition & Generator Modal */}
      {authToken && (
        <BulkProductModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          categories={categories}
          authToken={authToken}
          onProductsAdded={async () => {
            await loadData();
            onStoreUpdated();
          }}
          themeMode={themeMode}
        />
      )}
    </div>
  );
};
