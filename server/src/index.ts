import http from 'http';
import express from 'express';
import cors from 'cors';
import { LobbyRoom, Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
import { resolve } from 'path';
// import socialRoutes from "@colyseus/social/express"

import { GameRoom } from './rooms/game.room';

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(resolve(__dirname, '../public')));

const server = http.createServer(app);
const gameServer = new Server({
  server,
});

app.get('*', function (request, response) {
  response.sendFile(resolve(__dirname, '../public/index.html'));
});

// register your room handlers
gameServer.define('lobby', LobbyRoom);
gameServer
  .define('game', GameRoom, {
    maxClients: 2,
  })
  .enableRealtimeListing();

/**
 * Register @colyseus/social routes
 *
 * - uncomment if you want to use default authentication (https://docs.colyseus.io/server/authentication/)
 * - also uncomment the import statement
 */
// app.use("/", socialRoutes);

// register colyseus monitor AFTER registering your room handlers
// app.use('/colyseus', monitor());

gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);
