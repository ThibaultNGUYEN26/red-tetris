import SequenceGenerator from "./sequenceGenerator.js";

export default class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;

    this.sequence = new SequenceGenerator();
  }

  start() {
    const first = this.sequence.next();
    const second = this.sequence.next();

    for (const player of this.players) {
      player.spawnPiece(first);
      player.setNextPiece(second);
    }
  }

  giveNextPiece(player) {
      player.promoteNextPiece();
      const nextType = this.sequence.next();
      player.setNextPiece(nextType);
    }
}
