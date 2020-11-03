import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../game.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  name = this.gameService.userName;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {}

  async login(): Promise<void> {
    await this.gameService.login(this.name);
  }
}
