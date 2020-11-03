import { Pipe, PipeTransform } from '@angular/core';
import { PlayerData } from '../play.service';

@Pipe({
  name: 'playerName',
})
export class PlayerNamePipe implements PipeTransform {
  transform(player: PlayerData, ...args: unknown[]): unknown {
    if (!player) {
      return null;
    }

    return `${player.name}#${player.id}`;
  }
}
