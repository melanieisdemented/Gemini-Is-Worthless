import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Image as ImageIcon, Download, Sparkles, Settings2, Upload, X, Search } from 'lucide-react';

export function ImageGenerator({ onSaveGeneration }: { onSaveGeneration?: (type: string, prompt: string, url?: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [usePro, setUsePro] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
            { text: "Analyze this image in detail and write a highly descriptive prompt that could be used to recreate this exact scene, including the subjects, setting, lighting, atmosphere, and camera angle. Be concise but thorough." }
          ]
        }
      });
      setPrompt(prev => prev ? `${prev}\n\n${response.text}` : response.text || "");
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "Failed to analyze the image.");
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

      const parts: any[] = [];
      if (referenceImage) {
        parts.push({
          inlineData: {
            data: referenceImage.data,
            mimeType: referenceImage.mimeType
          }
        });
      }
      parts.push({ text: prompt });

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
      } else if (onSaveGeneration) {
        onSaveGeneration('image', prompt, '');
      }

    } catch (err: any) {
      console.error("Image generation error:", err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium">Generate Images</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Create high-quality images from text prompts. Choose between fast generation or studio-quality Pro models.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Reference Image (Optional)</label>
            <div 
              className={`relative aspect-video rounded-xl border-2 border-dashed overflow-hidden transition-colors ${referenceImage ? 'border-white/20' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
            >
              {referenceImage ? (
                <>
                  <img src={referenceImage.url} alt="Reference" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors flex items-center gap-2 text-xs font-medium disabled:opacity-50"
                      title="Analyze image to generate prompt"
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      {isAnalyzing ? 'Analyzing...' : 'Auto-Prompt'}
                    </button>
                    <button 
                      onClick={() => setReferenceImage(null)}
                      className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-colors"
                      title="Clear image"
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
                  <span className="text-xs text-white/50">Click to upload</span>
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
            <label className="text-sm font-medium text-white/80">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic city at sunset, cyberpunk style..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4 text-white/60" />
              <h4 className="text-sm font-medium">Settings</h4>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Model</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsePro(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${!usePro ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
                >
                  Flash (Fast)
                </button>
                <button
                  onClick={() => setUsePro(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${usePro ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
                >
                  Pro (HQ)
                </button>
              </div>
            </div>

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
              <label className="text-xs font-medium text-white/60">Resolution</label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 px-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Generate Image
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl aspect-square md:aspect-auto md:h-full flex items-center justify-center overflow-hidden relative min-h-[400px]">
            {generatedImage ? (
              <>
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <a
                  href={generatedImage}
                  download="generated-image.png"
                  className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full backdrop-blur-md transition-colors"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </a>
              </>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-white/50">
                <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                <p className="text-sm">Creating your masterpiece...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-white/30">
                <ImageIcon className="w-12 h-12 opacity-50" />
                <p className="text-sm">Your generated image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
