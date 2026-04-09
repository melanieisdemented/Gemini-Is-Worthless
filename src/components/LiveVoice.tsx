import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Loader2, AlertCircle, Flag, CheckCircle2, StopCircle } from 'lucide-react';
import { useAppStore } from '../store';

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

export function LiveVoice() {
  const { liveVoiceVoice: voice, setLiveVoiceVoice: setVoice, liveVoiceTranscript: transcript, setLiveVoiceTranscript: setTranscript } = useAppStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef<boolean>(false);

  const connectLive = async () => {
    setIsConnecting(true);
    setError(null);
    setTranscript([]);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");

      const ai = new GoogleGenAI({ apiKey });

      // Setup AudioContext
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // We need an AudioWorklet to capture audio. For simplicity, we can use ScriptProcessor if Worklet is too complex to inline,
      // but ScriptProcessor is deprecated. Let's try to use MediaRecorder or just standard Web Audio API.
      // Actually, the prompt says "Implement audio capture, encoding, decoding, and playback logic using Web Audio API."
      // Let's use a simple ScriptProcessorNode for capturing PCM 16kHz.
      
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1,
        sampleRate: 16000,
      } });

      const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            processor.onaudioprocess = (e) => {
              if (!isConnected) return;
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Convert to base64
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              nextPlayTimeRef.current = audioContextRef.current?.currentTime || 0;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const binary = atob(base64Audio);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              // Convert Int16 to Float32
              const pcm16 = new Int16Array(bytes.buffer);
              const float32 = new Float32Array(pcm16.length);
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
              }
              
              audioQueueRef.current.push(float32);
              playNextAudio();
            }

            // Handle transcription if available
            // Note: The prompt says outputAudioTranscription and inputAudioTranscription can be enabled.
            // But the types might not be fully exposed in the message object directly, or they might be in modelTurn/userTurn.
            // For simplicity, we'll just log or handle if we find text.
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            disconnectLive();
          },
          onclose: () => {
            disconnectLive();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          systemInstruction: "You are a helpful voice assistant.",
        },
      });

      sessionRef.current = { sessionPromise, processor, source };

    } catch (err: any) {
      console.error("Live API setup error:", err);
      const errorString = typeof err === 'string' ? err : JSON.stringify(err, Object.getOwnPropertyNames(err));
      const errorMessage = errorString.toLowerCase();
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted") || errorMessage.includes("spending cap") || errorMessage.includes("entity was not found") || errorMessage.includes("403") || errorMessage.includes("permission")) {
          setError("You have exceeded your API quota or spending cap, or your API key is invalid. Please check your GEMINI_API_KEY.");
      } else {
          setError(err.message || "Failed to connect to Live API.");
      }
      setIsConnecting(false);
      disconnectLive();
    }
  };

  const playNextAudio = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) return;

    const audioData = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
    
    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      }
    };
  };

  const disconnectLive = () => {
    setIsConnected(false);
    setIsConnecting(false);
    
    if (sessionRef.current) {
      sessionRef.current.processor?.disconnect();
      sessionRef.current.source?.disconnect();
      sessionRef.current.sessionPromise.then((session: any) => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      }).catch(console.error);
      sessionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      disconnectLive();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Mic className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-medium">Live Voice Conversation</h3>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          Have a real-time voice conversation with Gemini using the Live API.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70 uppercase tracking-wider">Assistant Voice</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            disabled={isConnected || isConnecting}
            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 disabled:opacity-50"
          >
            <option value="Zephyr">Zephyr</option>
            <option value="Kore">Kore</option>
            <option value="Puck">Puck</option>
            <option value="Charon">Charon</option>
            <option value="Fenrir">Fenrir</option>
          </select>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
            <ReportIssueButton error={error} />
          </div>
        )}

        <div className="flex justify-center py-8">
          {!isConnected ? (
            <button
              onClick={connectLive}
              disabled={isConnecting}
              className="w-32 h-32 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex flex-col items-center justify-center gap-2 hover:bg-green-500/30 transition-all disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-medium">Connecting...</span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8" />
                  <span className="text-sm font-medium">Start Call</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={disconnectLive}
              className="w-32 h-32 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex flex-col items-center justify-center gap-2 hover:bg-red-500/30 transition-all animate-pulse"
            >
              <StopCircle className="w-8 h-8" />
              <span className="text-sm font-medium">End Call</span>
            </button>
          )}
        </div>
        
        {isConnected && (
          <div className="text-center text-white/60 text-sm animate-pulse">
            Listening and speaking...
          </div>
        )}
      </div>
    </div>
  );
}
