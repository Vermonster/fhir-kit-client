export class FetchJob {
  readonly controller: AbortController;
  resolving: boolean;

  constructor() {
    this.controller = new AbortController();
    this.resolving = false;
  }

  addSignalOption<T extends object>(options: T): T & { signal: AbortSignal } {
    return { signal: this.controller.signal, ...options };
  }

  safeAbort(): void {
    if (!this.resolving) {
      this.controller.abort();
    }
  }
}

export class FetchQueue {
  private readonly jobs: FetchJob[];
  numJobs: number;

  constructor() {
    this.jobs = [];
    this.numJobs = 0;
  }

  buildJob(): FetchJob {
    const job = new FetchJob();
    this.numJobs = this.jobs.push(job);
    return job;
  }

  safeAbortOthers(currentJob: FetchJob): void {
    currentJob.resolving = true;
    for (const job of this.jobs) {
      if (job !== currentJob) {
        job.safeAbort();
      }
    }
  }
}
