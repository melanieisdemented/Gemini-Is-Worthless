import Dexie, { Table } from 'dexie';

export interface FileRecord {
  id?: number;
  key: string;
  data: string;
  mimeType: string;
  timestamp: number;
}

export interface VideoJob {
  id?: number;
  prompt: string;
  seed: number;
  resolution: string;
  model: string;
  duration: number; // Duration in seconds
  sourceImageName?: string;
  sourceImageData?: string; // base64 representation if available
  sourceImageMimeType?: string;
  outputVideoPath?: string; // Saved path or url
  outputVideoData?: string; // base64 for fallback preview
  outputVideoMimeType?: string; // video/mp4
  status: 'draft' | 'queued' | 'running' | 'failed' | 'complete';
  error?: string;
  progress: number; // 0 to 100
  backendType: 'comfyui' | 'gradio' | 'wan2gp';
  backendJobId?: string;
  createdAt: number;
  completedAt?: number;
}

export class AppDatabase extends Dexie {
  files!: Table<FileRecord, number>;
  videoJobs!: Table<VideoJob, number>;

  constructor() {
    super('AppStorageDB');
    this.version(2).stores({
      files: '++id, key, timestamp',
      videoJobs: '++id, status, createdAt'
    });
  }
}

export const db = new AppDatabase();

export const saveFile = async (key: string, data: string, mimeType: string) => {
  await db.files.where('key').equals(key).delete();
  await db.files.add({
    key,
    data,
    mimeType,
    timestamp: Date.now()
  });
};

export const getFile = async (key: string) => {
  const record = await db.files.where('key').equals(key).first();
  return record;
};

export const deleteFile = async (key: string) => {
  await db.files.where('key').equals(key).delete();
};

