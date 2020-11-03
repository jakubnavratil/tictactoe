import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { Delayed } from 'colyseus';

export class Player extends Schema {
  @type('uint8')
  id: number;

  @type('string')
  userName: string;

  @type('uint8')
  score: number = 0;

  @type('uint8')
  mark: number;

  @type('uint64')
  remainingTime: number;
}
