import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Video, Loader2, AlertCircle, X, Wand2, Download, Film, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../store';
import { saveFile, getFile, deleteFile } from '../lib/db';

interface FrameData {
  data: string;
  mimeType: string;
  url: string;
}

export function VideoGenerator() {
  const {
    videoPrompt: prompt, setVideoPrompt: setPrompt,
    videoAspectRatio: aspectRatio, setVideoAspectRatio: setAspectRatio,
    videoModel: model, setVideoModel: setModel,
    videoResolution: resolution, setVideoResolution: setResolution,
    videoDuration: duration, setVideoDuration: setDuration
  } = useAppStore();

  const [baseImage, setBaseImage] = useState<FrameData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<FrameData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadImages = async () => {
      const base = await getFile('videoGeneratorBaseImage');
      if (base) {
        setBaseImage({
          data: base.data,
          mimeType: base.mimeType,
          url: `data:${base.mimeType};base64,${base.data}`
        });
      }
      const end = await getFile('videoGeneratorEndImage');
      if (end) {
        setEndImage({
          data: end.data,
          mimeType: end.mimeType,
          url: `data:${end.mimeType};base64,${end.data}`
        });
      }
    };
    loadImages();
  }, []);

  useEffect(() => {
    if (model === 'veo-3.1-lite-generate-preview' && resolution === '4k') {
      setResolution('1080p');
    }
  }, [model, resolution, setResolution]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      setBaseImage({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
      await saveFile('videoGeneratorBaseImage', base64String, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEndFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      setEndImage({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
      await saveFile('videoGeneratorEndImage', base64String, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearBaseImage = async () => {
    setBaseImage(null);
    await deleteFile('videoGeneratorBaseImage');
  };

  const clearEndImage = async () => {
    setEndImage(null);
    await deleteFile('videoGeneratorEndImage');
  };

  const handleGenerateVideo = async () => {
    if (!baseImage) {
      setError("Please upload an initial image frame.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage('Checking API key permissions...');

    try {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }

      // Re-read the API key after potential selection
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("Paid API Key is not set. Please select an API key to use Veo.");
      }
      
      const ai = new GoogleGenAI({ apiKey });

      setLoadingMessage('Submitting image to Veo...');
      
      const payload: any = {
        model: model,
        prompt: (prompt || 'A cinematic, high-quality video animation of the provided image, smooth motion.') + ` (Duration: ${duration} seconds)`,
        image: {
          imageBytes: baseImage.data,
          mimeType: baseImage.mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio,
          durationSeconds: duration
        }
      };

      if (endImage) {
        payload.config.lastFrame = {
          imageBytes: endImage.data,
          mimeType: endImage.mimeType,
        };
      }

      let operation = await ai.models.generateVideos(payload);

      setLoadingMessage('Rendering video frames (this usually takes a few minutes)...');

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setLoadingMessage('Still rendering... Veo is processing the motion dynamics...');
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!downloadLink) {
        throw new Error("Video generation completed but no video URI was returned.");
      }

      setLoadingMessage('Fetching final video file...');

      // Fetch the video using the API key in the header
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      const videoBlob = await response.blob();
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      
      setVideoUrl(videoObjectUrl);

    } catch (err: any) {
      console.error("Video generation error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("requested entity was not found")) {
          setError("API key session expired or invalid. Please check your GEMINI_API_KEY.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap") || errorMessage.includes("entity was not found") || errorMessage.includes("403") || errorMessage.includes("permission")) {
          setError("You have exceeded your API quota or spending cap, or your API key does not have permission for this model. Please check your GEMINI_API_KEY.");
      } else if (errorMessage.includes("safety") || errorMessage.includes("policy") || errorMessage.includes("blocked")) {
          setError("The generated content was blocked by safety filters. Please try modifying your prompt or base image.");
      } else {
          setError(err.message || "An unexpected error occurred during video generation.");
      }
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Film className="w-5 h-5 text-[#ff4e00]" />
          <h3 className="text-lg font-medium">Image-to-Video Synthesis (Veo)</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Upload a single image and generate a high-quality video clip using Google's Veo model. 
          Similar to Stable Video Diffusion (SVD) or Sora, this adapts a static frame into dynamic motion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Start Frame</label>
              <div 
                className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-colors ${baseImage ? 'border-white/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
              >
                {baseImage ? (
                  <>
                    <img src={baseImage.url} alt="Base frame" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button 
                        onClick={clearBaseImage}
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
                    <Upload className="w-6 h-6 text-white/40 mb-2" />
                    <span className="text-xs text-white/50 text-center px-2">Upload Start</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 uppercase tracking-wider">End Frame (Optional)</label>
              <div 
                className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-colors ${endImage ? 'border-white/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
              >
                {endImage ? (
                  <>
                    <img src={endImage.url} alt="End frame" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button 
                        onClick={clearEndImage}
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
                    onClick={() => endFileInputRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 text-white/40 mb-2" />
                    <span className="text-xs text-white/50 text-center px-2">Upload End</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={endFileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleEndFileUpload}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Motion Prompt (Optional)</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how the image should animate (e.g., 'Camera pans slowly to the right, gentle wind blowing the trees...')"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all resize-none h-24"
            />
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-4 h-4 text-white/50" />
              <h4 className="text-sm font-medium text-white/70 uppercase tracking-wider">Advanced Options</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModel('veo-3.1-lite-generate-preview')}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${model === 'veo-3.1-lite-generate-preview' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    Veo Lite (Faster)
                  </button>
                  <button
                    onClick={() => setModel('veo-3.1-generate-preview')}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${model === 'veo-3.1-generate-preview' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    Veo Pro (Higher Quality)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Resolution</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setResolution('720p')}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${resolution === '720p' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    720p
                  </button>
                  <button
                    onClick={() => setResolution('1080p')}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${resolution === '1080p' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    1080p
                  </button>
                  <button
                    onClick={() => setResolution('4k')}
                    disabled={model === 'veo-3.1-lite-generate-preview'}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${resolution === '4k' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                    title={model === 'veo-3.1-lite-generate-preview' ? "4k requires Veo Pro" : ""}
                  >
                    4K
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${aspectRatio === '16:9' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    16:9 (Landscape)
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-2 text-xs rounded-lg border text-center transition-all ${aspectRatio === '9:16' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                  >
                    9:16 (Portrait)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-white/50">Duration</label>
                  <span className="text-xs text-white/70 font-mono">{duration}s</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="8" 
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-1">
                  <span>1s</span>
                  <span>8s</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerateVideo}
            disabled={isGenerating || !baseImage}
            className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Generate Video
              </>
            )}
          </button>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Output Video</label>
          <div className={`relative ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] w-2/3 mx-auto'} rounded-2xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center`}>
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                <p className="text-sm text-white/70 animate-pulse">{loadingMessage}</p>
              </div>
            ) : videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/30">
                <Film className="w-12 h-12 opacity-50" />
                <p className="text-sm">Generated video will appear here</p>
              </div>
            )}
          </div>
          
          {videoUrl && !isGenerating && (
            <div className="flex justify-center mt-4">
              <a 
                href={videoUrl} 
                download="generated-video.mp4"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Download MP4
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
