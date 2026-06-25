import { z } from 'zod';

// ============================================================================
// PHASE A: OFFLINE DEVICE CAPTURE (Agent 1)
// Anything not constrained by this schema is considered NARRATIVE and rejected.
// ============================================================================

export const ClockModelSchema = z.object({
  deviceMonotonic: z.number().int().nonnegative(),
  wallClock: z.number().int().nonnegative(), // t1
  serverClock: z.number().int().nonnegative().optional(), // Derived later during sync
});

export const TimeUncertaintySchema = z.object({
  deviceDriftPpm: z.number().min(0).max(500),
  ntpOffsetMs: z.number(),
  netRttMs: z.number().min(0),
  jitterMs: z.number().min(0),
});

export const DevicePerfSchema = z.object({
  cpuClass: z.string(),
  thermalState: z.enum(['nominal', 'fair', 'serious', 'critical']),
  fps: z.number().min(0).max(240),
  sensorLatency: z.number().min(0),
});

export const LightObservationSchema = z.object({
  azimuth_deg: z.number().min(0).max(360),
  elevation_deg: z.number().min(-90).max(90),
  timestamp_monotonic: z.number().int().nonnegative(),
  camera_exposure: z.number().positive(),
  iso: z.number().positive(),
  shutter: z.number().positive(),
  fov: z.number().positive(),
  max_luma: z.number().min(0).max(255),
  luma_histogram: z.array(z.number().int().nonnegative()).length(256),
  confidence: z.number().min(0).max(1),
});

// The strict payload generated offline by Agent 1
export const Agent1CalibrationBundle = z.object({
  clockModel: ClockModelSchema,
  timeUncertainty: TimeUncertaintySchema,
  devicePerf: DevicePerfSchema,
  observation: LightObservationSchema,
  calibrationVersion: z.literal('1.0.0'),
  registryVersion: z.literal('1.0.0'),
  consentReceipt: z.object({
    grantedAt: z.number(),
    scope: z.array(z.string()),
    hash: z.string() // Proof of what user consented to
  }),
  resourceBudgets: z.object({
    entropyBudgetUsed: z.number().nonnegative(),
    cpuBudgetUsed: z.number().nonnegative()
  })
});

export type Agent1Payload = z.infer<typeof Agent1CalibrationBundle>;
