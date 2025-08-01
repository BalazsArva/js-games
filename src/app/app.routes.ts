import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Snake } from './games/snake/snake';
import { CannonTargetShooter } from './games/cannon-target-shooter/cannon-target-shooter';

export const routes: Routes = [
    {
        path: '',
        title: 'Home',
        component: Home,
    },
    {
        path: 'games/snake',
        title: 'Snake',
        component: Snake,
    },
    {
        path: 'games/cannon-target-shooter',
        title: 'Cannon target shooter',
        component: CannonTargetShooter,
    },
];
