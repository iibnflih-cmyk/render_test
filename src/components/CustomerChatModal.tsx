import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  User, 
  MessageCircle, 
  Store, 
  ShoppingBag, 
  RefreshCw,
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ProductInquiryContext, ChatMessage, Conversation, ThemeMode, ClientChatUser } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';

interface CustomerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  productInquiry: ProductInquiryContext | null;
  onClearProductInquiry: () => void;
  themeMode: ThemeMode;
}

const STORAGE_USER_KEY = 'atelier_client_chat_user';
const STORAGE_MESSAGES_PREFIX = 'atelier_client_cached_messages_';

export const CustomerChatModal: React.FC<CustomerChatModalProps> = ({
  isOpen,
  onClose,
  productInquiry,
  onClearProductInquiry,
  themeMode
}) => {
  const isDark = themeMode === 'dark';
  const { settings } = useStoreSettings();

  // Client User State
  const [currentUser, setCurrentUser] = useState<ClientChatUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [inputUsername, setInputUsername] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const initialScrolledRef = useRef(false);

  // Helper to scroll to bottom safely
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    } else if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    isAtBottomRef.current = true;
  };

  // Monitor user scrolling to avoid jerking them down if they scrolled up
  const handleContainerScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const threshold = 70; // within 70px of bottom is considered 'at bottom'
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    isAtBottomRef.current = isBottom;
  };

  // Hide right-side document scrollbar when customer is on messaging page
  useEffect(() => {
    if (isOpen) {
      initialScrolledRef.current = false;
      isAtBottomRef.current = true;
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isOpen]);

  // Load cached messages from localStorage when user is known
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const cached = localStorage.getItem(STORAGE_MESSAGES_PREFIX + currentUser.id);
        if (cached) {
          setMessages(JSON.parse(cached));
        }
      } catch {
        // ignore
      }
    }
  }, [currentUser?.id]);

  // Fetch latest messages from server
  const fetchMessages = async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setIsLoadingMessages(true);

    try {
      const res = await fetch(`/api/chat/conversation/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const convo: Conversation = data.conversation;
        if (convo && Array.isArray(convo.messages)) {
          // Compare with previous messages to avoid unnecessary state updates & re-renders
          setMessages((prev) => {
            if (
              prev.length === convo.messages.length &&
              prev[prev.length - 1]?.id === convo.messages[convo.messages.length - 1]?.id
            ) {
              return prev;
            }
            return convo.messages;
          });

          try {
            localStorage.setItem(
              STORAGE_MESSAGES_PREFIX + currentUser.id,
              JSON.stringify(convo.messages)
            );
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn('Could not refresh messages:', err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  // Mark messages as read by client
  const markAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: currentUser.id, reader: 'client' })
      });
    } catch {
      // ignore
    }
  };

  // Polling when modal is open and user exists
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;

    fetchMessages();
    markAsRead();

    const interval = setInterval(() => {
      fetchMessages(true);
      markAsRead();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, currentUser?.id]);

  // Scroll to bottom ONLY on initial load or if user is already at the bottom
  useEffect(() => {
    if (!isOpen) return;

    if (messages.length > 0) {
      if (!initialScrolledRef.current) {
        initialScrolledRef.current = true;
        // On initial open, scroll to bottom immediately
        setTimeout(() => scrollToBottom('auto'), 50);
      } else if (isAtBottomRef.current) {
        // Only follow new messages if user hasn't scrolled up
        scrollToBottom('smooth');
      }
    }
  }, [messages, isOpen]);

  // Handle setting username on first entry
  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = inputUsername.trim();
    if (!cleanName) return;

    const user: ClientChatUser = {
      id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanName
    };

    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string, attachedProduct?: ProductInquiryContext | null) => {
    const text = (textToSend || inputText).trim();
    if (!text || !currentUser?.id || isSending) return;

    setIsSending(true);
    const prod = attachedProduct !== undefined ? attachedProduct : productInquiry;

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: currentUser.id,
          clientUsername: currentUser.username,
          sender: 'client',
          senderName: currentUser.username,
          text,
          productContext: prod || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          const updated = [...messages, data.message];
          setMessages(updated);
          setTimeout(() => scrollToBottom('smooth'), 50);
          try {
            localStorage.setItem(
              STORAGE_MESSAGES_PREFIX + currentUser.id,
              JSON.stringify(updated)
            );
          } catch {
            // ignore
          }
        }
        setInputText('');
        if (attachedProduct || productInquiry) {
          onClearProductInquiry();
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="customer-chat-full-page"
      className="fixed inset-0 z-50 flex flex-col w-full h-dvh overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-bg, #0e1117)',
        color: 'var(--theme-text, #f5f5f5)'
      }}
      dir="rtl"
    >
      {/* ========================================================= */}
      {/* FULL PAGE HEADER */}
      {/* ========================================================= */}
      <header 
        className="w-full px-4 sm:px-8 py-3.5 border-b flex items-center justify-between shrink-0 shadow-xs z-20"
        style={{
          backgroundColor: 'var(--theme-nav, var(--theme-card, #151921))',
          borderColor: 'var(--theme-border, #262d38)'
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            id="chat-back-to-store-btn"
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border"
            style={{
              backgroundColor: 'var(--theme-card, #151921)',
              borderColor: 'var(--theme-border, #262d38)',
              color: 'var(--theme-text, #f5f5f5)'
            }}
            title="العودة إلى متجر المنتجات"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمتجر</span>
          </button>

          <div className="h-6 w-px opacity-20 bg-current hidden sm:block" />

          <div className="hidden sm:flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs overflow-hidden"
              style={{
                backgroundColor: settings.logoUrl ? 'transparent' : 'var(--theme-primary, #f59e0b)',
                color: 'var(--theme-primary-text, #0a0a0a)'
              }}
            >
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base leading-none">
                  {settings.storeName ? `محادثة مع ${settings.storeName}` : 'محادثة الشراء المباشرة مع صاحب المتجر'}
                </h1>
              </div>
              <p className="text-xs mt-1 opacity-70">
                {settings.storeTagline || 'ناقش السعر، طريقة وتكلفة التوصيل لولايتك، وأكد طلب الشراء مباشرة'}
              </p>
            </div>
          </div>
        </div>

        {/* User Identity & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && (
            <div 
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs"
              style={{
                backgroundColor: 'var(--theme-card, #151921)',
                borderColor: 'var(--theme-border, #262d38)',
                color: 'var(--theme-text, #f5f5f5)'
              }}
            >
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">{currentUser.username}</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl transition-colors cursor-pointer hover:opacity-80"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN VIEWPORT BODY */}
      {/* ========================================================= */}
      {!currentUser ? (
        /* Full-page Onboarding Screen if user name is missing */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto no-scrollbar">
          <div className={`w-full max-w-md p-8 rounded-3xl border shadow-xl ${
            isDark ? 'bg-[#151921] border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <div className="w-16 h-16 rounded-3xl bg-amber-400/15 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">
              مرحباً بك في صفحة الشراء والتواصل
            </h2>

            <p className={`text-xs sm:text-sm mb-6 leading-relaxed ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              أدخل اسمك الكريم أو اسم المستخدم للبدء في المحادثة الكاملة مع صاحب المتجر حول السعر والتوصيل.
            </p>

            {/* Product context preview if selected */}
            {productInquiry && (
              <div className={`w-full p-3.5 rounded-2xl border mb-6 flex items-center gap-3.5 text-right ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
              }`}>
                <img 
                  src={productInquiry.image} 
                  alt={productInquiry.title}
                  className="w-14 h-14 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] text-amber-500 font-bold block">المنتج المراد شراؤه:</span>
                  <p className="text-sm font-bold truncate">{productInquiry.title}</p>
                  <p className="text-xs font-extrabold text-amber-500 mt-0.5">
                    {productInquiry.price.toLocaleString('fr-DZ')} د.ج
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveUsername} className="space-y-3">
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder="أدخل اسمك الكريم (مثال: كريم، مريم)..."
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-amber-400'
                }`}
                autoFocus
              />

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!inputUsername.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-bold text-sm transition-all shadow-md cursor-pointer"
                >
                  بدء المحادثة الآن
                </button>
              </div>
            </form>

            <p className={`text-[11px] mt-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              تُحفظ رسائلك واسمك على هذا المتصفح لتتمكن من متابعة الحديث في أي وقت.
            </p>
          </div>
        </div>
      ) : (
        /* Full-Page Chat Layout (Sidebar + Chat Arena) */
        <div className="flex-1 flex overflow-hidden p-3 sm:p-6 max-w-7xl w-full mx-auto gap-6">
          {/* LEFT SIDEBAR: Product purchase card */}
          <div className="hidden lg:flex lg:w-[360px] shrink-0 flex-col gap-4 overflow-y-auto no-scrollbar">
            {productInquiry ? (
              <div 
                className="p-5 rounded-3xl border flex flex-col shadow-xs"
                style={{
                  backgroundColor: 'var(--theme-card, #151921)',
                  borderColor: 'var(--theme-border, #262d38)',
                  color: 'var(--theme-text, #f5f5f5)'
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span 
                    className="text-xs font-bold flex items-center gap-1.5"
                    style={{ color: 'var(--theme-primary, #f59e0b)' }}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    تفاصيل المنتج المراد شراؤه
                  </span>
                  <button
                    onClick={onClearProductInquiry}
                    className="text-[11px] opacity-70 hover:opacity-100 hover:text-rose-500 transition-colors cursor-pointer"
                    title="إلغاء إرفاق المنتج"
                  >
                    إلغاء الإرفاق
                  </button>
                </div>

                <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 bg-black/20">
                  <img 
                    src={productInquiry.image} 
                    alt={productInquiry.title}
                    className="w-full h-full object-cover"
                  />
                  {productInquiry.category && (
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                      {productInquiry.category}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-base leading-snug mb-2">
                  {productInquiry.title}
                </h3>

                <div className="flex items-baseline gap-2 mb-4">
                  <span 
                    className="text-2xl font-black"
                    style={{ color: 'var(--theme-accent, #fbbf24)' }}
                  >
                    {productInquiry.price.toLocaleString('fr-DZ')}
                  </span>
                  <span 
                    className="text-sm font-bold"
                    style={{ color: 'var(--theme-accent, #fbbf24)' }}
                  >
                    د.ج (دينار جزائري)
                  </span>
                </div>

                <button
                  onClick={() => handleSendMessage(`مرحباً، أود شراء منتج: ${productInquiry.title} بسعر ${productInquiry.price.toLocaleString('fr-DZ')} د.ج. هل هو متوفر وكيف يتم التوصيل إلى ولايتي؟`, productInquiry)}
                  disabled={isSending}
                  className="w-full py-3 px-4 rounded-2xl disabled:opacity-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-primary, #f59e0b)',
                    color: 'var(--theme-primary-text, #0a0a0a)'
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال استفسار شراء هذا المنتج</span>
                </button>
              </div>
            ) : (
              <div 
                className="p-5 rounded-3xl border flex flex-col shadow-xs"
                style={{
                  backgroundColor: 'var(--theme-card, #151921)',
                  borderColor: 'var(--theme-border, #262d38)',
                  color: 'var(--theme-text, #f5f5f5)'
                }}
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--theme-primary, #f59e0b)'
                  }}
                >
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base mb-1">شراء المنتجات</h3>
                <p className="text-xs leading-relaxed mb-4 opacity-75">
                  يمكنك تصفح أي منتج في المتجر والضغط على زر <strong>"شراء"</strong> لإرفاق تفاصيله وصورته مباشرة في المحادثة والتفاوض بشأنه.
                </p>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer hover:opacity-85"
                  style={{
                    borderColor: 'var(--theme-border, #262d38)',
                    color: 'var(--theme-text, #f5f5f5)'
                  }}
                >
                  تصفح المنتجات في المتجر
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Full Page Chat Arena */}
          <div 
            className="flex-1 flex flex-col h-full rounded-3xl border overflow-hidden shadow-xs"
            style={{
              backgroundColor: 'var(--theme-card, #151921)',
              borderColor: 'var(--theme-border, #262d38)',
              color: 'var(--theme-text, #f5f5f5)'
            }}
          >
            {/* Mobile Product Inquiry Bar (if screen is small and product is attached) */}
            {productInquiry && (
              <div className={`lg:hidden p-3 border-b flex items-center justify-between gap-3 shrink-0 ${
                isDark ? 'bg-amber-400/10 border-amber-400/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <img 
                    src={productInquiry.image} 
                    alt={productInquiry.title}
                    className="w-10 h-10 rounded-xl object-cover shrink-0" 
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{productInquiry.title}</p>
                    <span className="text-xs font-extrabold text-amber-500">
                      {productInquiry.price.toLocaleString('fr-DZ')} د.ج
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleSendMessage(`مرحباً، أود شراء ${productInquiry.title} بسعر ${productInquiry.price.toLocaleString('fr-DZ')} د.ج. هل هو متوفر وكيف يتم التوصيل؟`, productInquiry)}
                  disabled={isSending}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>إرسال الاستفسار</span>
                </button>
              </div>
            )}

            {/* Chat Messages Feed */}
            <div 
              ref={chatContainerRef}
              onScroll={handleContainerScroll}
              className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4"
            >
              {/* Automated Welcome Banner (if enabled) */}
              {settings.automatedMessages?.enabled && settings.automatedMessages?.welcomeMessage && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs ${
                  isDark ? 'bg-amber-400/10 border-amber-400/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide block mb-1 text-amber-500">
                      رسالة ترحيبية من المتجر
                    </span>
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {settings.automatedMessages.welcomeMessage}
                    </p>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-12">
                  <div className="w-16 h-16 rounded-3xl bg-neutral-200/50 dark:bg-neutral-800/50 flex items-center justify-center text-neutral-400 mb-4">
                    <MessageCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">المحادثة مفتوحة وجاهزة</h3>
                  <p className={`text-xs sm:text-sm max-w-md ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    أرسل رسالتك الآن للاستفسار عن أسعار المنتجات، إمكانية التخفيض، ومدة وتكلفة التوصيل لولايتك.
                  </p>

                  {/* Starter question buttons in empty state */}
                  {settings.automatedMessages?.enabled && settings.automatedMessages?.starterQuestions?.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                      {settings.automatedMessages.starterQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className={`text-xs font-semibold py-2 px-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isDark 
                              ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-200' 
                              : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-800 shadow-xs'
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg) => {
                  const isClient = msg.sender === 'client';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label */}
                      <span className={`text-[10px] mb-1 px-1 font-bold ${
                        isClient ? 'text-neutral-400' : 'text-amber-500'
                      }`}>
                        {isClient ? `${currentUser.username} (أنت)` : (settings.storeName || 'صاحب المتجر (الإدارة)')}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`max-w-[88%] sm:max-w-[70%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                          isClient
                            ? 'bg-amber-400 text-neutral-950 font-medium rounded-bl-sm shadow-xs'
                            : isDark
                              ? 'bg-neutral-800/95 text-neutral-100 border border-neutral-700/80 rounded-br-sm shadow-xs'
                              : 'bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-br-sm shadow-xs'
                        }`}
                        style={isClient ? {
                          backgroundColor: 'var(--theme-primary, #f59e0b)',
                          color: 'var(--theme-primary-text, #0a0a0a)'
                        } : undefined}
                      >
                        {/* Attached Product preview inside bubble if any */}
                        {msg.productContext && (
                          <div className={`p-2.5 rounded-xl mb-2.5 flex items-center gap-3 border text-right ${
                            isClient
                              ? 'bg-black/10 border-black/10'
                              : isDark
                                ? 'bg-neutral-900 border-neutral-700'
                                : 'bg-white border-neutral-200'
                          }`}>
                            <img 
                              src={msg.productContext.image} 
                              alt={msg.productContext.title} 
                              className="w-12 h-12 rounded-xl object-cover" 
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold block opacity-80">المنتج المستفسر عنه:</span>
                              <p className="text-xs font-bold truncate">{msg.productContext.title}</p>
                              <span className="text-xs font-extrabold text-amber-500">
                                {msg.productContext.price.toLocaleString('fr-DZ')} د.ج
                              </span>
                            </div>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap text-xs sm:text-sm">{msg.text}</p>

                        <div className={`text-[10px] mt-1.5 text-left font-mono ${
                          isClient ? 'opacity-70 font-semibold' : 'text-neutral-400'
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString('ar-DZ', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Starter Questions Quick Bar (if enabled) */}
            {settings.automatedMessages?.enabled && settings.automatedMessages?.starterQuestions?.length > 0 && (
              <div className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 ${
                isDark ? 'bg-[#151921]/60 border-neutral-800' : 'bg-neutral-100/70 border-neutral-200'
              }`}>
                <span className="text-[11px] font-bold text-neutral-400 shrink-0 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  أسئلة سريعة:
                </span>
                {settings.automatedMessages.starterQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(q);
                      inputRef.current?.focus();
                    }}
                    className={`text-[11px] font-medium py-1 px-3 rounded-full border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-neutral-800 border-neutral-700 hover:border-amber-400 text-neutral-200'
                        : 'bg-white border-neutral-200 hover:border-amber-400 text-neutral-700 shadow-2xs'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Reply Area */}
            <div className={`p-3.5 sm:p-5 border-t shrink-0 ${
              isDark ? 'bg-[#12151b] border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
            }`}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب استفسارك هنا حول المنتج، السعر والتوصيل..."
                  disabled={isSending}
                  className={`flex-1 px-4 sm:px-5 py-3 text-xs sm:text-sm rounded-2xl border outline-none transition-all ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-400'
                      : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-amber-400 shadow-xs'
                  }`}
                />

                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="px-5 sm:px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--theme-primary, #f59e0b)',
                    color: 'var(--theme-primary-text, #0a0a0a)'
                  }}
                  title="إرسال"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
