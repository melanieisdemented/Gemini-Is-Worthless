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
  Type
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

  const addNewItem = () => {
    const newId = `ref-${Date.now()}`;
    const newItem: ReferenceItem = {
      id: newId,
      role: 'subject',
      description: '',
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
    setGeneratedImage(null);
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

The user wants to synthesize these references into a single cohesive, high-quality composite image with this instruction:
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
      console.log("Synthesized image prompt from analysis:", synthesizedPromptText);

      // 2. High-fidelity image synthesis using gemini-2.5-flash-image / gemini-3.1-flash-image
      setLoadingMessage('Synthesizing complex multi-element 3D environment...');

      // Note: Passing multiple input images directly to an image generation model in contents: { parts }
      // triggers multimodal text-generation rather than image generation. 
      // Thus, we use the highly descriptive synthesized prompt text generated by the stage 1 Art Director
      // to perform high-fidelity image synthesis.
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
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white/90 uppercase tracking-wider block">Reference Elements Board</span>
                <span className="text-[11px] text-white/40 block">Create reference slots dynamically to compose rich scene dependencies</span>
              </div>
              <button
                onClick={addNewItem}
                className="px-3 py-1.5 bg-[#ff4e00]/10 hover:bg-[#ff4e00]/25 text-[#ff7d00] rounded-lg text-xs font-bold border border-[#ff4e00]/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Element
              </button>
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
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {generatedImage ? (
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
              ) : isGenerating ? (
                <div className="flex flex-col items-center gap-3.5 text-white/50">
                  <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                  <p className="text-xs animate-pulse font-mono">{loadingMessage}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-white/20 p-6 text-center">
                  <ImageIcon className="w-14 h-14 opacity-25" />
                  <div className="space-y-1 max-w-[240px]">
                    <p className="text-xs font-semibold text-white/70">Masterpiece Canvas Empty</p>
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
              {generatedImage && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] text-white/40 font-mono">
                  <div>Engine: {model}</div>
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
        type="image" 
        title="Synthesized Masterpiece Composition" 
        contentUrl={generatedImage} 
        mimeType="image/png"
        prompt={userPrompt}
        metadata={{
          model: model,
          aspectRatio: aspectRatio,
          generationType: 'Multi-Reference Dynamic Scene Synthesis'
        }}
      />
    </div>
  );
}
