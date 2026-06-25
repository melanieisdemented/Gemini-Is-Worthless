import React, { useState, useEffect } from 'react';
import { 
  Search, Github, Terminal, Cpu, Layers, Copy, Check, 
  ArrowRight, ExternalLink, Sparkles, Code, Play, RefreshCw, 
  User, Move, Image as ImageIcon, Sliders, PlayCircle, Eye,
  Info, Sparkle, AlertCircle, Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModelRepository {
  id: string;
  name: string;
  owner: string;
  stars: string;
  license: string;
  category: 'talking-head' | 'pose-animation' | 'general' | 'interpolation';
  categoryLabel: string;
  description: string;
  howItWorks: string;
  githubUrl: string;
  hfSpaceUrl?: string;
  setupCommands: string[];
  inferenceCommands: string[];
  presetImage: string;
}

const REPOSITORIES_DATA: ModelRepository[] = [
  {
    id: 'liveportrait',
    name: 'LivePortrait',
    owner: 'Kwai-VGI',
    stars: '15.2k',
    license: 'MIT',
    category: 'talking-head',
    categoryLabel: 'Portrait / Talking Head',
    description: 'Efficient and high-fidelity portrait animation. Takes a single reference portrait image and a driving video (or audio) to animate the face with precise gaze, expression, and head-pose control.',
    howItWorks: 'Utilizes an explicit keypoint-based model combined with expression/gaze motion field parameters. It maps dynamic motion from the driving video onto the appearance representations of the reference image via modern deep spatial warping networks.',
    githubUrl: 'https://github.com/Kwai-VGI/LivePortrait',
    hfSpaceUrl: 'https://huggingface.co/spaces/Kwai-VGI/LivePortrait',
    presetImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    setupCommands: [
      '# Clone the repository',
      'git clone https://github.com/Kwai-VGI/LivePortrait.git',
      'cd LivePortrait',
      '',
      '# Create virtual environment',
      'conda create -n liveportrait python=3.9 -y',
      'conda activate liveportrait',
      '',
      '# Install dependencies',
      'pip install -r requirements.txt'
    ],
    inferenceCommands: [
      '# Run fast inference with reference image and driving video',
      'python inference.py \\',
      '  --source_image assets/examples/source/s9.jpg \\',
      '  --driving_video assets/examples/driving/d0.mp4 \\',
      '  --flag_lip_zero \\',
      '  --flag_eye_retargeting'
    ]
  },
  {
    id: 'mimicmotion',
    name: 'MimicMotion',
    owner: 'Tencent',
    stars: '6.8k',
    license: 'Apache-2.0',
    category: 'pose-animation',
    categoryLabel: 'Human Pose & Animation',
    description: 'High-quality human motion video generation guided by a reference image of a person and a sequence of skeleton poses (ControlNet pose video). Excels at handling large-scale body movements.',
    howItWorks: 'Introduces regional-attention and classifier-free guidance specifically fine-tuned for pose fidelity. It maps reference-only frame features to a spatiotemporal diffusion UNet, aligning hand/foot positioning seamlessly over time.',
    githubUrl: 'https://github.com/Tencent/MimicMotion',
    presetImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=400',
    setupCommands: [
      '# Clone the repository',
      'git clone https://github.com/Tencent/MimicMotion.git',
      'cd MimicMotion',
      '',
      '# Create virtual environment',
      'conda create -n mimicmotion python=3.10 -y',
      'conda activate mimicmotion',
      '',
      '# Install PyTorch and CUDA dependencies',
      'pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121',
      'pip install -r requirements.txt'
    ],
    inferenceCommands: [
      '# Run standard pose-driven video synthesis',
      'python inference.py \\',
      '  --ref_image_path assets/ref_girl.png \\',
      '  --pose_sequence_path assets/dance_pose.mp4 \\',
      '  --output_dir outputs/ \\',
      '  --num_inference_steps 50'
    ]
  },
  {
    id: 'hunyuanvideo',
    name: 'HunyuanVideo',
    owner: 'Tencent',
    stars: '8.4k',
    license: 'Tencent Hunyuan License',
    category: 'general',
    categoryLabel: 'General Image-to-Video',
    description: 'An advanced, large-scale, open-source video generation model featuring state-of-the-art architectural design. Excels at generating rich, cinematic motions from simple text prompts and reference images.',
    howItWorks: 'Uses a 3D Causal VAE to compress spatial-temporal pixels into compact latents, followed by a dual-stream flow-matching transformer. The reference image is processed through a visual encoder (like CLIP or SigLIP) and integrated via cross-attention.',
    githubUrl: 'https://github.com/Tencent/HunyuanVideo',
    presetImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=400',
    setupCommands: [
      '# Clone the repository',
      'git clone https://github.com/Tencent/HunyuanVideo.git',
      'cd HunyuanVideo',
      '',
      '# Install dependencies with flash-attention',
      'pip install -r requirements.txt',
      'pip install flash-attn --no-build-isolation'
    ],
    inferenceCommands: [
      '# Run image-to-video inference using pre-trained weights',
      'python sample_video.py \\',
      '  --model HunyuanVideo \\',
      '  --prompt "A majestic eagle soaring over the snow-covered mountains" \\',
      '  --input_image assets/eagle.png \\',
      '  --video_length 85 \\',
      '  --infer_steps 50'
    ]
  },
  {
    id: 'seine',
    name: 'SEINE',
    owner: 'Zheng-Sheng',
    stars: '2.5k',
    license: 'Apache-2.0',
    category: 'interpolation',
    categoryLabel: 'Keyframe Interpolation',
    description: 'Short video generation model specifically designed for transition synthesis. It can interpolate smoothly between two separate reference images (starting image and ending image) using physics-informed flow.',
    howItWorks: 'Conditions the diffusion process on both the start and end frame features concurrently. The UNet predicts intermediate latents by matching the boundary values of both reference frames, producing natural camera movements and morphs.',
    githubUrl: 'https://github.com/Zheng-Sheng/SEINE',
    presetImage: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=400',
    setupCommands: [
      '# Clone SEINE repository',
      'git clone https://github.com/Zheng-Sheng/SEINE.git',
      'cd SEINE',
      '',
      '# Setup virtual env and download checkpoints',
      'conda create -n seine python=3.8 -y',
      'conda activate seine',
      'pip install -r requirements.txt'
    ],
    inferenceCommands: [
      '# Generate transition video between start and end frame',
      'python sample_scripts/with_ref_images.py \\',
      '  --config configs/seine_interpolation.yaml \\',
      '  --input_start_image assets/start.png \\',
      '  --input_end_image assets/end.png \\',
      '  --prompt "Smooth transformation of a seed growing into a flower"'
    ]
  },
  {
    id: 'id-animator',
    name: 'ID-Animator',
    owner: 'IIAI-AL',
    stars: '1.9k',
    license: 'Non-Commercial',
    category: 'talking-head',
    categoryLabel: 'Portrait / Talking Head',
    description: 'Zero-shot identity-preserving human video generation. Allows users to supply a reference image of any person and control their movements, expressions, and actions via prompt while strictly preserving facial structure.',
    howItWorks: 'Decouples identity extraction from the main generation path. It uses a specialized facial identity encoder to inject dense, localized portrait tokens into the spatiotemporal layers of the video generator, preventing facial drift.',
    githubUrl: 'https://github.com/IIAI-AL/ID-Animator',
    presetImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    setupCommands: [
      '# Clone ID-Animator repository',
      'git clone https://github.com/IIAI-AL/ID-Animator.git',
      'cd ID-Animator',
      '',
      '# Setup environments',
      'conda create -n idanimator python=3.9 -y',
      'conda activate idanimator',
      'pip install -r requirements.txt'
    ],
    inferenceCommands: [
      '# Generate personalized action video from reference face',
      'python inference.py \\',
      '  --ref_image assets/avatar.jpg \\',
      '  --prompt "A young man wearing a leather jacket drinking coffee in a cafe, highly detailed" \\',
      '  --steps 30'
    ]
  }
];

export function ReferenceVideoHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeRepoId, setActiveRepoId] = useState<string>('liveportrait');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

  // Interactive LivePortrait simulation state
  const [lpSmile, setLpSmile] = useState(0);
  const [lpYaw, setLpYaw] = useState(0);
  const [lpEyes, setLpEyes] = useState(50);

  // Interactive MimicMotion state
  const [mmPose, setMmPose] = useState<'dance' | 'jump' | 'samba'>('dance');
  const [mmIsAnimating, setMmIsAnimating] = useState(true);

  // Interactive Hunyuan state
  const [hyPrompt, setHyPrompt] = useState('Cinematic camera sweep, sunset lighting, realistic wind');
  const [hyIsGenerating, setHyIsGenerating] = useState(false);
  const [hyProgress, setHyProgress] = useState(0);
  const [hyFinished, setHyFinished] = useState(false);

  // Interactive SEINE state
  const [seineEndImage, setSeineEndImage] = useState('https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&q=80&w=400');
  const [seineTransition, setSeineTransition] = useState(0);
  const [seineIsTransitioning, setSeineIsTransitioning] = useState(false);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredRepos = REPOSITORIES_DATA.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          repo.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || repo.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeRepo = REPOSITORIES_DATA.find(r => r.id === activeRepoId) || REPOSITORIES_DATA[0];

  // Simulated generation triggers
  const triggerHunyuanSimulation = () => {
    setHyIsGenerating(true);
    setHyFinished(false);
    setHyProgress(0);
  };

  useEffect(() => {
    if (hyIsGenerating) {
      const interval = setInterval(() => {
        setHyProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setHyIsGenerating(false);
            setHyFinished(true);
            return 100;
          }
          return p + 4;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [hyIsGenerating]);

  // SEINE Auto-transition effect
  useEffect(() => {
    if (seineIsTransitioning) {
      const interval = setInterval(() => {
        setSeineTransition(t => {
          if (t >= 1) {
            clearInterval(interval);
            setSeineIsTransitioning(false);
            return 1;
          }
          return t + 0.05;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [seineIsTransitioning]);

  return (
    <div className="bg-[#120704]/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#ff4e00]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-cyan-500/[0.03] blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-full text-[10px] font-semibold text-[#ff4e00] tracking-wider uppercase">
            <Sparkle className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Open Source Repository Showroom</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
            Reference Image-to-Video <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#ff4e00] to-[#ff8c00]">Model Hub</span>
          </h2>
          <p className="text-sm text-white/50 max-w-xl leading-relaxed">
            Interactively explore and visual-test leading edge open-source projects designed to animate, morph, or transition static reference images.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl shrink-0 self-start md:self-center">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all ${
              viewMode === 'visual' 
                ? 'bg-gradient-to-r from-[#ff4e00] to-[#ff6a00] text-white shadow-lg shadow-[#ff4e00]/25' 
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Interactive Showroom
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all ${
              viewMode === 'code' 
                ? 'bg-gradient-to-r from-[#ff4e00] to-[#ff6a00] text-white shadow-lg shadow-[#ff4e00]/25' 
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Developer Command Set
          </button>
        </div>
      </div>

      {/* Categories & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between relative z-10">
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 w-full sm:w-auto scrollbar-none">
          {['all', 'talking-head', 'pose-animation', 'general', 'interpolation'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                const first = REPOSITORIES_DATA.find(r => cat === 'all' || r.category === cat);
                if (first) setActiveRepoId(first.id);
              }}
              className={`px-4 py-2 text-xs font-medium rounded-xl border capitalize whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-white/10 border-white/20 text-white font-semibold' 
                  : 'bg-transparent border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {cat === 'all' ? 'All Models' : cat.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Filter models by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-2xl py-2.5 pl-9 pr-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff4e00]/30 transition-all focus:ring-1 focus:ring-[#ff4e00]/20"
          />
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Side: Repos List */}
        <div className="lg:col-span-4 space-y-3.5 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin">
          {filteredRepos.length === 0 ? (
            <div className="text-center py-16 text-sm text-white/30 italic bg-white/5 rounded-2xl border border-white/5">
              No matching models found
            </div>
          ) : (
            filteredRepos.map((repo) => {
              const isSelected = repo.id === activeRepoId;
              return (
                <button
                  key={repo.id}
                  onClick={() => setActiveRepoId(repo.id)}
                  className={`w-full text-left p-4.5 rounded-2xl border transition-all flex flex-col gap-3 relative overflow-hidden group ${
                    isSelected 
                      ? 'bg-gradient-to-br from-[#ff4e00]/8 to-[#ff4e00]/2 border-[#ff4e00]/30 shadow-[0_4px_24px_rgba(255,78,0,0.06)]' 
                      : 'bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold text-white/30 font-mono tracking-wider uppercase">
                        {repo.owner}
                      </div>
                      <div className="text-base font-semibold text-white group-hover:text-[#ff4e00] transition-colors flex items-center gap-2 mt-0.5">
                        {repo.name}
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#ff4e00] animate-pulse" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-white/60 bg-white/5 px-2.5 py-1 rounded-xl border border-white/10 group-hover:bg-white/10 transition-colors">
                      <Github className="w-3 h-3 text-white/40" />
                      <span>★ {repo.stars}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                    {repo.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
                    <span className="text-[9px] font-bold tracking-wider text-white/40 uppercase font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                      {repo.categoryLabel}
                    </span>
                    <span className="text-[11px] text-[#ff4e00] font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      Demo & Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Side: Showcase Panel */}
        <div className="lg:col-span-8 flex flex-col">
          <AnimatePresence mode="wait">
            {activeRepo && (
              <motion.div 
                key={activeRepo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-6 flex-1 flex flex-col justify-between"
              >
                {/* Repo Info Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-white/5">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-light text-white flex items-center gap-2">
                      <span className="font-bold">{activeRepo.name}</span>
                      <span className="text-xs text-white/30 font-mono font-normal bg-white/5 px-2 py-0.5 rounded-lg">by {activeRepo.owner}</span>
                    </h3>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {activeRepo.description}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <a 
                      href={activeRepo.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-colors font-medium"
                    >
                      <Github className="w-3.5 h-3.5 text-white/60" />
                      View Repository
                      <ExternalLink className="w-3 h-3 text-white/40" />
                    </a>
                    {activeRepo.hfSpaceUrl && (
                      <a 
                        href={activeRepo.hfSpaceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-white bg-[#ff4e00]/15 hover:bg-[#ff4e00]/25 text-[#ff4e00] px-3.5 py-2 rounded-xl border border-[#ff4e00]/25 transition-colors font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#ff4e00]" />
                        Run on HuggingFace
                        <ExternalLink className="w-3 h-3 text-[#ff4e00]/70" />
                      </a>
                    )}
                  </div>
                </div>

                {/* SHOWCASE VIEW */}
                {viewMode === 'visual' && (
                  <div className="space-y-6 py-2 flex-1 flex flex-col justify-center">
                    
                    {/* LivePortrait Interactive Simulator */}
                    {activeRepo.id === 'liveportrait' && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-5 space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                            <Sliders className="w-4 h-4 text-[#ff4e00]" />
                            <span>Animation Controls</span>
                          </div>
                          
                          <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-white/60">Smile Intensity</span>
                                <span className="text-[#ff4e00]">{lpSmile}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={lpSmile} 
                                onChange={(e) => setLpSmile(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff4e00] focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-white/60">Head Gaze / Yaw</span>
                                <span className="text-[#ff4e00]">{lpYaw}°</span>
                              </div>
                              <input 
                                type="range" 
                                min="-30" 
                                max="30" 
                                value={lpYaw} 
                                onChange={(e) => setLpYaw(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff4e00] focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="text-white/60">Eye Opening</span>
                                <span className="text-[#ff4e00]">{lpEyes}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={lpEyes} 
                                onChange={(e) => setLpEyes(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff4e00] focus:outline-none"
                              />
                            </div>

                            <button 
                              onClick={() => { setLpSmile(0); setLpYaw(0); setLpEyes(50); }}
                              className="w-full py-1.5 text-[10px] font-mono text-white/40 hover:text-white/70 border border-white/5 rounded-xl transition-all hover:bg-white/5"
                            >
                              Reset Face Coordinates
                            </button>
                          </div>
                        </div>

                        <div className="md:col-span-7 flex flex-col items-center justify-center gap-3">
                          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider font-mono">Real-time warp simulation</div>
                          <div className="relative w-44 h-44 rounded-3xl overflow-hidden border border-white/15 bg-black/40 group shadow-2xl">
                            <motion.img 
                              src={activeRepo.presetImage} 
                              alt="LivePortrait Simulation" 
                              className="w-full h-full object-cover transition-all duration-300 origin-center"
                              style={{
                                filter: `contrast(${100 + lpSmile * 0.1}%) brightness(${95 + lpSmile * 0.05}%)`,
                                transform: `rotateY(${lpYaw}deg) scale(${1 + lpEyes * 0.0005})`,
                                borderRadius: '24px'
                              }}
                            />
                            {/* Eye highlights / pupils representation to show warp */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="flex gap-12 mt-[-10px] opacity-40">
                                <div className="w-3 h-3 rounded-full bg-white blur-[1px] transition-transform duration-200" style={{ transform: `translate(${lpYaw * 0.3}px, ${(50 - lpEyes) * 0.1}px)` }} />
                                <div className="w-3 h-3 rounded-full bg-white blur-[1px] transition-transform duration-200" style={{ transform: `translate(${lpYaw * 0.3}px, ${(50 - lpEyes) * 0.1}px)` }} />
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-white/40 text-center leading-relaxed">
                            Drag sliders to manipulate face expression coordinates. The LivePortrait pipeline processes single portrait image conditioning under 15ms.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* MimicMotion Interactive Simulator */}
                    {activeRepo.id === 'mimicmotion' && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-5 space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                            <Move className="w-4 h-4 text-[#ff4e00]" />
                            <span>Select Driving Skeleton</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {[
                              { id: 'dance', label: 'Hip Hop Wave', desc: 'Flowing arm motions and side tilts' },
                              { id: 'jump', label: 'Super Star Jump', desc: 'Explosive vertical jumps and arm extension' },
                              { id: 'samba', label: 'Samba Spin', desc: 'Dynamic circular pivots and leg motion' }
                            ].map((pose) => (
                              <button
                                key={pose.id}
                                onClick={() => setMmPose(pose.id as any)}
                                className={`p-3 text-left rounded-xl border transition-all ${
                                  mmPose === pose.id 
                                    ? 'bg-[#ff4e00]/10 border-[#ff4e00]/40 text-white' 
                                    : 'bg-white/5 border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.08]'
                                }`}
                              >
                                <div className="text-xs font-bold font-sans">{pose.label}</div>
                                <div className="text-[10px] text-white/40 mt-0.5">{pose.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="md:col-span-7 flex flex-col items-center justify-center gap-3">
                          <div className="flex items-center justify-between w-full max-w-sm px-2 text-[10px] font-bold text-white/30 uppercase tracking-wider font-mono">
                            <span>Input Frame</span>
                            <span>Pose Guidance</span>
                            <span>Synthesized Output</span>
                          </div>
                          
                          <div className="flex items-center gap-4 bg-black/20 p-4 rounded-3xl border border-white/5 w-full max-w-sm justify-center">
                            {/* Original */}
                            <div className="w-20 h-28 rounded-xl overflow-hidden border border-white/10 relative">
                              <img src={activeRepo.presetImage} className="w-full h-full object-cover" alt="MimicMotion Input" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[9px] font-bold text-white uppercase tracking-widest font-mono">Base</div>
                            </div>

                            {/* Arrow */}
                            <span className="text-[#ff4e00] font-bold text-lg">+</span>

                            {/* Skeleton representation */}
                            <div className="w-20 h-28 rounded-xl overflow-hidden border border-white/10 bg-black/80 flex items-center justify-center relative">
                              <svg className="w-16 h-20" viewBox="0 0 100 100">
                                {/* Simulated dancing skeleton based on state */}
                                <motion.g
                                  animate={mmIsAnimating ? {
                                    translateY: mmPose === 'jump' ? [0, -15, 0] : [0, 1, 0],
                                    rotate: mmPose === 'samba' ? [0, 15, -15, 0] : [0, -2, 2, 0]
                                  } : {}}
                                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                >
                                  {/* Head */}
                                  <circle cx="50" cy="20" r="6" fill="#00ffcc" />
                                  {/* Spine */}
                                  <line x1="50" y1="26" x2="50" y2="55" stroke="#00ffcc" strokeWidth="2.5" />
                                  {/* Arms */}
                                  <motion.line 
                                    x1="50" y1="30" x2="30" y2="35" stroke="#ff00ff" strokeWidth="2" 
                                    animate={mmPose === 'dance' ? { y2: [25, 45, 25] } : mmPose === 'jump' ? { y2: [10, 15, 10], x2: [20, 25, 20] } : {}}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                  />
                                  <motion.line 
                                    x1="50" y1="30" x2="70" y2="35" stroke="#ff00ff" strokeWidth="2" 
                                    animate={mmPose === 'dance' ? { y2: [45, 25, 45] } : mmPose === 'jump' ? { y2: [10, 15, 10], x2: [80, 75, 80] } : {}}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                                  />
                                  {/* Legs */}
                                  <motion.line 
                                    x1="50" y1="55" x2="40" y2="80" stroke="#ffff00" strokeWidth="2" 
                                    animate={mmPose === 'samba' ? { x2: [35, 45, 35] } : {}}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                  />
                                  <motion.line 
                                    x1="50" y1="55" x2="60" y2="80" stroke="#ffff00" strokeWidth="2" 
                                    animate={mmPose === 'samba' ? { x2: [65, 55, 65] } : {}}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                  />
                                </motion.g>
                              </svg>
                              <div className="absolute inset-x-0 bottom-1 text-[8px] text-center font-bold text-cyan-400 uppercase tracking-widest font-mono">Pose</div>
                            </div>

                            {/* Arrow */}
                            <span className="text-[#ff4e00] font-bold text-lg">=</span>

                            {/* Generated */}
                            <div className="w-20 h-28 rounded-xl overflow-hidden border border-[#ff4e00]/20 relative">
                              <motion.img 
                                src={activeRepo.presetImage} 
                                className="w-full h-full object-cover" 
                                animate={mmIsAnimating ? {
                                  y: mmPose === 'jump' ? [0, -8, 0] : [0, 1, 0],
                                  rotate: mmPose === 'samba' ? [0, 2, -2, 0] : [0, 0, 0]
                                } : {}}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                alt="MimicMotion Result" 
                              />
                              <div className="absolute inset-x-0 bottom-1 text-[8px] text-center font-bold text-[#ff4e00] uppercase tracking-widest font-mono bg-black/60 py-0.5">Output</div>
                            </div>
                          </div>

                          <p className="text-[10px] text-white/40 text-center leading-relaxed">
                            MimicMotion coordinates spatiotemporal attention blocks to guarantee hand/foot fidelity, preventing the character structure from warping during complex moves.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* HunyuanVideo Interactive Simulator */}
                    {activeRepo.id === 'hunyuanvideo' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                          <Wand2 className="w-4 h-4 text-[#ff4e00]" />
                          <span>Motion Prompting Conditioning</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <input 
                            type="text" 
                            value={hyPrompt}
                            onChange={(e) => setHyPrompt(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff4e00]/30"
                            placeholder="Enter prompt description to animate image..."
                          />
                          <button 
                            onClick={triggerHunyuanSimulation}
                            disabled={hyIsGenerating}
                            className="bg-gradient-to-r from-[#ff4e00] to-[#ff7d00] hover:from-[#ff5e10] hover:to-[#ff8d10] text-white text-xs font-semibold px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {hyIsGenerating ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                {hyProgress}%
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-4 h-4" />
                                Simulate Generation
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          {/* Left Panel: Static Image */}
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">Reference Frame</span>
                            <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10">
                              <img src={activeRepo.presetImage} className="w-full h-full object-cover" alt="Hunyuan Static" />
                            </div>
                          </div>

                          {/* Right Panel: Simulated Video Motion output */}
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">Simulated Video Output (Motion)</span>
                            <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center relative">
                              {hyIsGenerating ? (
                                <div className="space-y-2 text-center">
                                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#ff4e00] animate-spin mx-auto" />
                                  <div className="text-[10px] font-mono text-white/50">Processing 3D Causal VAE Latents...</div>
                                </div>
                              ) : hyFinished ? (
                                <motion.div 
                                  className="w-full h-full relative"
                                  animate={{ scale: [1, 1.1, 1], rotate: [0, 1, -1, 0] }}
                                  transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                                >
                                  <img src={activeRepo.presetImage} className="w-full h-full object-cover filter saturate-[1.2] brightness-[1.05]" alt="Hunyuan Result" />
                                  <div className="absolute inset-0 bg-[#ff4e00]/10 mix-blend-color animate-pulse" />
                                </motion.div>
                              ) : (
                                <div className="text-center text-[10px] text-white/30 px-4">
                                  Click "Simulate Generation" to see how HunyuanVideo interpolates temporal flow and movement parameters.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SEINE Interactive Simulator */}
                    {activeRepo.id === 'seine' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                          <Layers className="w-4 h-4 text-[#ff4e00]" />
                          <span>Keyframe Transition Interpolation (Start Image to End Image)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                          <div className="md:col-span-8 space-y-4">
                            <div className="flex items-center gap-4 bg-black/30 p-4 rounded-3xl border border-white/5 justify-between">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono">Frame A (Start)</span>
                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                  <img src={activeRepo.presetImage} className="w-full h-full object-cover" alt="SEINE Start" />
                                </div>
                              </div>

                              {/* Interactive Transition Slider / Value */}
                              <div className="flex-1 px-4 space-y-2">
                                <div className="flex justify-between text-[10px] font-mono text-white/40">
                                  <span>Interpolated Mid-Frame</span>
                                  <span className="text-[#ff4e00]">{Math.round(seineTransition * 100)}%</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="1" 
                                  step="0.01"
                                  value={seineTransition} 
                                  onChange={(e) => setSeineTransition(parseFloat(e.target.value))}
                                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#ff4e00] focus:outline-none"
                                />
                                <button 
                                  onClick={() => { setSeineTransition(0); setSeineIsTransitioning(true); }}
                                  disabled={seineIsTransitioning}
                                  className="w-full py-1 text-[9px] font-mono text-white bg-[#ff4e00]/10 hover:bg-[#ff4e00]/20 rounded-lg border border-[#ff4e00]/20 transition-all disabled:opacity-50"
                                >
                                  {seineIsTransitioning ? 'Interpolating physics-informed flow...' : 'Run Auto transition loop'}
                                </button>
                              </div>

                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono">Frame B (End)</span>
                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                  <img src={seineEndImage} className="w-full h-full object-cover" alt="SEINE End" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Interpolated Preview */}
                          <div className="md:col-span-4 flex flex-col items-center justify-center gap-2">
                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">Transition Render</span>
                            <div className="w-32 h-32 rounded-2xl overflow-hidden border border-white/15 bg-black/40 relative shadow-xl">
                              {/* Starting image */}
                              <img 
                                src={activeRepo.presetImage} 
                                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-100" 
                                style={{ opacity: 1 - seineTransition, filter: `blur(${seineTransition * 4}px)` }}
                                alt="SEINE Mix A" 
                              />
                              {/* Ending image */}
                              <img 
                                src={seineEndImage} 
                                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-100" 
                                style={{ opacity: seineTransition, filter: `blur(${(1 - seineTransition) * 4}px)` }}
                                alt="SEINE Mix B" 
                              />
                              
                              <div className="absolute inset-0 bg-[#ff4e00]/5 mix-blend-color pointer-events-none" />
                            </div>
                            <p className="text-[9px] text-white/40 text-center">
                              SEINE models continuous transformations of high-quality shapes and backgrounds.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ID-Animator Interactive Simulator */}
                    {activeRepo.id === 'id-animator' && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-5 space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                            <User className="w-4 h-4 text-[#ff4e00]" />
                            <span>Identity Preserving Token Injection</span>
                          </div>
                          
                          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                            <div className="text-xs text-white/70 leading-relaxed font-sans">
                              Unlike regular text-to-video models where characters drift or morph into completely different people, <span className="text-[#ff4e00] font-semibold">ID-Animator</span> locks the exact facial geometry tokens first, then feeds them as high-priority constraints.
                            </div>
                            
                            <div className="flex gap-2 p-2.5 bg-black/30 rounded-xl border border-white/5">
                              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-white/50 leading-normal">
                                It separates face descriptors from clothes, background, and prompt variables entirely, allowing full text-based control over action.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-7 flex flex-col items-center justify-center gap-3">
                          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider font-mono">Decoupled Identity Map</div>
                          
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[8px] text-white/40 font-mono">Reference portrait</span>
                              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10">
                                <img src={activeRepo.presetImage} className="w-full h-full object-cover" alt="ID Ref" />
                              </div>
                            </div>

                            <span className="text-white/20 text-lg">➔</span>

                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[8px] text-[#ff4e00] font-mono font-bold">Geometry lock</span>
                              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-[#ff4e00]/20 relative bg-black flex items-center justify-center">
                                {/* Face mesh visual representation */}
                                <svg className="w-20 h-20 opacity-75" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="30" stroke="#ff4e00" strokeWidth="1" fill="none" strokeDasharray="3 3" />
                                  <path d="M40,40 L44,42 M56,42 L60,40 M50,45 L50,58 M42,65 Q50,72 58,65" stroke="#ff4e00" strokeWidth="1.5" fill="none" />
                                  <circle cx="42" cy="41" r="2" fill="#ff4e00" />
                                  <circle cx="58" cy="41" r="2" fill="#ff4e00" />
                                </svg>
                                <div className="absolute inset-0 bg-[#ff4e00]/5 animate-pulse" />
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-white/40 text-center max-w-xs leading-normal">
                            Maintains 98% facial identity consistency across diverse prompt environments without needing expensive LoRA training.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* DEVELOPER CODE VIEW */}
                {viewMode === 'code' && (
                  <div className="space-y-5 py-2 flex-1 flex flex-col">
                    
                    {/* Setup / Bash scripts instructions */}
                    <div className="space-y-4">
                      {/* Installation block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-[#ff4e00]" />
                            Clone & Environment Setup
                          </span>
                          <button
                            onClick={() => handleCopyText(activeRepo.setupCommands.join('\n'), 'setup')}
                            className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {copiedIndex === 'setup' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy block
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 font-mono text-xs text-emerald-400/90 overflow-x-auto whitespace-pre leading-relaxed scrollbar-thin max-h-48">
                          {activeRepo.setupCommands.join('\n')}
                        </div>
                      </div>

                      {/* Inference block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                            <Code className="w-4 h-4 text-[#ff4e00]" />
                            Python Inference Command
                          </span>
                          <button
                            onClick={() => handleCopyText(activeRepo.inferenceCommands.join('\n'), 'infer')}
                            className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"
                          >
                            {copiedIndex === 'infer' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy block
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 font-mono text-xs text-cyan-400/90 overflow-x-auto whitespace-pre leading-relaxed scrollbar-thin">
                          {activeRepo.inferenceCommands.join('\n')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom details card info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs text-white/50">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-[#ff4e00] shrink-0" />
                    <span>
                      <strong className="text-white/80 font-semibold font-sans">Conditioning Logic:</strong> {activeRepo.howItWorks.split('.')[0]}.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 sm:justify-end">
                    <Layers className="w-4 h-4 text-[#ff4e00] shrink-0" />
                    <span>
                      <strong className="text-white/80 font-semibold font-sans">Open-Source License:</strong> <span className="font-mono text-[#ff4e00]">{activeRepo.license}</span>
                    </span>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
