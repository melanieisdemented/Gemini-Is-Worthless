import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon, Download, Sparkles, Settings2, Upload, X, Search, Flag, CheckCircle2 } from 'lucide-react';

const ReportIssueButton = ({ error }: { error: string }) => {
  const [reported, setReported] = useState(false);
  return (
    <button
      onClick={() => {
        console.error("REPORTED ISSUE TO SUPERVISOR:", error);
        setReported(true);
        setTimeout(() => setReported(false), 3000);
      }}
      className="ml-auto flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs transition-colors mt-2"
    >
      {reported ? <CheckCircle2 className="w-3 h-3" /> : <Flag className="w-3 h-3" />}
      {reported ? 'Reported' : 'Report Issue'}
    </button>
  );
};

export function ImageGenerator() {
  const [activeTab, setActiveTab] = useState<'txt2img' | 'img2img'>('txt2img');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [usePro, setUsePro] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [controlMode, setControlMode] = useState('standard');
  const [lightingCondition, setLightingCondition] = useState('Cinematic studio lighting, warm directional sunlight, neon rim lights');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setReferenceImage({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!referenceImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key is missing.");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } },
            { text: "Analyze this image in detail and write a highly descriptive prompt that could be used to recreate this exact scene. Include subjects, setting, lighting, atmosphere, and camera angle. Output ONLY the prompt text, comma separated like a standard stable diffusion prompt." }
          ]
        }
      });
      setPrompt(prev => prev ? `${prev}, ${response.text}` : response.text || "");
    } catch (err: any) {
      console.error("Analysis error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap")) {
          setError("You have exceeded your API quota or spending cap. Please select a valid API key with billing enabled.");
          if (window.aistudio?.openSelectKey) {
             window.aistudio.openSelectKey();
          }
      } else {
          setError(err.message || "Failed to analyze the image.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Check for user-selected API key if using Pro model or Flash Image Preview
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
           await window.aistudio.openSelectKey();
           // Assume success after opening
        }
      }

      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key is missing.");

      const ai = new GoogleGenAI({ apiKey });
      const modelName = usePro ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';

      let finalPrompt = prompt;
      
      if (activeTab === 'img2img' && referenceImage) {
        if (controlMode === 'relight') {
          finalPrompt = `[IC-Light / Relighting Task] Strictly maintain the exact geometry, identity, and composition of the reference image. Completely replace the lighting with: ${lightingCondition}. ${prompt ? 'Additional details: ' + prompt : ''}`;
        } else if (controlMode === 'structure') {
          finalPrompt = `[ControlNet / Depth Task] Use the reference image strictly as a structural depth map and composition guide. Generate a completely new image based on this prompt: "${prompt}". The new image MUST perfectly match the shapes, poses, and layout of the reference.`;
        } else if (controlMode === 'material') {
          finalPrompt = `[Intrinsic / Material Task] Keep the exact same lighting, shadows, and geometry of the reference image. Change the materials and textures of the subjects to match this description: "${prompt}".`;
        } else if (controlMode === 'perspective') {
          finalPrompt = `[RISE / Novel View Synthesis Task] Keep the exact same subjects, style, and lighting of the reference image, but change the camera angle and perspective to: "${prompt}".`;
        } else if (controlMode === 'instruct') {
          finalPrompt = `[InstructPix2Pix Task] Apply the following editing instruction to the reference image: "${prompt}". Keep everything else exactly the same.`;
        } else if (controlMode === 'style') {
          finalPrompt = `[Style Transfer Task] Use the reference image STRICTLY for its visual style, color palette, and artistic medium. Do not copy its subjects or composition. Generate a completely new image of: "${prompt}" matching the exact style of the reference.`;
        }
      }

      if (stylePreset !== 'none') {
        finalPrompt = `${stylePreset} style. ${finalPrompt}`;
      }
      if (negativePrompt.trim()) {
        finalPrompt = `${finalPrompt}. Do not include: ${negativePrompt}`;
      }

      const parts: any[] = [];
      if (activeTab === 'img2img' && referenceImage) {
        parts.push({
          inlineData: {
            data: referenceImage.data,
            mimeType: referenceImage.mimeType
          }
        });
      }
      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: parts
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize
          }
        }
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            setGeneratedImage(imageUrl);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("No image was returned by the model.");
      }

    } catch (err: any) {
      console.error("Image generation error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap")) {
          setError("You have exceeded your API quota or spending cap. Please select a valid API key with billing enabled.");
          if (window.aistudio?.openSelectKey) {
             window.aistudio.openSelectKey();
          }
      } else {
          setError(err.message || "Failed to generate image.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getPromptPlaceholder = () => {
    if (activeTab === 'txt2img') return "Prompt (e.g. a futuristic city at sunset, cyberpunk style, masterpiece, best quality...)";
    switch (controlMode) {
      case 'instruct': return "Instruction (e.g. make it winter, swap the apple for a pear...)";
      case 'relight': return "Additional details (optional, e.g. add a lens flare)";
      case 'structure': return "Prompt for the new image (e.g. a futuristic city, cyberpunk style)";
      case 'material': return "Material description (e.g. made of solid gold, knitted yarn)";
      case 'perspective': return "New perspective (e.g. viewed from above, drone shot, extreme close-up)";
      case 'style': return "Prompt for the new image (e.g. a cat sitting on a wall)";
      default: return "Prompt (e.g. a futuristic city at sunset, cyberpunk style...)";
    }
  };

  return (
    <div className="space-y-4">
      {/* A1111-style Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('txt2img')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'txt2img' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
        >
          txt2img
        </button>
        <button
          onClick={() => setActiveTab('img2img')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'img2img' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
        >
          img2img
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompts & Settings */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Prompt Area */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <div className="relative">
                <textarea
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={getPromptPlaceholder()}
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
                {prompt && (
                  <button 
                    onClick={() => setPrompt('')}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <div className="relative">
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Negative prompt (e.g. ugly, blurry, low quality, bad anatomy...)"
                  className="w-full h-16 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-500/30 transition-colors resize-none"
                />
                {negativePrompt && (
                  <button 
                    onClick={() => setNegativePrompt('')}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Generate Button (A1111 style big button on right) */}
            <div className="w-32 flex flex-col gap-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1 shadow-lg shadow-orange-900/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-sm">Generating</span>
                  </>
                ) : (
                  <>
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-6">
            
            {/* img2img specific area */}
            {activeTab === 'img2img' && (
              <div className="space-y-2 pb-4 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white/80">Image for img2img</label>
                  {referenceImage && (
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      Interrogate CLIP
                    </button>
                  )}
                </div>
                
                <div 
                  className={`relative aspect-video max-h-64 rounded-lg border-2 border-dashed overflow-hidden transition-colors flex items-center justify-center ${referenceImage ? 'border-white/20 bg-black/40' : 'border-white/10 hover:border-white/30 bg-black/20'}`}
                >
                  {referenceImage ? (
                    <>
                      <img src={referenceImage.url} alt="Reference" className="max-w-full max-h-full object-contain" />
                      <button 
                        onClick={() => setReferenceImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div 
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-white/30 mb-2" />
                      <span className="text-sm text-white/50">Drop image here or click to upload</span>
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
                
                {referenceImage && (
                  <div className="pt-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-white/60">Control Mode</label>
                      <select
                        value={controlMode}
                        onChange={(e) => setControlMode(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                      >
                        <option value="standard">Standard (img2img)</option>
                        <option value="instruct">Instruct Edit (InstructPix2Pix)</option>
                        <option value="relight">Relight (IC-Light / HDRIs)</option>
                        <option value="structure">Structure Control (ControlNet / MiDaS)</option>
                        <option value="material">Material Edit (Intrinsic / NeRFactor)</option>
                        <option value="perspective">Novel View (RISE)</option>
                        <option value="style">Style Transfer (Reference-Only)</option>
                      </select>
                    </div>

                    {controlMode === 'relight' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <label className="text-xs font-medium text-white/60">Lighting Condition</label>
                        <input
                          type="text"
                          value={lightingCondition}
                          onChange={(e) => setLightingCondition(e.target.value)}
                          placeholder="e.g., Golden hour, cinematic studio lighting..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Quick Tasks</label>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setControlMode('standard'); setPrompt("Colorize this grayscale image realistically, adding natural, historically accurate, and vibrant colors."); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 transition-colors">🎨 Colorize</button>
                        <button onClick={() => { setControlMode('standard'); setPrompt("Restore this image, removing JPEG artifacts, noise, scratches, and blur. Make it sharp, clear, and high resolution."); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 transition-colors">✨ Restore</button>
                        <button onClick={() => { setControlMode('standard'); setPrompt("Uncrop and extend the borders of this image naturally, filling in the missing context seamlessly."); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 transition-colors">🖼️ Uncrop</button>
                        <button onClick={() => { setControlMode('instruct'); setPrompt("Make it look like a snowy winter day."); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 transition-colors">❄️ Winterize</button>
                        <button onClick={() => { setControlMode('perspective'); setPrompt("View from a high angle, drone shot looking down."); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 transition-colors">🚁 Drone View</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generation Parameters */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Model Checkpoint</label>
                  <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setUsePro(false)}
                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${!usePro ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
                    >
                      Flash (Fast)
                    </button>
                    <button
                      onClick={() => setUsePro(true)}
                      className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${usePro ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white/80'}`}
                    >
                      Pro (HQ)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Style Preset</label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  >
                    <option value="none">None</option>
                    <option value="Photorealistic">Photorealistic</option>
                    <option value="Anime">Anime</option>
                    <option value="Digital Art">Digital Art</option>
                    <option value="Cinematic">Cinematic</option>
                    <option value="3D Render">3D Render</option>
                    <option value="Cyberpunk">Cyberpunk</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Landscape)</option>
                    <option value="3:4">3:4 (Portrait)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/60">Resolution (Highres. fix)</label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  >
                    <option value="1K">1K (Standard)</option>
                    <option value="2K">2K (High)</option>
                    <option value="4K">4K (Ultra)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex flex-col items-start">
              {error}
              <ReportIssueButton error={error} />
            </div>
          )}
        </div>

        {/* Right Column: Output Gallery */}
        <div className="lg:col-span-5">
          <div className="bg-black/40 border border-white/10 rounded-xl p-2 h-full min-h-[500px] flex flex-col">
            <div className="flex-1 bg-black/60 rounded-lg overflow-hidden relative flex items-center justify-center">
              {generatedImage ? (
                <>
                  <img 
                    src={generatedImage} 
                    alt="Generated" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <a
                      href={generatedImage}
                      download="generated-image.png"
                      className="bg-black/80 hover:bg-black text-white p-2 rounded-lg backdrop-blur-md transition-colors border border-white/10"
                      title="Save"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </>
              ) : isGenerating ? (
                <div className="flex flex-col items-center gap-4 text-white/50">
                  <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                  <p className="text-sm">Generating...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-white/20">
                  <ImageIcon className="w-16 h-16 opacity-20" />
                  <p className="text-sm">Waiting for generation</p>
                </div>
              )}
            </div>
            
            {/* A1111 style info panel below image */}
            {generatedImage && (
              <div className="mt-2 p-3 bg-white/5 rounded-lg text-xs text-white/60 font-mono break-words">
                <p><span className="text-white/40">Prompt:</span> {prompt}</p>
                {negativePrompt && <p><span className="text-white/40">Negative prompt:</span> {negativePrompt}</p>}
                <p className="mt-2 text-white/40">
                  Model: {usePro ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview'}, 
                  Size: {imageSize}, 
                  Aspect Ratio: {aspectRatio}
                  {stylePreset !== 'none' ? `, Style: ${stylePreset}` : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
