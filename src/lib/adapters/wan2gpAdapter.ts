import { VideoBackendAdapter, AdapterJobInput, AdapterJobStatus, AdapterJobResult } from './baseAdapter';

export class Wan2GPAdapter implements VideoBackendAdapter {
  name = 'Wan2GP';

  // TODO: Set your local Wan2GP endpoint (defaults to http://localhost:7860 as per specification).
  private apiHost = 'http://localhost:7860';

  async createJob(input: AdapterJobInput): Promise<{ jobId: string }> {
    console.log(`[Wan2GP Adapter] Creating generation task for prompt: "${input.prompt}"`);
    
    // TODO: Send request to Wan2GP direct generation endpoint.
    // POST `${this.apiHost}/api/generate` with model configurations:
    // {
    //   "prompt": input.prompt,
    //   "seed": input.seed,
    //   "model": input.model,
    //   "resolution": input.resolution,
    //   "duration_seconds": input.duration,
    //   "first_frame": input.sourceImage ? input.sourceImage.data : null
    // }
    
    const mockJobId = 'wan2gp-job-' + Math.floor(Math.random() * 1000000);
    return { jobId: mockJobId };
  }

  async getJobStatus(jobId: string): Promise<AdapterJobStatus> {
    console.log(`[Wan2GP Adapter] Checking task progress: ${jobId}`);
    
    // TODO: Poll `${this.apiHost}/api/status/${jobId}` to receive current frame/step index.
    
    return {
      status: 'running',
      progress: 30
    };
  }

  async getJobResult(jobId: string): Promise<AdapterJobResult> {
    console.log(`[Wan2GP Adapter] Retrieving compiled video stream: ${jobId}`);
    
    // TODO: Read stream paths or download final compiled MP4 file.
    // e.g. GET `${this.apiHost}/api/outputs/${jobId}.mp4`
    
    return {
      status: 'completed',
      progress: 100,
      outputVideoPath: `${this.apiHost}/api/outputs/${jobId}.mp4`
    };
  }
}

export const wan2gpAdapter = new Wan2GPAdapter();
