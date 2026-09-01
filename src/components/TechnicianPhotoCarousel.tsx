import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Download,
  Trash2,
  Camera,
  LayoutGrid,
  Layers,
  Calendar,
  ShieldCheck,
  Tag,
  Info,
  Check,
  RotateCw,
} from 'lucide-react';
import { Language, PanelPhoto } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface TechnicianPhotoCarouselProps {
  photos: PanelPhoto[];
  lang: Language;
  panelTag: string;
  projectSiteRef: string;
  onOpenCapture: () => void;
  onDeletePhoto: (photoId: string) => void;
  onOpenFullscreen: (photo: PanelPhoto, index: number) => void;
}

export const TechnicianPhotoCarousel: React.FC<TechnicianPhotoCarouselProps> = ({
  photos,
  lang,
  panelTag,
  projectSiteRef,
  onOpenCapture,
  onDeletePhoto,
  onOpenFullscreen,
}) => {
  const t = TRANSLATIONS[lang];
  const isKa = lang === 'ka';

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'CAROUSEL' | 'GRID'>('CAROUSEL');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCopiedLink, setIsCopiedLink] = useState<boolean>(false);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);

  // Keep currentIndex bounded if photos array changes
  useEffect(() => {
    if (currentIndex >= photos.length && photos.length > 0) {
      setCurrentIndex(photos.length - 1);
    }
  }, [photos.length, currentIndex]);

  const activePhoto = photos[currentIndex] || photos[0];

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  // Autoplay effect
  useEffect(() => {
    if (!isPlaying || photos.length <= 1 || viewMode !== 'CAROUSEL') return;
    const interval = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, photos.length, viewMode, handleNext]);

  // Auto scroll thumbnail strip to keep active photo in view
  useEffect(() => {
    if (thumbnailStripRef.current) {
      const activeThumb = thumbnailStripRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentIndex]);

  // Keyboard navigation when in carousel view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'CAROUSEL' || photos.length <= 1) return;
      // If user is focused on an input/textarea, do not capture arrow keys
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, photos.length, handlePrev, handleNext]);

  // Download current photo
  const handleDownloadPhoto = (photo: PanelPhoto) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `${panelTag}_${photo.title?.replace(/\s+/g, '_') || 'photo'}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (photos.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header Toolbar: Carousel vs Grid toggle, Counter, Autoplay & Capture */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('CAROUSEL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === 'CAROUSEL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.techPhotoCarousel}</span>
            </button>
            <button
              onClick={() => {
                setViewMode('GRID');
                setIsPlaying(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t.techPhotoGrid}</span>
            </button>
          </div>

          {/* Photo count indicator */}
          <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
            {viewMode === 'CAROUSEL' ? (
              <>
                <span className="text-amber-400 font-bold">{currentIndex + 1}</span>
                <span className="mx-1 text-slate-600">/</span>
                <span>{photos.length}</span>
              </>
            ) : (
              <span>{photos.length} {t.techPhotoIndex}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Autoplay toggle button (only in carousel mode) */}
          {viewMode === 'CAROUSEL' && photos.length > 1 && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition cursor-pointer text-xs font-semibold ${
                isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title={isPlaying ? t.techCarouselPause : t.techCarouselAutoPlay}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>{t.techCarouselPause}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.techCarouselAutoPlay}</span>
                </>
              )}
            </button>
          )}

          {/* Take another photo */}
          <button
            onClick={onOpenCapture}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Camera className="w-3.5 h-3.5 fill-current" />
            <span>{t.techCameraCapture}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CAROUSEL SLIDER VIEW                                  */}
      {/* ======================================================== */}
      {viewMode === 'CAROUSEL' && activePhoto && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-3 sm:p-4">
          {/* Main Carousel Stage */}
          <div className="relative w-full aspect-video sm:aspect-[16/9] max-h-[480px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 group">
            {/* Image display */}
            <img
              src={activePhoto.url}
              alt={activePhoto.title || 'Panel Photo'}
              className="w-full h-full object-contain cursor-pointer transition duration-300 select-none"
              onClick={() => onOpenFullscreen(activePhoto, currentIndex)}
            />

            {/* Top Left Watermark Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-amber-400">{panelTag}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-mono text-[11px]">
                {new Date(activePhoto.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Top Right Quick Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
              <button
                onClick={() => handleDownloadPhoto(activePhoto)}
                className="p-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 backdrop-blur-md transition cursor-pointer shadow-lg"
                title={t.techPhotoDownload}
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => onOpenFullscreen(activePhoto, currentIndex)}
                className="p-2 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 backdrop-blur-md transition cursor-pointer shadow-lg"
                title={isKa ? 'სრულ ეკრანზე ნახვა' : 'Expand Fullscreen'}
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeletePhoto(activePhoto.id)}
                className="p-2 bg-slate-950/80 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-slate-700 hover:border-rose-500 backdrop-blur-md transition cursor-pointer shadow-lg"
                title={t.techCameraDeletePhoto}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Left Navigation Arrow */}
            {photos.length > 1 && (
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/80 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700 hover:border-amber-400 flex items-center justify-center transition cursor-pointer shadow-xl backdrop-blur-sm group-hover:scale-105 active:scale-95"
                title={t.techCarouselPrev}
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            {/* Right Navigation Arrow */}
            {photos.length > 1 && (
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/80 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700 hover:border-amber-400 flex items-center justify-center transition cursor-pointer shadow-xl backdrop-blur-sm group-hover:scale-105 active:scale-95"
                title={t.techCarouselNext}
              >
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            {/* Bottom Progress / Pagination dots */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800">
                {photos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === currentIndex
                        ? 'w-6 h-2 bg-amber-400 shadow-sm shadow-amber-400/50'
                        : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'
                    }`}
                    title={`${t.techPhotoIndex} ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Active Photo Caption & Inspection Meta Card */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activePhoto.title || (isKa ? 'ფარის საველე ფოტო' : 'Panel Inspection Photo')}</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                    #{currentIndex + 1} {t.techPhotoOf} {photos.length}
                  </span>
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{new Date(activePhoto.timestamp).toLocaleString()}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">{projectSiteRef}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenFullscreen(activePhoto, currentIndex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isKa ? 'დეტალური ხედი' : 'Detailed View'}</span>
                </button>
              </div>
            </div>

            {activePhoto.notes ? (
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                {activePhoto.notes}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                {isKa ? 'სპეციალური შენიშვნა არ არის მითითებული.' : 'No additional caption notes recorded for this photo.'}
              </p>
            )}
          </div>

          {/* Thumbnail Navigation Strip */}
          {photos.length > 1 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-slate-400 px-1 flex items-center justify-between">
                <span>{isKa ? 'ფოტოების ლენტა (დააწკაპუნეთ ასარჩევად):' : 'Thumbnail Strip (Click to select):'}</span>
                <span className="text-[10px] text-slate-500">
                  {isKa ? 'ისრებით გადახვევა: ← / →' : 'Keyboard Nav: ← / →'}
                </span>
              </div>

              <div
                ref={thumbnailStripRef}
                className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
              >
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative shrink-0 w-24 sm:w-28 aspect-video rounded-lg overflow-hidden border-2 transition duration-200 cursor-pointer group bg-black ${
                      idx === currentIndex
                        ? 'border-amber-400 ring-2 ring-amber-400/40 scale-[1.03] shadow-lg shadow-amber-500/20'
                        : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.title || `Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                      <span className="text-[9px] font-mono font-bold text-white truncate">
                        #{idx + 1}
                      </span>
                    </div>
                    {idx === currentIndex && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. GRID GALLERY VIEW                                     */}
      {/* ======================================================== */}
      {viewMode === 'GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group hover:border-amber-500/40 transition duration-200 shadow-md flex flex-col justify-between"
            >
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.title || 'Panel Photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                  onClick={() => {
                    setCurrentIndex(idx);
                    onOpenFullscreen(photo, idx);
                  }}
                />
                {/* Hover Overlay with Preview and Delete actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition p-2.5 flex flex-col justify-between pointer-events-none">
                  <div className="flex justify-between items-center pointer-events-auto">
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700">
                      {panelTag} • #{idx + 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePhoto(photo.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition cursor-pointer shadow"
                      title={t.techCameraDeletePhoto}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(idx);
                        setViewMode('CAROUSEL');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg shadow cursor-pointer transition border border-slate-700"
                    >
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>{isKa ? 'კარუსელში' : 'In Carousel'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFullscreen(photo, idx);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold rounded-lg shadow cursor-pointer transition"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>{isKa ? 'გადიდება' : 'View'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Caption & Timestamp */}
              <div className="p-3 space-y-1.5 bg-slate-900/60 border-t border-slate-800/80">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-200 truncate">
                    {photo.title || (isKa ? 'ფარის ინსპექცია' : 'Panel Inspection')}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(photo.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {photo.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {photo.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
