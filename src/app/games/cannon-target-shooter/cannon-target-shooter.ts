import { Component, ElementRef, viewChild, signal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Game } from './game';
import { GameHost } from './game-host';
import { Renderer } from './renderer';
import { ZoomOutCommand, ZoomInCommand, DragScreenCommand, ShootCannonBallCommand, DropCannonBallCommand, CheckCollisionCommand, DestroyTerrainCommand } from './types';
import { Terrain } from './terrain';

@Component({
  selector: 'app-cannon-target-shooter',
  imports: [FormsModule],
  templateUrl: './cannon-target-shooter.html',
  styleUrl: './cannon-target-shooter.scss'
})
export class CannonTargetShooter {

  canvasWidth = 1200;
  canvasHeight = 800;
  cannonBallCanvas = viewChild<ElementRef<HTMLCanvasElement>>('cannonBallCanvas');

  launchPower = signal<number>(10);
  launchAngle = signal<number>(45);
  renderBoundingBoxes = model<boolean>(false);
  renderTriangleEdges = model<boolean>(false);

  gameHost: GameHost | undefined;
  renderer: Renderer | undefined;
  game: Game | undefined;

  constructor() {
    this.renderBoundingBoxes.subscribe(val => {
      if (this.renderer) {
        this.renderer.renderTriangleBoundingBox = val;
      }
    });
    this.renderTriangleEdges.subscribe(val => {
      if (this.renderer) {
        this.renderer.renderTriangleEdges = val;
      }
    });
  }

  ngAfterViewInit() {
    this.game = new Game(Terrain.createRandom(1200, 600));
    this.renderer = new Renderer(this.cannonBallCanvas()?.nativeElement!);
    this.gameHost = new GameHost(this.game, this.renderer);

    this.gameHost.startup();
  }

  onMouseMove(e: MouseEvent) {
    if (!this.gameHost) {
      return;
    }

    if (e.buttons === 2) {
      this.gameHost.sendCommand(new DragScreenCommand(e.movementX, e.movementY));

      e.preventDefault();
      return false;
    }

    return true;
  }

  onDoubleClick(e: MouseEvent) {
    if (!this.gameHost) {
      return;
    }

    this.gameHost.sendCommand(new DestroyTerrainCommand(e.offsetX, e.offsetY));
  }

  onMouseWheel(e: WheelEvent) {
    if (!this.gameHost) {
      return;
    }

    if (e.deltaY > 0) {
      this.gameHost.sendCommand(new ZoomOutCommand());
    } else if (e.deltaY < 0) {
      this.gameHost.sendCommand(new ZoomInCommand());
    }

    e.preventDefault();
    return false;
  }

  dropCannonBall() {
    if (!this.gameHost) {
      return;
    }

    this.gameHost.sendCommand(new DropCannonBallCommand(1, 100));
  }

  shootCannonBall() {
    if (!this.gameHost) {
      return;
    }

    this.gameHost.sendCommand(new ShootCannonBallCommand(this.launchAngle(), this.launchPower()));
  }
}