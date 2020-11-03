import { Component } from '@angular/core';
import { environment } from 'environments/environment';
import { GameService } from './game.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'client';

  version = environment.versions.app;

  userName$ = this.gameService.userName$;

  constructor(private gameService: GameService) {}
}
