const TETROMINOES = ["I", "J", "L", "O", "S", "T", "Z"];

export default class sequenceGenerator {
  constructor() {
    this.queue = [];
    this.lastSpawnedPiece = null;
  }

  next() {
    if (this.queue.length === 0) {
      this.refillBag(this.lastSpawnedPiece);
    }

    const piece = this.queue.shift();
    this.lastSpawnedPiece = piece;
    return piece;
  }

  refillBag(lastSpawnedPiece) {
    let bag;

    do {
      bag = [...TETROMINOES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    } while (lastSpawnedPiece && bag[0] === lastSpawnedPiece);
    this.queue.push(...bag);
  }
}