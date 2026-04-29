/**
 * A single concurrent fetch slot that can be aborted.
 * Used internally by {@link FetchQueue}.
 */
export class FetchJob {
  readonly controller: AbortController;
  private resolving: boolean;

  constructor() {
    this.controller = new AbortController();
    this.resolving = false;
  }

  /** Merge this job's abort signal into an existing options object. */
  addSignalOption<T extends object>(options: T): T & { signal: AbortSignal } {
    return { signal: this.controller.signal, ...options };
  }

  /** Mark this job as the one that resolved first (prevents it from being aborted). */
  markResolving(): void {
    this.resolving = true;
  }

  /** Abort this job unless it has already resolved. */
  safeAbort(): void {
    if (!this.resolving) {
      this.controller.abort();
    }
  }
}

/**
 * Manages a set of concurrent fetch jobs, allowing all but the first winner
 * to be aborted. Used by {@link Client#smartAuthMetadata}.
 */
export class FetchQueue {
  private readonly jobs: FetchJob[];

  constructor() {
    this.jobs = [];
  }

  /** Total number of registered jobs. */
  get numJobs(): number {
    return this.jobs.length;
  }

  /** Register a new job and return it. */
  buildJob(): FetchJob {
    const job = new FetchJob();
    this.jobs.push(job);
    return job;
  }

  /** Mark `currentJob` as resolved and abort all sibling jobs. */
  safeAbortOthers(currentJob: FetchJob): void {
    currentJob.markResolving();
    for (const job of this.jobs) {
      if (job !== currentJob) {
        job.safeAbort();
      }
    }
  }
}
