import { VideoBackendAdapter, AdapterJobInput, AdapterJobStatus, AdapterJobResult } from './baseAdapter';

export class GradioAdapter implements VideoBackendAdapter {
  name = 'Gradio WebUI';

  // TODO: Set to your local Gradio WebUI port, often running on port 7860.
  private apiHost = 'http://localhost:7860';

  async createJob(input: AdapterJobInput): Promise<{ jobId: string }> {
    console.log(`[Gradio Adapter] Creating generation job:`, input);
    
    // TODO: Send input arguments to the `/api/predict` endpoint.
    // Standard Gradio HTTP POST structure:
    // POST http://localhost:7860/api/predict
    // Body: { "data": [ prompt, seed, model, resolution, duration, image_b64 ], "fn_index": 0 }
    
    const mockJobId = 'gradio-job-' + Math.floor(Math.random() * 1000000);
    return { jobId: mockJobId };
  }

  async getJobStatus(jobId: string): Promise<AdapterJobStatus> {
    console.log(`[Gradio Adapter] Fetching job status: ${jobId}`);
    
    // TODO: Connect via Gradio SSE or websocket client if the backend uses queueing.
    // When queue is enabled, Gradio clients query status using a unique session hash.
    
    return {
      status: 'running',
      progress: 75
    };
  }

  async getJobResult(jobId: string): Promise<AdapterJobResult> {
    console.log(`[Gradio Adapter] Fetching job result: ${jobId}`);
    
    // TODO: Download or map Gradio output file list from the prediction response.
    // Gradio stores files inside the `temp/` folder, accessible via `/file={filepath}`.
    
    return {
      status: 'completed',
      progress: 100,
      outputVideoPath: `${this.apiHost}/file=gradio_temp_output.mp4`
    };
  }
}

export const gradioAdapter = new GradioAdapter();
