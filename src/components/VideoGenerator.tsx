import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { HfInference } from '@huggingface/inference';
import { Upload, Video, Loader2, AlertCircle, X, Wand2, Download, Film, Settings2, Cloud, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '../store';
import { saveFile, getFile, deleteFile } from '../lib/db';
import { ReferenceVideoHub } from './ReferenceVideoHub';
import { ContentResultModal } from './ContentResultModal';

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
    videoDuration: duration, setVideoDuration: setDuration,
    incrementSpend
  } = useAppStore();

  const [generatorTab, setGeneratorTab] = useState<'hub' | 'cloud'>('cloud');
  const [inputMode, setInputMode] = useState<'image' | 'video' | 'multi-image'>('image');
  const [baseImage, setBaseImage] = useState<FrameData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<FrameData | null>(null);
  const [referenceVideo, setReferenceVideo] = useState<FrameData | null>(null);
  const [multiImages, setMultiImages] = useState<(FrameData | null)[]>([null, null, null]);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingSlot, setIsDraggingSlot] = useState<[boolean, boolean, boolean]>([false, false, false]);

  const slot0InputRef = useRef<HTMLInputElement>(null);
  const slot1InputRef = useRef<HTMLInputElement>(null);
  const slot2InputRef = useRef<HTMLInputElement>(null);
  const multiInputRefs = [slot0InputRef, slot1InputRef, slot2InputRef];
  
  const handleDropStart = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingStart(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
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
    }
  };

  const handleDropEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingEnd(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
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
    }
  };

  const handleDropVideo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm'))) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        setReferenceVideo({
          data: base64String,
          mimeType: file.type || 'video/mp4',
          url: URL.createObjectURL(file)
        });
        await saveFile('videoGeneratorRefVideo', base64String, file.type || 'video/mp4');
      };
      reader.readAsDataURL(file);
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endFileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadAssets = async () => {
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
      const refVideo = await getFile('videoGeneratorRefVideo');
      if (refVideo) {
        try {
          const byteCharacters = atob(refVideo.data);
          const byteArrays = [];
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          const videoBlob = new Blob(byteArrays, { type: refVideo.mimeType });
          setReferenceVideo({
            data: refVideo.data,
            mimeType: refVideo.mimeType,
            url: URL.createObjectURL(videoBlob)
          });
        } catch (e) {
          console.error("Failed to convert saved reference video", e);
        }
      }
      const m0 = await getFile('videoGeneratorMultiImage_0');
      const m1 = await getFile('videoGeneratorMultiImage_1');
      const m2 = await getFile('videoGeneratorMultiImage_2');
      setMultiImages([
        m0 ? { data: m0.data, mimeType: m0.mimeType, url: `data:${m0.mimeType};base64,${m0.data}` } : null,
        m1 ? { data: m1.data, mimeType: m1.mimeType, url: `data:${m1.mimeType};base64,${m1.data}` } : null,
        m2 ? { data: m2.data, mimeType: m2.mimeType, url: `data:${m2.mimeType};base64,${m2.data}` } : null,
      ]);
    };
    loadAssets();
  }, []);

  useEffect(() => {
    if (model === 'veo-2.0-generate-preview' && resolution === '4k') {
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

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      setReferenceVideo({
        data: base64String,
        mimeType: file.type || 'video/mp4',
        url: URL.createObjectURL(file)
      });
      await saveFile('videoGeneratorRefVideo', base64String, file.type || 'video/mp4');
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

  const clearReferenceVideo = async () => {
    setReferenceVideo(null);
    await deleteFile('videoGeneratorRefVideo');
  };

  const clearMultiImage = async (index: number) => {
    const next = [...multiImages];
    next[index] = null;
    setMultiImages(next);
    await deleteFile(`videoGeneratorMultiImage_${index}`);
  };

  const handleMultiImageFileUpload = (index: number, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const next = [...multiImages];
      next[index] = {
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      };
      setMultiImages(next);
      await saveFile(`videoGeneratorMultiImage_${index}`, base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDropMultiImage = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const nextDragging = [...isDraggingSlot] as [boolean, boolean, boolean];
    nextDragging[index] = false;
    setIsDraggingSlot(nextDragging);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleMultiImageFileUpload(index, file);
    }
  };

  const cancelGeneration = async () => {
    setIsGenerating(false);
    setLoadingMessage('Cancelled');
  };

  const handleGenerateVideo = async () => {
    if (inputMode === 'image' && !baseImage) {
      setError("Please upload an initial image frame.");
      return;
    }
    if (inputMode === 'video' && !referenceVideo) {
      setError("Please upload a reference video.");
      return;
    }
    if (inputMode === 'multi-image') {
      const activeImages = multiImages.filter(Boolean);
      if (activeImages.length === 0) {
        setError("Please upload at least one storyboard reference image.");
        return;
      }
      if (!prompt) {
        setError("A text prompt is required for storyboard generation to explain how to synthesize the references.");
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setLoadingMessage('Initializing cloud connection...');

    try {
      if (model === 'tencent/HunyuanVideo-I2V') {
        if (inputMode === 'video') {
          throw new Error("HunyuanVideo does not support Video-to-Video generation. Please select a Google Veo model under Advanced Options.");
        }
        if (inputMode === 'multi-image') {
          throw new Error("HunyuanVideo does not support multi-reference storyboard generation. Please select a Google Veo model under Advanced Options.");
        }
        
        const hfToken = process.env.HF_TOKEN;
        if (!hfToken) {
          throw new Error("HF_TOKEN is missing. Please add your Hugging Face token to the environment variables.");
        }
        
        const hf = new HfInference(hfToken);

        setLoadingMessage('Submitting image to HunyuanVideo...');
        
        // Convert base64 to Blob
        const byteCharacters = atob(baseImage!.data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        const imageBlob = new Blob(byteArrays, { type: baseImage!.mimeType });

        setLoadingMessage('Rendering video frames (this usually takes a few minutes)...');

        const generatedBlob = await hf.imageToVideo({
          model: 'tencent/HunyuanVideo-I2V',
          inputs: imageBlob,
          parameters: {
            prompt: prompt || undefined
          }
        });

        setLoadingMessage('Finalizing video file...');

        const arrayBuffer = await generatedBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64Data = btoa(binary);
        const mimeType = generatedBlob.type || 'video/mp4';
        
        const videoObjectUrl = URL.createObjectURL(generatedBlob);
        setVideoUrl(videoObjectUrl);
        setIsResultModalOpen(true);
        
        await saveFile('videoGeneratorGeneratedVideo', base64Data, mimeType);
        incrementSpend(0.05, 'video_gen', 'HunyuanVideo-I2V', prompt ? `Prompt: ${prompt.substring(0, 30)}...` : undefined);

      } else {
        // Veo Model
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY is missing. Please add your Gemini API key to the environment variables.");
        }
        
        const ai = new GoogleGenAI({ apiKey });

        setLoadingMessage(
          inputMode === 'video' 
            ? 'Submitting reference video to Veo...' 
            : inputMode === 'multi-image'
              ? 'Submitting reference storyboard to Veo...'
              : 'Submitting image to Veo...'
        );
        
        let operation;
        if (inputMode === 'video') {
          operation = await ai.models.generateVideos({
            model: model,
            prompt: prompt || 'A cinematic video based on the provided reference video',
            video: {
              videoBytes: referenceVideo!.data,
              mimeType: referenceVideo!.mimeType,
            },
            config: {
              numberOfVideos: 1,
              resolution: resolution,
              aspectRatio: aspectRatio
            }
          });
        } else if (inputMode === 'multi-image') {
          const referenceImagesPayload: any[] = [];
          for (const img of multiImages) {
            if (img) {
              referenceImagesPayload.push({
                image: {
                  imageBytes: img.data,
                  mimeType: img.mimeType,
                },
                referenceType: 'ASSET'
              });
            }
          }
          operation = await ai.models.generateVideos({
            model: model,
            prompt: prompt, // prompt is required and validated above
            config: {
              numberOfVideos: 1,
              referenceImages: referenceImagesPayload,
              resolution: resolution,
              aspectRatio: aspectRatio
            }
          });
        } else {
          const configParams: any = {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: aspectRatio
          };

          if (endImage) {
            configParams.lastFrame = {
              imageBytes: endImage.data,
              mimeType: endImage.mimeType,
            };
          }

          operation = await ai.models.generateVideos({
            model: model,
            prompt: prompt || 'A cinematic video based on the provided image',
            image: {
              imageBytes: baseImage!.data,
              mimeType: baseImage!.mimeType,
            },
            config: configParams
          });
        }

        setLoadingMessage('Rendering video frames (this usually takes a few minutes)...');

        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
          throw new Error("Failed to get video download link from Veo.");
        }

        setLoadingMessage('Downloading generated video...');

        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const videoBlob = await response.blob();
        
        setLoadingMessage('Finalizing video file...');

        const arrayBuffer = await videoBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64Data = btoa(binary);
        const mimeType = videoBlob.type || 'video/mp4';
        
        const videoObjectUrl = URL.createObjectURL(videoBlob);
        setVideoUrl(videoObjectUrl);
        setIsResultModalOpen(true);
        
        await saveFile('videoGeneratorGeneratedVideo', base64Data, mimeType);
        incrementSpend(0.20, 'video_gen', model, prompt ? `Prompt: ${prompt.substring(0, 30)}...` : undefined);
      }

    } catch (err: any) {
      console.error("Video generation error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("unauthorized") || errorMessage.includes("invalid token")) {
          setError("Invalid Hugging Face token. Please check your HF_TOKEN.");
      } else if (errorMessage.includes("model is loading")) {
          setError("The model is currently loading on Hugging Face. Please try again in a few seconds.");
      } else if (errorMessage.includes("payment required") || errorMessage.includes("402") || errorMessage.includes("billing") || errorMessage.includes("pre-paid credits")) {
          setError("Hugging Face requires pre-paid credits to use HunyuanVideo via fal-ai. Please use Google Veo instead.");
      } else if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota") || errorMessage.includes("spending cap") || errorMessage.includes("429")) {
          setError("Your AI Studio project has exceeded its monthly spending cap. Please go to https://ai.studio/spend to manage your project spend cap.");
      } else {
          setError(err.message || "An unexpected error occurred during video generation.");
      }
    } finally {
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Premium Segmented Switcher */}
      <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl max-w-lg mx-auto relative z-20 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setGeneratorTab('hub')}
          className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            generatorTab === 'hub'
              ? 'bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] text-white shadow-lg shadow-[#ff4e00]/20 scale-[1.02]'
              : 'text-white/50 border border-transparent hover:text-white/80'
          }`}
        >
          <Film className="w-4 h-4" />
          Reference Models Hub
        </button>
        <button
          onClick={() => setGeneratorTab('cloud')}
          className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
            generatorTab === 'cloud'
              ? 'bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] text-white shadow-lg shadow-[#ff4e00]/20 scale-[1.02]'
              : 'text-white/50 border border-transparent hover:text-white/80'
          }`}
        >
          <Cloud className="w-4 h-4" />
          Cloud AI Generator
        </button>
      </div>

      {generatorTab === 'hub' ? (
        <div className="animate-in fade-in duration-300">
          <ReferenceVideoHub />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in duration-300">
          <div className="md:col-span-12 p-6 bg-gradient-to-br from-[#ff4e00]/10 via-black/40 to-black border border-[#ff4e00]/20 rounded-2xl space-y-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4e00]/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-lg text-[#ff7d00]">
                <Video className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-wide">Reference Image- & Video-to-Video Synthesizer</h3>
                <p className="text-xs text-white/50 mt-0.5">Convert static pictures or reference videos into gorgeous, high-fidelity cinematic video loops utilizing Cloud AI models.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff4e00] text-black text-[10px] font-extrabold shrink-0">1</span>
                <div>
                  <h4 className="text-xs font-bold text-white/90">Input Mode</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Choose Image or Video mode below.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white/60 text-[10px] font-extrabold shrink-0">2</span>
                <div>
                  <h4 className="text-xs font-bold text-white/90">Source Asset</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Upload starting frame or reference video.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white/60 text-[10px] font-extrabold shrink-0">3</span>
                <div>
                  <h4 className="text-xs font-bold text-white/90">Describe Motion</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Write how you want the scene to animate.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ff4e00] text-black text-[10px] font-extrabold shrink-0">4</span>
                <div>
                  <h4 className="text-xs font-bold text-white/90">Synthesize</h4>
                  <p className="text-[10px] text-white/40 mt-0.5">Hit 'Generate' to run Veo 2.0 or Hunyuan.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 space-y-6">
            {/* Input Mode Selector Tab */}
            <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex flex-wrap sm:flex-nowrap gap-1 z-10 relative">
              <button
                type="button"
                onClick={() => {
                  setInputMode('image');
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${inputMode === 'image' ? 'bg-[#ff4e00] text-black shadow' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                🖼️ Single Image Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('video');
                  if (model === 'tencent/HunyuanVideo-I2V') {
                    setModel('veo-2.0-generate-preview');
                  }
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${inputMode === 'video' ? 'bg-[#ff4e00] text-black shadow' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                🎥 Video-to-Video Mode
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('multi-image');
                  setAspectRatio('16:9');
                  setResolution('720p');
                  if (model === 'tencent/HunyuanVideo-I2V') {
                    setModel('veo-2.0-generate-preview');
                  }
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${inputMode === 'multi-image' ? 'bg-[#ff4e00] text-black shadow' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                🎴 Multi-Image Storyboard
              </button>
            </div>

            {/* Conditionally Render Inputs based on mode */}
            {inputMode === 'image' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wider block">Reference Image (Start)</label>
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingStart(true); }}
                    onDragLeave={() => setIsDraggingStart(false)}
                    onDrop={handleDropStart}
                    className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-all ${
                      baseImage 
                        ? 'border-white/20 bg-black/20' 
                        : isDraggingStart
                          ? 'border-[#ff7d00] bg-[#ff4e00]/10 shadow-lg shadow-[#ff4e00]/10 scale-[1.01]'
                          : 'border-white/15 hover:border-white/30 hover:bg-white/5 bg-white/5'
                    }`}
                  >
                    {baseImage ? (
                      <>
                        <img src={baseImage.url} alt="Base frame" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button 
                            onClick={clearBaseImage}
                            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors border border-white/10 cursor-pointer"
                            title="Clear frame"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className={`p-2.5 rounded-full bg-white/5 border border-white/10 mb-2 transition-all ${isDraggingStart ? 'scale-110 bg-[#ff4e00]/20 border-[#ff4e00]/40 text-[#ff7d00]' : 'text-white/40'}`}>
                          <Upload className="w-5 h-5 animate-pulse text-[#ff7d00]" />
                        </div>
                        <span className="text-xs font-semibold text-white/90 text-center">
                          {isDraggingStart ? 'Drop initial image!' : 'Drag & drop Reference Image (Start)'}
                        </span>
                        <span className="text-[10px] text-white/40 text-center mt-0.5">
                          or click to upload (JPG, PNG)
                        </span>
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
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wider block">Reference Image (End - Optional)</label>
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingEnd(true); }}
                    onDragLeave={() => setIsDraggingEnd(false)}
                    onDrop={handleDropEnd}
                    className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-all ${
                      endImage 
                        ? 'border-white/20 bg-black/20' 
                        : isDraggingEnd
                          ? 'border-[#ff7d00] bg-[#ff4e00]/10 shadow-lg shadow-[#ff4e00]/10 scale-[1.01]'
                          : 'border-white/15 hover:border-white/30 hover:bg-white/5 bg-white/5'
                    }`}
                  >
                    {endImage ? (
                      <>
                        <img src={endImage.url} alt="End frame" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button 
                            onClick={clearEndImage}
                            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors border border-white/10 cursor-pointer"
                            title="Clear frame"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4"
                        onClick={() => endFileInputRef.current?.click()}
                      >
                        <div className={`p-2.5 rounded-full bg-white/5 border border-white/10 mb-2 transition-all ${isDraggingEnd ? 'scale-110 bg-[#ff4e00]/20 border-[#ff4e00]/40 text-[#ff7d00]' : 'text-white/40'}`}>
                          <Upload className="w-5 h-5 animate-pulse text-[#ff7d00]" />
                        </div>
                        <span className="text-xs font-semibold text-white/90 text-center">
                          {isDraggingEnd ? 'Drop end image!' : 'Drag & drop Reference Image (End - Optional)'}
                        </span>
                        <span className="text-[10px] text-white/40 text-center mt-0.5">
                          or click to upload (JPG, PNG)
                        </span>
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
            ) : inputMode === 'video' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white/70 uppercase tracking-wider block">Reference Video Input</label>
                  <span className="text-[10px] font-semibold text-[#ff7d00] bg-[#ff4e00]/10 px-2 py-0.5 rounded border border-[#ff4e00]/20">VEO 2.0 / 3.1 ONLY</span>
                </div>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingVideo(true); }}
                  onDragLeave={() => setIsDraggingVideo(false)}
                  onDrop={handleDropVideo}
                  className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-all ${
                    referenceVideo 
                      ? 'border-white/20 bg-black/20' 
                      : isDraggingVideo
                        ? 'border-[#ff7d00] bg-[#ff4e00]/10 shadow-lg shadow-[#ff4e00]/10 scale-[1.01]'
                        : 'border-white/15 hover:border-white/30 hover:bg-white/5 bg-white/5'
                  }`}
                >
                  {referenceVideo ? (
                    <>
                      <video 
                        src={referenceVideo.url} 
                        controls 
                        className="w-full h-full object-contain bg-black/40" 
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button 
                          onClick={clearReferenceVideo}
                          className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors border border-white/10 cursor-pointer"
                          title="Clear video"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div 
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <div className={`p-2.5 rounded-full bg-white/5 border border-white/10 mb-2 transition-all ${isDraggingVideo ? 'scale-110 bg-[#ff4e00]/20 border-[#ff4e00]/40 text-[#ff7d00]' : 'text-white/40'}`}>
                        <Upload className="w-5 h-5 animate-pulse text-[#ff7d00]" />
                      </div>
                      <span className="text-xs font-semibold text-white/90 text-center">
                        {isDraggingVideo ? 'Drop reference video!' : 'Drag & drop Reference Video'}
                      </span>
                      <span className="text-[10px] text-white/40 text-center mt-0.5">
                        or click to upload (MP4, WebM)
                      </span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={videoInputRef} 
                    className="hidden" 
                    accept="video/mp4,video/webm,video/*"
                    onChange={handleVideoFileUpload}
                  />
                </div>
                <p className="text-[11px] text-white/40 leading-normal">
                  Upload a reference video to guide Google Veo's generation. The AI will analyze the motion dynamics, structures, or visual flow of your input to construct a beautifully aligned and refined new video.
                </p>
              </div>
            ) : (
              // Multi-Image Storyboard Mode
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div>
                    <label className="text-sm font-semibold text-white/80 uppercase tracking-wider block">Multi-Image Reference Storyboard</label>
                    <span className="text-[10px] text-white/40">Provide up to 3 references (subject, environment, and style presets) to compose a custom scene.</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#ff7d00] bg-[#ff4e00]/10 px-2 py-0.5 rounded border border-[#ff4e00]/20 shrink-0">VEO ONLY</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "1. Subject / Character", label: "Guides character/main object" },
                    { title: "2. Environment", label: "Guides scenery/background" },
                    { title: "3. Concept / Style", label: "Guides theme/preset/style" }
                  ].map((slot, index) => {
                    const img = multiImages[index];
                    const isDragging = isDraggingSlot[index];
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-white/90">{slot.title}</span>
                          <span className="text-[9px] text-white/40 leading-none mt-0.5">{slot.label}</span>
                        </div>
                        <div 
                          onDragOver={(e) => { e.preventDefault(); const d = [...isDraggingSlot] as [boolean, boolean, boolean]; d[index] = true; setIsDraggingSlot(d); }}
                          onDragLeave={() => { const d = [...isDraggingSlot] as [boolean, boolean, boolean]; d[index] = false; setIsDraggingSlot(d); }}
                          onDrop={(e) => handleDropMultiImage(e, index)}
                          className={`relative aspect-square rounded-xl border-2 border-dashed overflow-hidden transition-all ${
                            img 
                              ? 'border-white/20 bg-black/20' 
                              : isDragging
                                ? 'border-[#ff7d00] bg-[#ff4e00]/10 shadow-lg shadow-[#ff4e00]/10 scale-[1.01]'
                                : 'border-white/15 hover:border-white/30 hover:bg-white/5 bg-white/5'
                          }`}
                        >
                          {img ? (
                            <>
                              <img src={img.url} alt={`Slot ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute top-1.5 right-1.5 flex gap-1.5">
                                <button 
                                  onClick={() => clearMultiImage(index)}
                                  className="p-1 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors border border-white/10 cursor-pointer"
                                  title="Clear"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div 
                              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-3"
                              onClick={() => multiInputRefs[index].current?.click()}
                            >
                              <Upload className="w-4 h-4 text-[#ff7d00] mb-1.5 opacity-80" />
                              <span className="text-[10px] font-medium text-white/80 text-center leading-tight">
                                {isDragging ? 'Drop Image!' : 'Upload Image'}
                              </span>
                              <span className="text-[8px] text-white/30 text-center mt-0.5">
                                JPG, PNG
                              </span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            ref={multiInputRefs[index]} 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleMultiImageFileUpload(index, file);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-[#ff4e00]/5 border border-[#ff4e00]/15 rounded-xl text-[11px] text-white/60 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#ff7d00] shrink-0 mt-0.5" />
                  <p>
                    Compose a complex video scene using different elements as source references. The AI uses advanced semantic mapping to merge your provided references harmoniously.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                Motion Prompt {inputMode === 'multi-image' && <span className="text-[10px] text-[#ff7d00] lowercase font-normal">*(Required for Storyboard)</span>}
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  inputMode === 'video' 
                    ? "Describe instructions to modify or extend the reference video (e.g., 'Make it look cinematic, high dynamic range, soft focus')" 
                    : inputMode === 'multi-image'
                      ? "Explain how the storyboard references combine. (e.g., 'A video of the character from Slot 1 standing in the snowy forest from Slot 2 holding the glowing artifact from Slot 3.')"
                      : "Describe how the image should animate (e.g., 'Camera pans slowly to the right, gentle wind blowing the trees...')"
                }
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
                      onClick={() => setModel('veo-2.0-generate-preview')}
                      className={`p-2 text-xs rounded-lg border text-center transition-all ${model === 'veo-2.0-generate-preview' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                    >
                      Google Veo 2.0 (Fast)
                    </button>
                    <button
                      onClick={() => setModel('tencent/HunyuanVideo-I2V')}
                      disabled={inputMode === 'video' || inputMode === 'multi-image'}
                      className={`p-2 text-xs rounded-lg border text-center transition-all ${model === 'tencent/HunyuanVideo-I2V' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                      title={inputMode === 'video' || inputMode === 'multi-image' ? "Hunyuan only supports Single Image-to-Video Mode" : ""}
                    >
                      HunyuanVideo (HF Cloud)
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
                      disabled={inputMode === 'multi-image'}
                      className={`p-2 text-xs rounded-lg border text-center transition-all ${resolution === '1080p' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                      title={inputMode === 'multi-image' ? "Multi-reference composition requires 720p" : ""}
                    >
                      1080p
                    </button>
                    <button
                      onClick={() => setResolution('4k')}
                      disabled={model === 'veo-2.0-generate-preview' || inputMode === 'multi-image'}
                      className={`p-2 text-xs rounded-lg border text-center transition-all ${resolution === '4k' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                      title={model === 'veo-2.0-generate-preview' ? "4k requires Veo Pro" : inputMode === 'multi-image' ? "Multi-reference composition requires 720p" : ""}
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
                      disabled={inputMode === 'multi-image'}
                      className={`p-2 text-xs rounded-lg border text-center transition-all ${aspectRatio === '9:16' ? 'bg-white/20 border-white/50 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                      title={inputMode === 'multi-image' ? "Multi-reference composition requires 16:9" : ""}
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

            {isGenerating ? (
              <button
                onClick={cancelGeneration}
                className="w-full py-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel Generation
              </button>
            ) : (
              <button
                onClick={handleGenerateVideo}
                disabled={
                  inputMode === 'image' 
                    ? !baseImage 
                    : inputMode === 'video' 
                      ? !referenceVideo 
                      : (!multiImages.some(Boolean) || !prompt)
                }
                className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="w-5 h-5" />
                Generate Video
              </button>
            )}
          </div>

          <div className="md:col-span-5 space-y-4">
            <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Output Video</label>
            <div className={`relative ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] w-full'} rounded-2xl overflow-hidden border border-white/10 bg-black/50 flex items-center justify-center`}>
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
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setIsResultModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff4e00]/20 hover:bg-[#ff4e00]/30 border border-[#ff4e00]/40 rounded-lg text-sm text-[#ff7d00] transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Review & Share
                </button>
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
      )}

      <ContentResultModal 
        isOpen={isResultModalOpen} 
        onClose={() => setIsResultModalOpen(false)} 
        type="video" 
        title="Generated AI Video" 
        contentUrl={videoUrl} 
        mimeType="video/mp4"
        prompt={prompt}
        metadata={{
          model: model === 'veo-2.0-generate-preview' ? 'Google Veo 2.0' : 'HunyuanVideo (HF Cloud)',
          resolution,
          aspectRatio,
          duration
        }}
      />
    </div>
  );
}
