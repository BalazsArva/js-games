import { Component, ElementRef, viewChild, signal, model, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Game, CannonBall } from './game';
import { Viewport } from './types';
import { Terrain } from './terrain';

const defaultPixelsPerMeter = 50;
const ballRadiusInMeter = 1;//1 / 10;

function convertLengthInMetersToPixels(lengthInMeters: number, zoomFactor: number) {
  return lengthInMeters * defaultPixelsPerMeter * zoomFactor;
}

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

  game = new Game(Terrain.createRandom(1500, 300));

  zoomFactor = model<number>(1);
  zoomFactorMin = signal<number>(.1);
  zoomFactorMax = signal<number>(2);
  zoomFactorStep = signal<number>(.1);

  viewportCenterInMeters = signal({ x: 0, y: 0 });

  launchPower = signal<number>(10);
  launchAngle = signal<number>(45);


  viewport = computed<Viewport>(() => {
    const mapSize = { widthInMeters: this.game.terrain.mapWidthMeters, heightInMeters: this.game.terrain.mapHeightMeters };

    const zoomAdjustedMapWidthInPixels = convertLengthInMetersToPixels(mapSize.widthInMeters, this.zoomFactor());
    const zoomAdjustedMapHeightInPixels = convertLengthInMetersToPixels(mapSize.heightInMeters, this.zoomFactor());

    const viewportWidthInMeters = this.game.terrain.mapWidthMeters / (zoomAdjustedMapWidthInPixels / this.canvasWidth);
    const viewportHeightInMeters = this.game.terrain.mapHeightMeters / (zoomAdjustedMapHeightInPixels / this.canvasHeight);

    // bounding box measured in meters
    // TODO: Imolement moving of viewport
    return {
      x: 0,
      y: 0,
      width: viewportWidthInMeters,
      height: viewportHeightInMeters,
    };
  })

  ngAfterViewInit() {
    this.doGameLoop(0);
  }

  doGameLoop(previousTimestamp: number) {
    requestAnimationFrame(() => {
      const now = performance.now();
      const elapsedMillis = now - previousTimestamp;
      this.game.updateState(elapsedMillis / 1000);
      this.renderFrame();

      this.doGameLoop(now);
    });
  }

  onMouseMove(e: MouseEvent) {

    if (e.buttons === 2) {

      const viewport = this.viewport();
      const xDistancePercentageRelativeToCanvas = e.offsetX / this.canvasWidth;
      const yDistancePercentageRelativeToCanvas = e.offsetY / this.canvasHeight;

      const movementInMetersX = viewport.width * (e.movementX / this.canvasWidth);
      const movementInMetersY = viewport.height * (e.movementY / this.canvasHeight);

      this.viewportCenterInMeters.update(curr => { return { x: curr.x + movementInMetersX, y: curr.y + movementInMetersY }; });

      e.preventDefault();
      return false;
    }

    return true;
  }

  onMouseWheel(e: WheelEvent) {
    if (e.deltaY > 0) {
      // scroll down, zoom out
      this.zoomFactor.update(curr => {
        const newVal = curr - this.zoomFactorStep();
        if (newVal > this.zoomFactorMin()) {
          return newVal;
        }
        return this.zoomFactorMin();
      });
    } else if (e.deltaY < 0) {
      // scroll up, zoom in
      this.zoomFactor.update(curr => {
        const newVal = curr + this.zoomFactorStep();
        if (newVal < this.zoomFactorMax()) {
          return newVal;
        }
        return this.zoomFactorMax();
      });
    }

    e.preventDefault();
    return false;
  }

  dropCannonBall() {
    this.game.spawnNewCannonBall({ x: 1, y: 100 }, { x: 0, y: 0 }, ballRadiusInMeter);
  }

  shootCannonBall() {
    const angleRad = (this.launchAngle() * Math.PI) / 180;
    const vX = Math.cos(angleRad) * this.launchPower();
    const vY = Math.sin(angleRad) * this.launchPower();

    this.game.spawnNewCannonBall({ x: 1, y: 100 }, { x: vX, y: vY }, ballRadiusInMeter);
  }

  renderFrame() {
    const ctx = this.cannonBallCanvas()?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('No context found for drawing');
      return;
    }

    ctx.reset();

    const viewport = this.viewport();
    const viewportElements = this.game.getViewportElements(viewport);

    this.paintTerrain(this.game.terrain, viewport, ctx);

    for (let i = 0; i < viewportElements.cannonBalls.length; ++i) {
      const cannonBall = viewportElements.cannonBalls[i];

      this.paintCannonBall(cannonBall, viewport, ctx);
    }

    this.paintMinimap();
  }

  paintTerrain(terrain: Terrain, viewport: Viewport, ctx: CanvasRenderingContext2D) {
    const zoomFactor = this.zoomFactor();

    ctx.fillStyle = '#089654ff';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#047440ff';

    for (let i = 0; i < terrain.landPolygons.length; ++i) {
      const poly = terrain.landPolygons[i];
      const vertices = poly.vertices;

      const path = new Path2D();
      path.moveTo(
        convertLengthInMetersToPixels(vertices[0].x - viewport.x, zoomFactor),
        this.canvasHeight - convertLengthInMetersToPixels(vertices[0].y - viewport.y, zoomFactor));

      for (let j = 1; j < poly.vertices.length; ++j) {
        path.lineTo(
          convertLengthInMetersToPixels(vertices[j].x - viewport.x, zoomFactor),
          this.canvasHeight - convertLengthInMetersToPixels(vertices[j].y - viewport.y, zoomFactor));
      }

      ctx.fill(path);
      ctx.stroke(path);
    }
  }

  paintCannonBall(cannonBall: CannonBall, viewport: Viewport, ctx: CanvasRenderingContext2D) {
    const zoomFactor = this.zoomFactor();
    const ballRadius = convertLengthInMetersToPixels(cannonBall.radius, zoomFactor);
    const xRelativeToViewport = cannonBall.position.x - viewport.x;
    const yRelativeToViewport = cannonBall.position.y - viewport.y;

    const canvasX = convertLengthInMetersToPixels(xRelativeToViewport, zoomFactor);
    const canvasY = this.canvasHeight - convertLengthInMetersToPixels(yRelativeToViewport, zoomFactor);

    ctx.fillStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffff00';

    const cbPath = new Path2D();
    cbPath.ellipse(canvasX, canvasY, ballRadius, ballRadius, 0, 0, 360);
    ctx.fill(cbPath);

    // TODO: Take this setting from a flag
    if (cannonBall.movementVector) {
      const vecPath = new Path2D();
      const vectorMagnifier = 10 * this.zoomFactor();

      vecPath.moveTo(canvasX, canvasY);
      vecPath.lineTo(canvasX + (vectorMagnifier * cannonBall.movementVector.x), canvasY - (vectorMagnifier * cannonBall.movementVector.y));

      ctx.stroke(vecPath);
    }
  }

  paintMinimap() {
    const ctx = this.cannonBallCanvas()?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('No context found for drawing');
      return;
    }

    // TODO: Change this once moving of viewport is implemented

    ctx.fillStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';

    const margin = 20;
    const mapWidthToHeightRatio = this.game.terrain.mapWidthMeters / this.game.terrain.mapHeightMeters;
    const minimapWidth = this.canvasWidth / 5;
    const minimapHeight = minimapWidth / mapWidthToHeightRatio;

    const viewport = this.viewport();
    const visibleWidthPercentage = viewport.width / this.game.terrain.mapWidthMeters;
    const visibleHeightPercentage = viewport.height / this.game.terrain.mapHeightMeters;

    const minimapViewportWidth = minimapWidth * visibleWidthPercentage;
    const minimapViewportHeight = minimapHeight * visibleHeightPercentage;

    ctx.rect(
      this.canvasWidth - minimapWidth - margin,
      margin,
      minimapWidth,
      minimapHeight);

    ctx.stroke();

    ctx.rect(
      this.canvasWidth - minimapWidth - margin,
      margin,
      minimapViewportWidth,
      minimapViewportHeight);

    ctx.stroke();
  }
}