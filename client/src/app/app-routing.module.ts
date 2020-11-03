import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { GameComponent } from './pages/game/game.component';
import { LobbyComponent } from './pages/lobby/lobby.component';
import { LoginComponent } from './pages/login/login.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'lobby',
      },
      {
        path: 'lobby',
        component: LobbyComponent,
      },
      {
        path: 'game',
        component: GameComponent,
      },
      {
        path: 'game/:id',
        component: GameComponent,
      },
    ],
  },

  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: '**',
    redirectTo: '/',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
