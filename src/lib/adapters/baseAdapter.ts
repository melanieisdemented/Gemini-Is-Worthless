export interface AdapterJobInput {
  prompt: string;
  seed: number;
  model: string;
  resolution: string;
  duration: number; // in seconds
  sourceImage?: {
    data: string; // base64 encoding (without header prefix) or data URI
    filename: string;
  };
}

export interface AdapterJobStatus {
  status: 'draft' | 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0 to 100
  error?: string;
}

export interface AdapterJobResult {
  status: 'completed' | 'failed';
  progress: number;
  error?: string;
  outputVideoPath?: string;
  outputVideoData?: string; // base64 encoded video
}

export interface VideoBackendAdapter {
  name: string;
  createJob(input: AdapterJobInput): Promise<{ jobId: string }>;
  getJobStatus(jobId: string): Promise<AdapterJobStatus>;
  getJobResult(jobId: string): Promise<AdapterJobResult>;
}
