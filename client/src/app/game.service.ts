import { Injectable } from '@angular/core';
import { Client, Room, RoomAvailable } from 'colyseus.js';
import { BehaviorSubject, fromEventPattern, Subject } from 'rxjs';
import { scan, withLatestFrom } from 'rxjs/operators';
import { PlayerData } from './play.service';
import { PlaySchema } from './play.schema';
import { Router } from '@angular/router';
import { Config } from './config';

export interface Message {
  message: string;
  player: PlayerData;
  system: boolean;
}

export interface Player {
  id: number;
  userName: string;
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private clientImpl: Client;
  private lobby: Room<unknown>;

  gameRoom: Room<PlaySchema>;

  private roomsSubject$ = new BehaviorSubject<RoomAvailable<unknown>[]>([]);
  rooms$ = this.roomsSubject$.asObservable();

  private userNameSubject$ = new BehaviorSubject<string>('');
  userName$ = this.userNameSubject$.asObservable();

  private userNameFilled = '';
  get userName(): string {
    if (!this.userNameFilled) {
      return window.localStorage.getItem('userName') ?? '';
    }

    return this.userNameFilled;
  }

  redirectUrl: string;

  constructor(private router: Router) {}

  private get client(): Client {
    if (!this.clientImpl) {
      this.clientImpl = new Client(Config.apiUrl);
    }
    return this.clientImpl;
  }

  get isLoggedIn(): boolean {
    return !!this.lobby;
  }

  async login(userName: string): Promise<Room<unknown>> {
    const lobby = await this.client.joinOrCreate('lobby', {
      userName,
    });
    this.lobby = lobby;
    this.userNameSubject$.next(userName);
    this.userNameFilled = userName;
    window.localStorage.setItem('userName', userName);

    let rooms: RoomAvailable<unknown>[] = [];
    this.lobby.onMessage('rooms', (serverRooms) => {
      rooms = serverRooms;
      this.roomsSubject$.next(rooms);
    });

    this.lobby.onMessage('+', ([roomId, room]) => {
      const roomIndex = rooms.findIndex((roomA) => roomA.roomId === roomId);
      if (roomIndex !== -1) {
        rooms[roomIndex] = room;
        rooms = [...rooms];
      } else {
        rooms = [...rooms, room];
      }

      this.roomsSubject$.next(rooms);
    });

    this.lobby.onMessage('-', (roomId) => {
      rooms = rooms.filter((room) => room.roomId !== roomId);
      this.roomsSubject$.next(rooms);
    });

    if (this.redirectUrl) {
      const url = this.redirectUrl;
      this.router.navigateByUrl(url);
    } else {
      this.router.navigate(['/lobby']);
    }

    this.redirectUrl = null;

    return lobby;
  }

  async joinRoom<T = unknown>(roomId: string): Promise<Room<T>> {
    return this.client.joinById(roomId, {
      userName: this.userName,
    });
  }

  async createGameRoom<T = unknown>(): Promise<Room<T>> {
    return this.client.create('game', {
      userName: this.userName,
    });
  }

  // async leaveGameRoom(): Promise<void> {
  //   if (!this.gameRoom) {
  //     return;
  //   }

  //   this.gameRoom.leave();
  // }
}
