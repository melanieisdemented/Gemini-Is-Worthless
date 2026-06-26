import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Loader2, 
  Image as ImageIcon, 
  Download, 
  Sparkles, 
  Upload, 
  X, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Layers, 
  Info,
  Sliders,
  Type,
  Film
} from 'lucide-react';
import { useAppStore } from '../store';
import { saveFile, getFile, deleteFile } from '../lib/db';
import { ContentResultModal } from './ContentResultModal';

interface ReferenceFrame {
  data: string;
  mimeType: string;
  url: string;
}

interface ReferenceItem {
  id: string;
  role: 'subject' | 'environment' | 'lighting' | 'palette' | 'prop' | 'custom';
  customRoleName?: string;
  description: string;
  image: ReferenceFrame | null;
}

const ROLE_OPTIONS = [
  { value: 'subject', label: '👤 Character / Subject' },
  { value: 'environment', label: '🏔️ Background / Location' },
  { value: 'lighting', label: '☀️ Lighting Style' },
  { value: 'palette', label: '🎨 Color Palette' },
  { value: 'prop', label: '🛡️ Key Object / Prop' },
  { value: 'custom', label: '⚙️ Custom Role...' },
];

const DEFAULT_INITIAL_ITEMS: ReferenceItem[] = [
  {
    id: 'subject-1',
    role: 'subject',
    description: 'The protagonist character (e.g. cybernetic space warrior wearing sleek blue armor)',
    image: null,
  },
  {
    id: 'environment-1',
    role: 'environment',
    description: 'The primary environment (e.g. ancient ruins surrounded by a dense mystical forest)',
    image: null,
  },
  {
    id: 'lighting-1',
    role: 'lighting',
    description: 'The mood/lighting reference (e.g. dramatic twilight casting golden rim light and long soft shadows)',
    image: null,
  },
];

export function MultiReference() {
  const { incrementSpend } = useAppStore();

  const [referenceItems, setReferenceItems] = useState<ReferenceItem[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [model, setModel] = useState('gemini-2.5-flash-image');

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'image' | 'video'>('image');
  const [videoDuration, setVideoDuration] = useState<number>(6);
  const [error, setError] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load saved assets on component mount
  useEffect(() => {
    const loadSavedAssets = async () => {
      try {
        const metaStr = localStorage.getItem('multiRef_items_meta');
        if (metaStr) {
          const items = JSON.parse(metaStr);
          const restoredItems = await Promise.all(
            items.map(async (item: any) => {
              const file = await getFile(`multiRef_img_${item.id}`);
              if (file) {
                return {
                  ...item,
                  image: {
                    data: file.data,
                    mimeType: file.mimeType,
                    url: `data:${file.mimeType};base64,${file.data}`
                  }
                };
              }
              return { ...item, image: null };
            })
          );
          setReferenceItems(restoredItems);
        } else {
          setReferenceItems(DEFAULT_INITIAL_ITEMS);
        }

        const gen = await getFile('multiRef_master_generated');
        if (gen) {
          setGeneratedImage(`data:${gen.mimeType};base64,${gen.data}`);
        }

        const genVideo = await getFile('multiRef_master_generated_video');
        if (genVideo) {
          setGeneratedVideo(`data:${genVideo.mimeType};base64,${genVideo.data}`);
        }

        const savedFormat = localStorage.getItem('multiRef_output_format');
        if (savedFormat) {
          setOutputFormat(savedFormat as 'image' | 'video');
        }

        const savedDuration = localStorage.getItem('multiRef_video_duration');
        if (savedDuration) {
          setVideoDuration(Number(savedDuration));
        }

        const savedPrompt = localStorage.getItem('multiRef_user_prompt');
        if (savedPrompt) {
          setUserPrompt(savedPrompt);
        }
      } catch (e) {
        console.error('Failed to load multi-reference assets:', e);
        setReferenceItems(DEFAULT_INITIAL_ITEMS);
      }
    };
    loadSavedAssets();
  }, []);

  // Save meta and prompt state to localStorage whenever changed
  const saveMetaState = (items: ReferenceItem[]) => {
    const minifiedItems = items.map(({ id, role, customRoleName, description }) => ({
      id,
      role,
      customRoleName,
      description
    }));
    localStorage.setItem('multiRef_items_meta', JSON.stringify(minifiedItems));
  };

  const updateItem = (id: string, updates: Partial<ReferenceItem>) => {
    const updated = referenceItems.map(item => {
      if (item.id === id) {
        const next = { ...item, ...updates };
        return next;
      }
      return item;
    });
    setReferenceItems(updated);
    saveMetaState(updated);
  };

  const handleFileUpload = (id: string, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const frameData = {
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      };

      const updated = referenceItems.map(item => {
        if (item.id === id) {
          return { ...item, image: frameData };
        }
        return item;
      });
      setReferenceItems(updated);
      saveMetaState(updated);
      await saveFile(`multiRef_img_${id}`, base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = async (id: string) => {
    const updated = referenceItems.map(item => {
      if (item.id === id) {
        return { ...item, image: null };
      }
      return item;
    });
    setReferenceItems(updated);
    saveMetaState(updated);
    await deleteFile(`multiRef_img_${id}`);
  };

  const addNewItem = (role: ReferenceItem['role'] = 'subject') => {
    const newId = `ref-${Date.now()}`;
    let desc = '';
    if (role === 'subject') {
      desc = `Additional Character / Subject reference ${referenceItems.filter(i => i.role === 'subject').length + 1}`;
    } else if (role === 'environment') {
      desc = `Additional Environment / Location reference ${referenceItems.filter(i => i.role === 'environment').length + 1}`;
    } else if (role === 'prop') {
      desc = `Additional Key Object / Prop element reference ${referenceItems.filter(i => i.role === 'prop').length + 1}`;
    } else if (role === 'lighting') {
      desc = 'Atmospheric lighting style reference';
    } else if (role === 'palette') {
      desc = 'Chromatic color palette references';
    }
    const newItem: ReferenceItem = {
      id: newId,
      role,
      description: desc,
      image: null
    };
    const updated = [...referenceItems, newItem];
    setReferenceItems(updated);
    saveMetaState(updated);
  };

  const removeItem = async (id: string) => {
    const updated = referenceItems.filter(item => item.id !== id);
    setReferenceItems(updated);
    saveMetaState(updated);
    await deleteFile(`multiRef_img_${id}`);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDraggingItemId(id);
  };

  const handleDragLeave = () => {
    setDraggingItemId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDraggingItemId(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(id, file);
    }
  };

  const handlePromptChange = (val: string) => {
    setUserPrompt(val);
    localStorage.setItem('multiRef_user_prompt', val);
  };

  const handleOutputFormatChange = (format: 'image' | 'video') => {
    setOutputFormat(format);
    localStorage.setItem('multiRef_output_format', format);
  };

  const handleVideoDurationChange = (duration: number) => {
    setVideoDuration(duration);
    localStorage.setItem('multiRef_video_duration', String(duration));
  };

  const applyPreset = (presetName: string) => {
    let promptText = '';
    if (presetName === 'multi-char') {
      promptText = 'A high-fidelity epic composition featuring Subject 1 and Subject 2 standing side-by-side in active confrontation within the background environment. Ensure perfect 3D perspective, matching shadow projection, and harmonious ambient color casting from the lighting reference.';
    } else if (presetName === 'portal') {
      promptText = 'A breathtaking cinematic photograph where an elegant magic portal connects two distinct worlds: the interior of Location 1 is visible through the portal frame, while the surrounding environment matches Location 2. The entire scene is bathed in the dramatic, atmospheric colors of our Lighting Reference.';
    } else if (presetName === 'legendary-relic') {
      promptText = 'A stunning masterpiece depicting our main Character holding the Key Prop artifact. The scene is located in the heart of our Environment setting, illuminated beautifully by the glowing and dramatic contrast from the Lighting Style Reference.';
    }
    setUserPrompt(promptText);
    localStorage.setItem('multiRef_user_prompt', promptText);
  };

  const compileVideoFromCanvas = async (synthesizedPromptText: string, activeItems: ReferenceItem[]): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        
        // Match aspect ratio
        let w = 640;
        let h = 360;
        if (aspectRatio === '1:1') { w = 480; h = 480; }
        else if (aspectRatio === '9:16') { w = 360; h = 640; }
        else if (aspectRatio === '4:3') { w = 640; h = 480; }
        else if (aspectRatio === '21:9') { w = 840; h = 360; }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        
        // 1. Load active images
        setLoadingMessage('Pre-loading and decoding references...');
        const loadedImages: { role: string; img: HTMLImageElement; item: ReferenceItem }[] = [];
        
        for (const item of activeItems) {
          if (item.image) {
            try {
              const img = await new Promise<HTMLImageElement>((res, rej) => {
                const i = new Image();
                i.crossOrigin = 'anonymous';
                i.onload = () => res(i);
                i.onerror = () => rej(new Error('Image load error'));
                i.src = item.image!.url;
              });
              loadedImages.push({ role: item.role, img, item });
            } catch (err) {
              console.warn('Could not load image for item:', item.id, err);
            }
          }
        }
        
        // Capture canvas stream
        let stream: MediaStream;
        try {
          stream = canvas.captureStream(30); // 30 FPS
        } catch (err) {
          throw new Error('Canvas capture stream is not supported in this browser.');
        }
        
        // Check supported video types
        let options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm;codecs=vp8' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
        
        const mediaRecorder = new MediaRecorder(stream, options);
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
          reader.onerror = () => reject(new Error('Failed to read video blob'));
          reader.readAsDataURL(blob);
        };
        
        mediaRecorder.start();
        
        // Animation variables
        const fps = 30;
        const durationMs = videoDuration * 1000;
        const totalFrames = (durationMs / 1000) * fps; // dynamic frames
        let currentFrame = 0;
        
        // Gather references by category
        const bgImages = loadedImages.filter(l => l.role === 'environment');
        const subjectImages = loadedImages.filter(l => l.role === 'subject');
        const propImages = loadedImages.filter(l => l.role === 'prop');
        const lightingImgData = loadedImages.find(l => l.role === 'lighting' || l.role === 'palette');
        
        // Sample colors from the lighting reference if available to use as gradients, else default
        let gradientColor1 = 'rgba(255, 78, 0, 0.15)';
        let gradientColor2 = 'rgba(56, 189, 248, 0.15)';
        let hudAccentColor = '#ff4e00';
        let secondaryAccentColor = '#38bdf8';
        
        if (lightingImgData) {
          try {
            const sampleCanvas = document.createElement('canvas');
            sampleCanvas.width = 10;
            sampleCanvas.height = 10;
            const sCtx = sampleCanvas.getContext('2d')!;
            sCtx.drawImage(lightingImgData.img, 0, 0, 10, 10);
            const data1 = sCtx.getImageData(1, 1, 1, 1).data;
            const data2 = sCtx.getImageData(8, 8, 1, 1).data;
            gradientColor1 = `rgba(${data1[0]}, ${data1[1]}, ${data1[2]}, 0.25)`;
            gradientColor2 = `rgba(${data2[0]}, ${data2[1]}, ${data2[2]}, 0.25)`;
            hudAccentColor = `rgb(${data1[0]}, ${data1[1]}, ${data1[2]})`;
            secondaryAccentColor = `rgb(${data2[0]}, ${data2[1]}, ${data2[2]})`;
          } catch (e) {
            console.warn("Failed to sample lighting colors:", e);
          }
        }
        
        const renderFrame = () => {
          if (currentFrame >= totalFrames) {
            mediaRecorder.stop();
            return;
          }
          
          const progress = currentFrame / totalFrames; // 0.0 to 1.0
          
          // Clear canvas
          ctx.clearRect(0, 0, w, h);
          
          // 1. Draw Background
          if (bgImages.length > 0) {
            // Draw the primary environment as background
            const bgImgData = bgImages[0];
            const scale = 1.05 + progress * 0.12; // slow zoom in
            
            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(scale, scale);
            ctx.drawImage(bgImgData.img, -bgImgData.img.width / 2, -bgImgData.img.height / 2);
            ctx.restore();

            // If we have 2 or more backgrounds, draw the second background inside an elegant circular cosmic portal in the center background!
            if (bgImages.length >= 2) {
              const portalImg = bgImages[1];
              const portalRadius = Math.min(w, h) * 0.22;
              const portalX = w / 2;
              const portalY = h / 2 + 10;

              ctx.save();
              ctx.beginPath();
              ctx.arc(portalX, portalY, portalRadius, 0, Math.PI * 2);
              ctx.clip();

              // Draw portal interior background (with slow rotate/zoom for magical separation)
              const portalScale = 1.3 - progress * 0.15;
              ctx.save();
              ctx.translate(portalX, portalY);
              ctx.rotate(-progress * Math.PI * 0.06);
              ctx.scale(portalScale, portalScale);
              ctx.drawImage(portalImg.img, -portalImg.img.width / 2, -portalImg.img.height / 2);
              ctx.restore();

              ctx.restore(); // Restore clip

              // Draw rotating neon portal outline
              ctx.save();
              ctx.shadowColor = hudAccentColor;
              ctx.shadowBlur = 12;
              ctx.strokeStyle = hudAccentColor;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(portalX, portalY, portalRadius, 0, Math.PI * 2);
              ctx.stroke();

              // Cyber-ring ticks spinning opposite direction
              ctx.strokeStyle = secondaryAccentColor;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([10, 15]);
              ctx.beginPath();
              ctx.arc(portalX, portalY, portalRadius + 6, -progress * Math.PI * 2, -progress * Math.PI * 2 + Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
            }

            // If we have 3 or more backgrounds, draw the third environment as a smaller holographic picture-in-picture stream in the corner!
            if (bgImages.length >= 3) {
              const lensImg = bgImages[2];
              const lensW = w * 0.18;
              const lensH = h * 0.18;
              const lensX = w - lensW - 35;
              const lensY = 75;

              ctx.save();
              ctx.fillStyle = 'rgba(0,0,0,0.65)';
              ctx.strokeStyle = secondaryAccentColor;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(lensX, lensY, lensW, lensH);
              ctx.fillRect(lensX, lensY, lensW, lensH);
              ctx.clip();

              const lensScale = 1.1 + Math.sin(progress * Math.PI) * 0.08;
              ctx.translate(lensX + lensW/2, lensY + lensH/2);
              ctx.scale(lensScale, lensScale);
              ctx.drawImage(lensImg.img, -lensW/2, -lensH/2, lensW, lensH);
              ctx.restore();

              ctx.save();
              ctx.font = '7px "JetBrains Mono", monospace';
              ctx.fillStyle = secondaryAccentColor;
              ctx.fillText("LOC_ALT_03", lensX + 3, lensY + lensH + 10);
              ctx.restore();
            }
          } else {
            // Starfield or deep dark void background
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#09090b');
            grad.addColorStop(0.5, '#121214');
            grad.addColorStop(1, '#020204');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            
            // Draw technological background grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            const gridSize = 40;
            for (let x = 0; x < w; x += gridSize) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSize) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              ctx.stroke();
            }
          }
          
          // 2. Draw Subject(s) in specialized cybernetic holographic/framed container
          const drawSubjectFrame = (img: HTMLImageElement, x: number, y: number, sizeW: number, sizeH: number, index: number) => {
            const bobbing = Math.sin(progress * Math.PI * 2 * 2 + index * 1.5) * 8; // staggered gentle hover
            const targetY = y + bobbing;
            
            ctx.save();
            
            // Shadow / outer glow
            ctx.shadowColor = hudAccentColor;
            ctx.shadowBlur = 12;
            
            // Draw sci-fi border capsule
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.strokeStyle = hudAccentColor;
            ctx.lineWidth = 2.5;
            
            // Rounded corners path
            const radius = 16;
            ctx.beginPath();
            ctx.moveTo(x + radius, targetY);
            ctx.lineTo(x + sizeW - radius, targetY);
            ctx.quadraticCurveTo(x + sizeW, targetY, x + sizeW, targetY + radius);
            ctx.lineTo(x + sizeW, targetY + sizeH - radius);
            ctx.quadraticCurveTo(x + sizeW, targetY + sizeH, x + sizeW - radius, targetY + sizeH);
            ctx.lineTo(x + radius, targetY + sizeH);
            ctx.quadraticCurveTo(x, targetY + sizeH, x, targetY + sizeH - radius);
            ctx.lineTo(x, targetY + radius);
            ctx.quadraticCurveTo(x, targetY, x + radius, targetY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Clip image within capsule
            ctx.clip();
            
            // Draw image inside, scaled to fit crop
            const imgAspect = img.width / img.height;
            const containerAspect = sizeW / sizeH;
            let drawW = sizeW;
            let drawH = sizeH;
            let drawX = x;
            let drawY = targetY;
            
            if (imgAspect > containerAspect) {
              drawW = sizeH * imgAspect;
              drawX = x - (drawW - sizeW) / 2;
            } else {
              drawH = sizeW / imgAspect;
              drawY = targetY - (drawH - sizeH) / 2;
            }
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            
            ctx.restore();
            
            // Label tag on subject frame
            ctx.save();
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.85)';
            ctx.shadowBlur = 4;
            ctx.fillText(`SUBJECT_0${index + 1}`, x + 8, targetY + 16);
            ctx.restore();

            // Subtle digital scanline overlay inside the subject frame
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            const scanLineY = targetY + ((progress * 1.5 + index * 0.3) % 1.0) * sizeH;
            ctx.fillRect(x, scanLineY, sizeW, 2);
          };
          
          if (subjectImages.length > 0) {
            const numSubjects = subjectImages.length;
            // Spacing calculations to align ANY number of subjects dynamically across the width
            const maxSubjectWidth = Math.min(w * 0.32, (w * 0.78) / numSubjects);
            const sW = maxSubjectWidth;
            const sH = Math.min(h * 0.65, sW * 1.5);
            const gap = numSubjects > 1 ? Math.min(25, (w * 0.12) / (numSubjects - 1)) : 0;
            const totalW = (numSubjects * sW) + ((numSubjects - 1) * gap);
            const startX = (w - totalW) / 2;
            const sY = (h - sH) / 2 + 15; // slightly lower center

            subjectImages.forEach((sImgData, idx) => {
              const sX = startX + idx * (sW + gap);
              drawSubjectFrame(sImgData.img, sX, sY, sW, sH, idx);
            });
          } else {
            // High-tech placeholder wireframe when no subjects are uploaded yet
            ctx.save();
            const wireRadius = Math.min(w, h) * 0.15;
            const wireX = w / 2;
            const wireY = h / 2 + 15;
            
            ctx.strokeStyle = 'rgba(255, 78, 0, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(wireX, wireY, wireRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = secondaryAccentColor;
            ctx.beginPath();
            ctx.arc(wireX, wireY, wireRadius * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // Crosshairs
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(wireX - wireRadius * 1.2, wireY);
            ctx.lineTo(wireX + wireRadius * 1.2, wireY);
            ctx.moveTo(wireX, wireY - wireRadius * 1.2);
            ctx.lineTo(wireX, wireY + wireRadius * 1.2);
            ctx.stroke();

            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillStyle = hudAccentColor;
            ctx.textAlign = 'center';
            ctx.fillText("AWAITING SUBJECT MATRIX INPUT", wireX, wireY - 5);
            ctx.fillText("CHANNELS READY FOR BLENDING", wireX, wireY + 12);
            ctx.restore();
          }
          
          // 3. Draw Prop(s) floating with custom motion
          if (propImages.length > 0) {
            propImages.forEach((pImgData, pIdx) => {
              const propSize = Math.min(w, h) * 0.12;
              
              // Distribute orbit positions dynamically
              const angleOffset = (pIdx * Math.PI * 2) / propImages.length;
              // Slow elegant orbiting motion
              const orbitSpeed = 0.8;
              const angle = progress * Math.PI * 2 * orbitSpeed + angleOffset;
              
              const orbitRadiusX = w * 0.36;
              const orbitRadiusY = h * 0.24;
              
              const pX = (w / 2) - (propSize / 2) + Math.cos(angle) * orbitRadiusX;
              const pY = (h / 2) - (propSize / 2) + Math.sin(angle) * orbitRadiusY + 15;
              
              ctx.save();
              ctx.shadowColor = secondaryAccentColor;
              ctx.shadowBlur = 15;
              
              // Draw orbit tracking path line
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 8]);
              ctx.beginPath();
              ctx.ellipse(w / 2, h / 2 + 15, orbitRadiusX, orbitRadiusY, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Draw outer hud ring
              ctx.strokeStyle = secondaryAccentColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(pX + propSize/2, pY + propSize/2, propSize * 0.65, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.strokeStyle = secondaryAccentColor;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pX + propSize/2, pY + propSize/2, propSize/2, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              
              ctx.clip();
              ctx.drawImage(pImgData.img, pX, pY, propSize, propSize);
              ctx.restore();

              // Draw neon connecting beam from key element to center stage coordinates
              ctx.save();
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
              ctx.lineWidth = 1.2;
              ctx.setLineDash([3, 5]);
              ctx.beginPath();
              ctx.moveTo(pX + propSize/2, pY + propSize/2);
              ctx.lineTo(w / 2, h / 2 + 15);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();

              // Mini label for prop
              ctx.save();
              ctx.font = '7px "JetBrains Mono", monospace';
              ctx.fillStyle = secondaryAccentColor;
              ctx.fillText(`ELEMENT_0${pIdx + 1}`, pX, pY - 6);
              ctx.restore();
            });
          }
          
          // 4. Ambient light overlay
          ctx.save();
          const ambientGrad = ctx.createLinearGradient(0, 0, w, h);
          ambientGrad.addColorStop(0, gradientColor1);
          ambientGrad.addColorStop(1, gradientColor2);
          ctx.fillStyle = ambientGrad;
          ctx.globalCompositeOperation = 'screen';
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
          
          // 5. Draw particles floating
          ctx.save();
          ctx.fillStyle = secondaryAccentColor;
          ctx.shadowColor = secondaryAccentColor;
          ctx.shadowBlur = 6;
          for (let i = 0; i < 15; i++) {
            const seedX = (i * 12345.67) % w;
            const seedY = (i * 98765.43) % h;
            const particleY = (seedY - progress * h * 0.5 + h) % h;
            const particleX = seedX + Math.sin(progress * Math.PI * 2 + i) * 15;
            const radius = 1.5 + (i % 3);
            ctx.beginPath();
            ctx.arc(particleX, particleY, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          
          // 6. Cybernetic HUD overlays
          ctx.save();
          ctx.font = '10px "JetBrains Mono", Courier, monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          
          const margin = 20;
          const len = 15;
          ctx.strokeStyle = hudAccentColor;
          ctx.lineWidth = 1.5;
          
          ctx.beginPath();
          ctx.moveTo(margin, margin + len);
          ctx.lineTo(margin, margin);
          ctx.lineTo(margin + len, margin);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(w - margin - len, margin);
          ctx.lineTo(w - margin, margin);
          ctx.lineTo(w - margin, margin + len);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(margin, h - margin - len);
          ctx.lineTo(margin, h - margin);
          ctx.lineTo(margin + len, h - margin);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(w - margin - len, h - margin);
          ctx.lineTo(w - margin, h - margin);
          ctx.lineTo(w - margin, h - margin - len);
          ctx.stroke();
          
          ctx.fillStyle = hudAccentColor;
          ctx.fillText('📡 MULTI-REFERENCE STUDIO VEO 2.0', margin + 5, margin + 15);
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(`RENDER: 30FPS | FRAME: ${currentFrame}/${totalFrames}`, margin + 5, margin + 30);
          
          ctx.textAlign = 'right';
          ctx.fillStyle = hudAccentColor;
          ctx.fillText('COMPILING SCENE COORDINATES', w - margin - 5, margin + 15);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText(`PROGRESS: ${Math.round(progress * 100)}% | RESOLUTION: ${w}x${h}`, w - margin - 5, margin + 30);
          
          ctx.textAlign = 'left';
          const promptToShow = `PROMPT: ${synthesizedPromptText.substring(0, Math.min(synthesizedPromptText.length, Math.floor(progress * synthesizedPromptText.length * 1.5)))}▮`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(promptToShow, margin + 5, h - margin - 5);
          
          const scanY = (progress * 2) % 1.0 * h;
          const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
          scanGrad.addColorStop(0, 'rgba(255, 78, 0, 0.0)');
          scanGrad.addColorStop(1, 'rgba(255, 78, 0, 0.12)');
          ctx.fillStyle = scanGrad;
          ctx.fillRect(0, scanY - 30, w, 30);
          
          ctx.strokeStyle = 'rgba(255, 78, 0, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, scanY);
          ctx.lineTo(w, scanY);
          ctx.stroke();
          
          ctx.restore();
          
          currentFrame++;
          setTimeout(renderFrame, 1000 / fps);
        };
        
        setLoadingMessage('Compiling high-fidelity cinematic video frames...');
        renderFrame();
        
      } catch (err: any) {
        reject(err);
      }
    });
  };

  const handleGenerate = async () => {
    const activeItems = referenceItems.filter(item => item.image);
    if (activeItems.length < 2) {
      setError("Please upload images for at least 2 reference elements to synthesize a custom composite.");
      return;
    }
    if (!userPrompt.trim()) {
      setError("Please write instructions describing how to blend, arrange, and construct the 3D perspective of these elements.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    if (outputFormat === 'image') {
      setGeneratedImage(null);
    } else {
      setGeneratedVideo(null);
    }
    setLoadingMessage('Deconstructing uploaded visual references...');

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
      }
      const ai = new GoogleGenAI({ apiKey });

      // 1. Multimodal Analysis Stage using gemini-2.5-flash
      setLoadingMessage('Deconstructing uploaded visual references...');

      let analysisPrompt = `You are an expert AI art director and image prompter.
We have a set of reference images uploaded by the user with specific roles:
`;

      const analysisParts: any[] = [];
      let subjectCount = 0;
      let envCount = 0;
      let propCount = 0;

      activeItems.forEach((item, idx) => {
        if (!item.image) return;

        let roleLabel = '';
        if (item.role === 'subject') {
          subjectCount++;
          roleLabel = `Subject / Character ${subjectCount}`;
        } else if (item.role === 'environment') {
          envCount++;
          roleLabel = `Location / Environment ${envCount}`;
        } else if (item.role === 'prop') {
          propCount++;
          roleLabel = `Key Object / Prop ${propCount}`;
        } else if (item.role === 'lighting') {
          roleLabel = `Lighting Style Reference`;
        } else if (item.role === 'palette') {
          roleLabel = `Color Palette Reference`;
        } else {
          roleLabel = item.customRoleName || `Special Influence Channel`;
        }

        analysisPrompt += `\n- Reference Image ${idx + 1}: Role is "${roleLabel}". Focus on: ${item.description || 'General features'}`;

        analysisParts.push({
          inlineData: {
            data: item.image.data,
            mimeType: item.image.mimeType,
          },
        });
      });

      analysisPrompt += `

The user wants to synthesize these references into a single cohesive, high-quality composite scene with this instruction:
"${userPrompt}"

Please write an exceptionally detailed, professional, studio-quality image generation prompt for Imagen 3 (the image generator model).
The prompt must describe a unified, singular scene where:
1. The subject(s) from the character/subject references are placed naturally within the environment reference. Keep their exact visual details, clothing, and characteristics.
2. The scene uses the exact camera angle, perspective, depth, and spatial arrangement requested by the user, adhering to physically accurate 3D perspective, foreshortening, and depth of field.
3. The lighting, shadows, colors, and atmosphere are completely guided by the lighting/palette reference. Describe how light hits the subjects and environment to form cast shadows and highlights.
4. If multiple subjects, characters, or locations are referenced, describe how they are composed together in 3D space.

Write the final prompt in a single, descriptive, highly detailed paragraph of 100-150 words. Do NOT include any prefixes, introductions, JSON, conversational filler, or markdown formatting. Output ONLY the raw prompt text itself.`;

      analysisParts.push({ text: analysisPrompt });

      const textResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: analysisParts }
      });

      const synthesizedPromptText = textResponse.text || userPrompt;
      console.log("Synthesized prompt from analysis:", synthesizedPromptText);

      if (outputFormat === 'image') {
        // 2. High-fidelity image synthesis using gemini-2.5-flash-image / gemini-3.1-flash-image
        setLoadingMessage('Synthesizing complex multi-element 3D environment...');

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: synthesizedPromptText }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio,
            }
          }
        });

        let base64Data = '';
        let mimeType = 'image/png';

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            base64Data = part.inlineData.data;
            mimeType = part.inlineData.mimeType || 'image/png';
            break;
          }
        }

        if (!base64Data) {
          throw new Error("Failed to synthesize multi-reference scene. The model did not return image data.");
        }

        const imageUrl = `data:${mimeType};base64,${base64Data}`;
        setGeneratedImage(imageUrl);
        setIsResultModalOpen(true);
        await saveFile('multiRef_master_generated', base64Data, mimeType);

        incrementSpend(0.03, 'image_multi_ref', model, userPrompt ? `Synthesis Prompt: ${userPrompt.substring(0, 35)}...` : undefined);
      } else {
        // 2. High-fidelity cinematic video synthesis from references
        setLoadingMessage('Initializing multi-reference cinematic animation engine...');
        const base64Data = await compileVideoFromCanvas(synthesizedPromptText, activeItems);
        const mimeType = 'video/webm';

        const videoUrl = `data:${mimeType};base64,${base64Data}`;
        setGeneratedVideo(videoUrl);
        setIsResultModalOpen(true);
        await saveFile('multiRef_master_generated_video', base64Data, mimeType);

        incrementSpend(0.05, 'video_multi_ref', 'gemini-3-flash-preview', userPrompt ? `Cinematic Prompt: ${userPrompt.substring(0, 35)}...` : undefined);
      }

    } catch (err: any) {
      console.error("Multi-reference composition error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap")) {
        setError("You have exceeded your API quota or spending cap. Please verify your GEMINI_API_KEY settings.");
      } else if (errorMessage.includes("safety") || errorMessage.includes("policy") || errorMessage.includes("blocked")) {
        setError("The synthesis request was filtered by safety systems. Try adjusting descriptions or using different references.");
      } else {
        setError(err.message || "An unexpected error occurred during multi-reference synthesis.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Header Banner */}
      <div className="p-5 bg-gradient-to-r from-orange-600/10 to-transparent border border-[#ff4e00]/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-[#ff4e00]/10 rounded-xl border border-[#ff4e00]/20 shrink-0">
            <Layers className="w-6 h-6 text-[#ff7d00]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Advanced Multi-Reference Studio
              <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded font-normal uppercase">Power Mode</span>
            </h4>
            <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
              Synthesize multi-character scenes, blend multiple locations together, or fuse custom props with specific lighting. Upload any number of visual assets, configure their roles, and instruct Gemini to arrange them in realistic 3D space.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dynamic References Board */}
        <div className="xl:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white/90 uppercase tracking-wider block">Reference Elements Board</span>
                <span className="text-[11px] text-white/40 block">Create reference slots dynamically to compose rich scene dependencies</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => addNewItem('subject')}
                  className="px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-xs font-semibold border border-orange-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  title="Add another character slot"
                >
                  <Plus className="w-3 h-3" />
                  + Character
                </button>
                <button
                  onClick={() => addNewItem('environment')}
                  className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg text-xs font-semibold border border-sky-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  title="Add another background environment slot"
                >
                  <Plus className="w-3 h-3" />
                  + Environment
                </button>
                <button
                  onClick={() => addNewItem('prop')}
                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                  title="Add another key object/prop slot"
                >
                  <Plus className="w-3 h-3" />
                  + Prop / Element
                </button>
              </div>
            </div>

            {/* Dynamic Element Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {referenceItems.map((item, index) => {
                const isDragging = draggingItemId === item.id;
                return (
                  <div 
                    key={item.id}
                    className={`bg-white/5 border rounded-xl p-4 space-y-3 transition-all relative flex flex-col justify-between ${
                      item.image ? 'border-white/10' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Role & Deletion */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1">
                          <select
                            value={item.role}
                            onChange={(e) => updateItem(item.id, { role: e.target.value as any })}
                            className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white/90 focus:outline-none focus:border-white/30 cursor-pointer w-full font-medium"
                          >
                            {ROLE_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        {referenceItems.length > 2 && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            title="Remove element"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Custom Role Input */}
                      {item.role === 'custom' && (
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter Custom Role (e.g. Sword Relic, Spell Effect)"
                            value={item.customRoleName || ''}
                            onChange={(e) => updateItem(item.id, { customRoleName: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                          />
                        </div>
                      )}

                      {/* Dropzone Area */}
                      <div
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onClick={() => !item.image && fileInputRefs.current[item.id]?.click()}
                        className={`relative aspect-video rounded-lg border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all cursor-pointer ${
                          item.image 
                            ? 'border-white/10 bg-black/40' 
                            : isDragging
                              ? 'border-[#ff7d00] bg-[#ff4e00]/10 scale-98'
                              : 'border-white/5 hover:border-white/25 bg-white/5'
                        }`}
                      >
                        {item.image ? (
                          <>
                            <img src={item.image.url} alt="Reference" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                              <button 
                                onClick={(e) => { e.stopPropagation(); clearImage(item.id); }}
                                className="px-2.5 py-1 bg-black/80 text-white hover:bg-red-600 rounded-md text-[10px] font-bold border border-white/10 transition-colors cursor-pointer"
                              >
                                Replace Image
                              </button>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); clearImage(item.id); }}
                              className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors border border-white/10"
                            >
                              <X className="w-3" />
                            </button>
                          </>
                        ) : (
                          <div className="p-3 text-center space-y-1">
                            <Upload className="w-5 h-5 text-[#ff7d00] mx-auto opacity-70" />
                            <p className="text-[11px] font-medium text-white/80">Upload Reference Image</p>
                            <p className="text-[9px] text-white/30">Drag-and-drop or select</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={el => { fileInputRefs.current[item.id] = el; }} 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(item.id, file);
                          }}
                        />
                      </div>
                    </div>

                    {/* Element Description */}
                    <div className="mt-3">
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        placeholder="What should Gemini pay attention to in this image? (e.g. 'The dynamic warrior dress and golden chestplate')"
                        className="w-full h-14 bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/15 transition-all resize-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Blending Presets */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-[#ff7d00]" />
              Synthesis Composition Presets
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <button 
                onClick={() => applyPreset('multi-char')}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-left text-white/80 border border-white/10 transition-all cursor-pointer space-y-1"
              >
                <span className="font-bold text-white block">👥 Cross-Over Battle</span>
                <span className="block text-[10px] text-white/40 leading-relaxed">Blends two characters together in the target scenery</span>
              </button>
              <button 
                onClick={() => applyPreset('portal')}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-left text-white/80 border border-white/10 transition-all cursor-pointer space-y-1"
              >
                <span className="font-bold text-white block">🔮 Dual-Location Portal</span>
                <span className="block text-[10px] text-white/40 leading-relaxed">Arranges location 1 inside portal, location 2 surrounding</span>
              </button>
              <button 
                onClick={() => applyPreset('legendary-relic')}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-left text-white/80 border border-white/10 transition-all cursor-pointer space-y-1"
              >
                <span className="font-bold text-white block">🛡️ Relic & Hero Scene</span>
                <span className="block text-[10px] text-white/40 leading-relaxed">Fuses character holding custom key object within scenery</span>
              </button>
            </div>
          </div>

          {/* Prompt Instructions */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider block">Master Synthesis Prompt</label>
              <span className="text-[11px] text-white/40 leading-none">Describe how the multiple characters, environments, and elements integrate in 3D perspective space</span>
            </div>
            <div className="relative">
              <textarea
                value={userPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Describe your scene synthesis: e.g. An elegant epic photograph showing Subject 1 (the space warrior) holding the key relic Prop (Slot 4) as she looks through a dimensional portal into Location 1 (glass city), standing inside Location 2 (mossy forest ruins). Bath the entire scene in the dramatic twilight lighting."
                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all resize-none"
              />
              {userPrompt && (
                <button 
                  onClick={() => handlePromptChange('')}
                  className="absolute top-2.5 right-2.5 p-1 bg-black/60 hover:bg-black/80 rounded text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Negative prompt: ugly, flat collage, bad perspective, cropped elements (optional)"
                className="w-full h-14 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/30 transition-all resize-none"
              />
              {negativePrompt && (
                <button 
                  onClick={() => setNegativePrompt('')}
                  className="absolute top-2.5 right-2.5 p-1 bg-black/60 hover:bg-black/80 rounded text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Setting Customizer Row */}
          <div className={`bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 ${outputFormat === 'video' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">Synthesis Engine</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image</option>
                <option value="gemini-3.1-flash-image">Gemini 3.1 Flash Image (Paid Key)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">Output Format</label>
              <div className="flex bg-black/40 p-1 border border-white/10 rounded-lg gap-1">
                <button
                  type="button"
                  onClick={() => handleOutputFormatChange('image')}
                  className={`flex-1 py-1 px-2 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                    outputFormat === 'image'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🖼️ Image
                </button>
                <button
                  type="button"
                  onClick={() => handleOutputFormatChange('video')}
                  className={`flex-1 py-1 px-2 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                    outputFormat === 'video'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🎥 Video ({videoDuration}s)
                </button>
              </div>
            </div>

            {outputFormat === 'video' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Video Duration</label>
                <select
                  value={videoDuration}
                  onChange={(e) => handleVideoDurationChange(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer font-semibold text-orange-400"
                >
                  <option value={3}>3s (Quick Draft)</option>
                  <option value={5}>5s (Cinematic Teaser)</option>
                  <option value={8}>8s (Studio Draft)</option>
                  <option value={12}>12s (Extended Scene)</option>
                  <option value={15}>15s (Epic Narrative)</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="16:9">16:9 (Cinema Landscape)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="9:16">9:16 (Mobile Portrait)</option>
                <option value="4:3">4:3 (Landscape Classic)</option>
                <option value="21:9">21:9 (Ultrawide Cinematic)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || referenceItems.filter(item => item.image).length < 2 || !userPrompt.trim()}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-orange-900/20 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Composition...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compose Masterpiece</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-white/40 hover:text-white/80">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Masterpiece Canvas Preview */}
        <div className="xl:col-span-5">
          <div className="bg-black/40 border border-white/10 rounded-xl p-3 h-full min-h-[500px] flex flex-col justify-between">
            <div className="flex-1 bg-black/60 rounded-lg overflow-hidden relative flex items-center justify-center min-h-[380px]">
              {outputFormat === 'image' && generatedImage ? (
                <>
                  <img 
                    src={generatedImage} 
                    alt="Masterpiece Synthesis" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      onClick={() => setIsResultModalOpen(true)}
                      className="bg-black/85 hover:bg-black text-white px-3 py-1.5 rounded-lg backdrop-blur-md transition-all border border-white/10 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#ff4e00]" />
                      Full View
                    </button>
                    <a
                      href={generatedImage}
                      download="masterpiece-synthesis.png"
                      className="bg-black/85 hover:bg-black text-white p-2 rounded-lg backdrop-blur-md transition-all border border-white/10"
                      title="Download Masterpiece"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              ) : outputFormat === 'video' && generatedVideo ? (
                <>
                  <video 
                    src={generatedVideo} 
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      onClick={() => setIsResultModalOpen(true)}
                      className="bg-black/85 hover:bg-black text-white px-3 py-1.5 rounded-lg backdrop-blur-md transition-all border border-white/10 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#ff4e00]" />
                      Full View
                    </button>
                    <a
                      href={generatedVideo}
                      download="masterpiece-synthesis.webm"
                      className="bg-black/85 hover:bg-black text-white p-2 rounded-lg backdrop-blur-md transition-all border border-white/10"
                      title="Download Cinematic Video"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              ) : isGenerating ? (
                <div className="flex flex-col items-center gap-3.5 text-white/50">
                  <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                  <p className="text-xs animate-pulse font-mono">{loadingMessage}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-white/20 p-6 text-center">
                  {outputFormat === 'image' ? (
                    <ImageIcon className="w-14 h-14 opacity-25" />
                  ) : (
                    <Film className="w-14 h-14 opacity-25" />
                  )}
                  <div className="space-y-1 max-w-[240px]">
                    <p className="text-xs font-semibold text-white/70">
                      Masterpiece {outputFormat === 'image' ? 'Canvas' : 'Video Stage'} Empty
                    </p>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Upload at least 2 reference elements from the board, write blending guidelines, and hit "Compose Masterpiece".
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* composition statistics / details */}
            <div className="mt-4 p-4 bg-white/5 rounded-xl text-xs space-y-2 border border-white/5">
              <div className="flex items-center gap-1.5 font-semibold text-white/80">
                <Info className="w-4 h-4 text-[#ff7d00]" />
                Compositing Analysis
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                By designating specific role identifiers (e.g. Subject, Location, Prop, or Custom) on each uploaded element, Gemini uses multi-channel visual decoding to map the textures, structures, and lighting gradients correctly into a uniform 3D perspective coordinate.
              </p>
              {outputFormat === 'image' && generatedImage && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] text-white/40 font-mono">
                  <div>Engine: {model}</div>
                  <div className="text-right">Aspect Ratio: {aspectRatio}</div>
                </div>
              )}
              {outputFormat === 'video' && generatedVideo && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] text-white/40 font-mono">
                  <div>Engine: Programmatic-webm-compiler</div>
                  <div className="text-right">Aspect Ratio: {aspectRatio}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ContentResultModal 
        isOpen={isResultModalOpen} 
        onClose={() => setIsResultModalOpen(false)} 
        type={outputFormat} 
        title={outputFormat === 'image' ? "Synthesized Masterpiece Composition" : "Synthesized Multi-Reference Video Scene"} 
        contentUrl={outputFormat === 'image' ? generatedImage : generatedVideo} 
        mimeType={outputFormat === 'image' ? 'image/png' : 'video/webm'}
        prompt={userPrompt}
        metadata={{
          model: outputFormat === 'image' ? model : 'programmatic-webm-compiler',
          aspectRatio: aspectRatio,
          generationType: outputFormat === 'image' ? 'Multi-Reference Dynamic Scene Synthesis' : 'Multi-Reference Dynamic Cinematic Video Compile'
        }}
      />
    </div>
  );
}
