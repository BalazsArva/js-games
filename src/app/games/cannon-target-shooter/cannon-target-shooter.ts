import { Component, ElementRef, viewChild, signal, model, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

const ballRadiusInMeter = 1;//1 / 6;
const defaultPixelsPerMeter = 50;
const gravityAcceleration = 9.81;

function convertLengthInMetersToPixels(lengthInMeters: number, zoomFactor: number) {
  return lengthInMeters * defaultPixelsPerMeter * zoomFactor;
}

function getBallRadiusInPixels(zoomFactor: number) {
  return convertLengthInMetersToPixels(ballRadiusInMeter, zoomFactor);
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
  zoomFactor = model<number>(1);
  zoomFactorMin = signal<number>(.1);
  zoomFactorMax = signal<number>(2);
  zoomFactorStep = signal<number>(.1);

  launchPower = signal<number>(10);
  launchAngle = signal<number>(45);

  ballPositionInMeters: Vector = { x: 1, y: 10 };

  mapSize = { widthInMeters: 300, heightInMeters: 100 };
  getViewport = computed(() => {
    const zoomAdjustedMapWidthInPixels = convertLengthInMetersToPixels(this.mapSize.widthInMeters, this.zoomFactor());
    const zoomAdjustedMapHeightInPixels = convertLengthInMetersToPixels(this.mapSize.heightInMeters, this.zoomFactor());

    const viewportWidthInMeters = this.mapSize.widthInMeters / (zoomAdjustedMapWidthInPixels / this.canvasWidth);
    const viewportHeightInMeters = this.mapSize.heightInMeters / (zoomAdjustedMapHeightInPixels / this.canvasHeight);

    // bounding box measured in meters
    // TODO: Imolement moving of viewport
    return {
      xMeters: 0,
      yMeters: 0,
      widthMeters: viewportWidthInMeters,
      heightMeters: viewportHeightInMeters,
    };
  })

  ngAfterViewInit() {
    this.paintCannonBall();
    this.paintMinimap();

    this.zoomFactor.subscribe(() => {
      this.paintCannonBall();
      this.paintMinimap();
    })
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
    let previousTimestamp = performance.now(); // measured in milliseconds

    this.animateCannonBall(previousTimestamp, { x: 0, y: 0 });
  }

  shootCannonBall() {
    let previousTimestamp = performance.now(); // measured in milliseconds

    const angleRad = (this.launchAngle() * Math.PI) / 180;

    const vX = Math.cos(angleRad) * this.launchPower();
    const vY = Math.sin(angleRad) * this.launchPower();

    this.animateCannonBall(previousTimestamp, { x: vX, y: vY });
  }

  resetBallPosition() {
    this.ballPositionInMeters = { x: 1, y: 30 };
    this.paintCannonBall();
  }

  animateCannonBall(previousTimestamp: number, currentMovementVector: Vector) {
    const now = performance.now();
    const elapsedSeconds = (now - previousTimestamp) / 1000;

    const gravityAccelerationOverElapsedTime: Vector = { x: 0, y: -(elapsedSeconds * gravityAcceleration) };
    const newMovementVector = addVectors(currentMovementVector, gravityAccelerationOverElapsedTime);

    const newPositionVector = addVectors(
      this.ballPositionInMeters,
      multiplyVectorByScalar(newMovementVector, elapsedSeconds));

    this.ballPositionInMeters = newPositionVector;
    if (newPositionVector.y < 0) {
      newPositionVector.y = 0;
    }

    this.paintCannonBall(newMovementVector);
    this.paintMinimap();

    if (newPositionVector.y > 0) {
      requestAnimationFrame(() => {
        this.animateCannonBall(now, newMovementVector);
      });
    }
  }

  computeBallPositionInPixels() {
    const heightInPixels = convertLengthInMetersToPixels(this.ballPositionInMeters.y, this.zoomFactor());
    const x = convertLengthInMetersToPixels(this.ballPositionInMeters.x, this.zoomFactor());

    // 'ground level' is canvas.height 
    return { x: x, y: this.canvasHeight - heightInPixels };
  }

  paintCannonBall(movementVector?: Vector) {
    const ctx = this.cannonBallCanvas()?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('No context found for drawing');
      return;
    }

    ctx.reset();
    ctx.fillStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff0000';

    const ballRadius = getBallRadiusInPixels(this.zoomFactor());
    const { x, y } = this.computeBallPositionInPixels();

    ctx.ellipse(x, y, ballRadius, ballRadius, 0, 0, 360);
    ctx.fill();

    if (movementVector) {
      const vectorMagnifier = 10 * this.zoomFactor();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (vectorMagnifier * movementVector.x), y - (vectorMagnifier * movementVector.y));
      ctx.stroke();
      ctx.closePath();
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
    const mapWidthToHeightRatio = this.mapSize.widthInMeters / this.mapSize.heightInMeters;
    const minimapWidth = this.canvasWidth / 5;
    const minimapHeight = minimapWidth / mapWidthToHeightRatio;

    const viewport = this.getViewport();
    const visibleWidthPercentage = viewport.widthMeters / this.mapSize.widthInMeters;
    const visibleHeightPercentage = viewport.heightMeters / this.mapSize.heightInMeters;

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