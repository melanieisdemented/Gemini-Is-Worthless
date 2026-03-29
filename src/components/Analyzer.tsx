import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Upload, FileVideo, Image as ImageIcon, Search, Flag, CheckCircle2 } from 'lucide-react';
import Markdown from 'react-markdown';

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

export function Analyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a file first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key is missing.");

      const ai = new GoogleGenAI({ apiKey });
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const defaultPrompt = file.type.startsWith('video/') 
        ? "Analyze this video and describe the key events, subjects, and any important information."
        : "Analyze this image in detail. Describe the subjects, setting, lighting, and any text or notable elements.";

      const finalPrompt = prompt.trim() || defaultPrompt;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            },
            { text: finalPrompt }
          ]
        }
      });

      const responseText = response.text || "No analysis generated.";
      setResult(responseText);
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
          setError(err.message || "Failed to analyze the file.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-medium">Analyze Media</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Upload an image or video and use Gemini 3.1 Pro to analyze its contents, extract information, or answer questions about it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:bg-white/5 hover:border-white/40 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden" 
            />
            
            {previewUrl ? (
              file?.type.startsWith('video/') ? (
                <video src={previewUrl} controls className="max-h-[250px] rounded-lg" />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-h-[250px] rounded-lg object-contain" />
              )
            ) : (
              <div className="flex flex-col items-center gap-4 text-white/50">
                <div className="flex gap-4">
                  <ImageIcon className="w-8 h-8" />
                  <FileVideo className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-medium text-white/80">Click to upload media</p>
                  <p className="text-sm mt-1">Supports images and videos</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Analysis Prompt (Optional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a specific question about the media, or leave blank for a general description..."
              className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !file}
            className="w-full py-3 px-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze Media
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex flex-col items-start">
              {error}
              <ReportIssueButton error={error} />
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px] flex flex-col">
          <h4 className="text-sm font-medium text-white/80 uppercase tracking-wider mb-4">Analysis Result</h4>
          
          <div className="flex-1 overflow-y-auto">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-white/50">
                <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                <p className="text-sm">Gemini is analyzing your media...</p>
              </div>
            ) : result ? (
              <div className="text-sm leading-relaxed text-white/90 markdown-body">
                <Markdown>{result}</Markdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-white/30">
                <Search className="w-12 h-12 opacity-50" />
                <p className="text-sm text-center max-w-[250px]">
                  Upload an image or video and click analyze to see the results here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
