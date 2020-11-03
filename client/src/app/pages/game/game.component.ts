import {
  trigger,
  transition,
  query,
  style,
  stagger,
  animate,
  keyframes,
} from '@angular/animations';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { GameService, Message, Player } from '../../game.service';
import { Mark } from '../../mark.enum';
import {
  GameState,
  PlayerData,
  PlayService,
  StateData,
} from '../../play.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location, PlatformLocation } from '@angular/common';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  animations: [
    trigger('gameEndPositions', [
      transition('* => true', [
        query(
          '.position.winning',
          [
            stagger(30, [
              animate(
                '500ms cubic-bezier(0.35, 0, 0.25, 1)',
                keyframes([
                  style({ transform: 'none' }),
                  style({ transform: 'scale(1.5)' }),
                  style({ transform: 'none' }),
                ]),
              ),
            ]),
          ],
          {
            optional: true,
          },
        ),
      ]),
    ]),

    trigger('gameEnd', [
      transition(':enter', [
        style({ transform: 'scale(3)' }),
        animate(
          '500ms cubic-bezier(1,.4,.96,.86)',
          style({ transform: 'none' }),
        ),
      ]),
    ]),

    trigger('reveal', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-30px)' }),
        animate(
          '300ms cubic-bezier(0.35, 0, 0.25, 1)',
          style({ opacity: 1, transform: 'none' }),
        ),
      ]),
    ]),
  ],
})
export class GameComponent implements OnInit, OnDestroy, AfterViewChecked {
  destroy$ = new Subject();

  @ViewChild('scrollBottom') private scrollBottom: ElementRef;
  scrollBottomOnNextCheck = false;

  // components
  moveConfirmation: number;

  messages$ = this.playService.messages$.pipe(
    tap(() => this.onIncommingMessage()),
  );

  Mark = Mark;

  showInviteDialog = false;

  get state(): StateData {
    return this.playService.state;
  }

  get isStateSetting(): boolean {
    return this.playService.state.state === GameState.SETTING;
  }

  get isStateRunning(): boolean {
    return this.playService.state.state === GameState.RUNNING;
  }

  get isStateFinished(): boolean {
    return this.playService.state.state === GameState.FINISHED;
  }

  get boardWidth(): number {
    return this.state.size * 30;
  }

  get canStartGame(): boolean {
    return (
      this.isHost &&
      this.state.state === GameState.SETTING &&
      this.state.players.length > 1
    );
  }

  get isHost(): boolean {
    return (
      this.state.player &&
      this.state.host &&
      this.state.player.id === this.state.host.id
    );
  }

  get showBoard(): boolean {
    return (
      this.state.state === GameState.RUNNING ||
      this.state.state === GameState.FINISHED
    );
  }

  get playerA(): PlayerData {
    if (this.state.players.length > 0) {
      return this.state.players[0];
    }

    return null;
  }

  get playerB(): PlayerData {
    if (this.state.players.length > 1) {
      return this.state.players[1];
    }

    return null;
  }

  get inviteLink(): string {
    return this.platformLocation.href;
  }

  constructor(
    private playService: PlayService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private platformLocation: PlatformLocation,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(async (p) => {
      const id = p.id;

      // catch if joining/creating fails
      try {
        if (!id) {
          const room = await this.playService.createGameRoom();

          // change location without leaving this component
          const url = this.router
            .createUrlTree([room.id], { relativeTo: this.route })
            .toString();
          this.location.replaceState(url);
        } else {
          await this.playService.joinRoom(id);
        }
      } catch (e) {
        this.router.navigate(['/lobby']);
      }
    });
  }

  ngOnDestroy(): void {
    this.playService.leaveRoom();
    this.destroy$.next();
  }

  async startGame(): Promise<void> {
    this.playService.startGame();
  }

  resetGame(): void {
    this.playService.resetGame();
  }

  placeMark(position: number): void {
    // something already placed
    if (this.state.board[position]) {
      return;
    }

    if (this.state.state !== GameState.RUNNING) {
      return;
    }

    if (this.state.currentMove.id !== this.state.player.id) {
      return;
    }

    if (this.moveConfirmation === position) {
      this.playService.placeMark(position);
      this.moveConfirmation = null;
    } else {
      this.moveConfirmation = position;
    }
  }

  trackBy(index: number, data: PlayerData): number {
    return index * 1000 + (data?.id ?? 0);
  }

  isWinningPosition(position: number): boolean {
    return (
      this.state.state === GameState.FINISHED &&
      this.state.winningCombination.includes(position)
    );
  }

  sendMessage(message: string): void {
    if (!message) {
      return;
    }

    this.playService.sendMessage(message);
  }

  isMessageOutgoing(message: Message): boolean {
    return !message.system && message.player.id === this.state.player.id;
  }

  ngAfterViewChecked(): void {
    if (this.scrollBottomOnNextCheck) {
      this.scrollToBottom();
      this.scrollBottomOnNextCheck = false;
    }
  }

  onIncommingMessage(): void {
    this.scrollBottomOnNextCheck = true;
  }

  scrollToBottom(): void {
    try {
      this.scrollBottom.nativeElement.scrollTop = this.scrollBottom.nativeElement.scrollHeight;
    } catch (err) {}
  }

  copyInviteLink(element: HTMLInputElement): void {
    element.select();
    document.execCommand('copy');
  }
}
