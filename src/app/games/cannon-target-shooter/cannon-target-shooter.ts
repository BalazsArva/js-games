import { Component, ElementRef, viewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const ballRadiusInMeter = 1 / 6;
const defaultPixelsPerMeter = 50;
const gravityAccelerationInMetersPerSecond = 9.81;

function convertLengthInMetersToPixels(lengthInMeters: number, zoomFactor: number) {
  return lengthInMeters * defaultPixelsPerMeter * zoomFactor;
}

function getBallRadiusInPixels(zoomFactor: number) {
  return convertLengthInMetersToPixels(ballRadiusInMeter, zoomFactor);
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

  ballPositionInMetersHeight = 1500;
  ballPositionInMetersWidth = 1;

  ngAfterViewInit() {
    this.paintCannonBall();
  }

  dropCannonBall() {
    let previousTimestamp = performance.now(); // measured in milliseconds
    let currentVelocity = 0;

    this.animateCannonBall(previousTimestamp, currentVelocity);
  }

  shootCannonBall() {
    
  }

  resetBallPosition() {
    this.ballPositionInMetersHeight = 250;
    this.paintCannonBall();
  }

  animateCannonBall(previousTimestamp: number, currentVelocity: number) {
    const now = performance.now();
    const elapsedSeconds = (now - previousTimestamp) / 1000;
    const velocityDelta = elapsedSeconds * gravityAccelerationInMetersPerSecond;
    currentVelocity += velocityDelta;

    this.ballPositionInMetersHeight -= (currentVelocity * elapsedSeconds);

    if (this.ballPositionInMetersHeight < 0) {
      this.ballPositionInMetersHeight = 0;
      this.paintCannonBall();
    } else {
      this.paintCannonBall();

      requestAnimationFrame(() => {
        this.animateCannonBall(now, currentVelocity);
      });
    }
  }

  computeBallPositionInPixels() {
    const heightInPixels = convertLengthInMetersToPixels(this.ballPositionInMetersHeight, this.zoomFactor());
    const x = convertLengthInMetersToPixels(this.ballPositionInMetersWidth, this.zoomFactor());

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