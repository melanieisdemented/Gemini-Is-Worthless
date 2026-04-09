import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Film, Image as ImageIcon, Search, Wand2, Loader2, Play, Pause, Scissors, Download, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { saveFile, getFile, deleteFile } from '../lib/db';

interface ExtractedFrame {
  id: string;
  time: number;
  dataUrl: string;
  base64: string;
  mimeType: string;
  analysis?: string;
}

export function VideoToImageStudio() {
  const { videoToImagePrompt: adaptPrompt, setVideoToImagePrompt: setAdaptPrompt } = useAppStore();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<ExtractedFrame | null>(null);
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  
  const [adaptedImageUrl, setAdaptedImageUrl] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const v = await getFile('videoToImageVideo');
      if (v) {
        setVideoUrl(`data:${v.mimeType};base64,${v.data}`);
        // We can't easily recreate a File object from base64 synchronously, 
        // but we can create a blob and set it as videoFile if needed, 
        // or just rely on videoUrl for playback.
        const res = await fetch(`data:${v.mimeType};base64,${v.data}`);
        const blob = await res.blob();
        setVideoFile(new File([blob], "video.mp4", { type: v.mimeType }));
      }
      const f = await getFile('videoToImageFrames');
      if (f) {
        setFrames(JSON.parse(f.data));
      }
      const s = await getFile('videoToImageSelectedFrame');
      if (s) {
        setSelectedFrame(JSON.parse(s.data));
      }
      const a = await getFile('videoToImageAdaptedImage');
      if (a) {
        setAdaptedImageUrl(`data:${a.mimeType};base64,${a.data}`);
      }
    };
    loadData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setFrames([]);
      setSelectedFrame(null);
      setAdaptedImageUrl(null);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        await saveFile('videoToImageVideo', base64String, file.type);
        await deleteFile('videoToImageFrames');
        await deleteFile('videoToImageSelectedFrame');
        await deleteFile('videoToImageAdaptedImage');
      };
      reader.readAsDataURL(file);
    } else if (file) {
      setError("Please upload a valid video file.");
    }
  };

  const extractFrames = async () => {
    if (!videoRef.current || !canvasRef.current || !videoFile) return;
    
    setIsExtracting(true);
    setError(null);
    setFrames([]);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setError("Canvas context not available");
      setIsExtracting(false);
      return;
    }

    try {
      // Simulate PySceneDetect / OpenCV by extracting frames at intervals
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        throw new Error("Video duration not available yet. Please try again in a moment.");
      }

      const frameCount = 6; // Extract 6 keyframes
      const interval = duration / (frameCount + 1);
      const newFrames: ExtractedFrame[] = [];

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      for (let i = 1; i <= frameCount; i++) {
        const time = interval * i;
        video.currentTime = time;
        
        // Wait for the video to seek to the new time
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        
        newFrames.push({
          id: `frame-${i}-${Date.now()}`,
          time,
          dataUrl,
          base64,
          mimeType: 'image/jpeg'
        });
      }

      setFrames(newFrames);
      await saveFile('videoToImageFrames', JSON.stringify(newFrames), 'application/json');
      if (newFrames.length > 0) {
        setSelectedFrame(newFrames[0]);
        await saveFile('videoToImageSelectedFrame', JSON.stringify(newFrames[0]), 'application/json');
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to extract frames.");
    } finally {
      setIsExtracting(false);
      // Reset video to start
      video.currentTime = 0;
    }
  };

  const analyzeFrame = async (frame: ExtractedFrame) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key is missing.");

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: frame.base64,
              mimeType: frame.mimeType
            }
          },
          "Analyze this extracted video frame. Describe the subjects, setting, lighting, motion blur, and any notable objects. Focus on details useful for video editing or image-to-video generation."
        ]
      });

      const updatedFrames = frames.map(f => 
        f.id === frame.id ? { ...f, analysis: response.text } : f
      );
      setFrames(updatedFrames);
      await saveFile('videoToImageFrames', JSON.stringify(updatedFrames), 'application/json');
      if (selectedFrame?.id === frame.id) {
        const updatedSelected = { ...frame, analysis: response.text };
        setSelectedFrame(updatedSelected);
        await saveFile('videoToImageSelectedFrame', JSON.stringify(updatedSelected), 'application/json');
      }
      
      // Auto-fill adapt prompt based on analysis
      if (response.text && !adaptPrompt) {
        // Extract a short summary for the prompt
        const summary = response.text.split('.')[0] + '.';
        setAdaptPrompt(`Enhance this scene: ${summary}`);
      }
      
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "Failed to analyze frame.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const adaptFrame = async () => {
    if (!selectedFrame) return;
    
    setIsAdapting(true);
    setError(null);
    setAdaptedImageUrl(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Image-to-Image using Gemini Image
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: selectedFrame.base64,
                mimeType: selectedFrame.mimeType
              }
            },
            { text: adaptPrompt || "Enhance and stylize this image, high quality, cinematic lighting." }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            const data = part.inlineData.data;
            const imageUrl = `data:${mimeType};base64,${data}`;
            setAdaptedImageUrl(imageUrl);
            await saveFile('videoToImageAdaptedImage', data, mimeType);
            foundImage = true;
            break;
          }
        }
      }
      if (!foundImage) throw new Error("No image was returned by the model.");

    } catch (err: any) {
      console.error("Adaptation error:", err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsAdapting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl md:text-4xl font-light tracking-tight">Video-to-Image Studio</h2>
        <p className="text-white/50 max-w-2xl mx-auto">
          Analyze, ingest, and adapt. Extract keyframes from video, analyze scenes with Gemini Pro, and synthesize new images or videos using advanced diffusion models.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Ingest */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">1</div>
            <div>
              <h3 className="font-medium">Ingest & Extract</h3>
              <p className="text-xs text-white/50">OpenCV / PySceneDetect simulation</p>
            </div>
          </div>

          {!videoUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
            >
              <Upload className="w-8 h-8 text-white/40 mb-3" />
              <p className="font-medium text-white/80">Upload Video</p>
              <p className="text-xs text-white/40 mt-1">MP4, WebM, MOV</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video 
                  ref={videoRef} 
                  src={videoUrl} 
                  className="w-full h-full object-contain"
                  controls
                  crossOrigin="anonymous"
                />
              </div>
              <button
                onClick={extractFrames}
                disabled={isExtracting}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                {isExtracting ? 'Extracting Keyframes...' : 'Extract Keyframes'}
              </button>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*"
            className="hidden" 
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Step 2: Analyze */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">2</div>
            <div>
              <h3 className="font-medium">Analyze Scene</h3>
              <p className="text-xs text-white/50">Gemini 3.1 Pro Vision</p>
            </div>
          </div>

          {frames.length > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {frames.map((frame, idx) => (
                  <button
                    key={frame.id}
                    onClick={() => setSelectedFrame(frame)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedFrame?.id === frame.id ? 'border-green-400 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  >
                    <img src={frame.dataUrl} alt={`Frame ${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-center py-0.5">
                      {frame.time.toFixed(1)}s
                    </div>
                  </button>
                ))}
              </div>

              {selectedFrame && (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-white/10">
                    <img src={selectedFrame.dataUrl} alt="Selected Frame" className="w-full h-full object-contain bg-black/50" />
                  </div>
                  
                  <button
                    onClick={() => analyzeFrame(selectedFrame)}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {isAnalyzing ? 'Analyzing Frame...' : 'Analyze Frame Details'}
                  </button>

                  {selectedFrame.analysis && (
                    <div className="p-3 bg-black/30 rounded-lg text-sm text-white/80 max-h-40 overflow-y-auto custom-scrollbar leading-relaxed">
                      {selectedFrame.analysis}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-white/30 text-center px-4">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Extract frames first to analyze scenes.</p>
            </div>
          )}
        </div>

        {/* Step 3: Adapt */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">3</div>
            <div>
              <h3 className="font-medium">Adapt & Synthesize</h3>
              <p className="text-xs text-white/50">Diffusers / I2V Adapters</p>
            </div>
          </div>

          {selectedFrame ? (
            <div className="space-y-4">
              <textarea
                value={adaptPrompt}
                onChange={(e) => setAdaptPrompt(e.target.value)}
                placeholder="Describe how to adapt this frame (e.g., 'Make it cyberpunk style', 'Add cinematic motion')..."
                className="w-full h-20 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              />

              <button
                onClick={adaptFrame}
                disabled={isAdapting}
                className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdapting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isAdapting ? 'Synthesizing...' : 'Generate Image'}
              </button>

              {adaptedImageUrl && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Result</p>
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-purple-500/30 bg-black/50">
                    <img src={adaptedImageUrl} alt="Adapted" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-white/30 text-center px-4">
              <Wand2 className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Select a frame to adapt and synthesize new media.</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
