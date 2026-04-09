import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Global
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Image Generator
  imagePrompt: string;
  imageNegativePrompt: string;
  imageAspectRatio: string;
  imageControlMode: string;
  imageLightingCondition: string;
  imageStylePreset: string;
  setImagePrompt: (p: string) => void;
  setImageNegativePrompt: (p: string) => void;
  setImageAspectRatio: (ar: string) => void;
  setImageControlMode: (m: string) => void;
  setImageLightingCondition: (l: string) => void;
  setImageStylePreset: (s: string) => void;

  // Video Generator
  videoPrompt: string;
  videoAspectRatio: '16:9' | '9:16';
  videoModel: 'veo-3.1-lite-generate-preview' | 'veo-3.1-generate-preview';
  videoResolution: '720p' | '1080p' | '4k';
  videoDuration: number;
  setVideoPrompt: (p: string) => void;
  setVideoAspectRatio: (ar: '16:9' | '9:16') => void;
  setVideoModel: (m: 'veo-3.1-lite-generate-preview' | 'veo-3.1-generate-preview') => void;
  setVideoResolution: (r: '720p' | '1080p' | '4k') => void;
  setVideoDuration: (d: number) => void;

  // Chatbot
  chatInput: string;
  chatUseSearch: boolean;
  chatUseMaps: boolean;
  chatMessages: any[];
  setChatInput: (s: string) => void;
  setChatUseSearch: (b: boolean) => void;
  setChatUseMaps: (b: boolean) => void;
  setChatMessages: (m: any[]) => void;

  // Analyzer
  analyzerPrompt: string;
  setAnalyzerPrompt: (p: string) => void;

  // Audio Generator
  audioPrompt: string;
  audioVoice: string;
  setAudioPrompt: (p: string) => void;
  setAudioVoice: (v: string) => void;

  // App.tsx (Alternate Angles)
  anglePrompt: string;
  setAnglePrompt: (p: string) => void;

  // VideoToImageStudio
  videoToImagePrompt: string;
  setVideoToImagePrompt: (p: string) => void;

  // LiveVoice
  liveVoiceVoice: string;
  setLiveVoiceVoice: (v: string) => void;
  liveVoiceTranscript: any[];
  setLiveVoiceTranscript: (t: any[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'chat',
      setActiveTab: (tab) => set({ activeTab: tab }),

      imagePrompt: '',
      imageNegativePrompt: '',
      imageAspectRatio: '1:1',
      imageControlMode: 'standard',
      imageLightingCondition: 'Cinematic studio lighting, warm directional sunlight, neon rim lights',
      imageStylePreset: 'none',
      setImagePrompt: (p) => set({ imagePrompt: p }),
      setImageNegativePrompt: (p) => set({ imageNegativePrompt: p }),
      setImageAspectRatio: (ar) => set({ imageAspectRatio: ar }),
      setImageControlMode: (m) => set({ imageControlMode: m }),
      setImageLightingCondition: (l) => set({ imageLightingCondition: l }),
      setImageStylePreset: (s) => set({ imageStylePreset: s }),

      videoPrompt: '',
      videoAspectRatio: '16:9',
      videoModel: 'veo-3.1-lite-generate-preview',
      videoResolution: '720p',
      videoDuration: 4,
      setVideoPrompt: (p) => set({ videoPrompt: p }),
      setVideoAspectRatio: (ar) => set({ videoAspectRatio: ar }),
      setVideoModel: (m) => set({ videoModel: m }),
      setVideoResolution: (r) => set({ videoResolution: r }),
      setVideoDuration: (d) => set({ videoDuration: d }),

      chatInput: '',
      chatUseSearch: true,
      chatUseMaps: false,
      chatMessages: [
        { role: 'model', text: 'Hello! I am your AI assistant. I can search the web, check Google Maps, analyze images, and solve complex problems. How can I help you today?' }
      ],
      setChatInput: (s) => set({ chatInput: s }),
      setChatUseSearch: (b) => set({ chatUseSearch: b }),
      setChatUseMaps: (b) => set({ chatUseMaps: b }),
      setChatMessages: (m) => set({ chatMessages: m }),

      analyzerPrompt: '',
      setAnalyzerPrompt: (p) => set({ analyzerPrompt: p }),

      audioPrompt: '',
      audioVoice: 'Aoede',
      setAudioPrompt: (p) => set({ audioPrompt: p }),
      setAudioVoice: (v) => set({ audioVoice: v }),

      anglePrompt: '',
      setAnglePrompt: (p) => set({ anglePrompt: p }),

      videoToImagePrompt: '',
      setVideoToImagePrompt: (p) => set({ videoToImagePrompt: p }),

      liveVoiceVoice: 'Zephyr',
      setLiveVoiceVoice: (v) => set({ liveVoiceVoice: v }),
      liveVoiceTranscript: [],
      setLiveVoiceTranscript: (t) => set({ liveVoiceTranscript: t }),
    }),
    {
      name: 'app-storage',
    }
  )
);
