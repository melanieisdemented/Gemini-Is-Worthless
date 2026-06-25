import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, Share2, Save, Check, Copy, 
  Film, Image as ImageIcon, Music, HelpCircle, 
  Calendar, ExternalLink, Clock, Sparkles, 
  Trash2, Eye, Info, ChevronRight, Globe,
  Twitter, Send, Mail, Link2, Monitor, AlertCircle, Loader2
} from 'lucide-react';
import { saveFile, getFile, deleteFile } from '../lib/db';

export interface SavedItem {
  id: string;
  type: 'video' | 'image' | 'audio' | 'depth' | 'angle' | 'adapted';
  title: string;
  prompt: string;
  timestamp: number;
  mimeType: string;
  fileKey: string;
  metadata?: {
    model?: string;
    resolution?: string;
    aspectRatio?: string;
    duration?: string | number;
    size?: string;
    voice?: string;
    [key: string]: any;
  };
}

export interface ContentResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'video' | 'image' | 'audio' | 'depth' | 'angle' | 'adapted';
  title: string;
  contentUrl: string | null;
  mimeType: string;
  prompt?: string;
  metadata?: {
    model?: string;
    resolution?: string;
    aspectRatio?: string;
    duration?: string | number;
    size?: string;
    voice?: string;
    [key: string]: any;
  };
}

// Convert any URL (e.g. blob:, data:) to base64 safely
const convertUrlToBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export function ContentResultModal({
  isOpen,
  onClose,
  type,
  title,
  contentUrl,
  mimeType,
  prompt = '',
  metadata = {}
}: ContentResultModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isShareLinkCopied, setIsShareLinkCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  // Reset internal states on open
  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      setIsPromptCopied(false);
      setShowShareOptions(false);
      setIsShareLinkCopied(false);
      setSaveError(null);
      setIsGeneratingShare(false);
      
      // Check if this item is already saved
      const savedList = JSON.parse(localStorage.getItem('saved_library') || '[]');
      const alreadySaved = savedList.some((item: any) => 
        item.type === type && item.prompt === prompt && item.title === title
      );
      setIsSaved(alreadySaved);
    }
  }, [isOpen, type, prompt, title]);

  if (!isOpen || !contentUrl) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setIsPromptCopied(true);
    setTimeout(() => setIsPromptCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = contentUrl;
    
    // Choose appropriate extension
    let ext = 'png';
    if (type === 'video') ext = 'mp4';
    else if (type === 'audio') ext = 'mp3';
    else if (type === 'depth') ext = 'jpg';
    
    const formattedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${formattedTitle}-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToLibrary = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Get Base64 from Url
      const { base64, mimeType: fetchedMime } = await convertUrlToBase64(contentUrl);
      
      // 2. Generate a unique key
      const fileId = `saved_${type}_${Date.now()}`;
      
      // 3. Save to IndexedDB
      await saveFile(fileId, base64, fetchedMime || mimeType);

      // 4. Create metadata
      const newItem: SavedItem = {
        id: fileId,
        type,
        title,
        prompt,
        timestamp: Date.now(),
        mimeType: fetchedMime || mimeType,
        fileKey: fileId,
        metadata
      };

      // 5. Save metadata to localStorage
      const savedList = JSON.parse(localStorage.getItem('saved_library') || '[]');
      savedList.unshift(newItem);
      localStorage.setItem('saved_library', JSON.stringify(savedList));

      setIsSaved(true);
    } catch (err: any) {
      console.error("Error saving to library:", err);
      setSaveError(err.message || "Could not save file to library. IndexedDB limit might be reached.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    if (showShareOptions) {
      setShowShareOptions(false);
      return;
    }
    
    setIsGeneratingShare(true);
    setTimeout(() => {
      setIsGeneratingShare(false);
      setShowShareOptions(true);
    }, 800); // Premium loading feel
  };

  const getShareLink = () => {
    return `${window.location.origin}?sharedType=${type}&sharedTitle=${encodeURIComponent(title)}&sharedPrompt=${encodeURIComponent(prompt)}`;
  };

  const handleCopyShareLink = () => {
    const shareLink = getShareLink();
    navigator.clipboard.writeText(shareLink);
    setIsShareLinkCopied(true);
    setTimeout(() => setIsShareLinkCopied(false), 2000);
  };

  const handleShareSocial = (platform: 'twitter' | 'telegram' | 'email') => {
    const shareLink = getShareLink();
    const text = `Check out this amazing AI ${type} generated on Video Synthesis Studio! ✨\n\nPrompt: "${prompt.substring(0, 50)}..."\n\n`;
    
    let url = '';
    if (platform === 'twitter') {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`;
    } else if (platform === 'telegram') {
      url = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;
    } else if (platform === 'email') {
      url = `mailto:?subject=${encodeURIComponent(`Amazing AI ${type} Shared Item`)}&body=${encodeURIComponent(`${text}\nLink: ${shareLink}`)}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-[#0d0704] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Glow effect at top */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff4e00] to-transparent opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff4e00]/10 rounded-xl border border-[#ff4e00]/20">
              {type === 'video' ? (
                <Film className="w-5 h-5 text-[#ff4e00]" />
              ) : type === 'audio' ? (
                <Music className="w-5 h-5 text-[#ff4e00]" />
              ) : (
                <ImageIcon className="w-5 h-5 text-[#ff4e00]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium tracking-tight text-white">{title}</h3>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold font-mono">
                Generated {type}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* Main Preview Container */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center group shadow-inner">
            {type === 'video' ? (
              <video 
                src={contentUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain"
              />
            ) : type === 'audio' ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-[#140b07] to-black">
                <div className="w-16 h-16 rounded-full bg-[#ff4e00]/10 border border-[#ff4e00]/30 flex items-center justify-center mb-4 animate-pulse">
                  <Music className="w-8 h-8 text-[#ff4e00]" />
                </div>
                <audio src={contentUrl} controls className="w-full max-w-md accent-[#ff4e00]" />
                <p className="text-xs text-white/40 mt-4 text-center max-w-sm">
                  Audio format synthesized successfully via Google Lyria or Gemini Voice
                </p>
              </div>
            ) : (
              <img 
                src={contentUrl} 
                alt="Generated result" 
                className="w-full h-full object-contain"
              />
            )}

            {/* Micro-sparkle floating indicator */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-medium text-white/80 border border-white/10 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              Ready
            </div>
          </div>

          {/* Social Share Drawer Overlay */}
          <AnimatePresence>
            {isGeneratingShare && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3"
              >
                <Loader2 className="w-4 h-4 animate-spin text-[#ff4e00]" />
                <span className="text-sm text-white/70">Generating shareable link reference...</span>
              </motion.div>
            )}

            {showShareOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                className="p-5 bg-gradient-to-r from-[#170e0a] to-[#0a0503] border border-[#ff4e00]/20 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#ff4e00] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Share This Content
                  </h4>
                  <button 
                    onClick={() => setShowShareOptions(false)}
                    className="text-[10px] text-white/40 hover:text-white"
                  >
                    Hide Options
                  </button>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={getShareLink()} 
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-4 py-2 bg-white text-black hover:bg-white/90 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {isShareLinkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-6 pt-2">
                  <button 
                    onClick={() => handleShareSocial('twitter')}
                    className="flex flex-col items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center">
                      <Twitter className="w-4 h-4 text-sky-400" />
                    </div>
                    <span>Twitter</span>
                  </button>
                  <button 
                    onClick={() => handleShareSocial('telegram')}
                    className="flex flex-col items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-400" />
                    </div>
                    <span>Telegram</span>
                  </button>
                  <button 
                    onClick={() => handleShareSocial('email')}
                    className="flex flex-col items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-amber-400" />
                    </div>
                    <span>Email</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt Section */}
          {prompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Generation Prompt</span>
                <button 
                  onClick={handleCopyPrompt}
                  className="text-xs text-white/40 hover:text-[#ff4e00] transition-colors flex items-center gap-1"
                >
                  {isPromptCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/80 leading-relaxed italic">
                "{prompt}"
              </div>
            </div>
          )}

          {/* Save Status Error */}
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Details / Metadata Grid */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Generation Details</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                <Monitor className="w-4 h-4 text-white/40 mt-0.5" />
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Model</div>
                  <div className="text-xs text-white/90 font-medium truncate max-w-[130px]">{metadata.model || 'Standard Engine'}</div>
                </div>
              </div>

              {metadata.resolution && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                  <Monitor className="w-4 h-4 text-white/40 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Resolution</div>
                    <div className="text-xs text-white/90 font-medium">{metadata.resolution}</div>
                  </div>
                </div>
              )}

              {metadata.aspectRatio && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                  <Monitor className="w-4 h-4 text-white/40 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Aspect Ratio</div>
                    <div className="text-xs text-white/90 font-medium">{metadata.aspectRatio}</div>
                  </div>
                </div>
              )}

              {metadata.duration && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-white/40 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Duration</div>
                    <div className="text-xs text-white/90 font-medium">{metadata.duration}s</div>
                  </div>
                </div>
              )}

              {metadata.size && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                  <Monitor className="w-4 h-4 text-white/40 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Quality Tier</div>
                    <div className="text-xs text-white/90 font-medium">{metadata.size}</div>
                  </div>
                </div>
              )}

              {metadata.voice && (
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                  <Monitor className="w-4 h-4 text-white/40 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Voice Persona</div>
                    <div className="text-xs text-white/90 font-medium">{metadata.voice}</div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-white/40 mt-0.5" />
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Created On</div>
                  <div className="text-xs text-white/90 font-medium">
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions bar */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Info className="w-4 h-4" />
            <span>Files auto-cached locally in IndexedDB</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="flex-1 sm:flex-initial px-5 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#ff4e00]" />
              Share Link
            </button>

            <button
              onClick={handleSaveToLibrary}
              disabled={isSaved || isSaving}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                isSaved 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-white/5 hover:bg-white/10 text-white border-white/10 disabled:opacity-50'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved to Library
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-500" />
                  Save to Library
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-5 py-3 bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] hover:brightness-110 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff4e00]/10 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface SavedLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedLibraryDrawer({ isOpen, onClose }: SavedLibraryDrawerProps) {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [itemUrl, setItemUrl] = useState<string | null>(null);

  // Load items on drawer open
  useEffect(() => {
    if (isOpen) {
      const loadLibrary = () => {
        const list = JSON.parse(localStorage.getItem('saved_library') || '[]');
        setSavedItems(list);
      };
      loadLibrary();
    }
  }, [isOpen]);

  // Load selected item data url
  useEffect(() => {
    if (selectedItem) {
      const fetchFile = async () => {
        const record = await getFile(selectedItem.fileKey);
        if (record) {
          setItemUrl(`data:${record.mimeType};base64,${record.data}`);
        } else {
          setItemUrl(null);
        }
      };
      fetchFile();
    } else {
      setItemUrl(null);
    }
  }, [selectedItem]);

  if (!isOpen) return null;

  const handleDeleteItem = async (e: React.MouseEvent, item: SavedItem) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${item.title}" from your library?`)) return;

    try {
      // Delete from IndexedDB
      await deleteFile(item.fileKey);
      
      // Delete from localStorage
      const list = JSON.parse(localStorage.getItem('saved_library') || '[]');
      const updated = list.filter((i: any) => i.id !== item.id);
      localStorage.setItem('saved_library', JSON.stringify(updated));
      
      setSavedItems(updated);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error("Failed to delete library item:", err);
    }
  };

  const handleDownloadItem = async (e: React.MouseEvent, item: SavedItem) => {
    e.stopPropagation();
    try {
      const record = await getFile(item.fileKey);
      if (!record) return;
      
      const link = document.createElement('a');
      link.href = `data:${record.mimeType};base64,${record.data}`;
      
      let ext = 'png';
      if (item.type === 'video') ext = 'mp4';
      else if (item.type === 'audio') ext = 'mp3';
      else if (item.type === 'depth') ext = 'jpg';
      
      link.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.id}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download item:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Drawer Panel */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-[#0e0704] border-l border-white/10 h-full flex flex-col z-10 shadow-2xl"
      >
        {/* Glow accent */}
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#ff4e00] via-transparent to-[#0096ff] opacity-40" />

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Save className="w-5 h-5 text-[#ff4e00]" />
            <h3 className="text-lg font-medium">My Private Library</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                <Save className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-white/70">Library is empty</p>
              <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                Generate videos, images, audio, depth maps, or alternate views and click "Save to Library" to keep them permanently cached here!
              </p>
            </div>
          ) : selectedItem && itemUrl ? (
            /* Selected Item Details View inside Drawer */
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-xs text-[#ff4e00] hover:underline flex items-center gap-1"
              >
                ← Back to List
              </button>

              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                {selectedItem.type === 'video' ? (
                  <video src={itemUrl} controls className="w-full h-full object-contain" />
                ) : selectedItem.type === 'audio' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#140b07] to-black">
                    <Music className="w-8 h-8 text-[#ff4e00] mb-2 animate-bounce" />
                    <audio src={itemUrl} controls className="w-full" />
                  </div>
                ) : (
                  <img src={itemUrl} alt="Library content" className="w-full h-full object-contain" />
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-semibold text-white">{selectedItem.title}</h4>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-0.5">
                    Saved on {new Date(selectedItem.timestamp).toLocaleDateString()}
                  </p>
                </div>

                {selectedItem.prompt && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white/80 italic leading-relaxed">
                    "{selectedItem.prompt}"
                  </div>
                )}

                {selectedItem.metadata && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/30">Specs</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {Object.entries(selectedItem.metadata).map(([key, val]) => (
                        <div key={key} className="px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-lg flex justify-between">
                          <span className="text-white/40 capitalize">{key}</span>
                          <span className="text-white/80 font-medium">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-4">
                  <button
                    onClick={(e) => handleDownloadItem(e, selectedItem)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] hover:brightness-110 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button
                    onClick={(e) => handleDeleteItem(e, selectedItem)}
                    className="py-2.5 px-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Saved Items List View */
            <div className="space-y-3">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-3 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl flex items-center gap-4 cursor-pointer transition-all hover:translate-x-1 group"
                >
                  {/* Thumbnail / Placeholder */}
                  <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
                    {item.type === 'video' ? (
                      <Film className="w-6 h-6 text-white/40 group-hover:scale-110 transition-transform" />
                    ) : item.type === 'audio' ? (
                      <Music className="w-6 h-6 text-white/40 group-hover:scale-110 transition-transform" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-white/40 group-hover:scale-110 transition-transform" />
                    )}
                    {/* Tiny format badge */}
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 rounded text-[8px] text-white/70 uppercase font-semibold">
                      {item.type}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white/90 truncate group-hover:text-[#ff4e00] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-white/40 truncate mt-0.5 leading-relaxed">
                      {item.prompt || 'No description prompt.'}
                    </p>
                    <p className="text-[9px] text-white/30 font-mono mt-1">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleDownloadItem(e, item)}
                      className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(e, item)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
