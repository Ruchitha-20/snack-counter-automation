// A small process-local mutex. Suitable only for this single-process prototype.
class Lock {
  constructor() {
    this.tail = Promise.resolve();
  }

  async runExclusive(work) {
    let release;
    const previous = this.tail;
    this.tail = new Promise((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }
}

module.exports = { Lock };
