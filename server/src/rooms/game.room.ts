import { Room, Client, Delayed } from 'colyseus';
import { GameState, MyRoomState } from './schema/MyRoomState';
import { Player } from './schema/Player';

export enum Mark {
  CIRCLE,
  CROSS,
}

export class GameRoom extends Room<MyRoomState> {
  maxClients = 2;

  lastPlayerId = 0;
  playersOrder: number[] = [];

  gameTime: Delayed;

  lastGameStartMove: number;

  marks = [Mark.CIRCLE, Mark.CROSS];
  unusedMarks = [...this.marks];

  timer: Delayed;

  onCreate(options: any) {
    this.clock.start();
    this.setState(new MyRoomState());

    this.onMessage('message', (client, message) => {
      const player = this.state.players.get(client.sessionId);

      this.broadcast('message', { playerId: player.id, message });
    });

    this.onMessage<{ type: 'start' | 'reset' }>(
      'control',
      (client, { type }) => {
        const player = this.state.players.get(client.sessionId);
        if (this.state.host !== player.id) {
          return;
        }

        if (type === 'reset') {
          this.reset();
          return;
        }

        if (type === 'start') {
          if (this.state.players.size !== 2) {
            return;
          }

          this.state.state = GameState.RUNNING;

          this.state.players.forEach((p) => {
            p.remainingTime = this.state.timeout;
          });

          // change starting move
          const players = [...this.state.players.values()];
          this.playersOrder = players.map((p) => p.id);
          if (!this.lastGameStartMove) {
            const random = Math.floor(Math.random() * this.playersOrder.length);
            this.state.currentMove = this.playersOrder[random];
          } else {
            const index = this.playersOrder.findIndex(
              (id) => id === this.lastGameStartMove,
            );
            if (index >= 0) {
              this.state.currentMove = this.playersOrder[
                (index + 1) % this.playersOrder.length
              ];
            } else {
              this.state.currentMove = this.playersOrder[0];
            }
          }

          this.lastGameStartMove = this.state.currentMove;

          // reset board
          this.state.nextRound();

          // timer for current player
          this.runTimer(this.state.currentMove);
        }
      },
    );

    this.onMessage<{ position: number }>('move', (client, { position }) => {
      if (this.state.state !== GameState.RUNNING) {
        return;
      }

      const player = this.state.players.get(client.sessionId);

      if (this.state.currentMove !== player.id) {
        return;
      }

      this.stopTimer(player);

      this.state.board.setAt(position, player.id);
      this.state.lastPosition = position;

      const checkResult = this.checkWin(position);
      if (checkResult) {
        this.state.state = GameState.FINISHED;
        this.state.winningPlayerId = player.id;

        player.score++;

        this.state.winningCombination.clear();
        this.state.winningCombination.push(...checkResult.sort());
      } else {
        // switch move to next player
        const currentMoveIndex = this.playersOrder.findIndex(
          (id) => id === player.id,
        );
        this.state.currentMove = this.playersOrder[
          (currentMoveIndex + 1) % this.playersOrder.length
        ];

        this.runTimer(this.state.currentMove);
      }
    });
  }

  stopTimer(player: Player) {
    if (this.timer) {
      player.remainingTime -= this.timer.elapsedTime;
      this.timer.clear();
      this.timer = null;
    }
  }

  runTimer(playerId: number) {
    const players = [...this.state.players.values()];
    const player = players.find((p) => p.id === playerId);
    const otherPlayer = players.filter((p) => p.id !== playerId)[0];

    this.timer = this.clock.setTimeout(() => {
      this.state.state = GameState.FINISHED;
      this.state.winningPlayerId = otherPlayer?.id;
      player.remainingTime = 0;
    }, player.remainingTime);
  }

  onJoin(client: Client, options: { userName: string }) {
    const player = new Player();
    player.assign({
      id: ++this.lastPlayerId,
      userName: options.userName,
      mark: this.unusedMarks[0],
    });

    this.unusedMarks = this.unusedMarks.filter((m) => m !== player.mark);

    if (!this.state.host) {
      this.state.host = player.id;
    }

    this.state.players.set(client.sessionId, player);
    client.send('player', player);
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    this.state.players.delete(client.sessionId);

    if (this.state.host === player.id) {
      if (this.state.players.size) {
        this.state.host = [...this.state.players.values()].shift().id;
      } else {
        this.disconnect();
        return;
      }
    }

    if (this.state.players.size < 2) {
      this.reset();
    }

    this.unusedMarks = [...this.unusedMarks, player.mark];
  }

  // keps the host
  reset() {
    if (this.timer) {
      this.timer.clear();
      this.timer = null;
    }

    this.lastGameStartMove = null;
    this.state.reset();
  }

  checkWin(lastMovedPosition: number): false | number[] {
    const board = this.state.board.toArray();
    const playerId = board[lastMovedPosition];
    const size = this.state.size;
    const minVPos = 0;
    const maxVPos = size ** 2 - 1;
    let win: number[] = [];

    // check horizontal
    win = [lastMovedPosition];
    let pos;
    // check left to right
    pos = lastMovedPosition - 1;
    while (
      pos >= Math.floor(lastMovedPosition / size) * size &&
      board[pos] === playerId
    ) {
      win.push(pos);
      pos--;
    }
    pos = lastMovedPosition + 1;
    while (
      pos <= Math.floor(lastMovedPosition / size) * size + size - 1 &&
      board[pos] === playerId
    ) {
      win.push(pos);
      pos++;
    }
    if (win.length >= 5) {
      return win;
    }

    // check vertical
    win = [lastMovedPosition];
    // check top to bot
    pos = lastMovedPosition - size;
    while (pos >= minVPos && board[pos] === playerId) {
      win.push(pos);
      pos -= size;
    }
    pos = lastMovedPosition + size;
    while (pos <= maxVPos && board[pos] === playerId) {
      win.push(pos);
      pos += size;
    }
    if (win.length >= 5) {
      return win;
    }

    // check diag left top to right bot
    win = [lastMovedPosition];
    pos = lastMovedPosition - (size + 1);
    while (
      pos >= minVPos &&
      pos >= Math.floor(pos / size) * size &&
      board[pos] === playerId
    ) {
      win.push(pos);
      pos -= size + 1;
    }
    pos = lastMovedPosition + (size + 1);
    while (
      pos <= maxVPos &&
      pos <= Math.floor(pos / size) * size + size - 1 &&
      board[pos] === playerId
    ) {
      win.push(pos);
      pos += size + 1;
    }
    if (win.length >= 5) {
      return win;
    }

    // check diag right top to left bot
    win = [lastMovedPosition];
    pos = lastMovedPosition - (size - 1);
    while (
      pos >= minVPos &&
      pos <= Math.floor(pos / size) * size + size - 1 &&
      board[pos] === playerId
    ) {
      win.push(pos);
      pos -= size - 1;
    }
    pos = lastMovedPosition + (size - 1);
    while (
      pos <= maxVPos &&
      pos >= Math.floor(pos / size) * size &&
      board[pos] === playerId
    ) {
      win.push(pos);
      pos += size - 1;
    }
    if (win.length >= 5) {
      return win;
    }

    return false;
  }

  onDispose() {}
}
