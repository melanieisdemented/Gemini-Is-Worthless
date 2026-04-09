import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Music, Mic, Loader2, AlertCircle, Play, Download, Flag, CheckCircle2, Radio } from 'lucide-react';
import { LiveVoice } from './LiveVoice';
import { useAppStore } from '../store';
import { saveFile, getFile } from '../lib/db';

const ReportIssueButton = ({ error }: { error: string }) => {
  const [reported, setReported] = useState(false);
  return (
    <button
      onClick={() => {
        console.error("REPORTED ISSUE TO SUPERVISOR:", error);
        setReported(true);
        setTimeout(() => setReported(false), 3000);
      }}
      className="ml-auto flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs transition-colors"
    >
      {reported ? <CheckCircle2 className="w-3 h-3" /> : <Flag className="w-3 h-3" />}
      {reported ? 'Reported' : 'Report Issue'}
    </button>
  );
};

export function AudioGenerator() {
  const { audioPrompt: prompt, setAudioPrompt: setPrompt, audioVoice: voice, setAudioVoice: setVoice } = useAppStore();
  const [mode, setMode] = useState<'music' | 'tts' | 'live'>('music');
  const [musicDuration, setMusicDuration] = useState<'clip' | 'pro'>('clip');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    const loadAudio = async () => {
      const a = await getFile('audioGeneratorGeneratedAudio');
      if (a) {
        setGeneratedAudioUrl(`data:${a.mimeType};base64,${a.data}`);
      }
    };
    loadAudio();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAudioUrl(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");

      const ai = new GoogleGenAI({ apiKey });

      if (mode === 'music') {
        const model = musicDuration === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';
        const response = await ai.models.generateContentStream({
          model,
          contents: prompt,
        });

        let audioBase64 = "";
        let mimeType = "audio/wav";

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
          }
        }

        if (!audioBase64) throw new Error("No audio generated.");

        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);
        setGeneratedAudioUrl(audioUrl);
        await saveFile('audioGeneratorGeneratedAudio', audioBase64, mimeType);

      } else if (mode === 'tts') {
        // TTS
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio generated.");

        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = bytes.length;
        const chunkSize = 36 + dataSize;
        
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        
        const writeString = (view: DataView, offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, chunkSize, true);
        writeString(view, 8, 'WAVE');
        
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        
        const pcmData = new Uint8Array(buffer, 44);
        pcmData.set(bytes);
        
        const blob = new Blob([buffer], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        setGeneratedAudioUrl(audioUrl);
        
        // Convert buffer to base64 for storage
        const base64AudioData = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        await saveFile('audioGeneratorGeneratedAudio', base64AudioData, 'audio/wav');
      }

    } catch (err: any) {
      console.error("Audio generation error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap") || errorMessage.includes("entity was not found") || errorMessage.includes("403") || errorMessage.includes("permission")) {
          setError("You have exceeded your API quota or spending cap, or your API key is invalid. Please check your GEMINI_API_KEY.");
      } else {
          setError(err.message || "An unexpected error occurred during audio generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Music className="w-5 h-5 text-pink-400" />
          <h3 className="text-lg font-medium">Audio & Music Generation</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Generate music tracks using Lyria, convert text to speech using Gemini TTS, or have a live voice conversation.
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode('music')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'music' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Music className="w-4 h-4" />
          Music
        </button>
        <button
          onClick={() => setMode('tts')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'tts' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Mic className="w-4 h-4" />
          Speech
        </button>
        <button
          onClick={() => setMode('live')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'live' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          <Radio className="w-4 h-4" />
          Live Voice
        </button>
      </div>

      {mode === 'live' ? (
        <LiveVoice />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 uppercase tracking-wider">
              {mode === 'music' ? 'Music Prompt' : 'Text to Speak'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === 'music' ? "e.g., A cinematic orchestral track with a driving beat..." : "Enter the text you want to convert to speech..."}
              className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {mode === 'music' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Duration</label>
              <select
                value={musicDuration}
                onChange={(e) => setMusicDuration(e.target.value as 'clip' | 'pro')}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30"
              >
                <option value="clip">Short Clip (up to 30s)</option>
                <option value="pro">Full-length Track</option>
              </select>
            </div>
          )}

          {mode === 'tts' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30"
              >
                <option value="Kore">Kore</option>
                <option value="Puck">Puck</option>
                <option value="Charon">Charon</option>
                <option value="Fenrir">Fenrir</option>
                <option value="Zephyr">Zephyr</option>
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
              <ReportIssueButton error={error} />
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Audio...
              </>
            ) : (
              <>
                {mode === 'music' ? <Music className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                Generate {mode === 'music' ? 'Music' : 'Speech'}
              </>
            )}
          </button>
        </div>
      )}

      {generatedAudioUrl && !isGenerating && mode !== 'live' && (
        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <h3 className="text-lg font-medium text-center">Generated Audio</h3>
          <audio controls src={generatedAudioUrl} className="w-full" autoPlay />
          <div className="flex justify-center">
            <a
              href={generatedAudioUrl}
              download={`generated-${mode}.wav`}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Audio
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
