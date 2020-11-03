import { Injectable } from '@angular/core';
import { Room } from 'colyseus.js';
import { BehaviorSubject, Subject } from 'rxjs';
import { scan, switchMap, tap } from 'rxjs/operators';
import { GameService, Message } from './game.service';
import { Mark } from './mark.enum';
import { PlaySchema } from './play.schema';
import { PlayerSchema } from './player.schema';

export enum GameState {
  SETTING = 'setting',
  RUNNING = 'running',
  FINISHED = 'finished',
}

export interface StateData {
  player: PlayerData;
  players: PlayerData[];
  host: PlayerData;

  state: GameState;
  size: number;
  board: PlayerSchema[];
  currentMove: PlayerData;
  lastPosition: number;

  winningPlayer: PlayerData;
  winningCombination: number[];
}

export interface PlayerData {
  id: number;
  name: string;
  score: number;
  mark: Mark;
  remainingTime: number;
}

@Injectable({
  providedIn: 'root',
})
export class PlayService {
  room: Room<PlaySchema>;

  private messagesReset$ = new BehaviorSubject(null);
  private messagesSubject$ = new Subject<Message>();

  messages$ = this.messagesReset$.pipe(
    switchMap(() => {
      return this.messagesSubject$.asObservable().pipe(
        scan((messages, message) => {
          messages.push(message);
          if (messages.length > 50) {
            messages.splice(0, messages.length - 50);
          }

          return messages;
        }, [] as Message[]),
      );
    }),
  );

  state: StateData = this.createEmptyState();

  timerInterval: number;
  timerTimeout: number;

  constructor(private gameService: GameService) {}

  createEmptyState(): StateData {
    return {
      host: null,
      state: GameState.SETTING,
      board: [],
      currentMove: null,
      player: null,
      players: [],
      size: 10,
      lastPosition: -1,
      winningCombination: [],
      winningPlayer: null,
    };
  }

  async joinRoom(roomId: string): Promise<Room<PlaySchema>> {
    if (this.room && this.room.id === roomId) {
      return;
    }

    this.messagesReset$.next(null);

    this.room = await this.gameService.joinRoom<PlaySchema>(roomId);
    this.listenToRoom();

    return this.room;
  }

  async createGameRoom(): Promise<Room<PlaySchema>> {
    this.messagesReset$.next(null);

    this.room = await this.gameService.createGameRoom<PlaySchema>();
    this.listenToRoom();

    return this.room;
  }

  async leaveRoom(): Promise<void> {
    this.state = this.createEmptyState();
    if (!this.room) {
      return;
    }

    this.room.leave();
    this.room = null;
  }

  listenToRoom(): void {
    const room = this.room;

    const oldBoard = []; // TODO remove
    room.onStateChange((state) => {
      console.log('the room state has been updated:', state);

      const players = [...state.players.values()].map(this.playerDataFactory);
      this.state.players = players;

      this.state.host = players.find((p) => p.id === state.host);

      const board = state.board.reduce((sum, current, index) => {
        sum[index] = current ? players.find((p) => p.id === current) : null;
        return sum;
      }, oldBoard);
      this.state.board = board;

      const oldState = this.state.state;
      this.state.state = state.state;

      this.state.size = state.size;

      const lastMove = this.state.currentMove;
      this.state.currentMove = players.find((p) => p.id === state.currentMove);

      this.state.lastPosition = state.lastPosition;

      this.state.winningPlayer = players.find(
        (p) => p.id === state.winningPlayerId,
      );

      // someone won
      if (
        oldState !== this.state.state &&
        this.state.state === GameState.FINISHED
      ) {
        this.messagesSubject$.next({
          message: `${this.state.winningPlayer.name}#${this.state.winningPlayer.id} won`,
          player: null,
          system: true,
        });
      }

      const winningCombination = [...state.winningCombination.values()];
      this.state.winningCombination = winningCombination;

      // clear all timers
      if (this.state.state === GameState.RUNNING) {
        // currentMove changed
        if (
          (!lastMove && this.state.currentMove) ||
          lastMove.id !== this.state.currentMove.id
        ) {
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
          }
          if (this.timerTimeout) {
            clearTimeout(this.timerTimeout);
          }

          // start new timer
          let startTime = Date.now();
          this.timerInterval = window.setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            startTime = Date.now();
            this.state.currentMove.remainingTime -= elapsedTime;
          }, 200);

          this.timerTimeout = window.setTimeout(() => {
            this.state.currentMove.remainingTime = 0;
            window.clearInterval(this.timerInterval);
          }, this.state.currentMove.remainingTime);
        }
      } else {
        // clear all timers
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
        }
        if (this.timerTimeout) {
          clearTimeout(this.timerTimeout);
        }
      }
    });

    // there is bug in `once`, while handler is self removing, it skips next handler
    // hence this is registered at the end
    room.onStateChange.once((state) => {
      room.state.players.onAdd = (player) => {
        this.messagesSubject$.next({
          message: `${player.userName}#${player.id} joined`,
          player: null,
          system: true,
        });
      };
      room.state.players.onRemove = (player) => {
        this.messagesSubject$.next({
          message: `${player.userName}#${player.id} left`,
          player: null,
          system: true,
        });
      };
    });

    room.onMessage<PlayerSchema>('player', (data) => {
      this.state.player = this.playerDataFactory(data);
    });

    room.onMessage<{ message: string; playerId: number; system: boolean }>(
      'message',
      (data) => {
        let player: PlayerData;
        if (!data.system) {
          player = this.state.players.find((p) => p.id === data.playerId);
          if (!player) {
            return;
          }
        }

        this.messagesSubject$.next({
          message: data.message,
          player,
          system: data.system,
        });
      },
    );
  }

  private playerDataFactory(player: PlayerSchema): PlayerData {
    return {
      id: player.id,
      mark: player.mark,
      name: player.userName,
      score: player.score,
      remainingTime: player.remainingTime,
    };
  }

  sendMessage(message: string): void {
    this.room.send('message', message);
  }

  startGame(): void {
    this.room.send('control', { type: 'start' });
  }

  resetGame(): void {
    this.room.send('control', { type: 'reset' });
  }

  placeMark(position: number): void {
    this.room.send('move', { position });
  }
}
