import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  Crop, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Move,
  RefreshCcw
} from 'lucide-react';
import { ThemeMode } from '../types';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  themeMode: ThemeMode;
}

type AspectRatioType = '1:1' | '4:5' | '4:3' | '16:9' | 'free';

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  themeMode
}) => {
  const isDark = themeMode === 'dark';

  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('1:1');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number; left: number; top: number }>({
    width: 0,
    height: 0,
    left: 0,
    top: 0
  });

  // Dragging states
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isResizingHandle, setIsResizingHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; box: { x: number; y: number; width: number; height: number } }>({
    mouseX: 0,
    mouseY: 0,
    box: { x: 0, y: 0, width: 0, height: 0 }
  });

  // Calculate initial crop box based on aspect ratio
  const calculateInitialCropBox = useCallback((aspect: AspectRatioType, dispW: number, dispH: number) => {
    if (dispW <= 0 || dispH <= 0) return { x: 0, y: 0, width: 0, height: 0 };

    let targetRatio = 1;
    if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '4:5') targetRatio = 4 / 5;
    else if (aspect === '4:3') targetRatio = 4 / 3;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else if (aspect === 'free') targetRatio = dispW / dispH;

    let width = dispW * 0.85;
    let height = width / targetRatio;

    if (height > dispH * 0.85) {
      height = dispH * 0.85;
      width = height * targetRatio;
    }

    const x = (dispW - width) / 2;
    const y = (dispH - height) / 2;

    return { x, y, width, height };
  }, []);

  // Update layout when image is loaded or resized
  const updateLayout = useCallback(() => {
    if (!containerRef.current || !imageRef.current || !imageLoaded) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerW = containerRect.width;
    const containerH = containerRect.height;

    const imgNatW = naturalSize.width;
    const imgNatH = naturalSize.height;
    if (imgNatW === 0 || imgNatH === 0) return;

    // Fit image inside container while preserving aspect
    const scale = Math.min((containerW - 40) / imgNatW, (containerH - 40) / imgNatH);
    const fitW = imgNatW * scale;
    const fitH = imgNatH * scale;
    const fitLeft = (containerW - fitW) / 2;
    const fitTop = (containerH - fitH) / 2;

    setDisplayedSize({
      width: fitW,
      height: fitH,
      left: fitLeft,
      top: fitTop
    });

    setCropBox(calculateInitialCropBox(aspectRatio, fitW, fitH));
  }, [imageLoaded, naturalSize, aspectRatio, calculateInitialCropBox]);

  useEffect(() => {
    if (isOpen && imageLoaded) {
      updateLayout();
    }
  }, [isOpen, imageLoaded, updateLayout]);

  // Handle aspect ratio switch
  const handleAspectChange = (newAspect: AspectRatioType) => {
    setAspectRatio(newAspect);
    if (displayedSize.width > 0 && displayedSize.height > 0) {
      setCropBox(calculateInitialCropBox(newAspect, displayedSize.width, displayedSize.height));
    }
  };

  // Image load handler
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
    setZoom(1);
    setRotation(0);
  };

  // Handle drag/resize interaction
  const handleMouseDown = (e: React.MouseEvent, type: 'move' | string) => {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'move') {
      setIsDraggingBox(true);
    } else {
      setIsResizingHandle(type);
    }

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...cropBox }
    };
  };

  const handleTouchStart = (e: React.TouchEvent, type: 'move' | string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    if (type === 'move') {
      setIsDraggingBox(true);
    } else {
      setIsResizingHandle(type);
    }

    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      box: { ...cropBox }
    };
  };

  useEffect(() => {
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!isDraggingBox && !isResizingHandle) return;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;
      const startBox = dragStartRef.current.box;
      const maxW = displayedSize.width;
      const maxH = displayedSize.height;

      if (isDraggingBox) {
        let newX = startBox.x + deltaX;
        let newY = startBox.y + deltaY;

        // Constrain to image bounds
        newX = Math.max(0, Math.min(newX, maxW - startBox.width));
        newY = Math.max(0, Math.min(newY, maxH - startBox.height));

        setCropBox(prev => ({ ...prev, x: newX, y: newY }));
      } else if (isResizingHandle) {
        let newX = startBox.x;
        let newY = startBox.y;
        let newW = startBox.width;
        let newH = startBox.height;

        const handle = isResizingHandle;
        const targetRatio = aspectRatio === '1:1' ? 1 
          : aspectRatio === '4:5' ? 4/5 
          : aspectRatio === '4:3' ? 4/3 
          : aspectRatio === '16:9' ? 16/9 
          : null;

        if (handle.includes('se')) {
          newW = Math.max(40, Math.min(startBox.width + deltaX, maxW - startBox.x));
          newH = targetRatio ? newW / targetRatio : Math.max(40, Math.min(startBox.height + deltaY, maxH - startBox.y));
          if (targetRatio && newH > maxH - startBox.y) {
            newH = maxH - startBox.y;
            newW = newH * targetRatio;
          }
        } else if (handle.includes('nw')) {
          const maxDeltaX = startBox.box ? startBox.x : startBox.width - 40;
          const adjustedDeltaX = Math.max(-startBox.x, Math.min(deltaX, startBox.width - 40));
          newW = startBox.width - adjustedDeltaX;
          newX = startBox.x + adjustedDeltaX;
          newH = targetRatio ? newW / targetRatio : startBox.height - deltaY;
          newY = targetRatio ? startBox.y + (startBox.height - newH) : startBox.y + deltaY;

          if (newX < 0) { newX = 0; newW = startBox.x + startBox.width; }
          if (newY < 0) { newY = 0; newH = startBox.y + startBox.height; if (targetRatio) newW = newH * targetRatio; }
        } else if (handle.includes('ne')) {
          newW = Math.max(40, Math.min(startBox.width + deltaX, maxW - startBox.x));
          newH = targetRatio ? newW / targetRatio : Math.max(40, startBox.height - deltaY);
          newY = startBox.y + (startBox.height - newH);
          if (newY < 0) {
            newY = 0;
            newH = startBox.y + startBox.height;
            if (targetRatio) newW = newH * targetRatio;
          }
        } else if (handle.includes('sw')) {
          const adjustedDeltaX = Math.max(-startBox.x, Math.min(deltaX, startBox.width - 40));
          newW = startBox.width - adjustedDeltaX;
          newX = startBox.x + adjustedDeltaX;
          newH = targetRatio ? newW / targetRatio : Math.max(40, Math.min(startBox.height + deltaY, maxH - startBox.y));
          if (targetRatio && newH > maxH - startBox.y) {
            newH = maxH - startBox.y;
            newW = newH * targetRatio;
          }
        }

        setCropBox({
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: Math.min(newW, maxW - newX),
          height: Math.min(newH, maxH - newY)
        });
      }
    };

    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      setIsDraggingBox(false);
      setIsResizingHandle(null);
    };

    if (isDraggingBox || isResizingHandle) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDraggingBox, isResizingHandle, displayedSize, aspectRatio]);

  // Execute Canvas Cropping
  const handleApplyCrop = () => {
    if (!imageRef.current || !naturalSize.width || !displayedSize.width) return;

    try {
      const scaleX = naturalSize.width / displayedSize.width;
      const scaleY = naturalSize.height / displayedSize.height;

      const sourceX = cropBox.x * scaleX;
      const sourceY = cropBox.y * scaleY;
      const sourceWidth = cropBox.width * scaleX;
      const sourceHeight = cropBox.height * scaleY;

      const canvas = document.createElement('canvas');
      // Set high quality output size (standardize to high-res max 1200px)
      const targetSize = Math.min(1200, Math.max(600, sourceWidth));
      const targetHeight = targetSize * (sourceHeight / sourceWidth);

      canvas.width = targetSize;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If rotated
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      ctx.drawImage(
        imageRef.current,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetSize,
        targetHeight
      );

      if (rotation !== 0) {
        ctx.restore();
      }

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('Error cropping image:', err);
      // Fallback to original image if cross-origin canvas security issue arises
      onCropComplete(imageSrc);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col overflow-hidden max-h-[90vh] ${
          isDark ? 'bg-[#15181e] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-500 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">تحديد وقص مساحة الصورة</h3>
              <p className="text-[11px] text-neutral-400">اسحب الإطار لتحديد المنطقة التي ترغب في عرضها للمنتج</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b text-xs ${isDark ? 'bg-neutral-900/50 border-neutral-800' : 'bg-neutral-50 border-neutral-200'}`}>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-bold text-neutral-400 ml-1">الأبعاد:</span>
            {(
              [
                { id: '1:1', label: 'مربع (1:1)' },
                { id: '4:5', label: 'طولي (4:5)' },
                { id: '4:3', label: 'كلاسيكي (4:3)' },
                { id: '16:9', label: 'عريض (16:9)' },
                { id: 'free', label: 'حر' },
              ] as { id: AspectRatioType; label: string }[]
            ).map((aspect) => (
              <button
                key={aspect.id}
                type="button"
                onClick={() => handleAspectChange(aspect.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  aspectRatio === aspect.id
                    ? 'bg-amber-400 text-neutral-950 shadow-xs'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                }`}
              >
                {aspect.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (displayedSize.width > 0) {
                  setCropBox(calculateInitialCropBox(aspectRatio, displayedSize.width, displayedSize.height));
                }
              }}
              className={`p-1.5 rounded-lg border text-neutral-400 hover:text-amber-500 transition-colors cursor-pointer ${isDark ? 'border-neutral-700' : 'border-neutral-200'}`}
              title="إعادة ضبط الإطار للوسط"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Cropper Stage */}
        <div 
          ref={containerRef}
          className="relative flex-1 w-full min-h-[380px] bg-[#0c0d10] overflow-hidden select-none flex items-center justify-center p-5"
        >
          <div 
            className="relative"
            style={{
              width: displayedSize.width || 'auto',
              height: displayedSize.height || 'auto'
            }}
          >
            {/* The Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              className="max-w-full max-h-[50vh] object-contain rounded-lg pointer-events-none block"
            />

            {/* Dark Mask Outside Crop Area */}
            {imageLoaded && displayedSize.width > 0 && (
              <>
                {/* Top mask */}
                <div 
                  className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{ height: cropBox.y }}
                />
                {/* Bottom mask */}
                <div 
                  className="absolute left-0 right-0 bottom-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{ top: cropBox.y + cropBox.height }}
                />
                {/* Left mask */}
                <div 
                  className="absolute bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{ 
                    top: cropBox.y, 
                    left: 0, 
                    width: cropBox.x, 
                    height: cropBox.height 
                  }}
                />
                {/* Right mask */}
                <div 
                  className="absolute bg-black/60 backdrop-blur-[1px] pointer-events-none"
                  style={{ 
                    top: cropBox.y, 
                    left: cropBox.x + cropBox.width, 
                    right: 0, 
                    height: cropBox.height 
                  }}
                />

                {/* Active Resizable & Draggable Crop Box */}
                <div
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                  onTouchStart={(e) => handleTouchStart(e, 'move')}
                  className="absolute border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] cursor-move transition-shadow z-10"
                  style={{
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.width,
                    height: cropBox.height,
                    boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)'
                  }}
                >
                  {/* Grid Lines (Rule of Thirds) */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-35">
                    <div className="border-r border-b border-amber-200/60" />
                    <div className="border-r border-b border-amber-200/60" />
                    <div className="border-b border-amber-200/60" />
                    <div className="border-r border-b border-amber-200/60" />
                    <div className="border-r border-b border-amber-200/60" />
                    <div className="border-b border-amber-200/60" />
                    <div className="border-r border-amber-200/60" />
                    <div className="border-r border-amber-200/60" />
                    <div />
                  </div>

                  {/* Drag Handle Indicator at Center */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
                    <div className="p-2 rounded-full bg-black/40 text-white">
                      <Move className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Corner Resize Handles */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    onTouchStart={(e) => handleTouchStart(e, 'nw')}
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-amber-400 rounded-sm border-2 border-neutral-900 cursor-nwse-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    onTouchStart={(e) => handleTouchStart(e, 'ne')}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-amber-400 rounded-sm border-2 border-neutral-900 cursor-nesw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    onTouchStart={(e) => handleTouchStart(e, 'sw')}
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-amber-400 rounded-sm border-2 border-neutral-900 cursor-nesw-resize shadow-md"
                  />
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                    onTouchStart={(e) => handleTouchStart(e, 'se')}
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-amber-400 rounded-sm border-2 border-neutral-900 cursor-nwse-resize shadow-md"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? 'border-neutral-800 bg-neutral-900/50' : 'border-neutral-200 bg-neutral-50'}`}>
          <span className="text-xs text-neutral-400">
            {naturalSize.width > 0 && `الدقة الأصلية: ${naturalSize.width} × ${naturalSize.height} بكسل`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark ? 'border-neutral-700 hover:bg-neutral-800' : 'border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-neutral-950 text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد وقص الصورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
