import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  Upload,
  RotateCcw,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Tag,
  Clock,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { Language, PanelPhoto } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface TechnicianCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  panelTag: string;
  projectName: string;
  projectSiteRef: string;
  onSavePhoto: (photo: PanelPhoto) => void;
  existingPhotos?: PanelPhoto[];
  onDeletePhoto?: (photoId: string) => void;
}

export const TechnicianCameraModal: React.FC<TechnicianCameraModalProps> = ({
  isOpen,
  onClose,
  lang,
  panelTag,
  projectName,
  projectSiteRef,
  onSavePhoto,
  existingPhotos = [],
  onDeletePhoto,
}) => {
  const t = TRANSLATIONS[lang];
  const isKa = lang === 'ka';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState<string>('');
  const [photoNotes, setPhotoNotes] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'CAMERA' | 'GALLERY'>('CAMERA');
  const [previewPhoto, setPreviewPhoto] = useState<PanelPhoto | null>(null);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setIsInitializing(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? (isKa ? 'კამერის ნებართვა უარყოფილია. გთხოვთ დაუშვათ ბრაუზერის პარამეტრებიდან ან ატვირთოთ ფაილი.' : 'Camera access permission denied. Please allow camera permissions or upload an image file.')
          : (isKa ? 'კამერის ჩართვა ვერ მოხერხდა. გთხოვთ გამოიყენოთ ფაილის ატვირთვა.' : 'Unable to connect to camera device. Please use file upload instead.')
      );
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, isKa, stopCamera]);

  useEffect(() => {
    if (isOpen && activeView === 'CAMERA' && !capturedPhotoUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeView, capturedPhotoUrl, startCamera, stopCamera]);

  // Take Snapshot from Video stream
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Overlay On-Site Inspection Watermark Banner
    const bannerHeight = Math.max(36, Math.round(height * 0.07));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Accent line
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, height - bannerHeight, width, 3);

    // Text details
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(12, Math.round(bannerHeight * 0.35))}px monospace, sans-serif`;
    const now = new Date();
    const dateFormatted = now.toISOString().replace('T', ' ').slice(0, 19);
    const leftText = `⚡ ${panelTag} | Ref: ${projectSiteRef}`;
    const rightText = `IEC 61439 | ${dateFormatted}`;

    ctx.fillText(leftText, 14, height - bannerHeight / 2 + 5);
    const rightTextWidth = ctx.measureText(rightText).width;
    ctx.fillText(rightText, width - rightTextWidth - 14, height - bannerHeight / 2 + 5);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhotoUrl(dataUrl);
    setPhotoTitle(isKa ? `ფარის ინსპექცია (${panelTag})` : `Panel Inspection (${panelTag})`);
    stopCamera();
  };

  // Handle File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedPhotoUrl(dataUrl);
        setPhotoTitle(file.name.replace(/\.[^/.]+$/, '') || (isKa ? `ატვირთული ფოტო (${panelTag})` : `Attached Photo (${panelTag})`));
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save the captured photo to project metadata
  const handleSaveCaptured = () => {
    if (!capturedPhotoUrl) return;

    const newPhoto: PanelPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: capturedPhotoUrl,
      timestamp: new Date().toISOString(),
      title: photoTitle.trim() || (isKa ? `საველე ფოტო (${panelTag})` : `Field Photo (${panelTag})`),
      notes: photoNotes.trim(),
      panelTag,
    };

    onSavePhoto(newPhoto);
    setCapturedPhotoUrl(null);
    setPhotoTitle('');
    setPhotoNotes('');
    onClose();
  };

  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setPhotoTitle('');
    setPhotoNotes('');
    startCamera();
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{t.techCameraModalTitle}</span>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-400/20">
                  {panelTag}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {projectSiteRef || projectName} • IEC 61439
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher if existing photos exist */}
            {existingPhotos.length > 0 && (
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setActiveView('CAMERA');
                    if (!capturedPhotoUrl) startCamera();
                  }}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeView === 'CAMERA'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isKa ? 'კამერა' : 'Camera'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('GALLERY');
                    stopCamera();
                  }}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeView === 'GALLERY'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isKa ? `გალერეა (${existingPhotos.length})` : `Gallery (${existingPhotos.length})`}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeView === 'CAMERA' ? (
            capturedPhotoUrl ? (
              /* Review & Save Captured Photo */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video max-h-[340px] flex items-center justify-center">
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured panel inspection"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg border border-slate-700 text-[11px] font-mono text-amber-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{panelTag} • {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      {isKa ? 'ფოტოს დასახელება / ობიექტი' : 'Photo Title / Target'}
                    </label>
                    <input
                      type="text"
                      value={photoTitle}
                      onChange={(e) => setPhotoTitle(e.target.value)}
                      placeholder={isKa ? 'მაგ. მთავარი შემყვანი და დიფერენციალი' : 'e.g. Main Infeed & RCD Assembly'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                      {isKa ? 'დამატებითი შენიშვნა / გაზომვის დეტალი' : 'Inspection Remarks / Caption'}
                    </label>
                    <input
                      type="text"
                      value={photoNotes}
                      onChange={(e) => setPhotoNotes(e.target.value)}
                      placeholder={isKa ? 'მაგ. შემოწმდა 2.5 N·m გადაჭერით, დაზიანება არ შეინიშნება' : 'e.g. Torqued to 2.5 N·m, insulation intact'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handleRetake}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.techCameraRetake}</span>
                  </button>

                  <button
                    onClick={handleSaveCaptured}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t.techCameraSave}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Camera Viewfinder & Controls */
              <div className="space-y-4">
                {cameraError ? (
                  <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-4 text-xs space-y-3">
                    <div className="flex items-start gap-2.5 text-rose-300">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                      <p className="leading-relaxed">{cameraError}</p>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-100 font-semibold text-xs transition cursor-pointer"
                      >
                        {isKa ? 'ხელახლა ცდა' : 'Retry Camera'}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.techCameraUploadFallback}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-[340px] flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30 border border-white/20">
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-r border-b border-white/20" />
                      <div className="border-b border-white/20" />
                      <div className="border-r border-white/20" />
                      <div className="border-r border-white/20" />
                      <div />
                    </div>

                    {/* Live Watermark Tag Badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg border border-slate-700 text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>LIVE • {panelTag}</span>
                    </div>

                    {/* Camera Flip button */}
                    <button
                      onClick={handleToggleFacingMode}
                      className="absolute top-2 right-2 p-2 bg-slate-950/80 backdrop-blur-md hover:bg-slate-800 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title={isKa ? 'კამერის შეცვლა (წინა/უკანა)' : 'Switch Camera'}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Central Target Reticle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-16 h-16 border-2 border-amber-400/60 rounded-xl flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  {/* File Upload Fallback button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.techCameraUploadFallback}</span>
                  </button>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Big Shutter / Take Photo Button */}
                  <button
                    onClick={handleCaptureSnapshot}
                    disabled={isInitializing || !stream}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4 fill-current" />
                    <span>{t.techCameraSnap}</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Gallery of Existing Attached Photos */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span className="font-semibold">{t.techCameraAttachedPhotos} ({existingPhotos.length})</span>
                <button
                  onClick={() => {
                    setActiveView('CAMERA');
                    startCamera();
                  }}
                  className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ {isKa ? 'ახალი ფოტოს გადაღება' : 'Take New Photo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {existingPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group hover:border-slate-700 transition"
                  >
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.title || 'Panel Photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2 justify-between">
                        <span className="text-[10px] text-slate-200 font-mono">
                          {new Date(photo.timestamp).toLocaleString()}
                        </span>
                        {onDeletePhoto && (
                          <button
                            onClick={() => onDeletePhoto(photo.id)}
                            className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer"
                            title={t.techCameraDeletePhoto}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 space-y-1">
                      <div className="font-semibold text-xs text-slate-200 truncate">
                        {photo.title || 'Panel Inspection Photo'}
                      </div>
                      {photo.notes && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {photo.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>{projectSiteRef} • {panelTag}</span>
          <span>IEC 61439 Verification Protocol</span>
        </div>
      </div>
    </div>
  );
};
