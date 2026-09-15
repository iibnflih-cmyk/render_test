import React, { useState, useRef, useEffect } from 'react';
import { 
  Palette, 
  Sparkles, 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Check, 
  RotateCcw, 
  Save, 
  MessageSquare, 
  Plus, 
  Eye, 
  Crown, 
  Zap, 
  Gem, 
  ShoppingBag, 
  Heart, 
  Star, 
  ShieldCheck, 
  Flame, 
  Bell, 
  CheckCircle2, 
  AlertCircle,
  Crop,
  Smartphone,
  Monitor,
  Tablet,
  Sliders,
  Paintbrush
} from 'lucide-react';
import { StoreSettings, ColorPalettePreset, Product } from '../../types';
import { COLOR_PALETTES, DEFAULT_STORE_SETTINGS } from '../../data/themePresets';
import { ImageCropperModal } from '../ImageCropperModal';
import { useStoreSettings } from '../../context/StoreSettingsContext';

interface StoreCustomizerTabProps {
  authToken: string;
  onSettingsSaved?: () => void;
  themeMode?: string;
  products?: Product[];
}

const LOGO_ICONS = [
  { id: 'zap', label: 'طاقة / برق', Icon: Zap },
  { id: 'crown', label: 'تاج ملكي', Icon: Crown },
  { id: 'sparkles', label: 'بريق وتميز', Icon: Sparkles },
  { id: 'gem', label: 'جوهرة نادرة', Icon: Gem },
  { id: 'shopping-bag', label: 'حقيبة تسوق', Icon: ShoppingBag },
  { id: 'star', label: 'نجمة ذهبية', Icon: Star },
  { id: 'heart', label: 'قلب', Icon: Heart },
  { id: 'shield', label: 'أمان وثقة', Icon: ShieldCheck },
  { id: 'flame', label: 'شعلة', Icon: Flame }
];

const PRESET_QUICK_COLORS = [
  '#0d1015', '#f8fafc', '#ffffff', '#111827', '#151921', '#1e293b', 
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#06b6d4', '#14b8a6', '#64748b', '#27272a', '#09090b'
];

export const StoreCustomizerTab: React.FC<StoreCustomizerTabProps> = ({
  authToken,
  onSettingsSaved,
  themeMode,
  products
}) => {
  const { settings: globalSettings, updateSettings, refreshSettings } = useStoreSettings();

  // Current Working Settings State
  const [draftSettings, setDraftSettings] = useState<StoreSettings>(() => {
    return globalSettings || DEFAULT_STORE_SETTINGS;
  });

  const [activeTab, setActiveTab] = useState<'colors' | 'identity' | 'messages'>('colors');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // New Starter Question Input
  const [newQuestionInput, setNewQuestionInput] = useState('');

  // Image Cropper for Logo
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [rawLogoImage, setRawLogoImage] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch current server settings on mount and sync with draft
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setDraftSettings(data.settings);
          }
        }
      } catch (err) {
        console.warn('Could not fetch settings:', err);
      }
    };
    fetchLatest();
  }, []);

  // Sync draft when global settings change externally
  useEffect(() => {
    if (globalSettings && !hasChanges) {
      setDraftSettings(globalSettings);
    }
  }, [globalSettings, hasChanges]);

  // Update a field in draft
  const handleUpdate = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setDraftSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  // Update nested theme
  const handleUpdateTheme = (patch: Partial<StoreSettings['theme']>) => {
    setDraftSettings(prev => ({
      ...prev,
      theme: { ...prev.theme, ...patch }
    }));
    setHasChanges(true);
  };

  // Select a preset palette
  const handleSelectPalette = (preset: ColorPalettePreset) => {
    const bg = preset.backgroundColor || preset.darkBg || preset.lightBg || '#0d1015';
    const card = preset.cardBackground || preset.darkCardBg || preset.lightCardBg || '#151921';
    const text = preset.textColor || '#f5f5f5';
    const nav = preset.navBackground || card || '#0f1217';
    const border = preset.borderColor || '#262d38';

    handleUpdateTheme({
      presetId: preset.id,
      primary: preset.primary,
      primaryHover: preset.primaryHover,
      primaryText: preset.primaryText,
      accent: preset.accent,
      backgroundColor: bg,
      cardBackground: card,
      textColor: text,
      navBackground: nav,
      borderColor: border,
      darkBg: bg,
      lightBg: bg,
      darkCardBg: card,
      lightCardBg: card
    });
  };

  // Handle Logo Upload and Cropper
  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawLogoImage(reader.result);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoCropped = (croppedDataUrl: string) => {
    handleUpdate('logoUrl', croppedDataUrl);
    setIsCropperOpen(false);
  };

  const handleRemoveLogo = () => {
    handleUpdate('logoUrl', undefined);
  };

  // Handle Starter Questions
  const handleAddQuestion = () => {
    const q = newQuestionInput.trim();
    if (!q) return;

    const currentQuestions = draftSettings.automatedMessages?.starterQuestions || [];
    if (currentQuestions.includes(q)) {
      setErrorMessage('هذا السؤال مضاف بالفعل');
      return;
    }

    handleUpdate('automatedMessages', {
      ...draftSettings.automatedMessages,
      enabled: draftSettings.automatedMessages?.enabled ?? true,
      welcomeMessage: draftSettings.automatedMessages?.welcomeMessage || '',
      instantReply: draftSettings.automatedMessages?.instantReply || '',
      starterQuestions: [...currentQuestions, q]
    });
    setNewQuestionInput('');
  };

  const handleRemoveQuestion = (indexToRemove: number) => {
    const currentQuestions = draftSettings.automatedMessages?.starterQuestions || [];
    handleUpdate('automatedMessages', {
      ...draftSettings.automatedMessages,
      enabled: draftSettings.automatedMessages?.enabled ?? true,
      welcomeMessage: draftSettings.automatedMessages?.welcomeMessage || '',
      instantReply: draftSettings.automatedMessages?.instantReply || '',
      starterQuestions: currentQuestions.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // Save Settings to Backend API
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ settings: draftSettings })
      });

      if (res.ok) {
        const data = await res.json();
        const savedSettings: StoreSettings = data.settings || draftSettings;
        setSuccessMessage('تم حفظ التخصيصات وتطبيقها على المتجر بنجاح!');
        setHasChanges(false);
        try {
          localStorage.setItem('atelier_store_settings_cache', JSON.stringify(savedSettings));
        } catch {
          // ignore
        }
        await updateSettings(savedSettings);
        await refreshSettings();
        if (onSettingsSaved) onSettingsSaved();
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
      }
    } catch {
      setErrorMessage('فشل الاتصال بالخادم، يرجى المحاولة لاحقاً');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية للمتجر؟')) {
      setDraftSettings(DEFAULT_STORE_SETTINGS);
      setHasChanges(true);
      try {
        setIsSaving(true);
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ settings: DEFAULT_STORE_SETTINGS })
        });
        if (res.ok) {
          const data = await res.json();
          const saved = data.settings || DEFAULT_STORE_SETTINGS;
          await updateSettings(saved);
          await refreshSettings();
          setHasChanges(false);
          setSuccessMessage('تمت استعادة الإعدادات الافتراضية بنجاح!');
          if (onSettingsSaved) onSettingsSaved();
        }
      } catch (err) {
        console.error('Failed to reset settings:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Extract active colors for live preview
  const activeBg = draftSettings.theme?.backgroundColor || draftSettings.theme?.darkBg || '#0d1015';
  const activeCardBg = draftSettings.theme?.cardBackground || draftSettings.theme?.darkCardBg || '#151921';
  const activeText = draftSettings.theme?.textColor || '#f5f5f5';
  const activeNav = draftSettings.theme?.navBackground || activeCardBg || '#0f1217';
  const activeBorder = draftSettings.theme?.borderColor || '#262d38';
  const activePrimary = draftSettings.theme?.primary || '#f59e0b';
  const activePrimaryText = draftSettings.theme?.primaryText || '#0a0a0a';
  const activeAccent = draftSettings.theme?.accent || '#fbbf24';

  const renderLogoIcon = (iconId?: string) => {
    switch (iconId) {
      case 'crown': return <Crown className="w-4 h-4" />;
      case 'sparkles': return <Sparkles className="w-4 h-4" />;
      case 'gem': return <Gem className="w-4 h-4" />;
      case 'shopping-bag': return <ShoppingBag className="w-4 h-4" />;
      case 'star': return <Star className="w-4 h-4" />;
      case 'heart': return <Heart className="w-4 h-4" />;
      case 'shield': return <ShieldCheck className="w-4 h-4" />;
      case 'flame': return <Flame className="w-4 h-4" />;
      case 'zap':
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-400" />
            <span>تخصيص هوية وألوان المتجر</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            تحكم كامل في مظهر المتجر، الألوان، الشعار، والرسائل الترحيبية مع معاينة حية وفورية.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
            title="استعادة الإعدادات الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasChanges ? 'حفظ التعديلات' : 'حفظ التخصيص'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Controls on Left/Top + Unified Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Customizer Controls (7 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          {/* Sub Tabs Navigation */}
          <div className="flex rounded-xl bg-neutral-900/80 p-1 border border-neutral-800">
            <button
              onClick={() => setActiveTab('colors')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'colors'
                  ? 'bg-amber-400 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>الألوان والخلفيات</span>
            </button>

            <button
              onClick={() => setActiveTab('identity')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'identity'
                  ? 'bg-amber-400 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>الهوية والشعار</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-amber-400 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>الرسائل الترحيبية</span>
            </button>
          </div>

          {/* TAB 1: COLORS & BACKGROUNDS */}
          {activeTab === 'colors' && (
            <div className="space-y-5">
              {/* Ready Palettes Selection */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>لوحات الألوان الجاهزة (نقرة واحدة للتطبيق)</span>
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    اختر قالباً أو خصص أدناه
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {COLOR_PALETTES.map((palette) => {
                    const isSelected = draftSettings.theme?.presetId === palette.id;
                    const pBg = palette.backgroundColor || palette.darkBg || '#0d1015';
                    const pCard = palette.cardBackground || palette.darkCardBg || '#151921';
                    
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => handleSelectPalette(palette)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between h-24 relative overflow-hidden group cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-neutral-800'
                            : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-white truncate max-w-[85%]">
                            {palette.name}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        {/* Color swatches preview bar */}
                        <div className="flex items-center gap-1 mt-2">
                          <div 
                            className="w-5 h-5 rounded-md shadow-xs border border-white/10" 
                            style={{ backgroundColor: pBg }}
                            title="خلفية الصفحة"
                          />
                          <div 
                            className="w-5 h-5 rounded-md shadow-xs border border-white/10" 
                            style={{ backgroundColor: pCard }}
                            title="خلفية البطاقات"
                          />
                          <div 
                            className="w-5 h-5 rounded-md shadow-xs" 
                            style={{ backgroundColor: palette.primary }}
                            title="اللون الرئيسي"
                          />
                          <div 
                            className="w-5 h-5 rounded-md shadow-xs" 
                            style={{ backgroundColor: palette.accent }}
                            title="لون التمييز"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Precise Color Controls (Includes "that white color thing" & all components) */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>تخصيص ألوان الخلفيات والعناصر بدقة</span>
                  </span>
                  <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-md font-bold">
                    تعديل حر
                  </span>
                </div>

                <div className="space-y-4">
                  {/* 1. Page Background Color ("That white color thing" or any custom background) */}
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white block">
                          لون خلفية الصفحة الرئيسية (Page Background)
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          الخلفية الكلية للمتجر (أبيض، داكن، رمادي فاتح، أو أي لون تريده)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeBg.startsWith('#') ? activeBg : '#0d1015'}
                          onChange={(e) => handleUpdateTheme({ backgroundColor: e.target.value, darkBg: e.target.value, lightBg: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={activeBg}
                          onChange={(e) => handleUpdateTheme({ backgroundColor: e.target.value, darkBg: e.target.value, lightBg: e.target.value })}
                          className="w-20 px-2 py-1 text-xs rounded-md bg-neutral-900 border border-neutral-700 text-white font-mono text-center"
                        />
                      </div>
                    </div>
                    {/* Quick Swatches */}
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                      {['#f8fafc', '#ffffff', '#0d1015', '#09090b', '#111827', '#091410', '#140c10', '#0a0e17'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleUpdateTheme({ backgroundColor: c, darkBg: c, lightBg: c })}
                          className="w-5 h-5 rounded-md border border-white/20 shrink-0 cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          title={`تطبيق ${c}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 2. Card Background Color */}
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white block">
                          لون خلفية البطاقات والحاويات (Card Surfaces)
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          خلفية بطاقات المنتجات والحاويات
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeCardBg.startsWith('#') ? activeCardBg : '#151921'}
                          onChange={(e) => handleUpdateTheme({ cardBackground: e.target.value, darkCardBg: e.target.value, lightCardBg: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={activeCardBg}
                          onChange={(e) => handleUpdateTheme({ cardBackground: e.target.value, darkCardBg: e.target.value, lightCardBg: e.target.value })}
                          className="w-20 px-2 py-1 text-xs rounded-md bg-neutral-900 border border-neutral-700 text-white font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Text Color */}
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white block">
                          لون النصوص والعناوين (Text Color)
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          لون كتابة أسماء المنتجات والنصوص التوضيحية
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeText.startsWith('#') ? activeText : '#f5f5f5'}
                          onChange={(e) => handleUpdateTheme({ textColor: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={activeText}
                          onChange={(e) => handleUpdateTheme({ textColor: e.target.value })}
                          className="w-20 px-2 py-1 text-xs rounded-md bg-neutral-900 border border-neutral-700 text-white font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Primary Brand Color */}
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white block">
                          اللون الرئيسي للأزرار والرموز (Primary Color)
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          أزرار الشراء، شريط الإعلانات، والشعار
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activePrimary.startsWith('#') ? activePrimary : '#f59e0b'}
                          onChange={(e) => handleUpdateTheme({ primary: e.target.value, primaryHover: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={activePrimary}
                          onChange={(e) => handleUpdateTheme({ primary: e.target.value, primaryHover: e.target.value })}
                          className="w-20 px-2 py-1 text-xs rounded-md bg-neutral-900 border border-neutral-700 text-white font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Accent & Prices Color */}
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white block">
                          لون التمييز والأسعار (Accent / Price Color)
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          إبراز أسعار المنتجات والعناصر المميزة
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeAccent.startsWith('#') ? activeAccent : '#fbbf24'}
                          onChange={(e) => handleUpdateTheme({ accent: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={activeAccent}
                          onChange={(e) => handleUpdateTheme({ accent: e.target.value })}
                          className="w-20 px-2 py-1 text-xs rounded-md bg-neutral-900 border border-neutral-700 text-white font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Border & Divider Color */}
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white block">
                          لون الحواف والفواصل (Borders & Outlines)
                        </label>
                        <span className="text-[11px] text-neutral-400">
                          حدود بطاقات المنتجات والشريط العلوي
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeBorder.startsWith('#') ? activeBorder : '#262d38'}
                          onChange={(e) => handleUpdateTheme({ borderColor: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <input
                          type="text"
                          value={activeBorder}
                          onChange={(e) => handleUpdateTheme({ borderColor: e.target.value })}
                          className="w-20 px-2 py-1 text-xs rounded-md bg-neutral-900 border border-neutral-700 text-white font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORE IDENTITY & LOGO */}
          {activeTab === 'identity' && (
            <div className="space-y-5">
              {/* Store Names & Taglines */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>اسم المتجر والوصف الترويجي</span>
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      اسم المتجر (Store Name)
                    </label>
                    <input
                      type="text"
                      value={draftSettings.storeName || ''}
                      onChange={(e) => handleUpdate('storeName', e.target.value)}
                      placeholder="مثال: أتيليه • ATELIER"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      الشعار اللفظي أو الوصف المختصر (Tagline)
                    </label>
                    <input
                      type="text"
                      value={draftSettings.storeTagline || ''}
                      onChange={(e) => handleUpdate('storeTagline', e.target.value)}
                      placeholder="مثال: استوديو الأزياء والتصميم الراقي"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      عنوان الواجهة الرئيسي (Hero Title)
                    </label>
                    <input
                      type="text"
                      value={draftSettings.heroTitle || ''}
                      onChange={(e) => handleUpdate('heroTitle', e.target.value)}
                      placeholder="مثال: تشكيلة الأزياء الحصرية"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      الوصف التفصيلي للواجهة (Hero Subtitle)
                    </label>
                    <textarea
                      rows={2}
                      value={draftSettings.heroSubtitle || ''}
                      onChange={(e) => handleUpdate('heroSubtitle', e.target.value)}
                      placeholder="مثال: تصاميم استثنائية بخامات فاخرة وجودة ملكية مصممة خصيصاً لذوقك الرفيع."
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Management */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>شعار المتجر (Logo)</span>
                </span>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Logo Preview box */}
                  <div 
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-neutral-700 flex items-center justify-center overflow-hidden shrink-0 shadow-md"
                    style={{
                      backgroundColor: draftSettings.logoUrl ? 'transparent' : activePrimary,
                      color: activePrimaryText
                    }}
                  >
                    {draftSettings.logoUrl ? (
                      <img
                        src={draftSettings.logoUrl}
                        alt="Logo Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      renderLogoIcon(draftSettings.logoIcon)
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full text-center sm:text-right">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoFileSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>رفع صورة شعار</span>
                      </button>

                      {draftSettings.logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الصورة</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      يمكنك رفع صورة شعار خاصة بمتجرك أو اختيار أيقونة سريعة من الخيارات أدناه
                    </p>
                  </div>
                </div>

                {/* Vector Icon Options if no image uploaded */}
                {!draftSettings.logoUrl && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      أو اختر أيقونة الشعار:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {LOGO_ICONS.map(({ id, label, Icon }) => {
                        const isSelected = (draftSettings.logoIcon || 'zap') === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => handleUpdate('logoIcon', id)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400/10 text-amber-400 font-bold'
                                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] truncate">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Announcement Bar Ribbon */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>شريط الإعلانات العلوي (Announcement Bar)</span>
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftSettings.announcementBar?.enabled ?? true}
                      onChange={(e) => handleUpdate('announcementBar', {
                        ...draftSettings.announcementBar,
                        enabled: e.target.checked,
                        text: draftSettings.announcementBar?.text || '',
                        badge: draftSettings.announcementBar?.badge || ''
                      })}
                      className="rounded accent-amber-400"
                    />
                    <span className="text-xs text-neutral-300 font-semibold">تفعيل الشريط</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      نص الإعلان أو العرض
                    </label>
                    <input
                      type="text"
                      value={draftSettings.announcementBar?.text || ''}
                      onChange={(e) => handleUpdate('announcementBar', {
                        ...draftSettings.announcementBar,
                        enabled: draftSettings.announcementBar?.enabled ?? true,
                        text: e.target.value,
                        badge: draftSettings.announcementBar?.badge || ''
                      })}
                      placeholder="مثال: توصيل مجاني لجميع الولايات والدفع عند الاستلام..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      شارة الإعلان (Badge)
                    </label>
                    <input
                      type="text"
                      value={draftSettings.announcementBar?.badge || ''}
                      onChange={(e) => handleUpdate('announcementBar', {
                        ...draftSettings.announcementBar,
                        enabled: draftSettings.announcementBar?.enabled ?? true,
                        text: draftSettings.announcementBar?.text || '',
                        badge: e.target.value
                      })}
                      placeholder="مثال: عرض خاص أو تخفيضات"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATED MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <span>الرسائل التلقائية الترحيبية</span>
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftSettings.automatedMessages?.enabled ?? true}
                      onChange={(e) => handleUpdate('automatedMessages', {
                        ...draftSettings.automatedMessages,
                        enabled: e.target.checked,
                        welcomeMessage: draftSettings.automatedMessages?.welcomeMessage || '',
                        starterQuestions: draftSettings.automatedMessages?.starterQuestions || [],
                        instantReply: draftSettings.automatedMessages?.instantReply || ''
                      })}
                      className="rounded accent-amber-400"
                    />
                    <span className="text-xs text-neutral-300 font-semibold">تفعيل الرسائل التلقائية</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      رسالة الترحيب الأولى للعميل (Welcome Message)
                    </label>
                    <textarea
                      rows={3}
                      value={draftSettings.automatedMessages?.welcomeMessage || ''}
                      onChange={(e) => handleUpdate('automatedMessages', {
                        ...draftSettings.automatedMessages,
                        enabled: draftSettings.automatedMessages?.enabled ?? true,
                        welcomeMessage: e.target.value,
                        starterQuestions: draftSettings.automatedMessages?.starterQuestions || [],
                        instantReply: draftSettings.automatedMessages?.instantReply || ''
                      })}
                      placeholder="مرحباً بك في متجرنا! يسعدنا تواجدك..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      الرد الفوري التلقائي (Instant Auto-Reply)
                    </label>
                    <textarea
                      rows={2}
                      value={draftSettings.automatedMessages?.instantReply || ''}
                      onChange={(e) => handleUpdate('automatedMessages', {
                        ...draftSettings.automatedMessages,
                        enabled: draftSettings.automatedMessages?.enabled ?? true,
                        welcomeMessage: draftSettings.automatedMessages?.welcomeMessage || '',
                        starterQuestions: draftSettings.automatedMessages?.starterQuestions || [],
                        instantReply: e.target.value
                      })}
                      placeholder="شكراً لتواصلك معنا! لقد استلمنا رسالتك وسنقوم بالرد عليك في لحظات..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Starter Questions */}
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>الأسئلة الشائعة السريعة للعميل (Starter Questions)</span>
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQuestionInput}
                    onChange={(e) => setNewQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddQuestion())}
                    placeholder="اكتب سؤالاً مقترحاً واضغط إضافة..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white text-xs focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 font-bold text-xs transition-all cursor-pointer shrink-0"
                  >
                    إضافة
                  </button>
                </div>

                <div className="space-y-2">
                  {(draftSettings.automatedMessages?.starterQuestions || []).map((question, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <span className="truncate">{question}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="حذف السؤال"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Unified Real-Time Website Preview (7 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-3">
          {/* Live Preview Container Header */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">معاينة المتجر الحية الموحدة (Real-Time Live Preview)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="محدث مباشرة" />
            </div>

            {/* Viewport size switcher */}
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setPreviewViewport('desktop')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  previewViewport === 'desktop' ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
                title="عرض شاشة الكمبيوتر"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewViewport('tablet')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  previewViewport === 'tablet' ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
                title="عرض الجهاز اللوحي"
              >
                <Tablet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewViewport('mobile')}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  previewViewport === 'mobile' ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
                title="عرض شاشة الهاتف"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* The Live Interactive Preview Window */}
          <div 
            className="rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 relative flex flex-col"
            style={{
              backgroundColor: activeBg,
              color: activeText,
              borderColor: activeBorder,
              minHeight: '620px',
              maxHeight: '780px',
              maxWidth: previewViewport === 'mobile' ? '380px' : previewViewport === 'tablet' ? '600px' : '100%',
              margin: '0 auto'
            }}
          >
            {/* Top Announcement Bar in Preview */}
            {draftSettings.announcementBar?.enabled && (
              <div 
                className="py-1.5 px-3 text-center text-[11px] font-bold flex items-center justify-center gap-2 shadow-xs shrink-0"
                style={{
                  backgroundColor: activePrimary,
                  color: activePrimaryText
                }}
              >
                {draftSettings.announcementBar.badge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-black/15 text-[9px] font-extrabold">
                    {draftSettings.announcementBar.badge}
                  </span>
                )}
                <span className="truncate">{draftSettings.announcementBar.text || '✨ توصيل متوفر لجميع الولايات'}</span>
              </div>
            )}

            {/* Header Navigation in Preview */}
            <div 
              className="px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0"
              style={{
                backgroundColor: activeNav,
                borderColor: activeBorder
              }}
            >
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs shrink-0 overflow-hidden font-bold"
                  style={{
                    backgroundColor: draftSettings.logoUrl ? 'transparent' : activePrimary,
                    color: activePrimaryText
                  }}
                >
                  {draftSettings.logoUrl ? (
                    <img src={draftSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    renderLogoIcon(draftSettings.logoIcon)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs tracking-tight truncate leading-tight">
                    {draftSettings.storeName || 'أتيليه • ATELIER'}
                  </div>
                  <div className="text-[9px] opacity-70 truncate">
                    {draftSettings.storeTagline || 'استوديو الأزياء والتصميم'}
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div 
                className="flex-1 max-w-[180px] hidden sm:flex items-center px-2.5 py-1 rounded-full text-[10px] border opacity-80"
                style={{
                  backgroundColor: activeCardBg,
                  borderColor: activeBorder
                }}
              >
                <span className="opacity-50">بحث عن المنتجات...</span>
              </div>
            </div>

            {/* Scrollable Main Content in Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
              {/* Hero Banner Section */}
              <div className="space-y-1">
                <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1" style={{ backgroundColor: activePrimary, color: activePrimaryText }}>
                  استكشف التشكيلة
                </div>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight leading-snug">
                  {draftSettings.heroTitle || 'تشكيلة الأزياء الحصرية'}
                </h3>
                <p className="text-xs opacity-75 line-clamp-2">
                  {draftSettings.heroSubtitle || 'تصاميم استثنائية بخامات فاخرة وجودة ملكية مصممة خصيصاً لذوقك الرفيع.'}
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {['جميع التشكيلات', 'السترات', 'الهوديز', 'الجينز'].map((cat, idx) => (
                  <span
                    key={cat}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border ${
                      idx === 0
                        ? 'font-bold shadow-xs'
                        : 'opacity-70'
                    }`}
                    style={{
                      backgroundColor: idx === 0 ? activePrimary : activeCardBg,
                      color: idx === 0 ? activePrimaryText : activeText,
                      borderColor: activeBorder
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>

              {/* Product Cards Live Grid */}
              <div className="grid grid-cols-2 gap-3">
                {products && products.length > 0 ? (
                  products.slice(0, 4).map((product) => (
                    <div 
                      key={product.id}
                      className="rounded-2xl border p-3 flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: activeCardBg,
                        borderColor: activeBorder,
                        color: activeText
                      }}
                    >
                      <div className="aspect-[4/3] rounded-xl bg-black/10 overflow-hidden relative mb-2 flex items-center justify-center">
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-full h-full object-cover" 
                        />
                        {product.badge && (
                          <span 
                            className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                            style={{ backgroundColor: activePrimary, color: activePrimaryText }}
                          >
                            {product.badge}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] opacity-60 block truncate">{product.subcategory || product.category}</span>
                        <h4 className="text-xs font-bold truncate">{product.title}</h4>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/10 dark:border-white/10">
                          <span className="font-extrabold text-xs" style={{ color: activeAccent }}>
                            {product.price.toLocaleString('fr-DZ')} د.ج
                          </span>
                          <button 
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
                            style={{ backgroundColor: activePrimary, color: activePrimaryText }}
                          >
                            شراء
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div 
                    className="col-span-2 text-[11px] opacity-70 p-4 text-center rounded-2xl border"
                    style={{ backgroundColor: activeCardBg, borderColor: activeBorder }}
                  >
                    لا توجد منتجات متاحة — أضف منتجات أولاً لتظهر هنا
                  </div>
                )}
              </div>

              {/* Floating Chat Bubble Simulation */}
              {draftSettings.automatedMessages?.enabled && (
                <div 
                  className="p-3 rounded-2xl border shadow-lg space-y-1.5"
                  style={{
                    backgroundColor: activeCardBg,
                    borderColor: activeBorder
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: activePrimary, color: activePrimaryText }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold">محادثة المتجر التلقائية</span>
                  </div>
                  <p className="text-[11px] opacity-80 leading-relaxed">
                    {draftSettings.automatedMessages.welcomeMessage || 'مرحباً بك! كيف يمكننا مساعدتك اليوم؟'}
                  </p>
                  {draftSettings.automatedMessages.starterQuestions && draftSettings.automatedMessages.starterQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {draftSettings.automatedMessages.starterQuestions.slice(0, 2).map((q, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 rounded-full text-[10px] border opacity-85"
                          style={{ borderColor: activeBorder }}
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom bar inside preview */}
            <div 
              className="p-2.5 border-t text-center text-[10px] opacity-60 shrink-0"
              style={{
                backgroundColor: activeNav,
                borderColor: activeBorder
              }}
            >
              <span>{draftSettings.storeName || 'أتيليه'} • جميع الحقوق محفوظة</span>
            </div>
          </div>
        </div>

      </div>

      {/* Image Cropper Modal for Logo */}
      {isCropperOpen && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          imageSrc={rawLogoImage}
          onClose={() => setIsCropperOpen(false)}
          onCropComplete={handleLogoCropped}
          themeMode={themeMode ?? 'dark'}
        />
      )}
    </div>
  );
};
