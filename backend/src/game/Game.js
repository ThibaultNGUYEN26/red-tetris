import SequenceGenerator from "./sequenceGenerator.js";

export default class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;

    this.sequence = new SequenceGenerator();
  }

  start() {
    // Everyone gets the SAME pieces
    for (const player of this.players) {
      const first = this.sequence.next();
      const second = this.sequence.next();

      player.spawnPiece(first);
      player.setNextPiece(second);
    }
  }

  giveNextPiece(player) {
    const nextType = this.sequence.next();
    player.setNextPiece(nextType);
  }
}
