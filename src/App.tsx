import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { pipeline, env } from '@huggingface/transformers';
import { Upload, Video, Loader2, Key, AlertCircle, X, Wand2, Camera, Image as ImageIcon, Settings, Download, ArrowDown, ArrowUp, ArrowRight, Maximize, ZoomIn, Users, RotateCcw, PenTool, MessageSquare, Search, Flag, CheckCircle2, Mic, Film } from 'lucide-react';

// Configure transformers.js to use the Hugging Face Hub
env.allowLocalModels = false;
import { motion, AnimatePresence } from 'motion/react';
import { Chatbot } from './components/Chatbot';
import { ImageGenerator } from './components/ImageGenerator';
import { Analyzer } from './components/Analyzer';
import { AudioGenerator } from './components/AudioGenerator';
import { VideoToImageStudio } from './components/VideoToImageStudio';
import { VideoGenerator } from './components/VideoGenerator';

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

interface FrameUploaderProps {
  label: string;
  frame: FrameData | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

function FrameUploader({ label, frame, onUpload, onClear, onAnalyze, isAnalyzing }: FrameUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/70 uppercase tracking-wider">{label}</label>
      </div>
      <div 
        className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-colors ${frame ? 'border-white/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
      >
        {frame ? (
          <>
            <img src={frame.url} alt={label} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex gap-2">
              {onAnalyze && (
                <button 
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors flex items-center gap-2 text-xs font-medium disabled:opacity-50"
                  title="Analyze image to generate prompt"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Prompt'}
                </button>
              )}
              <button 
                onClick={onClear}
                className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                title="Clear frame"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-white/40 mb-3" />
            <span className="text-sm text-white/50">Click to upload image</span>
            <span className="text-xs text-white/30 mt-1">16:9 recommended</span>
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
  const { activeTab, setActiveTab, anglePrompt, setAnglePrompt } = useAppStore();
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  
  const [showSettings, setShowSettings] = useState(false);

  const [baseImage, setBaseImage] = useState<FrameData | null>(null);
  const [selectedAngle, setSelectedAngle] = useState("Bird's-eye view (Top down)");
  const [customAngle, setCustomAngle] = useState('');
  const [generatedAngleUrl, setGeneratedAngleUrl] = useState<string | null>(null);
  const [isGeneratingAngle, setIsGeneratingAngle] = useState(false);
  const [angleImageSize, setAngleImageSize] = useState('1K');
  const [angleAspectRatio, setAngleAspectRatio] = useState('16:9');

  const [depthImage, setDepthImage] = useState<FrameData | null>(null);
  const [generatedDepthUrl, setGeneratedDepthUrl] = useState<string | null>(null);
  const [isGeneratingDepth, setIsGeneratingDepth] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [analyzingFrame, setAnalyzingFrame] = useState<'firstFrame' | 'lastFrame' | 'baseImage' | 'depthImage' | null>(null);

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
        setAnglePrompt(prev => prev ? `${prev}\n\n${analysisText}` : analysisText);
      } else if (frameType === 'depthImage') {
        console.log("Depth Image Analysis:", analysisText);
      }
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
      
      setGeneratedDepthUrl(canvas.toDataURL('image/jpeg', 0.9));
    } catch (err: any) {
      console.error("Depth generation error:", err);
      setError(err.message || "An unexpected error occurred during depth generation.");
    } finally {
      setIsGeneratingDepth(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-white/20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff4e00] opacity-[0.03] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#0096ff] opacity-[0.03] blur-[120px]" />
      </div>

      <main className="relative max-w-5xl mx-auto px-6 py-12 flex flex-col gap-8">
        <header className="flex items-start justify-between">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight">Video Synthesis Studio</h1>
            <p className="text-white/50 max-w-xl">
              Analyze, ingest, and adapt. Extract keyframes, analyze scenes, and synthesize new images or videos.
            </p>
          </div>
        </header>

        <div className="flex justify-center gap-4 mb-4 flex-wrap">
          <button 
            onClick={() => { setActiveTab('studio'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'studio' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Film className="w-4 h-4" />
            Video2Image
          </button>
          <button 
            onClick={() => { setActiveTab('video'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'video' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Video className="w-4 h-4" />
            Image2Video
          </button>
          <button 
            onClick={() => { setActiveTab('angles'); setError(null); }}
            className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${activeTab === 'angles' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Camera className="w-4 h-4" />
            Alternate Angles
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
            <div className="max-w-2xl mx-auto w-full">
              <FrameUploader 
                label="Base Image" 
                frame={baseImage} 
                onUpload={(e) => handleFileUpload(e, setBaseImage)} 
                onClear={() => setBaseImage(null)}
                onAnalyze={() => handleAnalyzeFrame('baseImage')}
                isAnalyzing={analyzingFrame === 'baseImage'}
              />
            </div>

            <div className="space-y-4 max-w-2xl mx-auto w-full">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Select New Angle</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_ANGLES.map(angle => {
                    const Icon = angle.icon;
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
                  })}
                </div>
                {selectedAngle === 'Custom...' && (
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
              </div>

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

              <button
                onClick={handleGenerateAngle}
                disabled={isGeneratingAngle || !baseImage || (selectedAngle === 'Custom...' && !customAngle)}
                className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
            </div>

            {generatedAngleUrl && !isGeneratingAngle && (
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
                <div className="flex justify-center">
                  <a 
                    href={generatedAngleUrl} 
                    download="generated-angle.png"
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Download Image
                  </a>
                </div>
              </motion.div>
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
                <div className="flex flex-col items-center gap-4">
                  <a 
                    href={generatedDepthUrl} 
                    download="depth-map.jpg"
                    className="text-sm text-white/50 hover:text-white transition-colors"
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
    </div>
  );
}
