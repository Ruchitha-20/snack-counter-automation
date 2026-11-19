const { createSeedData } = require("./seed-data");

class Store {
  constructor() {
    this.reset();
  }

  reset() {
    this.data = createSeedData();
  }
}

module.exports = { Store };
