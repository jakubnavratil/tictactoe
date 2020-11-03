import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Room, RoomAvailable } from 'colyseus.js';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { GameService } from '../../game.service';
import { PlayService } from '../../play.service';

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnInit, OnDestroy {
  loading = true;
  rooms$ = this.gameService.rooms$;
  lobby: Room<unknown>;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}
}
