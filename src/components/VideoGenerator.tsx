import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, VideoJob } from '../lib/db';
import { 
  comfyuiAdapter 
} from '../lib/adapters/comfyuiAdapter';
import { 
  gradioAdapter 
} from '../lib/adapters/gradioAdapter';
import { 
  wan2gpAdapter 
} from '../lib/adapters/wan2gpAdapter';
import { 
  Upload, Video, Loader2, AlertCircle, X, Wand2, Download, Film, 
  Settings2, Sparkles, CheckCircle2, RotateCcw, Trash2, Play, 
  Pause, Link2, Info, ArrowRight, Database, HelpCircle, 
  Layers, Clock, FileVideo, PlusCircle, Check, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function VideoGenerator() {
  // Query all video jobs from IndexedDB, order descending by creation
  const jobs = useLiveQuery(() => db.videoJobs.orderBy('createdAt').reverse().toArray()) || [];

  // Active state / active job configuration
  const [activeTab, setActiveTab] = useState<'dispatcher' | 'queue' | 'gallery' | 'adapters'>('dispatcher');
  const [selectedJob, setSelectedJob] = useState<VideoJob | null>(null);
  
  // Create Job Form States
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState<number>(-1);
  const [model, setModel] = useState('Wan2.1-T2V-14B');
  const [resolution, setResolution] = useState('720p (1280x720)');
  const [duration, setDuration] = useState<number>(5); // Default 5s
  const [sourceImage, setSourceImage] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [selectedBackend, setSelectedBackend] = useState<'comfyui' | 'gradio' | 'wan2gp'>('wan2gp');
  
  // Custom states
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  
  // File input ref for source image
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Drag and drop image handlers
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload a valid image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSourceImage({
        data: base64String,
        mimeType: file.type,
        name: file.name
      });
      showNotification('Source image uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  // Submit Job to IndexedDB
  const handleCreateJob = async (status: 'draft' | 'queued') => {
    if (!prompt.trim()) {
      showNotification('Please provide a prompt description first', 'error');
      return;
    }

    const finalSeed = seed === -1 ? Math.floor(Math.random() * 10000000) : seed;

    try {
      const newJob: VideoJob = {
        prompt,
        seed: finalSeed,
        model,
        resolution,
        duration,
        sourceImageName: sourceImage ? sourceImage.name : undefined,
        sourceImageData: sourceImage ? sourceImage.data : undefined,
        sourceImageMimeType: sourceImage ? sourceImage.mimeType : undefined,
        status,
        progress: status === 'queued' ? 10 : 0,
        backendType: selectedBackend,
        createdAt: Date.now()
      };

      const newId = await db.videoJobs.add(newJob);
      
      showNotification(
        status === 'queued' 
          ? `Job #${newId} dispatched successfully with ${selectedBackend}!` 
          : `Job #${newId} saved as draft!`, 
        'success'
      );

      // If queued, let's trigger a nice local simulation transition to represent the lifecycle
      if (status === 'queued') {
        simulateJobLifecycle(Number(newId));
        setActiveTab('queue');
      } else {
        // Reset form for next draft
        setPrompt('');
        setSeed(-1);
        setSourceImage(null);
      }
    } catch (err: any) {
      showNotification(`Failed to save job: ${err.message}`, 'error');
    }
  };

  // Delete Job from db
  const handleDeleteJob = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await db.videoJobs.delete(id);
      showNotification('Job deleted from local storage');
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setPreviewVideoUrl(null);
      }
    } catch (err: any) {
      showNotification(`Could not delete job: ${err.message}`, 'error');
    }
  };

  // Reuse / Clone settings from an existing job
  const handleReuseSettings = (job: VideoJob, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPrompt(job.prompt);
    setSeed(job.seed);
    setModel(job.model);
    setResolution(job.resolution);
    setDuration(job.duration);
    setSelectedBackend(job.backendType);
    if (job.sourceImageData && job.sourceImageName && job.sourceImageMimeType) {
      setSourceImage({
        data: job.sourceImageData,
        name: job.sourceImageName,
        mimeType: job.sourceImageMimeType
      });
    } else {
      setSourceImage(null);
    }
    showNotification('Settings loaded into active dispatcher tab');
    setActiveTab('dispatcher');
  };

  // Select a job to view deep details or inspect media output
  const handleSelectJob = (job: VideoJob) => {
    setSelectedJob(job);
    if (job.outputVideoData) {
      // Decode base64 to video Blob url for HTML video playback
      try {
        const byteCharacters = atob(job.outputVideoData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: job.outputVideoMimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewVideoUrl(url);
      } catch (err) {
        console.error("Error creating object URL:", err);
        setPreviewVideoUrl(null);
      }
    } else {
      setPreviewVideoUrl(null);
    }
  };

  // Manual status advancement simulator for "boring, modular, working" control
  const handleForceStatusChange = async (jobId: number, nextStatus: 'draft' | 'queued' | 'running' | 'failed' | 'complete') => {
    try {
      const updates: Partial<VideoJob> = { status: nextStatus };
      if (nextStatus === 'running') {
        updates.progress = 40;
      } else if (nextStatus === 'complete') {
        updates.progress = 100;
        updates.completedAt = Date.now();
        // Generate a simulated base64 sample video so there is a real visual to preview
        updates.outputVideoData = await generateSampleVideoBase64(jobId);
        updates.outputVideoMimeType = 'video/webm';
        updates.outputVideoPath = `http://localhost:7860/outputs/local_job_${jobId}.mp4`;
      } else if (nextStatus === 'failed') {
        updates.progress = 100;
        updates.error = 'Inference out of memory (OOM). Model exceeded vRAM capabilities on local GPU device.';
        updates.completedAt = Date.now();
      } else if (nextStatus === 'queued') {
        updates.progress = 10;
      } else {
        updates.progress = 0;
      }

      await db.videoJobs.update(jobId, updates);
      
      // Refresh current open inspector if modified
      if (selectedJob && selectedJob.id === jobId) {
        const refreshed = await db.videoJobs.get(jobId);
        if (refreshed) {
          handleSelectJob(refreshed);
        }
      }
      
      showNotification(`Job status transitioned to: ${nextStatus}`);
    } catch (err: any) {
      showNotification(`Failed to transition status: ${err.message}`, 'error');
    }
  };

  // Async lifecycle simulator
  const simulateJobLifecycle = async (jobId: number) => {
    // Progressive update simulation so the UI acts real-time
    setTimeout(async () => {
      const job = await db.videoJobs.get(jobId);
      if (job && job.status === 'queued') {
        await db.videoJobs.update(jobId, { status: 'running', progress: 25 });
        
        setTimeout(async () => {
          const runningJob = await db.videoJobs.get(jobId);
          if (runningJob && runningJob.status === 'running') {
            await db.videoJobs.update(jobId, { progress: 65 });

            setTimeout(async () => {
              const completingJob = await db.videoJobs.get(jobId);
              if (completingJob && completingJob.status === 'running') {
                const sampleBase64 = await generateSampleVideoBase64(jobId);
                await db.videoJobs.update(jobId, {
                  status: 'complete',
                  progress: 100,
                  outputVideoData: sampleBase64,
                  outputVideoMimeType: 'video/webm',
                  outputVideoPath: `http://localhost:7860/outputs/local_job_${jobId}.mp4`,
                  completedAt: Date.now()
                });
                
                // If it's currently selected, refresh inspector
                if (selectedJob && selectedJob.id === jobId) {
                  const refreshed = await db.videoJobs.get(jobId);
                  if (refreshed) {
                    handleSelectJob(refreshed);
                  }
                }
                showNotification(`Job #${jobId} completed successfully!`);
              }
            }, 3000);
          }
        }, 3000);
      }
    }, 2000);
  };

  // Canvas-based client-side programmatic MP4/WebM generator
  const generateSampleVideoBase64 = (jobId: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext('2d')!;
      
      let stream: MediaStream;
      try {
        stream = canvas.captureStream(20);
      } catch (err) {
        resolve('');
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      };
      
      mediaRecorder.start();
      
      const startTime = Date.now();
      const duration = 3000; // 3 seconds preview
      let angle = 0;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) {
          mediaRecorder.stop();
          return;
        }
        
        // Deep local dark gradient background
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#09090b');
        grad.addColorStop(0.5, '#18181b');
        grad.addColorStop(1, '#ff4e0018');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Rotating tech circles
        ctx.strokeStyle = '#ff4e00';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff4e00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 45 + Math.sin(angle) * 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 20 - Math.cos(angle) * 5, 0, Math.PI * 2);
        ctx.stroke();

        // Display metadata watermark overlay
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px monospace';
        ctx.fillText(`LOCAL RECONSTRUCTION #${jobId}`, 15, 25);
        ctx.fillText(`TIME: ${(elapsed / 1000).toFixed(1)}s`, canvas.width - 85, 25);
        
        angle += 0.08;
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" id="local-video-controller">
      
      {/* Toast Notification HUD */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium border backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-rose-950/95 border-rose-800 text-rose-200'
                : notification.type === 'info'
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-zinc-900/95 border-emerald-800 text-emerald-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#ff4e00]" />
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern High-End Top Hero Header */}
      <div className="relative bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="absolute inset-0 bg-radial-gradient from-[#ff4e000f] via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-2xl text-[#ff4e00]">
              <Film className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                Video Generation Dashboard
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                LOCAL-FIRST WORKSPACE • OFFLINE PERSISTENT STORAGE
              </p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            Monitor, parameterize, and queue neural video generation jobs locally. Swap backend adapters such as ComfyUI, Gradio, or direct Wan2GP REST configurations effortlessly.
          </p>
        </div>

        {/* Local Storage Indicator Badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>IndexedDB Engine</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {jobs.length} total tasks preserved
          </span>
        </div>
      </div>

      {/* Dashboard Nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase flex items-center gap-2 ${
              activeTab === 'dispatcher'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-[#ff4e00]" />
            Dispatcher Form
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase flex items-center gap-2 relative ${
              activeTab === 'queue'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Queue ({jobs.filter(j => j.status === 'queued' || j.status === 'running').length})
            {jobs.filter(j => j.status === 'running').length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ff4e00] rounded-full animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase flex items-center gap-2 ${
              activeTab === 'gallery'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Output Gallery ({jobs.filter(j => j.status === 'complete').length})
          </button>

          <button
            onClick={() => setActiveTab('adapters')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase flex items-center gap-2 ${
              activeTab === 'adapters'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            Backend Adapters
          </button>
        </div>

        {/* Clear All Data Button */}
        {jobs.length > 0 && (
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to purge all local video jobs from database?")) {
                await db.videoJobs.clear();
                showNotification("Database purged successfully", "info");
              }
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors border border-red-950 hover:bg-red-950/20 px-3 py-1.5 rounded-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Storage
          </button>
        )}
      </div>

      {/* Main Tab Views Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Dynamic Workspace Area (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* View 1: Job Dispatcher Form */}
            {activeTab === 'dispatcher' && (
              <motion.div
                key="dispatcher"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 space-y-6"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#ff4e00]" />
                    Job Parameterization
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Inference Target:</span>
                    <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 text-zinc-300 border border-zinc-800 rounded font-bold uppercase">
                      {selectedBackend}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Prompt textarea input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                      Generation Instruction (Prompt) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Cinematic drone pan around an architectural concrete library in the middle of a dense fir forest, sunrise lighting, photorealistic..."
                      className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#ff4e00]/50 focus:ring-1 focus:ring-[#ff4e00]/20 transition-all placeholder-zinc-600 resize-none font-sans"
                    />
                  </div>

                  {/* Optional Source Image Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                      Optional Source Image (First Frame Guidance)
                    </label>
                    
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleDropImage}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDraggingImage
                          ? 'border-[#ff4e00] bg-[#ff4e00]/5'
                          : sourceImage
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                      }`}
                    >
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageFile(file);
                        }}
                        accept="image/*"
                        className="hidden"
                      />

                      {sourceImage ? (
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                          <img 
                            src={`data:${sourceImage.mimeType};base64,${sourceImage.data}`}
                            alt="Source guide"
                            className="max-h-32 rounded-lg border border-zinc-800 object-contain shadow-md"
                          />
                          <p className="text-[10px] text-zinc-500 mt-2 font-mono truncate max-w-xs">{sourceImage.name}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSourceImage(null);
                              showNotification("Image removed", "info");
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 py-2">
                          <Upload className="w-6 h-6 text-zinc-500 mx-auto" />
                          <p className="text-xs font-medium text-zinc-300">Drag image here or click to upload</p>
                          <p className="text-[10px] text-zinc-500 font-mono">JPEG, PNG • Max 10MB file size</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form config controls grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Model Parameter */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                        Base Architecture
                      </label>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ff4e00]/50 transition-colors"
                      >
                        <option value="Wan2.1-T2V-14B">Wan2.1-T2V-14B (Text to Video)</option>
                        <option value="Wan2.1-I2V-14B">Wan2.1-I2V-14B (Image to Video)</option>
                        <option value="Wan2.1-T2V-1.3B">Wan2.1-T2V-1.3B (Fast Light model)</option>
                        <option value="Sora-1.0-Sim">Sora Simulated (1.0 API)</option>
                      </select>
                    </div>

                    {/* Resolution Parameter */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                        Target Resolution
                      </label>
                      <select
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#ff4e00]/50 transition-colors"
                      >
                        <option value="480p (832x480)">480p (832x480) - Mobile fast</option>
                        <option value="720p (1280x720)">720p (1280x720) - Standard HD</option>
                        <option value="1080p (1920x1080)">1080p (1920x1080) - Full Cinematic</option>
                      </select>
                    </div>

                    {/* Duration Slider Parameter */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block flex items-center justify-between">
                        <span>Duration</span>
                        <span className="text-[10px] text-[#ff4e00] font-mono">{duration} seconds</span>
                      </label>
                      <input 
                        type="range"
                        min="2"
                        max="20"
                        step="1"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full accent-[#ff4e00] bg-zinc-900 rounded-lg cursor-pointer h-2"
                      />
                    </div>

                    {/* Seed Parameter */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block flex items-center justify-between">
                        <span>Inference Seed</span>
                        <button 
                          type="button"
                          onClick={() => setSeed(Math.floor(Math.random() * 10000000))}
                          className="text-[10px] text-[#ff4e00] hover:underline"
                        >
                          Randomize 🎲
                        </button>
                      </label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(Number(e.target.value))}
                        placeholder="-1 (Random)"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff4e00]/50 transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Dispatch Trigger Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handleCreateJob('draft')}
                    className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-all border border-zinc-800 flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4 text-zinc-500" />
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateJob('queued')}
                    className="w-full sm:flex-1 bg-[#ff4e00] hover:bg-[#ff5f15] text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff4e00]/10"
                  >
                    <Video className="w-4 h-4" />
                    Queue Generation Job
                  </button>
                </div>
              </motion.div>
            )}

            {/* View 2: Active Jobs Queue list */}
            {activeTab === 'queue' && (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-4"
              >
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Real-time Active Queue & Jobs
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Below is the stream of running or queued video renders. You can interactively transition jobs step-by-step to test completion pipelines.
                  </p>
                </div>

                {jobs.filter(j => j.status !== 'complete' && j.status !== 'failed').length === 0 ? (
                  <div className="text-center py-16 bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                    No jobs are currently in the queue or running. Save or queue a job in the Dispatcher!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.filter(j => j.status !== 'complete' && j.status !== 'failed').map((job) => (
                      <div 
                        key={job.id}
                        className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg relative overflow-hidden"
                      >
                        {/* Progressive Background Indicator bar */}
                        <div 
                          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-[#ff4e00] to-amber-500 transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold uppercase">
                              {job.backendType}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">Job #{job.id}</span>
                            <span className="text-xs text-zinc-600 font-mono">• Created: {new Date(job.createdAt).toLocaleTimeString()}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {job.status === 'running' ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                RUNNING ({job.progress}%)
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded uppercase">
                                {job.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white italic leading-relaxed">
                            "{job.prompt}"
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-mono">
                            <span>Model: {job.model}</span>
                            <span>Resolution: {job.resolution}</span>
                            <span>Seed: {job.seed}</span>
                            <span>Duration: {job.duration}s</span>
                            {job.sourceImageName && (
                              <span className="text-emerald-500">Image: {job.sourceImageName}</span>
                            )}
                          </div>
                        </div>

                        {/* Simulator controls directly attached to the queue item! */}
                        <div className="pt-3 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Test Simulator:</span>
                            
                            {job.status === 'draft' && (
                              <button
                                onClick={() => handleForceStatusChange(Number(job.id), 'queued')}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[10px] font-mono border border-zinc-800 flex items-center gap-1"
                              >
                                Queue Job
                              </button>
                            )}

                            {job.status === 'queued' && (
                              <button
                                onClick={() => handleForceStatusChange(Number(job.id), 'running')}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-400 rounded text-[10px] font-mono border border-zinc-800 flex items-center gap-1"
                              >
                                Start Running
                              </button>
                            )}

                            {job.status === 'running' && (
                              <button
                                onClick={async () => {
                                  const prg = Math.min(100, job.progress + 20);
                                  if (prg >= 100) {
                                    await handleForceStatusChange(Number(job.id), 'complete');
                                  } else {
                                    await db.videoJobs.update(Number(job.id), { progress: prg });
                                  }
                                }}
                                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-cyan-400 rounded text-[10px] font-mono border border-zinc-800"
                              >
                                Advance Progress +20%
                              </button>
                            )}

                            {(job.status === 'queued' || job.status === 'running') && (
                              <>
                                <button
                                  onClick={() => handleForceStatusChange(Number(job.id), 'complete')}
                                  className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded text-[10px] font-mono border border-emerald-900/40 flex items-center gap-1"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleForceStatusChange(Number(job.id), 'failed')}
                                  className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-400 rounded text-[10px] font-mono border border-rose-900/40 flex items-center gap-1"
                                >
                                  Fail Job
                                </button>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleReuseSettings(job, e)}
                              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 py-1 px-2 hover:bg-zinc-900 rounded"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Clone settings
                            </button>
                            
                            <button
                              onClick={(e) => handleDeleteJob(Number(job.id), e)}
                              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1 px-2 hover:bg-rose-950/20 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* View 3: Output Gallery */}
            {activeTab === 'gallery' && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Completed Video Gallery
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Below are your finalized high-fidelity generated videos, saved locally to IndexedDB along with original metadata parameters.
                  </p>
                </div>

                {jobs.filter(j => j.status === 'complete' || j.status === 'failed').length === 0 ? (
                  <div className="text-center py-20 bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                    No completed video jobs exist in storage yet. Build your prompt and complete a task in active queue to see results!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobs.filter(j => j.status === 'complete' || j.status === 'failed').map((job) => (
                      <div 
                        key={job.id} 
                        onClick={() => handleSelectJob(job)}
                        className={`group bg-zinc-950 border rounded-2xl overflow-hidden cursor-pointer transition-all ${
                          selectedJob?.id === job.id 
                            ? 'border-[#ff4e00] ring-1 ring-[#ff4e00]/20 shadow-2xl' 
                            : 'border-zinc-800 hover:border-zinc-700 hover:shadow-xl'
                        }`}
                      >
                        {/* Video Card Preview */}
                        <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden border-b border-zinc-900">
                          {job.status === 'failed' ? (
                            <div className="p-4 text-center space-y-2">
                              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto animate-pulse" />
                              <span className="text-xs font-bold text-rose-400 block uppercase tracking-wider">Render Failed</span>
                            </div>
                          ) : job.outputVideoData ? (
                            <video 
                              src={`data:${job.outputVideoMimeType};base64,${job.outputVideoData}`}
                              className="w-full h-full object-cover"
                              muted 
                              loop
                              playsInline
                              onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                              onMouseOut={(e) => {
                                const vid = e.target as HTMLVideoElement;
                                vid.pause();
                                vid.currentTime = 0;
                              }}
                            />
                          ) : (
                            <div className="p-4 text-center space-y-2">
                              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                              <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wider">File Saved</span>
                            </div>
                          )}

                          {/* Top Info Banner overlay */}
                          <div className="absolute top-2 left-2 flex gap-1.5">
                            <span className="text-[9px] bg-black/80 text-white border border-zinc-800 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                              {job.backendType}
                            </span>
                            <span className="text-[9px] bg-black/80 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded font-mono">
                              {job.duration}s
                            </span>
                          </div>

                          {/* Hover Overlay Play Icon */}
                          {job.status === 'complete' && job.outputVideoData && (
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-[#ff4e00] text-white p-3 rounded-full transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl">
                                <Play className="w-5 h-5 fill-current" />
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card metadata details */}
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-zinc-300 font-medium line-clamp-2 leading-relaxed">
                            "{job.prompt}"
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-900 text-[10px] font-mono text-zinc-500">
                            <span>Seed: {job.seed}</span>
                            <span>Resolution: {job.resolution.split(' ')[0]}</span>
                          </div>

                          {/* Error block if failed */}
                          {job.error && (
                            <div className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-[10px] text-red-400 leading-relaxed font-mono max-h-16 overflow-y-auto">
                              {job.error}
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                            <button
                              onClick={(e) => handleReuseSettings(job, e)}
                              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-900 rounded"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Clone Settings
                            </button>

                            <button
                              onClick={(e) => handleDeleteJob(Number(job.id), e)}
                              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-1 px-2 hover:bg-rose-950/20 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* View 4: Backend Adapters placeholder definitions list */}
            {activeTab === 'adapters' && (
              <motion.div
                key="adapters"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-400" />
                    Adapter Registry Architecture
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Below are the architectural adapters mapped for physical or simulated generation. These are declared in separate self-contained modules for developers to hook into their local GPU infrastructure.
                  </p>
                </div>

                {/* Grid of 3 declared placeholders */}
                <div className="space-y-6">
                  
                  {/* ComfyUI Adapter Details */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                          <Settings2 className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-bold text-white">ComfyUI Adapter</h3>
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">
                        comfyuiAdapter.ts
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Maps high-end generation to a local ComfyUI graph running on port <code className="text-white bg-zinc-900 px-1 rounded">8188</code>. Generates graph workflow JSON, queues job requests to the <code className="text-white bg-zinc-900 px-1 rounded">/prompt</code> endpoint, and polls the generation history database.
                    </p>
                    <div className="bg-zinc-900/80 border border-zinc-800/60 p-3.5 rounded-xl text-[11px] font-mono text-zinc-500 space-y-1">
                      <span className="text-zinc-400 uppercase tracking-wider font-bold block text-[10px] pb-1">TODO Endpoints Configured:</span>
                      <div>• Queue Endpoint: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">POST /prompt</code></div>
                      <div>• Queue State Check: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">GET /queue</code></div>
                      <div>• Output History: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">GET /history/&#123;id&#125;</code></div>
                    </div>
                  </div>

                  {/* Gradio Adapter Details */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400">
                          <Settings2 className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-bold text-white">Gradio WebUI Adapter</h3>
                      </div>
                      <span className="text-[10px] font-mono bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded uppercase">
                        gradioAdapter.ts
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Maps requests to Gradio backend frameworks usually running on port <code className="text-white bg-zinc-900 px-1 rounded">7860</code>. Standard Gradio installations execute operations via predicting endpoints or SSE websocket loops.
                    </p>
                    <div className="bg-zinc-900/80 border border-zinc-800/60 p-3.5 rounded-xl text-[11px] font-mono text-zinc-500 space-y-1">
                      <span className="text-zinc-400 uppercase tracking-wider font-bold block text-[10px] pb-1">TODO Endpoints Configured:</span>
                      <div>• Inference Endpoint: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">POST /api/predict</code></div>
                      <div>• Session status query: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">GET /api/queue/status</code></div>
                    </div>
                  </div>

                  {/* Wan2GP Adapter Details */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                          <Settings2 className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-bold text-white">Wan2GP Adapter</h3>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase">
                        wan2gpAdapter.ts
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Tailored specifically for the Wan2.1 dedicated local proxy generator running at port <code className="text-white bg-zinc-900 px-1 rounded">7860</code>. Interacts with direct REST controllers rather than web interfaces.
                    </p>
                    <div className="bg-zinc-900/80 border border-zinc-800/60 p-3.5 rounded-xl text-[11px] font-mono text-zinc-500 space-y-1">
                      <span className="text-zinc-400 uppercase tracking-wider font-bold block text-[10px] pb-1">TODO Endpoints Configured:</span>
                      <div>• Dispatch Task: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">POST /api/generate</code></div>
                      <div>• Polling State: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">GET /api/status/&#123;id&#125;</code></div>
                      <div>• Stream compilation retrieval: <code className="text-[#ff4e00] bg-black/40 px-1 rounded">GET /api/outputs/&#123;id&#125;.mp4</code></div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right Side: Active Inspector / Details Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Film className="w-4 h-4 text-[#ff4e00]" />
              Media Inspector
            </h2>

            {selectedJob ? (
              <div className="space-y-4">
                {/* Visual playback block if completed */}
                {selectedJob.status === 'complete' && previewVideoUrl ? (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-zinc-800">
                    <video 
                      src={previewVideoUrl} 
                      controls 
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : selectedJob.status === 'failed' ? (
                  <div className="p-6 bg-rose-950/20 border border-rose-900/30 rounded-xl text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto animate-bounce" />
                    <h4 className="text-xs font-bold text-rose-300 uppercase tracking-widest">Inference Error</h4>
                    <p className="text-[11px] text-rose-400 font-mono leading-relaxed bg-black/35 p-2 rounded">
                      {selectedJob.error || 'OOM Error on execution.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center space-y-2 text-zinc-500">
                    <Loader2 className="w-6 h-6 text-zinc-600 animate-spin mx-auto" />
                    <p className="text-xs">Job is currently in <strong className="text-zinc-400">{selectedJob.status}</strong> state. No compiled video media generated yet.</p>
                  </div>
                )}

                {/* Metadata detailed specifications table */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                    Metadata Parameters
                  </h3>

                  <div className="bg-zinc-900/60 rounded-xl p-4 text-xs space-y-2.5 font-mono">
                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">ID / Target</span>
                      <span className="text-zinc-300 font-bold">#{selectedJob.id} [{selectedJob.backendType}]</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">Base Model</span>
                      <span className="text-zinc-300 truncate max-w-[150px]">{selectedJob.model}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">Seed Value</span>
                      <span className="text-[#ff4e00] font-bold">{selectedJob.seed}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">Resolution</span>
                      <span className="text-zinc-300">{selectedJob.resolution}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">Duration</span>
                      <span className="text-zinc-300">{selectedJob.duration} seconds</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">Source Image</span>
                      <span className="text-zinc-300 truncate max-w-[150px]">
                        {selectedJob.sourceImageName || 'None'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-zinc-800/40">
                      <span className="text-zinc-500">Output Path</span>
                      <span className="text-blue-400 underline truncate max-w-[150px] text-[10px]" title={selectedJob.outputVideoPath}>
                        {selectedJob.outputVideoPath || 'Pending'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500">Created At</span>
                      <span className="text-zinc-300 text-[10px]">
                        {new Date(selectedJob.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Description prompt string */}
                  <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Prompt Text:</span>
                    <p className="text-xs text-zinc-300 italic leading-relaxed">
                      "{selectedJob.prompt}"
                    </p>
                  </div>

                  {/* Actions for currently loaded job */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => handleReuseSettings(selectedJob, e)}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 py-2.5 rounded-lg text-xs font-bold transition-all uppercase flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reuse settings
                    </button>

                    <button
                      onClick={(e) => handleDeleteJob(Number(selectedJob.id), e)}
                      className="bg-rose-950/40 border border-rose-900 hover:bg-rose-950 text-rose-400 px-3 rounded-lg text-xs font-bold transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-zinc-600 space-y-2">
                <FileVideo className="w-10 h-10 mx-auto text-zinc-800" />
                <p className="text-xs">No active video selected for deep inspection.</p>
                <p className="text-[10px] text-zinc-700">Select a card in the queue or finished library to inspect file attributes and download local media blobs.</p>
              </div>
            )}
          </div>

          {/* Quick Active Backend Configurations Indicator panel */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-zinc-400" />
              Target Backend Configurations
            </h3>
            
            <div className="space-y-3 text-xs">
              <div 
                onClick={() => setSelectedBackend('comfyui')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedBackend === 'comfyui'
                    ? 'bg-zinc-900 border-[#ff4e00]/40 shadow-inner'
                    : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">ComfyUI Local</span>
                  {selectedBackend === 'comfyui' && <Check className="w-3.5 h-3.5 text-[#ff4e00]" />}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">http://localhost:8188</span>
              </div>

              <div 
                onClick={() => setSelectedBackend('gradio')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedBackend === 'gradio'
                    ? 'bg-zinc-900 border-[#ff4e00]/40 shadow-inner'
                    : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Gradio WebUI</span>
                  {selectedBackend === 'gradio' && <Check className="w-3.5 h-3.5 text-[#ff4e00]" />}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">http://localhost:7860</span>
              </div>

              <div 
                onClick={() => setSelectedBackend('wan2gp')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedBackend === 'wan2gp'
                    ? 'bg-zinc-900 border-[#ff4e00]/40 shadow-inner'
                    : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Wan2GP REST</span>
                  {selectedBackend === 'wan2gp' && <Check className="w-3.5 h-3.5 text-[#ff4e00]" />}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">http://localhost:7860</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
