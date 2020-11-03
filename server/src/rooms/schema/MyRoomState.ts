import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { Player } from './Player';

export enum GameState {
  SETTING = 'setting',
  RUNNING = 'running',
  FINISHED = 'finished',
}

export class MyRoomState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @type('uint8')
  host: number;

  @type('uint8')
  size = 15; // max 250 - see winningCombination

  @type(['uint8'])
  board = new ArraySchema<number>();

  @type('string')
  state = GameState.SETTING;

  @type('uint8')
  winningPlayerId: number;

  @type(['uint16'])
  winningCombination = new ArraySchema<number>();

  @type('uint8')
  currentMove: number;

  @type('int16')
  lastPosition: number = -1;

  @type('uint64')
  timeout: number = 5 * 60 * 1000;

  nextRound() {
    this.board = new ArraySchema(...Array(this.size ** 2).fill(0));
    this.winningCombination = new ArraySchema();
    this.winningPlayerId = 0;
    this.lastPosition = -1;
  }

  reset() {
    this.state = GameState.SETTING;
    this.players.forEach((p) => {
      p.remainingTime = 0;
      p.score = 0;
    });
    this.nextRound();
  }
}
