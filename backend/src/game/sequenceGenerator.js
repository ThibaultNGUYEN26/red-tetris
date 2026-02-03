const TETROMINOES = ["I", "J", "L", "O", "S", "T", "Z"];

export default class sequenceGenerator {
  constructor() {
    this.queue = [];
  }

  next() {
    if (this.queue.length === 0) {
      this.refillBag();
    }
    return this.queue.shift();
  }

  refillBag() {
    const bag = [...TETROMINOES];

    // Fisher–Yates shuffle (uniform)
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    this.queue.push(...bag);
  }
}