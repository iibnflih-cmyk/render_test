import React, { useState, useRef } from 'react';
import { 
  X, 
  Layers, 
  Upload, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Crop, 
  Image as ImageIcon,
  Tag,
  Sliders,
  Check,
  AlertCircle,
  FileImage,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { CategoryItem, ThemeMode } from '../types';
import { ImageCropperModal } from './ImageCropperModal';

export interface MultiProductDraft {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  fileName?: string;
}

interface BulkProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  authToken: string;
  onProductsAdded: () => void;
  themeMode: ThemeMode;
}

export const BulkProductModal: React.FC<BulkProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  authToken,
  onProductsAdded,
  themeMode
}) => {
  const isDark = themeMode === 'dark';

  const [draftItems, setDraftItems] = useState<MultiProductDraft[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  // Cropper modal state for an individual item
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);

  // Batch fill helpers
  const [batchCategory, setBatchCategory] = useState<string>(categories.find(c => c.id !== 'all')?.id || 'outerwear');
  const [batchPrice, setBatchPrice] = useState<number | ''>('');
  const [batchPrefix, setBatchPrefix] = useState<string>('');

  // Submission & loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  if (!isOpen) return null;

  // Handle multiple file upload selection
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>, append = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    setErrorMessage(null);

    const fileArray: File[] = Array.from(files);
    const newDrafts: MultiProductDraft[] = [];
    let loadedCount = 0;

    const defaultCategory = categories.find(c => c.id !== 'all')?.id || 'outerwear';
    const baseOffset = append ? draftItems.length : 0;

    fileArray.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Generate a clean title based on clean file name or index
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const itemNumber = baseOffset + idx + 1;
        
        newDrafts.push({
          id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: cleanName.length > 2 && cleanName.length < 50 ? cleanName : `منتج جديد #${itemNumber}`,
          price: 3500,
          category: defaultCategory,
          image: dataUrl,
          fileName: file.name
        });

        loadedCount++;
        if (loadedCount === fileArray.length) {
          if (append) {
            setDraftItems(prev => [...prev, ...newDrafts]);
          } else {
            setDraftItems(newDrafts);
          }
          setIsProcessingFiles(false);
          // reset input
          if (e.target) e.target.value = '';
        }
      };

      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === fileArray.length) {
          setIsProcessingFiles(false);
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // Open cropper for specific item
  const handleOpenCropper = (index: number) => {
    setCroppingIndex(index);
    setCropperOpen(true);
  };

  // Crop complete handler for specific item
  const handleCropComplete = (croppedDataUrl: string) => {
    if (croppingIndex !== null && draftItems[croppingIndex]) {
      const updated = [...draftItems];
      updated[croppingIndex] = {
        ...updated[croppingIndex],
        image: croppedDataUrl
      };
      setDraftItems(updated);
    }
    setCropperOpen(false);
    setCroppingIndex(null);
  };

  // Update item field
  const handleUpdateField = (index: number, field: keyof MultiProductDraft, value: any) => {
    const updated = [...draftItems];
    updated[index] = { ...updated[index], [field]: value };
    setDraftItems(updated);
  };

  // Remove single item
  const handleRemoveItem = (index: number) => {
    setDraftItems(prev => prev.filter((_, i) => i !== index));
  };

  // Batch apply category to all items
  const applyCategoryToAll = () => {
    if (!batchCategory) return;
    setDraftItems(prev => prev.map(item => ({ ...item, category: batchCategory })));
  };

  // Batch apply price to all items
  const applyPriceToAll = () => {
    if (batchPrice === '' || Number(batchPrice) < 0) return;
    setDraftItems(prev => prev.map(item => ({ ...item, price: Number(batchPrice) })));
  };

  // Batch apply title prefix
  const applyTitlePrefixToAll = () => {
    if (!batchPrefix.trim()) return;
    setDraftItems(prev => prev.map((item, idx) => ({
      ...item,
      title: `${batchPrefix.trim()} #${idx + 1}`
    })));
  };

  // Submit all items
  const handleSaveAllProducts = async () => {
    if (draftItems.length === 0) {
      setErrorMessage('يرجى رفع صور المنتجات أولاً');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = draftItems.map(item => ({
        title: item.title,
        price: Number(item.price) || 0,
        category: item.category,
        image: item.image,
        sizes: ['S', 'M', 'L', 'XL'],
        colors: [{ name: 'أسود فاحم', hex: '#111111' }]
      }));

      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ items: payload })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`تم بنجاح إضافة وحفظ (${data.count}) منتج في المتجر!`);
        onProductsAdded();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(data.error || 'حدث خطأ أثناء حفظ المنتجات');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCroppingItem = croppingIndex !== null ? draftItems[croppingIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-6xl max-h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark 
            ? 'bg-neutral-950 border-neutral-800 text-white' 
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
        dir="rtl"
      >
        {/* Hidden Multi-file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFilesSelected(e, false)}
          multiple
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={appendFileInputRef}
          onChange={(e) => handleFilesSelected(e, true)}
          multiple
          accept="image/*"
          className="hidden"
        />

        {/* Modal Header */}
        <div className={`p-4 sm:p-6 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400 text-neutral-950 font-black">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">رفع مجموعة منتجات بالصور دفعة واحدة</h2>
                {draftItems.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-500 font-extrabold">
                    {draftItems.length} منتج مجهز
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                ارفع عدة صور (مثلاً 5 أو 10 صور)، وقص كل صورة وحدد اسمها وسعرها وقسمها قبل الحفظ الفوري
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Batch Controls Bar (Visible when there are items) */}
        {draftItems.length > 0 && (
          <div className={`p-3 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50/70'}`}>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-neutral-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>تعبئة وتوحيد جماعي سريع:</span>
              </span>

              {/* Batch Category */}
              <div className="flex items-center gap-1.5">
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-white border-neutral-300'
                  }`}
                >
                  {categories.filter(c => c.id !== 'all').map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyCategoryToAll}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 font-bold transition-all cursor-pointer"
                  title="تطبيق هذا القسم على جميع المنتجات المرفوعة"
                >
                  تطبيق القسم على الكل
                </button>
              </div>

              {/* Batch Price */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="سعر موحد (د.ج)"
                  value={batchPrice}
                  onChange={(e) => setBatchPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-28 px-2.5 py-1.5 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-white border-neutral-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={applyPriceToAll}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100' : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
                  }`}
                >
                  تطبيق السعر
                </button>
              </div>

              {/* Batch Prefix */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="بادئة اسم (مثلاً: نقاب ملكي)"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  className={`w-36 px-2.5 py-1.5 rounded-xl border text-xs font-semibold outline-none ${
                    isDark ? 'bg-neutral-950 border-neutral-700' : 'bg-white border-neutral-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={applyTitlePrefixToAll}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100' : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-900'
                  }`}
                >
                  ترقيم الأسماء
                </button>
              </div>
            </div>

            {/* Append More Images Button */}
            <button
              type="button"
              onClick={() => appendFileInputRef.current?.click()}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark ? 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10' : 'border-amber-500 text-amber-600 hover:bg-amber-50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صور أخرى للقائمة</span>
            </button>
          </div>
        )}

        {/* Notifications */}
        {successMessage && (
          <div className="m-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="m-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body / Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {draftItems.length === 0 ? (
            /* Upload Dropzone */
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`py-20 px-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${
                isDark 
                  ? 'border-neutral-800 hover:border-amber-400 bg-neutral-900/30 hover:bg-amber-400/5' 
                  : 'border-neutral-300 hover:border-amber-500 bg-neutral-50 hover:bg-amber-50/30'
              }`}
            >
              <div className="p-4 rounded-3xl bg-amber-400/10 group-hover:bg-amber-400 text-amber-500 group-hover:text-neutral-950 transition-all mb-4">
                {isProcessingFiles ? (
                  <RefreshCw className="w-10 h-10 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10" />
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black mb-1">
                انقر هنا لتحديد ورفع عدة صور في وقت واحد
              </h3>
              <p className={`text-xs max-w-md ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                يمكنك تحديد 5 أو 10 أو أكثر من الصور من جهازك. سيتم إنشاء بطاقة لكل صورة مع إمكانية قصها وتحديد أبعادها وتحديد اسمها وسعرها وقسمها.
              </p>

              <button
                type="button"
                className="mt-5 px-6 py-2.5 rounded-xl bg-amber-400 group-hover:bg-amber-500 text-neutral-950 text-xs font-black flex items-center gap-2 shadow-xs pointer-events-none"
              >
                <FileImage className="w-4 h-4" />
                <span>اختر الصور من جهازك (Select Images)</span>
              </button>
            </div>
          ) : (
            /* Items Cards Grid */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>كل صورة تمثل منتجاً مستقلاً. انقر على "قص وتحديد المساحة" لتعديل إطار الصورة بدقة:</span>
                <span className="font-bold text-amber-500">{draftItems.length} منتج جاهز</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {draftItems.map((item, index) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center gap-4 ${
                        isDark 
                          ? 'bg-[#15181e] border-neutral-800/80 hover:border-neutral-700' 
                          : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
                      }`}
                    >
                      {/* Product Image & Crop Box */}
                      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                        <span className="text-xs font-black text-amber-500 w-5 text-center shrink-0">
                          #{index + 1}
                        </span>

                        <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700/60 shrink-0">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleOpenCropper(index)}
                            className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold cursor-pointer"
                            title="قص وتحديد مساحة هذه الصورة"
                          >
                            <Crop className="w-5 h-5 text-amber-400" />
                            <span>قص الصورة</span>
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5 md:hidden flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleOpenCropper(index)}
                            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            <span>قص الصورة #{index + 1}</span>
                          </button>
                        </div>
                      </div>

                      {/* Product Details Form */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3 w-full">
                        {/* Title */}
                        <div className="sm:col-span-6">
                          <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                            اسم المنتج <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateField(index, 'title', e.target.value)}
                            placeholder="مثلاً: نقاب ساتر ملكي..."
                            className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border outline-none ${
                              isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                            }`}
                          />
                        </div>

                        {/* Price */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                            السعر (د.ج) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateField(index, 'price', Number(e.target.value))}
                            placeholder="3500"
                            className={`w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border outline-none ${
                              isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                            }`}
                          />
                        </div>

                        {/* Category */}
                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                            القسم / التصنيف <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateField(index, 'category', e.target.value)}
                            className={`w-full px-3 py-2.5 text-xs font-bold rounded-xl border outline-none ${
                              isDark ? 'bg-neutral-900 border-neutral-800 focus:border-amber-400' : 'bg-neutral-50 border-neutral-200 focus:border-amber-400'
                            }`}
                          >
                            {categories.filter(c => c.id !== 'all').map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={`flex md:flex-col items-center gap-2 self-stretch justify-end md:justify-center border-t md:border-t-0 md:border-r pt-3 md:pt-0 md:pr-3 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
                        <button
                          type="button"
                          onClick={() => handleOpenCropper(index)}
                          className="hidden md:flex px-3 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-500 hover:text-neutral-950 text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shrink-0"
                          title="قص وضبط مساحة الصورة"
                        >
                          <Crop className="w-4 h-4" />
                          <span>قص</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                          title="حذف هذا المنتج من القائمة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${isDark ? 'border-neutral-800 bg-neutral-900/60' : 'border-neutral-200 bg-neutral-50/70'}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
            <Tag className="w-4 h-4 text-amber-500" />
            <span>
              {draftItems.length > 0 
                ? `سيتم حفظ وتثبيت (${draftItems.length}) منتج دفعة واحدة`
                : 'حدد الصور لبدء تجهيز المنتجات'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {draftItems.length > 0 && (
              <button
                type="button"
                onClick={() => setDraftItems([])}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition-colors cursor-pointer`}
              >
                مسح الكل
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={isSubmitting || draftItems.length === 0}
              onClick={handleSaveAllProducts}
              className="flex-1 sm:flex-none px-7 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>حفظ وإضافة جميع المنتجات ({draftItems.length}) إلى المتجر</span>
            </button>
          </div>
        </div>
      </div>

      {/* Individual Image Cropper Modal */}
      {currentCroppingItem && (
        <ImageCropperModal
          isOpen={cropperOpen}
          imageSrc={currentCroppingItem.image}
          onClose={() => {
            setCropperOpen(false);
            setCroppingIndex(null);
          }}
          onCropComplete={handleCropComplete}
          themeMode={themeMode}
        />
      )}
    </div>
  );
};
