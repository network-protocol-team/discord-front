export const logClient = (msg) => {
  console.log(`[DEBUG]: ${msg}`);
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class Timer {
  originalMs = 0;
  id = undefined;
  isAborted = false;

  constructor(ms) {
    this.ms = ms;
    this.originalMs = ms;
  }

  setMs(ms) {
    this.ms = ms;
  }
  start() {
    return new Promise((resolve) => {
      if (this.id === -1) {
        throw new Error('timer has already aborted');
      }
      this.id = setTimeout(resolve, this.ms);
    });
  }
  abort() {
    // 사용하지 않은 this.id 라면
    if (this.id !== -1 || this.id === undefined) {
      clearTimeout(this.id);
      this.id = -1;

      this.isAborted = true;
    }
  }
  reset() {
    this.id = undefined;
    this.isAborted = false;
    this.ms = this.originalMs;
  }
}
