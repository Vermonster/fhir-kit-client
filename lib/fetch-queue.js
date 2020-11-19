/* eslint-disable max-classes-per-file */

/* global AbortController */
require('abort-controller/polyfill');

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
    for (let a = 0, l = this.numJobs; a < l; a += 1) {
      if (currentJob === this.jobs[a]) { continue; } // eslint-disable-line no-continue
      this.jobs[a].controller.abort();
    }
  }
}

module.exports = {
  FetchQueue,
  FetchJob,
};
