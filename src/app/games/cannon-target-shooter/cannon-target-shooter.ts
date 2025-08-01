import { Component, ElementRef, viewChild, signal } from '@angular/core';
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
  zoomFactor = signal<number>(1);
  launchPower = signal<number>(10);
  launchAngle = signal<number>(45);

  ballPositionInMeters: Vector = { x: 1, y: 30 };

  ngAfterViewInit() {
    this.paintCannonBall();
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

    const initialMovementVector = { x: vX, y: vY };

    console.log({ angleRad, initialMovementVector });

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

    console.log({ elapsedSeconds, newMovementVector })

    const newPositionVector = addVectors(
      this.ballPositionInMeters,
      multiplyVectorByScalar(newMovementVector, elapsedSeconds));

    this.ballPositionInMeters = newPositionVector;
    if (newPositionVector.y < 0) {
      newPositionVector.y = 0;
    }

    this.paintCannonBall();

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

  paintCannonBall() {
    const ctx = this.cannonBallCanvas()?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.error('No context found for cannonball drawing');
      return;
    }

    const ballRadius = getBallRadiusInPixels(this.zoomFactor());
    const ballPosition = this.computeBallPositionInPixels();

    ctx.reset();
    ctx.fillStyle = '#333';

    ctx.moveTo(100, 100);
    ctx.ellipse(ballPosition.x, ballPosition.y, ballRadius, ballRadius, 0, 0, 360);
    ctx.fill();
  }
}