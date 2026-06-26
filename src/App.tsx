import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { pipeline, env } from '@huggingface/transformers';
import { Upload, Video, Loader2, Key, AlertCircle, X, Wand2, Camera, Image as ImageIcon, Settings, Download, ArrowDown, ArrowUp, ArrowRight, Maximize, ZoomIn, Users, RotateCcw, PenTool, MessageSquare, Search, Flag, CheckCircle2, Mic, Film, Clock, FolderHeart, Sparkles, Plus, Trash2, Play, Pause, Check, Copy, FileSpreadsheet, Split, Columns } from 'lucide-react';

// Configure transformers.js to use the Hugging Face Hub
env.allowLocalModels = false;
import { motion, AnimatePresence } from 'motion/react';
import { Chatbot } from './components/Chatbot';
import { ImageGenerator } from './components/ImageGenerator';
import { MultiReference } from './components/MultiReference';
import { Analyzer } from './components/Analyzer';
import { AudioGenerator } from './components/AudioGenerator';
import { VideoToImageStudio } from './components/VideoToImageStudio';
import { VideoGenerator } from './components/VideoGenerator';
import { UsageMonitor } from './components/UsageMonitor';
import { SavedLibraryDrawer, ContentResultModal } from './components/ContentResultModal';
import { saveFile } from './lib/db';

const ReportIssueButton = ({ error }: { error: string }) => {
  const [reported, setReported] = useState(false);
  return (
    <button
      onClick={() => {
        console.error("REPORTED ISSUE TO SUPERVISOR:", error);
        setReported(true);
        setTimeout(() => setReported(false), 3000);
      }}
      className="ml-auto flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs transition-colors"
    >
      {reported ? <CheckCircle2 className="w-3 h-3" /> : <Flag className="w-3 h-3" />}
      {reported ? 'Reported' : 'Report Issue'}
    </button>
  );
};

declare global {
  interface Window {
    aistudio?: any;
  }
}

interface FrameData {
  data: string;
  mimeType: string;
  url: string;
}

interface AngleHistoryItem {
  id: string;
  timestamp: number;
  base64: string;
  mimeType: string;
  angle: string;
  prompt: string;
  size: string;
  aspectRatio: string;
}

interface BatchQueueItem {
  id: string;
  angle: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
  url?: string;
  base64?: string;
  mimeType?: string;
}

interface FrameUploaderProps {
  label: string;
  frame: FrameData | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropFile?: (file: File) => void;
  onClear: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  overlayUrl?: string | null;
  showOverlay?: boolean;
  overlayOpacity?: number;
}

function FrameUploader({ 
  label, 
  frame, 
  onUpload, 
  onDropFile,
  onClear, 
  onAnalyze, 
  isAnalyzing,
  overlayUrl,
  showOverlay,
  overlayOpacity = 0.5
}: FrameUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/') && onDropFile) {
      onDropFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/70 uppercase tracking-wider">{label}</label>
      </div>
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-all ${
          frame 
            ? 'border-white/20 bg-black/20' 
            : isDragging
              ? 'border-[#ff7d00] bg-[#ff4e00]/10 shadow-lg shadow-[#ff4e00]/10 scale-[1.01]'
              : 'border-white/15 hover:border-white/30 hover:bg-white/5 bg-white/5'
        }`}
      >
        {frame ? (
          <>
            <img src={frame.url} alt={label} className="w-full h-full object-cover" />
            {showOverlay && overlayUrl && (
              <img 
                src={overlayUrl} 
                alt="Depth Map Overlay" 
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen pointer-events-none transition-opacity duration-300" 
                style={{ opacity: overlayOpacity }}
              />
            )}
            <div className="absolute top-2 right-2 flex gap-2 z-10">
              {onAnalyze && (
                <button 
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors flex items-center gap-2 text-xs font-medium disabled:opacity-50 cursor-pointer border border-white/10"
                  title="Analyze image to generate prompt"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Prompt'}
                </button>
              )}
              <button 
                onClick={onClear}
                className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors cursor-pointer border border-white/10"
                title="Clear frame"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`p-4 rounded-full bg-white/5 border border-white/10 mb-3 transition-all ${isDragging ? 'scale-110 bg-[#ff4e00]/20 border-[#ff4e00]/40 text-[#ff7d00]' : 'text-white/40'}`}>
              <Upload className="w-8 h-8 animate-pulse text-[#ff7d00]" />
            </div>
            
            <div className="text-center space-y-1 max-w-sm">
              <span className="text-sm font-semibold text-white/95 block">
                {isDragging ? 'Drop it like it\'s hot!' : 'Drag & drop reference image here'}
              </span>
              <span className="text-xs text-white/40 block">
                or click to browse local files (JPG, PNG, WEBP)
              </span>
              <span className="text-[10px] text-white/20 block font-mono">
                16:9 aspect ratio recommended for optimal perspective mapping
              </span>
            </div>

            <button
              type="button"
              className="mt-4 px-4 py-2 bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] hover:from-[#ff6000] hover:to-[#ff9000] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#ff4e00]/15 border border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Select Reference Image
            </button>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={onUpload}
        />
      </div>
    </div>
  );
}

import { useAppStore } from './store';

export default function App() {
  const { activeTab, setActiveTab, anglePrompt, setAnglePrompt, incrementSpend } = useAppStore();
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  
  const [showSettings, setShowSettings] = useState(false);

  const [baseImage, setBaseImage] = useState<FrameData | null>(null);
  const [selectedAngle, setSelectedAngle] = useState("Bird's-eye view (Top down)");
  const [customAngle, setCustomAngle] = useState('');
  const [generatedAngleUrl, setGeneratedAngleUrl] = useState<string | null>(null);
  const [isGeneratingAngle, setIsGeneratingAngle] = useState(false);
  const [angleImageSize, setAngleImageSize] = useState('1K');
  const [angleAspectRatio, setAngleAspectRatio] = useState('16:9');

  // Batch processing states for Alternate Angles
  const [isBatchMode, setIsBatchMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('angle_batch_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('angle_batch_queue');
      if (saved) {
        const parsed = JSON.parse(saved) as BatchQueueItem[];
        // Re-create Blob URLs for completed items on initial load
        return parsed.map(item => {
          if (item.status === 'completed' && item.base64 && item.mimeType) {
            try {
              const byteCharacters = atob(item.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: item.mimeType });
              const url = URL.createObjectURL(blob);
              return { ...item, url };
            } catch (e) {
              console.error("Failed to restore batch item URL on load:", e);
              return item;
            }
          }
          return item;
        });
      }
    } catch (e) {
      console.error("Failed to load batch queue from localStorage:", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('angle_batch_mode', isBatchMode ? 'true' : 'false');
    } catch (e) {
      console.error("Failed to save batch mode to localStorage:", e);
    }
  }, [isBatchMode]);

  useEffect(() => {
    try {
      // Persist the queue structure without the temporary blob URLs
      const queueToSave = batchQueue.map(item => {
        const { url, ...rest } = item;
        return rest;
      });
      localStorage.setItem('angle_batch_queue', JSON.stringify(queueToSave));
    } catch (e) {
      console.error("Failed to save batch queue to localStorage:", e);
    }
  }, [batchQueue]);

  const [batchStatus, setBatchStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle');
  const [batchAutoSave, setBatchAutoSave] = useState<boolean>(() => {
    try {
      return localStorage.getItem('angle_batch_auto_save') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('angle_batch_auto_save', batchAutoSave ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  }, [batchAutoSave]);

  const [customBatchInput, setCustomBatchInput] = useState('');
  const [savedBatchAngles, setSavedBatchAngles] = useState<string[]>([]);
  const [selectedCompletedItems, setSelectedCompletedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('angle_batch_queue');
      if (saved) {
        const parsed = JSON.parse(saved) as BatchQueueItem[];
        return parsed.filter(item => item.status === 'completed').map(item => item.id);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareItemAId, setCompareItemAId] = useState<string | null>(null);
  const [compareItemBId, setCompareItemBId] = useState<string | null>(null);
  const [compareType, setCompareType] = useState<'side-by-side' | 'split-slider'>('side-by-side');
  const [compareSplitPosition, setCompareSplitPosition] = useState<number>(50);
  const [syncCoords, setSyncCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const completedItems = batchQueue.filter(item => item.status === 'completed' && item.url);
    if (completedItems.length > 0) {
      if (!compareItemAId || !completedItems.some(i => i.id === compareItemAId)) {
        setCompareItemAId(completedItems[0].id);
      }
      if (completedItems.length > 1) {
        if (!compareItemBId || !completedItems.some(i => i.id === compareItemBId) || compareItemBId === completedItems[0].id) {
          const firstNonA = completedItems.find(i => i.id !== (compareItemAId || completedItems[0].id));
          if (firstNonA) {
            setCompareItemBId(firstNonA.id);
          } else {
            setCompareItemBId(completedItems[1].id);
          }
        }
      } else {
        setCompareItemBId(null);
      }
    } else {
      setCompareItemAId(null);
      setCompareItemBId(null);
    }
  }, [batchQueue]);

  const [depthImage, setDepthImage] = useState<FrameData | null>(null);
  const [generatedDepthUrl, setGeneratedDepthUrl] = useState<string | null>(null);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);

  const [baseImageDepthUrl, setBaseImageDepthUrl] = useState<string | null>(null);
  const [isGeneratingBaseDepth, setIsGeneratingBaseDepth] = useState(false);
  const [showDepthOverlay, setShowDepthOverlay] = useState(false);
  const [depthOverlayOpacity, setDepthOverlayOpacity] = useState(0.5);

  useEffect(() => {
    setBaseImageDepthUrl(null);
    setShowDepthOverlay(false);
  }, [baseImage]);

  const [error, setError] = useState<string | null>(null);
  const [analyzingFrame, setAnalyzingFrame] = useState<'firstFrame' | 'lastFrame' | 'baseImage' | 'depthImage' | null>(null);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryCount, setLibraryCount] = useState(0);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'depth' | 'angle'>('depth');
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalPrompt, setModalPrompt] = useState<string>('');
  const [modalMetadata, setModalMetadata] = useState<any>({});

  useEffect(() => {
    const updateCount = () => {
      const list = JSON.parse(localStorage.getItem('saved_library') || '[]');
      setLibraryCount(list.length);
    };
    updateCount();
    window.addEventListener('storage', updateCount);
    const interval = setInterval(updateCount, 1500);
    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  const [angleHistory, setAngleHistory] = useState<AngleHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('angle_generation_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse angle history:", e);
      return [];
    }
  });

  const addToAngleHistory = (item: Omit<AngleHistoryItem, 'id' | 'timestamp'>) => {
    setAngleHistory(prev => {
      const newItem: AngleHistoryItem = {
        ...item,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now()
      };
      const updated = [newItem, ...prev].slice(0, 5);
      localStorage.setItem('angle_generation_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRestoreHistoryItem = (item: AngleHistoryItem) => {
    setGeneratedAngleUrl(`data:${item.mimeType};base64,${item.base64}`);
    setAnglePrompt(item.prompt);
    setAngleImageSize(item.size);
    setAngleAspectRatio(item.aspectRatio);
    
    const isPreset = PRESET_ANGLES.some(angle => angle.id === item.angle);
    if (isPreset) {
      setSelectedAngle(item.angle);
      setCustomAngle('');
    } else {
      setSelectedAngle('Custom...');
      setCustomAngle(item.angle);
    }
  };

  const PRESET_ANGLES = [
    { id: "Bird's-eye view (Top down)", label: "Bird's-eye view", icon: ArrowDown, desc: "Top down" },
    { id: "Low angle (Looking up)", label: "Low angle", icon: ArrowUp, desc: "Looking up" },
    { id: "Side profile", label: "Side profile", icon: ArrowRight, desc: "From the side" },
    { id: "Wide establishing shot", label: "Wide shot", icon: Maximize, desc: "Establishing" },
    { id: "Close-up shot", label: "Close-up", icon: ZoomIn, desc: "Detailed" },
    { id: "Over-the-shoulder shot", label: "Over-the-shoulder", icon: Users, desc: "From behind" },
    { id: "Dutch angle (Tilted)", label: "Dutch angle", icon: RotateCcw, desc: "Tilted" },
    { id: "Custom...", label: "Custom...", icon: PenTool, desc: "Describe it" }
  ];

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      setError("GEMINI_API_KEY is not set. Please configure it in your environment.");
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setFrame: (frame: FrameData | null) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setFrame({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFileDrop = (file: File, setFrame: (frame: FrameData | null) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setFrame({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeFrame = async (frameType: 'baseImage' | 'depthImage') => {
    let frameToAnalyze = null;
    if (frameType === 'baseImage') frameToAnalyze = baseImage;
    if (frameType === 'depthImage') frameToAnalyze = depthImage;

    if (!frameToAnalyze) return;

    setAnalyzingFrame(frameType);
    setError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: frameToAnalyze.data,
                mimeType: frameToAnalyze.mimeType
              }
            },
            { text: "Analyze this image in detail and write a highly descriptive prompt that could be used to recreate this exact scene, including the subjects, setting, lighting, atmosphere, and camera angle. Be concise but thorough." }
          ]
        }
      });

      const analysisText = response.text || "";
      
      if (frameType === 'baseImage') {
        setAnglePrompt(anglePrompt ? `${anglePrompt}\n\n${analysisText}` : analysisText);
      } else if (frameType === 'depthImage') {
        console.log("Depth Image Analysis:", analysisText);
      }
      incrementSpend(0.005, 'image_analyze', 'gemini-3-flash-preview');
    } catch (err: any) {
      console.error("Analysis error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap") || errorMessage.includes("entity was not found") || errorMessage.includes("403") || errorMessage.includes("permission")) {
          setError("You have exceeded your API quota or spending cap. Please check your GEMINI_API_KEY.");
      } else {
          setError(err.message || "Failed to analyze the image.");
      }
    } finally {
      setAnalyzingFrame(null);
    }
  };

  const handleGenerateAngle = async () => {
    if (!baseImage) {
      setError("Please provide a base image.");
      return;
    }

    setIsGeneratingAngle(true);
    setError(null);
    setGeneratedAngleUrl(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const angleToUse = selectedAngle === 'Custom...' ? customAngle : selectedAngle;

      // Gemini 2D Approximation Logic
      let promptText = `Analyze the provided reference image and completely redraw the scene from a NEW camera angle: ${angleToUse}.

CRITICAL INSTRUCTIONS FOR 3D PERSPECTIVE:
1. DO NOT simply warp, stretch, or distort the original 2D image. You must imagine the scene in 3D space and render a physically accurate new camera perspective.
2. Apply correct foreshortening, vanishing points, and depth of field appropriate for the new angle.
3. The subject's identity, facial features, body proportions, and clothing MUST remain 100% identical to the reference.
4. The background environment and lighting must remain consistent but shift accurately according to the new perspective.
5. Ensure studio-quality, sharp details, and realistic anatomy.`;

      if (anglePrompt.trim()) {
        promptText += `\n\nADDITIONAL CONTEXT FROM USER:\n${anglePrompt}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: baseImage.data,
                mimeType: baseImage.mimeType,
              },
            },
            {
              text: promptText,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: angleAspectRatio,
          }
        }
      });

      let newBase64 = '';
      let newMimeType = 'image/png';

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newBase64 = part.inlineData.data;
          newMimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!newBase64) {
        throw new Error("Failed to generate angle. No image returned.");
      }

      const byteCharacters = atob(newBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {type: newMimeType});
      const url = URL.createObjectURL(blob);

      setGeneratedAngleUrl(url);
      setModalType('angle');
      setModalUrl(url);
      setModalPrompt(`Angle: ${angleToUse}. Additional details: ${anglePrompt || 'none'}`);
      setModalMetadata({
        model: 'gemini-2.5-flash-image',
        size: angleImageSize,
        aspectRatio: angleAspectRatio
      });
      setIsResultModalOpen(true);
      
      incrementSpend(0.03, 'image_angle', 'gemini-2.5-flash-image', angleToUse ? `Angle: ${angleToUse}` : undefined);

      addToAngleHistory({
        base64: newBase64,
        mimeType: newMimeType,
        angle: angleToUse,
        prompt: anglePrompt,
        size: angleImageSize,
        aspectRatio: angleAspectRatio
      });

    } catch (err: any) {
      console.error("Image generation error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("requested entity was not found")) {
          setError("API key session expired or invalid. Please check your GEMINI_API_KEY.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap") || errorMessage.includes("entity was not found") || errorMessage.includes("403") || errorMessage.includes("permission")) {
          setError("You have exceeded your API quota or spending cap. Please check your GEMINI_API_KEY.");
      } else if (errorMessage.includes("safety") || errorMessage.includes("policy") || errorMessage.includes("blocked")) {
          setError("The generated content was blocked by safety filters. Please try modifying your prompt or base image.");
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
          setError("A network error occurred. Please check your internet connection and try again.");
      } else if (errorMessage.includes("timeout")) {
          setError("The request timed out. Please try again.");
      } else {
          setError(err.message || "An unexpected error occurred during image generation. Please try again.");
      }
    } finally {
      setIsGeneratingAngle(false);
    }
  };

  // Batch processing handlers
  const handleToggleAngleInBatch = (angleId: string) => {
    setBatchQueue(prev => {
      const exists = prev.some(item => item.angle === angleId);
      if (exists) {
        return prev.filter(item => item.angle !== angleId);
      } else {
        const newItem: BatchQueueItem = {
          id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          angle: angleId,
          status: 'queued'
        };
        return [...prev, newItem];
      }
    });
  };

  const handleAddCustomAngleToBatch = () => {
    if (!customBatchInput.trim()) return;
    const newItem: BatchQueueItem = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      angle: customBatchInput.trim(),
      status: 'queued'
    };
    setBatchQueue(prev => [...prev, newItem]);
    setCustomBatchInput('');
  };

  const handleRemoveBatchQueueItem = (itemId: string) => {
    setBatchQueue(prev => prev.filter(item => item.id !== itemId));
    setSelectedCompletedItems(prev => prev.filter(id => id !== itemId));
  };

  const handleClearBatchQueue = () => {
    setBatchQueue([]);
    setSavedBatchAngles([]);
    setSelectedCompletedItems([]);
    setBatchStatus('idle');
  };

  const handleToggleSelectCompletedItem = (itemId: string) => {
    setSelectedCompletedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleSelectAllCompleted = () => {
    const completedIds = batchQueue
      .filter(item => item.status === 'completed')
      .map(item => item.id);
    setSelectedCompletedItems(completedIds);
  };

  const handleDeselectAllCompleted = () => {
    setSelectedCompletedItems([]);
  };

  const handleAddAllPresetsToBatch = () => {
    const newItems: BatchQueueItem[] = PRESET_ANGLES
      .filter(preset => preset.id !== 'Custom...')
      .map((preset, idx) => ({
        id: `batch_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        angle: preset.id,
        status: 'queued'
      }));
    setBatchQueue(newItems);
  };

  const handleStartBatchGeneration = async () => {
    if (!baseImage) {
      setError("Please provide a base image first.");
      return;
    }
    if (batchQueue.length === 0) {
      setError("Please select or add at least one angle for the batch queue.");
      return;
    }

    setError(null);
    setSavedBatchAngles([]);
    
    // Reset non-completed items to queued, keep completed ones if resuming
    setBatchQueue(prev => prev.map(item => {
      if (item.status === 'completed') return item;
      return { ...item, status: 'queued', error: undefined };
    }));
    
    setBatchStatus('running');
  };

  const handlePauseBatchGeneration = () => {
    setBatchStatus('paused');
    setBatchQueue(prev => prev.map(item => {
      if (item.status === 'running') {
        return { ...item, status: 'queued' };
      }
      return item;
    }));
  };

  const handleSaveAllBatchToLibrary = async () => {
    try {
      const completedItems = batchQueue.filter(item => item.status === 'completed' && item.url && item.base64);
      if (completedItems.length === 0) return;

      const savedList = JSON.parse(localStorage.getItem('saved_library') || '[]');
      const newlySavedAngles: string[] = [];

      for (const item of completedItems) {
        if (!item.base64 || !item.mimeType) continue;

        // Prevent redundant saving
        const alreadySaved = savedList.some((savedItem: any) => 
          savedItem.type === 'angle' && savedItem.title.includes(item.angle)
        );
        if (alreadySaved) continue;

        const fileId = `saved_angle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await saveFile(fileId, item.base64, item.mimeType);

        const newItem = {
          id: fileId,
          type: 'angle',
          title: `Alternate Angle: ${item.angle}`,
          prompt: `Angle: ${item.angle}. Additional details: ${anglePrompt || 'none'}`,
          timestamp: Date.now(),
          mimeType: item.mimeType,
          fileKey: fileId,
          metadata: {
            model: 'gemini-2.5-flash-image',
            size: angleImageSize,
            aspectRatio: angleAspectRatio
          }
        };

        savedList.unshift(newItem);
        newlySavedAngles.push(item.angle);
      }

      localStorage.setItem('saved_library', JSON.stringify(savedList));
      setSavedBatchAngles(prev => [...prev, ...newlySavedAngles]);
      
      // Update count badge
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error("Failed to save batch to library:", err);
    }
  };

  const handleSaveSelectedBatchToLibrary = async () => {
    try {
      const completedItems = batchQueue.filter(item => 
        item.status === 'completed' && 
        item.url && 
        item.base64 && 
        selectedCompletedItems.includes(item.id)
      );
      if (completedItems.length === 0) return;

      const savedList = JSON.parse(localStorage.getItem('saved_library') || '[]');
      const newlySavedAngles: string[] = [];

      for (const item of completedItems) {
        if (!item.base64 || !item.mimeType) continue;

        // Prevent redundant saving
        const alreadySaved = savedList.some((savedItem: any) => 
          savedItem.type === 'angle' && savedItem.title.includes(item.angle)
        );
        if (alreadySaved) continue;

        const fileId = `saved_angle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await saveFile(fileId, item.base64, item.mimeType);

        const newItem = {
          id: fileId,
          type: 'angle',
          title: `Alternate Angle: ${item.angle}`,
          prompt: `Angle: ${item.angle}. Additional details: ${anglePrompt || 'none'}`,
          timestamp: Date.now(),
          mimeType: item.mimeType,
          fileKey: fileId,
          metadata: {
            model: 'gemini-2.5-flash-image',
            size: angleImageSize,
            aspectRatio: angleAspectRatio
          }
        };

        savedList.unshift(newItem);
        newlySavedAngles.push(item.angle);
      }

      localStorage.setItem('saved_library', JSON.stringify(savedList));
      setSavedBatchAngles(prev => [...prev, ...newlySavedAngles]);
      
      // Update count badge
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error("Failed to save selected batch items to library:", err);
    }
  };

  const handleDownloadAllBatch = () => {
    const completedItems = batchQueue.filter(item => item.status === 'completed' && item.url);
    completedItems.forEach((item, idx) => {
      setTimeout(() => {
        if (!item.url) return;
        const link = document.createElement('a');
        link.href = item.url;
        const formattedAngle = item.angle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        link.download = `alternate-angle-${formattedAngle}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 200);
    });
  };

  const handleExportBatchCSV = () => {
    if (batchQueue.length === 0) return;

    const headers = ['Queue Item ID', 'Angle/Perspective Setting', 'Status', 'Additional Context/Prompt', 'Aspect Ratio', 'Image Size', 'Error Message'];
    const rows = batchQueue.map(item => [
      item.id,
      item.angle,
      item.status,
      anglePrompt || 'None',
      angleAspectRatio,
      angleImageSize,
      item.error || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `alternate-angles-batch-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sequential generation loop effect
  useEffect(() => {
    if (batchStatus !== 'running') return;

    // Find the first queued item
    const nextItemIndex = batchQueue.findIndex(item => item.status === 'queued');
    
    // If no queued items left, we are done!
    if (nextItemIndex === -1) {
      const hasFailed = batchQueue.some(item => item.status === 'failed');
      setBatchStatus(hasFailed ? 'failed' : 'completed');
      return;
    }

    let active = true;

    const generateItem = async () => {
      const itemToGenerate = batchQueue[nextItemIndex];
      
      // Update state to running
      setBatchQueue(prev => prev.map((item, idx) => 
        idx === nextItemIndex ? { ...item, status: 'running' } : item
      ));

      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is not set.");
        }
        const ai = new GoogleGenAI({ apiKey });

        const angleToUse = itemToGenerate.angle;

        let promptText = `Analyze the provided reference image and completely redraw the scene from a NEW camera angle: ${angleToUse}.

CRITICAL INSTRUCTIONS FOR 3D PERSPECTIVE:
1. DO NOT simply warp, stretch, or distort the original 2D image. You must imagine the scene in 3D space and render a physically accurate new camera perspective.
2. Apply correct foreshortening, vanishing points, and depth of field appropriate for the new angle.
3. The subject's identity, facial features, body proportions, and clothing MUST remain 100% identical to the reference.
4. The background environment and lighting must remain consistent but shift accurately according to the new perspective.
5. Ensure studio-quality, sharp details, and realistic anatomy.`;

        if (anglePrompt.trim()) {
          promptText += `\n\nADDITIONAL CONTEXT FROM USER:\n${anglePrompt}`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: baseImage!.data,
                  mimeType: baseImage!.mimeType,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: angleAspectRatio,
            }
          }
        });

        if (!active) return;

        let newBase64 = '';
        let newMimeType = 'image/png';

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            newBase64 = part.inlineData.data;
            newMimeType = part.inlineData.mimeType || 'image/png';
            break;
          }
        }

        if (!newBase64) {
          throw new Error("No image returned from Gemini API.");
        }

        const byteCharacters = atob(newBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {type: newMimeType});
        const url = URL.createObjectURL(blob);

        setBatchQueue(prev => prev.map((item, idx) => 
          idx === nextItemIndex ? { ...item, status: 'completed', url, base64: newBase64, mimeType: newMimeType } : item
        ));

        // Also auto-select this item for saving
        setSelectedCompletedItems(prev => {
          if (!prev.includes(itemToGenerate.id)) {
            return [...prev, itemToGenerate.id];
          }
          return prev;
        });

        // Auto-save to library if configured
        if (batchAutoSave) {
          try {
            const savedList = JSON.parse(localStorage.getItem('saved_library') || '[]');
            // Prevent redundant saving
            const alreadySaved = savedList.some((savedItem: any) => 
              savedItem.type === 'angle' && savedItem.title.includes(itemToGenerate.angle)
            );
            if (!alreadySaved) {
              const fileId = `saved_angle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              await saveFile(fileId, newBase64, newMimeType);

              const newItem = {
                id: fileId,
                type: 'angle',
                title: `Alternate Angle: ${itemToGenerate.angle}`,
                prompt: `Angle: ${itemToGenerate.angle}. Additional details: ${anglePrompt || 'none'}`,
                timestamp: Date.now(),
                mimeType: newMimeType,
                fileKey: fileId,
                metadata: {
                  model: 'gemini-2.5-flash-image',
                  size: angleImageSize,
                  aspectRatio: angleAspectRatio
                }
              };

              savedList.unshift(newItem);
              localStorage.setItem('saved_library', JSON.stringify(savedList));
              setSavedBatchAngles(prev => [...prev, itemToGenerate.angle]);
              
              // Update count badge
              window.dispatchEvent(new Event('storage'));
            }
          } catch (e) {
            console.error("Auto-save failed for item:", e);
          }
        }

        // Add to history list
        addToAngleHistory({
          base64: newBase64,
          mimeType: newMimeType,
          angle: angleToUse,
          prompt: anglePrompt,
          size: angleImageSize,
          aspectRatio: angleAspectRatio
        });

        incrementSpend(0.03, 'image_angle', 'gemini-2.5-flash-image', angleToUse ? `Angle: ${angleToUse}` : undefined);

      } catch (err: any) {
        console.error("Batch processing item error:", err);
        if (!active) return;

        const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
        const errorMessage = errorString.toLowerCase();
        let message = err.message || "Unknown API error.";
        
        if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap")) {
          message = "Quota limit reached.";
        } else if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
          message = "Blocked by safety filter.";
        }

        setBatchQueue(prev => prev.map((item, idx) => 
          idx === nextItemIndex ? { ...item, status: 'failed', error: message } : item
        ));
        
        // Auto-pause if an error occurs so the user knows
        setBatchStatus('paused');
      }
    };

    generateItem();

    return () => {
      active = false;
    };
  }, [batchStatus, batchQueue, baseImage, anglePrompt, angleAspectRatio, angleImageSize, batchAutoSave]);

  const handleGenerateDepth = async () => {
    if (!depthImage) {
      setError("Please upload an image to generate a depth map.");
      return;
    }

    setIsGeneratingDepth(true);
    setError(null);
    setLoadingMessage("Loading Depth-Anything model (this may take a moment on first run)...");

    try {
      // Resize image to max 1024x1024 to avoid memory issues in browser
      const resizedDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1024;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => reject(new Error("Failed to load image for resizing"));
        img.src = depthImage.url;
      });

      // Initialize the pipeline
      const estimator = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
      
      setLoadingMessage("Estimating depth map with Depth-Anything...");
      
      // Run depth estimation
      const output = await estimator(resizedDataUrl);
      
      const result = Array.isArray(output) ? output[0] : output;
      const depthRaw = (result as any).depth;
      
      // Convert RawImage to Data URL
      const canvas = document.createElement('canvas');
      canvas.width = depthRaw.width;
      canvas.height = depthRaw.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      const imageData = ctx.createImageData(depthRaw.width, depthRaw.height);
      for (let i = 0; i < depthRaw.data.length; i++) {
        const val = depthRaw.data[i];
        imageData.data[i * 4] = val;     // R
        imageData.data[i * 4 + 1] = val; // G
        imageData.data[i * 4 + 2] = val; // B
        imageData.data[i * 4 + 3] = 255; // A
      }
      ctx.putImageData(imageData, 0, 0);
      
      const depthDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setGeneratedDepthUrl(depthDataUrl);
      setModalType('depth');
      setModalUrl(depthDataUrl);
      setModalPrompt('Generated 3D depth map using Depth-Anything model estimation.');
      setModalMetadata({
        model: 'Xenova/depth-anything-small-hf',
        type: 'Depth Estimation Map'
      });
      setIsResultModalOpen(true);
    } catch (err: any) {
      console.error("Depth generation error:", err);
      setError(err.message || "An unexpected error occurred during depth generation.");
    } finally {
      setIsGeneratingDepth(false);
    }
  };

  const handleToggleDepthOverlay = async (checked: boolean) => {
    setShowDepthOverlay(checked);
    if (checked && !baseImageDepthUrl && baseImage) {
      setIsGeneratingBaseDepth(true);
      setError(null);
      try {
        const resizedDataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1024;
            
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          img.onerror = () => reject(new Error("Failed to load base image for depth estimation"));
          img.src = baseImage.url;
        });

        const estimator = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
        const output = await estimator(resizedDataUrl);
        const result = Array.isArray(output) ? output[0] : output;
        const depthRaw = (result as any).depth;
        
        const canvas = document.createElement('canvas');
        canvas.width = depthRaw.width;
        canvas.height = depthRaw.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        const imageData = ctx.createImageData(depthRaw.width, depthRaw.height);
        for (let i = 0; i < depthRaw.data.length; i++) {
          const val = depthRaw.data[i];
          imageData.data[i * 4] = val;     // R
          imageData.data[i * 4 + 1] = val; // G
          imageData.data[i * 4 + 2] = val; // B
          imageData.data[i * 4 + 3] = 255; // A
        }
        ctx.putImageData(imageData, 0, 0);
        
        setBaseImageDepthUrl(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err: any) {
        console.error("Base image depth generation error:", err);
        setError("Failed to generate depth map for base image: " + (err.message || err));
        setShowDepthOverlay(false);
      } finally {
        setIsGeneratingBaseDepth(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-white/20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff4e00] opacity-[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#0096ff] opacity-[0.03] blur-[120px]" />
      </div>

      <main className="relative max-w-5xl mx-auto px-6 py-12 flex flex-col gap-8">
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">Video Synthesis Studio</h1>
            <p className="text-white/50 max-w-xl">
              Analyze, ingest, and adapt. Extract keyframes, analyze scenes, and synthesize new images or videos.
            </p>
          </div>
          <div className="shrink-0 mt-2 flex items-center gap-3">
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="px-4 py-2 bg-[#ff4e00]/10 hover:bg-[#ff4e00]/20 border border-[#ff4e00]/30 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all shadow-lg hover:shadow-[#ff4e00]/5 cursor-pointer relative"
            >
              <FolderHeart className="w-4 h-4 text-[#ff4e00]" />
              <span>My Library</span>
              {libraryCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-[#ff4e00] text-[9px] font-bold rounded-full text-white leading-none min-w-[16px] text-center border border-black animate-pulse">
                  {libraryCount}
                </span>
              )}
            </button>
            <UsageMonitor />
          </div>
        </header>

        <div className="flex justify-center gap-4 mb-4 flex-wrap">
          <button 
            onClick={() => { setActiveTab('studio'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'studio' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Film className="w-4 h-4" />
            Video to Image
          </button>
          <button 
            onClick={() => { setActiveTab('video'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'video' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Video className="w-4 h-4" />
            Image to Video
          </button>
          <button 
            onClick={() => { setActiveTab('angles'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'angles' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Camera className="w-4 h-4" />
            Alternate Angles
          </button>
          <button 
            onClick={() => { setActiveTab('multi-reference'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'multi-reference' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Sparkles className="w-4 h-4 text-[#ff4e00]" />
            Multi-Reference
          </button>
          <button 
            onClick={() => { setActiveTab('depth'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'depth' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <ImageIcon className="w-4 h-4" />
            Depth-Anything
          </button>
          <button 
            onClick={() => { setActiveTab('chat'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <MessageSquare className="w-4 h-4" />
            AI Chat
          </button>
          <button 
            onClick={() => { setActiveTab('image'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'image' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Wand2 className="w-4 h-4" />
            Generate Image
          </button>
          <button 
            onClick={() => { setActiveTab('analyze'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'analyze' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Search className="w-4 h-4" />
            Analyze
          </button>
          <button 
            onClick={() => { setActiveTab('audio'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'audio' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Mic className="w-4 h-4" />
            Audio
          </button>
        </div>

        {activeTab === 'studio' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VideoToImageStudio />
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VideoGenerator />
          </div>
        )}

        {activeTab === 'angles' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-2xl mx-auto w-full space-y-4">
              {/* Informative Help Banner for Reference Image Upload */}
              <div className="p-4 bg-[#ff4e00]/5 border border-[#ff4e00]/20 rounded-xl flex items-start gap-3 shadow-sm">
                <Sparkles className="w-5 h-5 text-[#ff7d00] shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Reference Image Guided Generation</h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Upload a reference image (product photo, scene, layout) below. Using Depth-guided perspective construction, the AI will reconstruct this exact scene and allow you to capture it from entirely new perspective angles.
                  </p>
                </div>
              </div>

              <FrameUploader 
                label="Base Image" 
                frame={baseImage} 
                onUpload={(e) => handleFileUpload(e, setBaseImage)} 
                onDropFile={(file) => handleFileDrop(file, setBaseImage)}
                onClear={() => setBaseImage(null)}
                onAnalyze={() => handleAnalyzeFrame('baseImage')}
                isAnalyzing={analyzingFrame === 'baseImage'}
                overlayUrl={baseImageDepthUrl}
                showOverlay={showDepthOverlay}
                overlayOpacity={depthOverlayOpacity}
              />

              {baseImage && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDepthOverlay(!showDepthOverlay)}
                      disabled={isGeneratingBaseDepth}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ff4e00]/50 ${showDepthOverlay ? 'bg-[#ff4e00]' : 'bg-white/10'}`}
                    >
                      <span className="sr-only">Overlay Depth Map</span>
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showDepthOverlay ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-white/90">Overlay Depth Map</div>
                      <div className="text-[10px] text-white/50">
                        {isGeneratingBaseDepth ? (
                          <span className="text-[#ff4e00] flex items-center gap-1.5 font-medium animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Analyzing 3D Depth...
                          </span>
                        ) : (
                          'Visualize perspective and depth layout of the scene'
                        )}
                      </div>
                    </div>
                  </div>

                  {showDepthOverlay && baseImageDepthUrl && (
                    <div className="flex items-center gap-3 flex-1 max-w-xs md:justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40">Opacity</span>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={depthOverlayOpacity}
                        onChange={(e) => setDepthOverlayOpacity(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff4e00] focus:outline-none"
                      />
                      <span className="text-xs font-mono text-white/70 w-8 text-right">{Math.round(depthOverlayOpacity * 100)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mode Selector */}
            <div className="flex justify-center items-center gap-2 mb-6 bg-white/5 border border-white/10 p-1.5 rounded-xl max-w-xs sm:max-w-sm mx-auto">
              <button
                onClick={() => { setIsBatchMode(false); setError(null); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${!isBatchMode ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white/90'}`}
              >
                Single Angle
              </button>
              <button
                onClick={() => { setIsBatchMode(true); setError(null); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${isBatchMode ? 'bg-white text-black shadow-md' : 'text-white/60 hover:text-white/90'}`}
              >
                <span>Batch Queue</span>
                {batchQueue.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#ff4e00] text-white rounded-full leading-none min-w-[16px] text-center border border-black animate-pulse">
                    {batchQueue.length}
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto w-full">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wider">
                    {isBatchMode ? 'Select Angles for Batch Queue' : 'Select New Angle'}
                  </label>
                  {isBatchMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddAllPresetsToBatch}
                        disabled={batchStatus === 'running'}
                        className="text-xs text-[#ff4e00]/80 hover:text-[#ff4e00] disabled:opacity-40 transition-colors flex items-center gap-1 bg-[#ff4e00]/5 border border-[#ff4e00]/10 px-2 py-1 rounded cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Select All Presets
                      </button>
                      <button
                        onClick={handleClearBatchQueue}
                        disabled={batchStatus === 'running'}
                        className="text-xs text-white/40 hover:text-white/70 disabled:opacity-40 transition-colors flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Clear Queue
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_ANGLES.map(angle => {
                    const Icon = angle.icon;
                    
                    if (angle.id === 'Custom...') {
                      if (isBatchMode) return null; // We handle custom angle separately in batch mode
                      
                      const isSelected = selectedAngle === angle.id;
                      return (
                        <button
                          key={angle.id}
                          onClick={() => setSelectedAngle(angle.id)}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col items-start gap-2 ${isSelected ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90'}`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-white/50'}`} />
                          <div>
                            <div className="text-sm font-medium">{angle.label}</div>
                            <div className="text-xs opacity-60">{angle.desc}</div>
                          </div>
                        </button>
                      );
                    }

                    // For non-custom presets
                    const isInBatch = batchQueue.some(item => item.angle === angle.id);
                    const isSingleSelected = selectedAngle === angle.id;
                    const isSelected = isBatchMode ? isInBatch : isSingleSelected;

                    return (
                      <button
                        key={angle.id}
                        disabled={isBatchMode && batchStatus === 'running'}
                        onClick={() => {
                          if (isBatchMode) {
                            handleToggleAngleInBatch(angle.id);
                          } else {
                            setSelectedAngle(angle.id);
                          }
                        }}
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col items-start gap-2 relative ${isSelected ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/90'} ${isBatchMode && batchStatus === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-white/50'}`} />
                        <div>
                          <div className="text-sm font-medium">{angle.label}</div>
                          <div className="text-xs opacity-60">{angle.desc}</div>
                        </div>
                        {isBatchMode && isInBatch && (
                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff4e00] text-[9px] font-bold text-white shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isBatchMode && selectedAngle === 'Custom...' && (
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Custom Angle Description</label>
                      {customAngle && (
                        <button onClick={() => setCustomAngle('')} className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1">
                          <X className="w-3 h-3" /> Clear
                        </button>
                      )}
                    </div>
                    <input 
                      autoFocus
                      type="text"
                      value={customAngle}
                      onChange={(e) => setCustomAngle(e.target.value)}
                      placeholder="e.g., 'From below looking up at the sky', 'Security camera in the corner'"
                      className="w-full bg-transparent border-b border-white/20 pb-2 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-all"
                    />
                  </div>
                )}

                {isBatchMode && (
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Add Custom Angle to Queue</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={customBatchInput}
                        disabled={batchStatus === 'running'}
                        onChange={(e) => setCustomBatchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCustomAngleToBatch();
                          }
                        }}
                        placeholder="e.g., 'Macro close up of subject's eyes', 'Wide shot looking down'"
                        className="flex-1 bg-transparent border-b border-white/20 pb-2 text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 transition-all text-sm disabled:opacity-50"
                      />
                      <button
                        onClick={handleAddCustomAngleToBatch}
                        disabled={batchStatus === 'running' || !customBatchInput.trim()}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Batch Queue Status UI */}
              {isBatchMode && batchQueue.length > 0 && (
                <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Processing Queue</span>
                      <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-mono">
                        {batchQueue.filter(item => item.status === 'completed').length} / {batchQueue.length} Done
                      </span>

                      {/* Auto-Save Toggle */}
                      <label className="inline-flex items-center gap-2 ml-2 cursor-pointer select-none text-[11px] font-medium text-white/60 hover:text-white/85 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={batchAutoSave}
                          onChange={(e) => setBatchAutoSave(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="relative w-7 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/70 after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[#ff4e00] peer-checked:after:bg-white" />
                        <span>Auto-Save</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportBatchCSV}
                        title="Export Batch Queue to CSV"
                        className="p-1 px-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/70 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
                        <span>Export CSV</span>
                      </button>
                      {batchStatus !== 'idle' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          batchStatus === 'running' ? 'bg-[#ff4e00]/20 text-[#ff7d00] animate-pulse' :
                          batchStatus === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                          batchStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {batchStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  {batchStatus !== 'idle' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-white/50 font-mono">
                        <span>Progress</span>
                        <span>{Math.round((batchQueue.filter(item => item.status === 'completed').length / batchQueue.length) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] transition-all duration-300"
                          style={{ width: `${(batchQueue.filter(item => item.status === 'completed').length / batchQueue.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Queued Items List */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {batchQueue.map((item, idx) => {
                      const isRunning = item.status === 'running';
                      const isCompleted = item.status === 'completed';
                      const isFailed = item.status === 'failed';

                      return (
                        <div 
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg text-sm border transition-all ${
                            isRunning ? 'bg-[#ff4e00]/10 border-[#ff4e00]/30 text-white font-medium' :
                            isCompleted ? 'bg-green-500/5 border-green-500/20 text-white/80' :
                            isFailed ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                            'bg-white/5 border-white/5 text-white/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isRunning ? (
                              <Loader2 className="w-4 h-4 text-[#ff4e00] animate-spin shrink-0" />
                            ) : isCompleted ? (
                              <Check className="w-4 h-4 text-green-400 shrink-0 stroke-[3]" />
                            ) : isFailed ? (
                              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            ) : (
                              <span className="w-4 h-4 text-[10px] font-mono text-white/30 border border-white/20 rounded-full flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                            )}
                            
                            <div className="min-w-0 flex-1">
                              <span className="font-medium truncate block">{item.angle}</span>
                              {isFailed && item.error && (
                                <span className="text-[10px] text-red-400/80 block leading-tight mt-0.5">{item.error}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            {isCompleted && item.url && (
                              <button
                                onClick={() => {
                                  setModalType('angle');
                                  setModalUrl(item.url!);
                                  setModalPrompt(`Angle: ${item.angle}. Additional details: ${anglePrompt || 'none'}`);
                                  setModalMetadata({
                                    model: 'gemini-2.5-flash-image',
                                    size: angleImageSize,
                                    aspectRatio: angleAspectRatio
                                  });
                                  setIsResultModalOpen(true);
                                }}
                                className="text-xs text-[#ff4e00] hover:underline"
                              >
                                View
                              </button>
                            )}

                            {batchStatus !== 'running' && (
                              <button
                                onClick={() => handleRemoveBatchQueueItem(item.id)}
                                className="text-white/40 hover:text-white/80 transition-colors p-1"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Additional Details (Optional)</label>
                  {anglePrompt && (
                    <button onClick={() => setAnglePrompt('')} className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
                <textarea 
                  value={anglePrompt}
                  onChange={(e) => setAnglePrompt(e.target.value)}
                  placeholder="Describe the subject or scene to help the AI maintain proportions and details..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all resize-none h-24"
                />
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Image Settings</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs text-white/50 uppercase">Quality / Size</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1K', '2K', '4K'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setAngleImageSize(size)}
                          className={`p-2 text-sm rounded-xl border text-center transition-all ${angleImageSize === size ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs text-white/50 uppercase">Aspect Ratio</span>
                    <select
                      value={angleAspectRatio}
                      onChange={(e) => setAngleAspectRatio(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-all"
                    >
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:3">4:3 (Standard)</option>
                      <option value="3:4">3:4 (Portrait)</option>
                      <option value="16:9">16:9 (Widescreen)</option>
                      <option value="9:16">9:16 (Vertical)</option>
                      <option value="21:9">21:9 (Cinematic)</option>
                      <option value="3:2">3:2 (Classic)</option>
                      <option value="2:3">2:3 (Tall)</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                  <ReportIssueButton error={error} />
                </div>
              )}

              {/* Action Buttons */}
              {isBatchMode ? (
                <div className="space-y-3">
                  {batchStatus === 'running' ? (
                    <button
                      onClick={handlePauseBatchGeneration}
                      className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-yellow-600/10"
                    >
                      <Pause className="w-5 h-5" />
                      Pause Batch Generation
                    </button>
                  ) : (
                    <button
                      onClick={handleStartBatchGeneration}
                      disabled={!baseImage || batchQueue.length === 0}
                      className="w-full py-4 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Play className="w-5 h-5" />
                      {batchQueue.some(item => item.status === 'completed') ? 'Resume Batch Generation' : `Start Batch Generation (${batchQueue.length} items)`}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGenerateAngle}
                  disabled={isGeneratingAngle || !baseImage || (selectedAngle === 'Custom...' && !customAngle)}
                  className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingAngle ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Angle...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      Generate Angle
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Results Rendering */}
            {isBatchMode ? (
              // Batch Mode Results Grid
              batchQueue.some(item => item.status === 'completed' && item.url) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-4xl mx-auto w-full space-y-6 pt-8 border-t border-white/10"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#ff4e00]" />
                        Batch Results
                      </h3>
                      <p className="text-xs text-white/50">Completed generations from your queue</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedCompletedItems.length > 0 && (
                        <button
                          onClick={handleSaveSelectedBatchToLibrary}
                          className="px-4 py-2 bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] hover:from-[#ff6000] hover:to-[#ff9000] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#ff4e00]/15"
                        >
                          <FolderHeart className="w-3.5 h-3.5" />
                          Save Selected ({selectedCompletedItems.length})
                        </button>
                      )}
                      
                      <button
                        onClick={handleSaveAllBatchToLibrary}
                        className="px-4 py-2 bg-[#ff4e00]/10 hover:bg-[#ff4e00]/20 border border-[#ff4e00]/30 text-[#ff7d00] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FolderHeart className="w-3.5 h-3.5" />
                        {savedBatchAngles.length >= batchQueue.filter(item => item.status === 'completed').length
                          ? 'Saved to Library'
                          : 'Save All to Library'
                        }
                      </button>
                      <button
                        onClick={handleDownloadAllBatch}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download All
                      </button>
                      
                      <button
                        onClick={() => setIsCompareMode(prev => !prev)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isCompareMode 
                            ? 'bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] text-white border-transparent shadow-md shadow-[#ff4e00]/15' 
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                        }`}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        {isCompareMode ? 'Exit Compare' : 'Compare Mode'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/50 border-b border-white/5 pb-2">
                    <span className="font-mono">
                      {selectedCompletedItems.length} of {batchQueue.filter(item => item.status === 'completed').length} selected
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSelectAllCompleted}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAllCompleted}
                        className="hover:text-white transition-colors cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {isCompareMode ? (
                    /* Compare Mode Workspace */
                    <div className="space-y-6 bg-white/5 border border-white/10 rounded-2xl p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCompareType('side-by-side')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                              compareType === 'side-by-side'
                                ? 'bg-white/10 text-white border-white/20 shadow-md'
                                : 'bg-transparent text-white/50 border-transparent hover:text-white/80'
                            }`}
                          >
                            <Columns className="w-3.5 h-3.5" />
                            Side-by-Side (Synced)
                          </button>
                          <button
                            onClick={() => setCompareType('split-slider')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors ${
                              compareType === 'split-slider'
                                ? 'bg-white/10 text-white border-white/20 shadow-md'
                                : 'bg-transparent text-white/50 border-transparent hover:text-white/80'
                            }`}
                          >
                            <Split className="w-3.5 h-3.5" />
                            Split Overlay Slider
                          </button>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/55 font-medium">Image A:</span>
                            <select
                              value={compareItemAId || ''}
                              onChange={(e) => setCompareItemAId(e.target.value || null)}
                              className="bg-black/40 border border-white/10 rounded-lg text-xs text-white p-1.5 focus:outline-none focus:border-white/30"
                            >
                              {batchQueue
                                .filter(item => item.status === 'completed' && item.url)
                                .map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.angle}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/55 font-medium">Image B:</span>
                            <select
                              value={compareItemBId || ''}
                              onChange={(e) => setCompareItemBId(e.target.value || null)}
                              className="bg-black/40 border border-white/10 rounded-lg text-xs text-white p-1.5 focus:outline-none focus:border-white/30"
                            >
                              {batchQueue
                                .filter(item => item.status === 'completed' && item.url)
                                .map(item => (
                                  <option key={item.id} value={item.id} disabled={item.id === compareItemAId}>
                                    {item.angle}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {batchQueue.filter(item => item.status === 'completed' && item.url).length < 2 ? (
                        <div className="py-12 text-center text-white/50">
                          <Columns className="w-8 h-8 mx-auto mb-3 opacity-30 text-[#ff4e00]" />
                          <p className="text-sm font-medium">Not enough completed items to compare</p>
                          <p className="text-xs text-white/30 mt-1">Batch comparison requires at least 2 successfully generated angles.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {compareType === 'side-by-side' ? (
                            /* Side-by-Side Sync Workspace */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left slot: Image A */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-white/80 bg-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                    Slot A: {batchQueue.find(i => i.id === compareItemAId)?.angle || 'None'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        const item = batchQueue.find(i => i.id === compareItemAId);
                                        if (item?.url) {
                                          setModalType('angle');
                                          setModalUrl(item.url);
                                          setModalPrompt(`Angle: ${item.angle}. Additional details: ${anglePrompt || 'none'}`);
                                          setModalMetadata({
                                            model: 'gemini-2.5-flash-image',
                                            size: angleImageSize,
                                            aspectRatio: angleAspectRatio
                                          });
                                          setIsResultModalOpen(true);
                                        }
                                      }}
                                      className="p-1 px-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-white/80 rounded-md transition-all cursor-pointer"
                                    >
                                      View
                                    </button>
                                    {batchQueue.find(i => i.id === compareItemAId) && (
                                      <a
                                        href={batchQueue.find(i => i.id === compareItemAId)?.url}
                                        download={`angle-${batchQueue.find(i => i.id === compareItemAId)?.angle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer border border-white/10"
                                      >
                                        <Download className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div
                                  onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    setSyncCoords({ x, y });
                                  }}
                                  onMouseLeave={() => setSyncCoords(null)}
                                  className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-crosshair group"
                                >
                                  {batchQueue.find(i => i.id === compareItemAId)?.url ? (
                                    <img
                                      src={batchQueue.find(i => i.id === compareItemAId)?.url}
                                      alt="Compare Slot A"
                                      className="w-full h-full object-cover select-none"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">Select Image A</div>
                                  )}

                                  {/* Sync Overlay Lines */}
                                  {syncCoords && (
                                    <>
                                      <div 
                                        className="absolute left-0 right-0 h-[1.5px] bg-[#ff4e00]/70 pointer-events-none z-30 shadow-[0_0_4px_rgba(255,78,0,0.5)]" 
                                        style={{ top: `${syncCoords.y}%` }} 
                                      />
                                      <div 
                                        className="absolute top-0 bottom-0 w-[1.5px] bg-[#ff4e00]/70 pointer-events-none z-30 shadow-[0_0_4px_rgba(255,78,0,0.5)]" 
                                        style={{ left: `${syncCoords.x}%` }} 
                                      />
                                      <div 
                                        className="absolute h-4 w-4 rounded-full border-2 border-[#ff4e00] pointer-events-none z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow"
                                        style={{ left: `${syncCoords.x}%`, top: `${syncCoords.y}%` }}
                                      >
                                        <div className="h-1 w-1 bg-[#ff4e00] rounded-full" />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Right slot: Image B */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-white/80 bg-white/5 px-2.5 py-1 rounded-md uppercase tracking-wider">
                                    Slot B: {batchQueue.find(i => i.id === compareItemBId)?.angle || 'None'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        const item = batchQueue.find(i => i.id === compareItemBId);
                                        if (item?.url) {
                                          setModalType('angle');
                                          setModalUrl(item.url);
                                          setModalPrompt(`Angle: ${item.angle}. Additional details: ${anglePrompt || 'none'}`);
                                          setModalMetadata({
                                            model: 'gemini-2.5-flash-image',
                                            size: angleImageSize,
                                            aspectRatio: angleAspectRatio
                                          });
                                          setIsResultModalOpen(true);
                                        }
                                      }}
                                      className="p-1 px-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-white/80 rounded-md transition-all cursor-pointer"
                                    >
                                      View
                                    </button>
                                    {batchQueue.find(i => i.id === compareItemBId) && (
                                      <a
                                        href={batchQueue.find(i => i.id === compareItemBId)?.url}
                                        download={`angle-${batchQueue.find(i => i.id === compareItemBId)?.angle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer border border-white/10"
                                      >
                                        <Download className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                <div
                                  onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    setSyncCoords({ x, y });
                                  }}
                                  onMouseLeave={() => setSyncCoords(null)}
                                  className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 cursor-crosshair group"
                                >
                                  {batchQueue.find(i => i.id === compareItemBId)?.url ? (
                                    <img
                                      src={batchQueue.find(i => i.id === compareItemBId)?.url}
                                      alt="Compare Slot B"
                                      className="w-full h-full object-cover select-none"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">Select Image B</div>
                                  )}

                                  {/* Sync Overlay Lines */}
                                  {syncCoords && (
                                    <>
                                      <div 
                                        className="absolute left-0 right-0 h-[1.5px] bg-[#ff4e00]/70 pointer-events-none z-30 shadow-[0_0_4px_rgba(255,78,0,0.5)]" 
                                        style={{ top: `${syncCoords.y}%` }} 
                                      />
                                      <div 
                                        className="absolute top-0 bottom-0 w-[1.5px] bg-[#ff4e00]/70 pointer-events-none z-30 shadow-[0_0_4px_rgba(255,78,0,0.5)]" 
                                        style={{ left: `${syncCoords.x}%` }} 
                                      />
                                      <div 
                                        className="absolute h-4 w-4 rounded-full border-2 border-[#ff4e00] pointer-events-none z-30 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow"
                                        style={{ left: `${syncCoords.x}%`, top: `${syncCoords.y}%` }}
                                      >
                                        <div className="h-1 w-1 bg-[#ff4e00] rounded-full" />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Split Slider Workspace */
                            <div className="space-y-3">
                              <p className="text-xs text-white/50 text-center">Drag the visual slider to compare and analyze fine visual details across perspective states.</p>
                              
                              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 select-none max-w-2xl mx-auto">
                                {/* Base Image A (Full/Background) */}
                                {batchQueue.find(i => i.id === compareItemAId)?.url && (
                                  <img
                                    src={batchQueue.find(i => i.id === compareItemAId)?.url}
                                    alt="Compare Slider A"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                  />
                                )}
                                
                                {/* Overlay Image B (Clipped/Foreground) */}
                                {batchQueue.find(i => i.id === compareItemBId)?.url && (
                                  <img
                                    src={batchQueue.find(i => i.id === compareItemBId)?.url}
                                    alt="Compare Slider B"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                    style={{
                                      clipPath: `polygon(0 0, ${compareSplitPosition}% 0, ${compareSplitPosition}% 100%, 0 100%)`
                                    }}
                                  />
                                )}

                                {/* Center Divider Handle */}
                                <div 
                                  className="absolute top-0 bottom-0 w-1 bg-[#ff4e00] z-20 pointer-events-none"
                                  style={{ left: `${compareSplitPosition}%` }}
                                >
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#ff4e00] border-2 border-white shadow-lg flex items-center justify-center">
                                    <Split className="w-4 h-4 text-white rotate-90" />
                                  </div>
                                </div>

                                {/* Range Slider Controller Overlay */}
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={compareSplitPosition}
                                  onChange={(e) => setCompareSplitPosition(Number(e.target.value))}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                                />

                                {/* Badges */}
                                <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-md text-[10px] font-semibold text-white/90 z-20 pointer-events-none border border-white/10 uppercase tracking-wide">
                                  Left: {batchQueue.find(i => i.id === compareItemAId)?.angle || 'A'}
                                </div>
                                <div className="absolute bottom-3 right-3 bg-black/70 px-2.5 py-1 rounded-md text-[10px] font-semibold text-white/90 z-20 pointer-events-none border border-white/10 uppercase tracking-wide">
                                  Right: {batchQueue.find(i => i.id === compareItemBId)?.angle || 'B'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Quick details summary side-by-side comparison */}
                          <div className="p-4 bg-white/5 rounded-xl border border-white/10 max-w-4xl mx-auto">
                            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Perspective Details Comparison</h4>
                            <div className="grid grid-cols-2 gap-6 text-xs">
                              <div className="space-y-1.5 border-r border-white/10 pr-4">
                                <div className="font-semibold text-[#ff7d00]">{batchQueue.find(i => i.id === compareItemAId)?.angle}</div>
                                <div className="text-white/60"><span className="text-white/40">Status:</span> Completed</div>
                                <div className="text-white/60"><span className="text-white/40">Dimensions:</span> {angleAspectRatio} ({angleImageSize})</div>
                                <div className="text-white/50 text-[11px] italic mt-1 line-clamp-2">Prompt context: {anglePrompt || 'none'}</div>
                              </div>
                              <div className="space-y-1.5 pl-2">
                                <div className="font-semibold text-[#ff7d00]">{batchQueue.find(i => i.id === compareItemBId)?.angle}</div>
                                <div className="text-white/60"><span className="text-white/40">Status:</span> Completed</div>
                                <div className="text-white/60"><span className="text-white/40">Dimensions:</span> {angleAspectRatio} ({angleImageSize})</div>
                                <div className="text-white/50 text-[11px] italic mt-1 line-clamp-2">Prompt context: {anglePrompt || 'none'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {batchQueue
                        .filter(item => item.status === 'completed' && item.url)
                        .map((item) => {
                          const isSelected = selectedCompletedItems.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleSelectCompletedItem(item.id)}
                              className={`group relative aspect-video rounded-xl overflow-hidden border transition-all flex flex-col justify-end cursor-pointer ${
                                isSelected 
                                  ? 'border-[#ff4e00] ring-2 ring-[#ff4e00]/30 bg-[#ff4e00]/5' 
                                  : 'border-white/10 bg-black/40 hover:border-white/30'
                              }`}
                            >
                              <img
                                src={item.url}
                                alt={item.angle}
                                className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                              />

                              {/* Checkbox badge overlay in top-right */}
                              <div className="absolute top-2 right-2 z-20">
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                  isSelected 
                                    ? 'bg-[#ff4e00] border-[#ff4e00] text-white shadow' 
                                    : 'bg-black/40 border-white/40 text-transparent hover:border-white/80'
                                }`}>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              </div>

                              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent z-10" />

                              <div className="absolute inset-0 flex flex-col justify-end p-3 z-20" onClick={(e) => e.stopPropagation() /* Prevent card selection toggle when clicking buttons */}>
                                <span className="text-xs font-semibold text-white/95 truncate block mb-2" title={item.angle}>
                                  {item.angle}
                                </span>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setModalType('angle');
                                      setModalUrl(item.url!);
                                      setModalPrompt(`Angle: ${item.angle}. Additional details: ${anglePrompt || 'none'}`);
                                      setModalMetadata({
                                        model: 'gemini-2.5-flash-image',
                                        size: angleImageSize,
                                        aspectRatio: angleAspectRatio
                                      });
                                      setIsResultModalOpen(true);
                                    }}
                                    className="flex-1 py-1.5 bg-white hover:bg-white/90 text-black text-[10px] font-semibold rounded-md transition-colors text-center cursor-pointer shadow-md"
                                  >
                                    View & Share
                                  </button>
                                  <a
                                    href={item.url}
                                    download={`angle-${item.angle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
                                    className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </motion.div>
              )
            ) : (
              // Single Mode Result
              generatedAngleUrl && !isGeneratingAngle && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-4xl mx-auto w-full space-y-4"
                >
                  <h2 className="text-xl font-light text-center">New Angle Generated</h2>
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                    <img 
                      src={generatedAngleUrl} 
                      alt="Generated Angle"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setModalType('angle');
                        setModalUrl(generatedAngleUrl);
                        const angleToUse = selectedAngle === 'Custom...' ? customAngle : selectedAngle;
                        setModalPrompt(`Angle: ${angleToUse}. Additional details: ${anglePrompt || 'none'}`);
                        setModalMetadata({
                          model: 'gemini-2.5-flash-image',
                          size: angleImageSize,
                          aspectRatio: angleAspectRatio
                        });
                        setIsResultModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#ff4e00]/20 hover:bg-[#ff4e00]/30 border border-[#ff4e00]/40 rounded-lg text-sm text-[#ff7d00] transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Review & Share
                    </button>
                    <a 
                      href={generatedAngleUrl} 
                      download="generated-angle.png"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                    >
                      Download Image
                    </a>
                  </div>
                </motion.div>
              )
            )}

            {/* History Panel */}
            {angleHistory.length > 0 && (
              <div className="max-w-2xl mx-auto w-full space-y-4 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#ff4e00]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/80">Angle Generation History</h3>
                  </div>
                  <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full font-mono">
                    Last 5 generations
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {angleHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 hover:border-white/30 transition-all flex flex-col justify-between"
                    >
                      <img 
                        src={`data:${item.mimeType};base64,${item.base64}`} 
                        alt={item.angle} 
                        className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-80 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100 transition-opacity" />
                      
                      <div className="absolute inset-0 flex flex-col justify-end p-2.5 z-10">
                        <div className="text-[10px] font-semibold text-white/95 truncate" title={item.angle}>
                          {item.angle}
                        </div>
                        <div className="text-[8px] text-white/50 mt-0.5 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        {/* Hover Actions */}
                        <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleRestoreHistoryItem(item)}
                            className="flex-1 py-1 bg-white hover:bg-white/90 text-black text-[9px] font-semibold rounded-md transition-colors text-center cursor-pointer shadow-md"
                            title="Revert to this generation and restore parameters"
                          >
                            Restore
                          </button>
                          <a
                            href={`data:${item.mimeType};base64,${item.base64}`}
                            download={`angle-${item.id}.png`}
                            className="p-1.5 bg-white/10 hover:bg-white/25 text-white rounded-md transition-colors flex items-center justify-center cursor-pointer"
                            title="Download image"
                          >
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'depth' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-2xl mx-auto space-y-8">
              <FrameUploader 
                label="Base Image" 
                frame={depthImage} 
                onUpload={(e) => handleFileUpload(e, setDepthImage)} 
                onDropFile={(file) => handleFileDrop(file, setDepthImage)}
                onClear={() => setDepthImage(null)}
                onAnalyze={() => handleAnalyzeFrame('depthImage')}
                isAnalyzing={analyzingFrame === 'depthImage'}
              />

              <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <ImageIcon className="w-5 h-5 text-[#0096ff]" />
                  <h3 className="text-lg font-medium">Depth-Anything Estimation</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">
                  Uses the Depth-Anything model to generate highly accurate 3D depth maps from a single 2D image.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                  <ReportIssueButton error={error} />
                </div>
              )}

              <button
                onClick={handleGenerateDepth}
                disabled={isGeneratingDepth || !depthImage}
                className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingDepth ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Depth Map
                  </>
                )}
              </button>
            </div>

            {generatedDepthUrl && !isGeneratingDepth && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto w-full space-y-4"
              >
                <h2 className="text-xl font-light text-center">Depth Map Generated</h2>
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <img 
                    src={generatedDepthUrl} 
                    alt="Generated Depth Map"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setModalType('depth');
                      setModalUrl(generatedDepthUrl);
                      setModalPrompt('Generated 3D depth map using Depth-Anything model estimation.');
                      setModalMetadata({
                        model: 'Xenova/depth-anything-small-hf',
                        type: 'Depth Estimation Map'
                      });
                      setIsResultModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ff4e00]/20 hover:bg-[#ff4e00]/30 border border-[#ff4e00]/40 rounded-lg text-sm text-[#ff7d00] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Review & Share
                  </button>
                  <a 
                    href={generatedDepthUrl} 
                    download="depth-map.jpg"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                  >
                    Download Depth Map
                  </a>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-medium">Gemini Assistant</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">
                  Chat with Gemini to analyze images, search the web, check Google Maps, or solve complex problems using high-level thinking.
                </p>
              </div>
              <Chatbot />
            </div>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto">
              <ImageGenerator />
            </div>
          </div>
        )}

        {activeTab === 'multi-reference' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto">
              <MultiReference />
            </div>
          </div>
        )}

        {activeTab === 'analyze' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto">
              <Analyzer />
            </div>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-4xl mx-auto">
              <AudioGenerator />
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isLibraryOpen && (
          <SavedLibraryDrawer isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
        )}
        {isResultModalOpen && (
          <ContentResultModal
            isOpen={isResultModalOpen}
            onClose={() => setIsResultModalOpen(false)}
            type={modalType}
            title={modalType === 'angle' ? 'Generated Alternate Angle' : 'Generated Depth Map'}
            contentUrl={modalUrl}
            mimeType="image/jpeg"
            prompt={modalPrompt}
            metadata={modalMetadata}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
