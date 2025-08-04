import { GravityAcceleration, Vector, Viewport } from "./types";

function addVectors(a: Vector, b: Vector) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function multiplyVectorByScalar(a: Vector, s: number) {
  return { x: a.x * s, y: a.y * s };
}

// x,y,radius,movementVector expressed in meters
export class CannonBall {
  constructor(
    public position: Vector,
    public radius: number,
    public weight: number,
    public movementVector: Vector) {
  }
}

export class Game {
  private cannonBalls: CannonBall[] = [];

  constructor(public mapWidthMeters: number, public mapHeightMeters: number) {
  }

  updateState(elapsedSeconds: number) {
    if (!this.cannonBalls.length) {
      return;
    }

    const gravityAccelerationOverElapsedTime: Vector = { x: 0, y: -(elapsedSeconds * GravityAcceleration) };

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

  spawnNewCannonBall(position: Vector, movement: Vector, radius: number) {
    // TODO: Weight as input or configurable
    this.cannonBalls.push(new CannonBall(position, radius, 0, movement));
  }
}
