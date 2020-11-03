import { Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import { GameState } from './play.service';
import { PlayerSchema } from './player.schema';

export abstract class PlaySchema extends Schema {
  players = new MapSchema<PlayerSchema>();

  host: number;

  size: number; // max 250 - see winningCombination

  board = new ArraySchema<number>();

  state: GameState;

  winningPlayerId: number;

  winningCombination = new ArraySchema<number>();

  currentMove: number;

  lastPosition: number;

  timeout: number;
}
