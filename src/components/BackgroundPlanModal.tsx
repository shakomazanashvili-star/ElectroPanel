import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCw,
  ZoomIn,
  Sliders,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  X,
  Check,
  Move,
  Sparkles,
} from 'lucide-react';
import { FloorPlanBackgroundImage, Language } from '../types';

interface BackgroundPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundImage?: FloorPlanBackgroundImage;
  onUpdateBackground: (bg: FloorPlanBackgroundImage | undefined) => void;
  lang: Language;
}

export const BackgroundPlanModal: React.FC<BackgroundPlanModalProps> = ({
  isOpen,
  onClose,
  backgroundImage,
  onUpdateBackground,
  lang,
}) => {
  const isKa = lang === 'ka';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local editable settings
  const [opacity, setOpacity] = useState<number>(backgroundImage?.opacity ?? 0.45);
  const [scale, setScale] = useState<number>(backgroundImage?.scale ?? 1.0);
  const [rotation, setRotation] = useState<number>(backgroundImage?.rotation ?? 0);
  const [posX, setPosX] = useState<number>(backgroundImage?.x ?? 0);
  const [posY, setPosY] = useState<number>(backgroundImage?.y ?? 0);
  const [locked, setLocked] = useState<boolean>(backgroundImage?.locked ?? true);
  const [visible, setVisible] = useState<boolean>(backgroundImage?.visible ?? true);

  if (!isOpen) return null;

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newBg: FloorPlanBackgroundImage = {
          url,
          name: file.name,
          x: 0,
          y: 0,
          scale: 1.0,
          rotation: 0,
          opacity: 0.45,
          visible: true,
          locked: true,
          naturalWidth: img.width,
          naturalHeight: img.height,
        };
        onUpdateBackground(newBg);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Quick preset: Cadastral NAPR Orthophoto blueprint overlay
  const handleLoadNaprtPreset = () => {
    // A high-contrast cadastral grid svg data URI for overlay
    const naprSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <pattern id="cadGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="%2338bdf8" stroke-width="0.75" stroke-opacity="0.35"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="%230f172a" fill-opacity="0.4"/>
      <g transform="rotate(-32 400 300)">
        <polygon points="150,100 650,100 650,500 150,500" fill="url(%23cadGrid)" stroke="%2338bdf8" stroke-width="3"/>
        <line x1="150" y1="280" x2="650" y2="280" stroke="%2338bdf8" stroke-width="2"/>
        <line x1="380" y1="100" x2="380" y2="500" stroke="%2338bdf8" stroke-width="2"/>
        <line x1="380" y1="360" x2="650" y2="360" stroke="%2338bdf8" stroke-width="2"/>
        <text x="240" y="200" fill="%23ffffff" font-size="24" font-weight="bold">01 / 1</text>
        <text x="440" y="240" fill="%2338bdf8" font-size="20" font-weight="bold">CAD-PLAN</text>
      </g>
    </svg>`;

    const newBg: FloorPlanBackgroundImage = {
      url: naprSvg,
      name: 'NAPR_Cadastral_Plan.svg',
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
      opacity: 0.5,
      visible: true,
      locked: true,
      naturalWidth: 800,
      naturalHeight: 600,
    };
    onUpdateBackground(newBg);
  };

  const applyChanges = (updates: Partial<FloorPlanBackgroundImage>) => {
    if (!backgroundImage) return;
    const updated = {
      ...backgroundImage,
      opacity,
      scale,
      rotation,
      x: posX,
      y: posY,
      locked,
      visible,
      ...updates,
    };
    onUpdateBackground(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="bg-plan-modal-dialog"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isKa ? 'ნახაზის / ფოტოს ატვირთვა & მოხაზვა' : 'Upload Floor Plan & Cadastral Tracing'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKa
                  ? 'ატვირთეთ საჯარო რეესტრის (NAPR), არქიტექტორული ან CAD ნახაზის ფოტო და დახაზეთ ზედ'
                  : 'Upload blueprint/cadastral image to trace walls and place electrical points over it'}
              </p>
            </div>
          </div>
          <button
            id="close-bg-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Upload Area */}
          {!backgroundImage ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 bg-slate-800/30 hover:bg-slate-800/60 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
              >
                <div className="p-4 bg-sky-500/10 border border-sky-500/20 group-hover:border-sky-500/40 rounded-2xl text-sky-400">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    {isKa ? 'დააკლიკეთ ან ჩააგდეთ ნახაზის ფაილი აქ' : 'Click or drop blueprint image file here'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG, WEBP, SVG, PDF {isKa ? '(მაგ: საჯარო რეესტრის ნახაზი)' : '(e.g. NAPR plan)'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Cadastral NAPR Preset Button */}
              <button
                onClick={handleLoadNaprtPreset}
                className="w-full p-3.5 bg-gradient-to-r from-slate-800 to-slate-800/70 hover:from-slate-700 hover:to-slate-700/80 border border-sky-500/30 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-sky-300 transition-all shadow-md"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                {isKa
                  ? 'საკადასტრო NAPR შაბლონის გამოყენება (შენობა 01/1)'
                  : 'Load NAPR Cadastral Blueprint Preset (01/1)'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Active Image Status Bar */}
              <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-xs">{backgroundImage.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {backgroundImage.naturalWidth} x {backgroundImage.naturalHeight} px
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newVis = !visible;
                      setVisible(newVis);
                      applyChanges({ visible: newVis });
                    }}
                    className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                      visible
                        ? 'bg-slate-700 border-slate-600 text-slate-200'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {visible ? <Eye className="w-4 h-4 text-sky-400" /> : <EyeOff className="w-4 h-4" />}
                    {visible ? (isKa ? 'ჩართულია' : 'Visible') : isKa ? 'დამალულია' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => onUpdateBackground(undefined)}
                    className="p-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-lg text-xs transition-colors"
                    title={isKa ? 'ნახაზის წაშლა' : 'Remove background'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image Transform Controls */}
              <div className="space-y-4 p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{isKa ? 'გამჭვირვალობა (Opacity)' : 'Opacity'}</span>
                    <span className="font-mono text-sky-400">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setOpacity(val);
                      applyChanges({ opacity: val });
                    }}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                {/* Scale Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{isKa ? 'მასშტაბი (Scale)' : 'Scale'}</span>
                    <span className="font-mono text-amber-400">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={scale}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setScale(val);
                      applyChanges({ scale: val });
                    }}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Rotation Angle Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      {isKa ? 'მობრუნების კუთხე (Rotation)' : 'Rotation Angle'}
                    </span>
                    <span className="font-mono text-emerald-400">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={rotation}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setRotation(val);
                      applyChanges({ rotation: val });
                    }}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[-90, -45, -32, 0, 32, 45, 90].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => {
                          setRotation(deg);
                          applyChanges({ rotation: deg });
                        }}
                        className={`flex-1 py-1 text-[10px] font-mono rounded border ${
                          rotation === deg
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {deg > 0 ? `+${deg}°` : `${deg}°`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Offset X & Y */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">X {isKa ? 'გადანაცვლება' : 'Offset'}</label>
                    <input
                      type="number"
                      value={posX}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setPosX(val);
                        applyChanges({ x: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Y {isKa ? 'გადანაცვლება' : 'Offset'}</label>
                    <input
                      type="number"
                      value={posY}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setPosY(val);
                        applyChanges({ y: val });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Lock Position Toggle */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const newLocked = !locked;
                      setLocked(newLocked);
                      applyChanges({ locked: newLocked });
                    }}
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      locked
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {locked
                      ? isKa
                        ? 'ნახაზი დაბლოკილია (ხატვისას არ გადაადგილდება)'
                        : 'Plan is Locked on Canvas'
                      : isKa
                      ? 'ნახაზი განბლოკილია'
                      : 'Plan is Unlocked'}
                  </button>
                </div>
              </div>

              {/* Replace Image Button */}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {isKa ? 'სხვა სურათის ატვირთვა' : 'Choose another image'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            id="btn-save-bg-settings"
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
          >
            {isKa ? 'მზადაა' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
