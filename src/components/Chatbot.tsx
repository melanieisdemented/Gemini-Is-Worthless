import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, ThinkingLevel } from '@google/genai';
import { Send, Loader2, Search, MapPin, Brain, Image as ImageIcon, X } from 'lucide-react';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  image?: { data: string; mimeType: string; url: string };
}

export function Chatbot({ onSaveGeneration }: { onSaveGeneration?: (type: string, prompt: string, url?: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your AI assistant. I can search the web, check Google Maps, analyze images, and solve complex problems. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [useMaps, setUseMaps] = useState(false);
  const [highThinking, setHighThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setImage({
        data: base64String,
        mimeType: file.type,
        url: URL.createObjectURL(file)
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = image;
    setInput('');
    setImage(null);
    setMessages(prev => [...prev, { role: 'user', text: userMessage, image: currentImage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key is missing.");

      const ai = new GoogleGenAI({ apiKey });
      
      const tools = [];
      if (useSearch && !useMaps) tools.push({ googleSearch: {} });
      if (useMaps && !useSearch) tools.push({ googleMaps: {} });

      const config: any = {
        systemInstruction: "You are a helpful, highly intelligent AI assistant.",
      };

      if (tools.length > 0) {
        config.tools = tools;
        config.toolConfig = { includeServerSideToolInvocations: true };
      }

      if (highThinking) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const modelName = highThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";

      // Convert history to contents format
      const contents = messages.map(m => {
        const parts: any[] = [];
        if (m.image) {
          parts.push({ inlineData: { data: m.image.data, mimeType: m.image.mimeType } });
        }
        parts.push({ text: m.text });
        return { role: m.role, parts };
      });
      
      const newParts: any[] = [];
      if (currentImage) {
        newParts.push({ inlineData: { data: currentImage.data, mimeType: currentImage.mimeType } });
      }
      if (userMessage) {
        newParts.push({ text: userMessage });
      } else {
        newParts.push({ text: "Please analyze this image." });
      }
      contents.push({ role: 'user', parts: newParts });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config
      });

      let responseText = response.text || "I couldn't generate a response.";
      
      // Extract URLs if grounding was used
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        responseText += "\n\n**Sources:**\n";
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            responseText += `- [${chunk.web.title}](${chunk.web.uri})\n`;
          } else if (chunk.maps?.uri) {
            responseText += `- [Google Maps](${chunk.maps.uri})\n`;
          }
        });
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      if (onSaveGeneration) {
        onSaveGeneration('chat', userMessage || 'Image Analysis', '');
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message || 'Something went wrong.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
        <h3 className="font-medium flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Gemini Assistant
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => { setUseSearch(!useSearch); if (!useSearch) setUseMaps(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${useSearch ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-white/50 border border-white/10'}`}
          >
            <Search className="w-3.5 h-3.5" /> Search
          </button>
          <button 
            onClick={() => { setUseMaps(!useMaps); if (!useMaps) setUseSearch(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${useMaps ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-white/5 text-white/50 border border-white/10'}`}
          >
            <MapPin className="w-3.5 h-3.5" /> Maps
          </button>
          <button 
            onClick={() => setHighThinking(!highThinking)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${highThinking ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/50 border border-white/10'}`}
          >
            <Brain className="w-3.5 h-3.5" /> High Thinking
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
              {msg.image && (
                <img src={msg.image.url} alt="Uploaded" className="max-w-full rounded-lg mb-3 max-h-[300px] object-contain" />
              )}
              <div className="text-sm leading-relaxed markdown-body">
                <Markdown>{msg.text}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white rounded-2xl p-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm opacity-70">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-black/20">
        {image && (
          <div className="mb-3 relative inline-block">
            <img src={image.url} alt="Preview" className="h-20 rounded-lg border border-white/20" />
            <button 
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/5 border border-white/10 text-white p-3 rounded-xl hover:bg-white/10 transition-colors"
            title="Upload Image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
          />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !image) || isLoading}
            className="bg-white text-black p-3 rounded-xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
