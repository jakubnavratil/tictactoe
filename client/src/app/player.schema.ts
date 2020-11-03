import { Schema } from '@colyseus/schema';
import { Mark } from './mark.enum';

export abstract class PlayerSchema extends Schema {
  id: number;

  userName: string;

  score: number;

  mark: Mark;

  remainingTime: number;
}
