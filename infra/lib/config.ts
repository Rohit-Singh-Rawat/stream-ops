export interface StackConfig {
  readonly dbMinCapacity: number;
  readonly dbMaxCapacity: number;
  /** 1024 = 1 vCPU. FFmpeg transcoding is CPU-bound — size accordingly. */
  readonly workerCpu: number;
  /** Must be a valid Fargate cpu/memory combination. */
  readonly workerMemoryMiB: number;
  /**
   * Default Fargate ephemeral storage is 20GiB.
   * The worker downloads the full original video before transcoding, so this must
   * exceed your largest expected upload plus the generated HLS output.
   */
  readonly workerEphemeralStorageGiB: number;
  readonly apiCpu: number;
  readonly apiMemoryMiB: number;
  readonly webCpu: number;
  readonly webMemoryMiB: number;
  readonly apiMinCapacity: number;
  readonly apiMaxCapacity: number;
}

export const defaultConfig: StackConfig = {
  // 0.5 ACU allows Aurora to scale near-zero when idle.
  dbMinCapacity: 0.5,
  dbMaxCapacity: 16,
  workerCpu: 2048,
  workerMemoryMiB: 4096,
  workerEphemeralStorageGiB: 50,
  apiCpu: 512,
  apiMemoryMiB: 1024,
  webCpu: 512,
  webMemoryMiB: 1024,
  apiMinCapacity: 1,
  apiMaxCapacity: 10,
};
