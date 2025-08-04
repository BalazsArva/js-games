import { Component, ElementRef, viewChild, signal, model, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

const ballRadiusInMeter = 1;//1 / 10;
const defaultPixelsPerMeter = 50;
const gravityAcceleration = 9.81;

function convertLengthInMetersToPixels(lengthInMeters: number, zoomFactor: number) {
  return lengthInMeters * defaultPixelsPerMeter * zoomFactor;
}

interface Vector {
  x: number;
  y: number;
}

function addVectors(a: Vector, b: Vector) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function multiplyVectorByScalar(a: Vector, s: number) {
  return { x: a.x * s, y: a.y * s };
}

class Game {
  private cannonBalls: CannonBall[] = [];

  constructor(public mapWidthMeters: number, public mapHeightMeters: number) {
  }

  updateState(elapsedSeconds: number) {
    if (!this.cannonBalls.length) {
      return;
    }

    const gravityAccelerationOverElapsedTime: Vector = { x: 0, y: -(elapsedSeconds * gravityAcceleration) };

    for (let i = this.cannonBalls.length - 1; i >= 0; --i) {
      const cannonBall = this.cannonBalls[i];
      if (!cannonBall.movementVector) {
        continue;
      }

      const newMovementVector = addVectors(cannonBall.movementVector, gravityAccelerationOverElapsedTime);
      const newPositionVector = addVectors(
        cannonBall.position,
        multiplyVectorByScalar(newMovementVector, elapsedSeconds));

      cannonBall.movementVector = newMovementVector;
      cannonBall.position = newPositionVector;

      // Ball went off the map - delete it
      if (newPositionVector.x < (- 2 * cannonBall.radius) ||
        newPositionVector.x > (this.mapWidthMeters + 2 * cannonBall.radius) ||
        newPositionVector.y < (-2 * cannonBall.radius) ||
        newPositionVector.y > (this.mapHeightMeters + 2 * cannonBall.radius)) {
        this.cannonBalls.splice(i, 1);
      }
    }
  }

  getViewportElements(viewport: Viewport) {
    // TODO: Improve fitlering - it only returns elements whose center are in the VP, but clipping will occur
    return {
      cannonBalls: this.cannonBalls.filter(cb =>
      (cb.position.x >= viewport.x && cb.position.x <= (viewport.x + viewport.width) &&
        (cb.position.y >= viewport.y && cb.position.y <= (viewport.y + viewport.height)))),
    };
  }

  spawnNewCannonBall(position: Vector, movement: Vector) {
    // TODO: Radius and weight as input  or configurable
    this.cannonBalls.push(new CannonBall(position, ballRadiusInMeter, 0, movement));
  }
}

// x,y,radius,movementVector expressed in meters
class CannonBall {
  constructor(
    public position: Vector,
    public radius: number,
    public weight: number,
    public movementVector: Vector) {
  }
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
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

  game = new Game(1500, 300);

  zoomFactor = model<number>(1);
  zoomFactorMin = signal<number>(.1);
  zoomFactorMax = signal<number>(2);
  zoomFactorStep = signal<number>(.1);

  viewportCenterInMeters = signal({ x: 0, y: 0 });

  launchPower = signal<number>(10);
  launchAngle = signal<number>(45);


  viewport = computed<Viewport>(() => {
    const mapSize = { widthInMeters: this.game.mapWidthMeters, heightInMeters: this.game.mapHeightMeters };

    const zoomAdjustedMapWidthInPixels = convertLengthInMetersToPixels(mapSize.widthInMeters, this.zoomFactor());
    const zoomAdjustedMapHeightInPixels = convertLengthInMetersToPixels(mapSize.heightInMeters, this.zoomFactor());

    const viewportWidthInMeters = this.game.mapWidthMeters / (zoomAdjustedMapWidthInPixels / this.canvasWidth);
    const viewportHeightInMeters = this.game.mapHeightMeters / (zoomAdjustedMapHeightInPixels / this.canvasHeight);

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

    /*
    this.zoomFactor.subscribe(() => {
      this.paintCannonBall();
      this.paintMinimap();
    })
    */
  }

  doGameLoop(previousTimestamp: number) {
    requestAnimationFrame(() => {
      const now = performance.now();
      const elapsedMillis = now - previousTimestamp;
      this.game.updateState(elapsedMillis / 1000);
      this.animateCannonBall();

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
    // The density of pure iron at room temperature is 7,874 kg/m³
    const ballVolume = (4 / 3) * Math.PI * Math.pow(ballRadiusInMeter, 3);
    const weight = 7874 * ballVolume;

    console.log({ cannonBallVolume: ballVolume, cannonBallWeight: weight, cannonBallRadius: ballRadiusInMeter });

    this.game.spawnNewCannonBall({ x: 1, y: 100 }, { x: 0, y: 0 });
  }

  shootCannonBall() {
    const angleRad = (this.launchAngle() * Math.PI) / 180;
    const vX = Math.cos(angleRad) * this.launchPower();
    const vY = Math.sin(angleRad) * this.launchPower();

    this.game.spawnNewCannonBall({ x: 1, y: 100 }, { x: vX, y: vY });
  }

  animateCannonBall() {
    const ctx = this.cannonBallCanvas()?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('No context found for drawing');
      return;
    }

    ctx.reset();

    const viewport = this.viewport();
    const viewportElements = this.game.getViewportElements(viewport);

    for (let i = 0; i < viewportElements.cannonBalls.length; ++i) {
      const cannonBall = viewportElements.cannonBalls[i];

      this.paintCannonBall(cannonBall, viewport, ctx);
    }

    this.paintMinimap();
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
    const mapWidthToHeightRatio = this.game.mapWidthMeters / this.game.mapHeightMeters;
    const minimapWidth = this.canvasWidth / 5;
    const minimapHeight = minimapWidth / mapWidthToHeightRatio;

    const viewport = this.viewport();
    const visibleWidthPercentage = viewport.width / this.game.mapWidthMeters;
    const visibleHeightPercentage = viewport.height / this.game.mapHeightMeters;

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