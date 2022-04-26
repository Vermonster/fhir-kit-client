/* eslint-disable max-classes-per-file */
const { AbortController } = require('node-abort-controller');

class FetchJob {
  constructor() {
    this.controller = new AbortController();
    this.resolving = false;
  }

  addSignalOption(options) {
    return {
      signal: this.controller.signal,
      ...options,
    };
  }

  safeAbort() {
    if (!(this.resolving)) {
      this.controller.abort();
    }
  }
}

class FetchQueue {
  constructor() {
    this.jobs = [];
    this.numJobs = 0;
  }

  buildJob() {
    const job = new FetchJob();
    this.numJobs = this.jobs.push(job);
    return job;
  }

  safeAbortOthers(currentJob) {
    currentJob.resolving = true; // eslint-disable-line no-param-reassign
    for (let a = 0, l = this.numJobs; a < l; a += 1) {
      if (currentJob === this.jobs[a]) { continue; } // eslint-disable-line no-continue
      this.jobs[a].safeAbort();
    }
  }
}

module.exports = {
  FetchQueue,
  FetchJob,
};
