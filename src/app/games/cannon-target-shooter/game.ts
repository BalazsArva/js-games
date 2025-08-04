import { GravityAcceleration, IronDensity, Vector, Viewport } from "./types";

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
    public movementVector: Vector) {
  }

  get velocity(): number {
    return Math.sqrt(Math.pow(this.movementVector.x, 2) + Math.pow(this.movementVector.y, 2));
  }

  get kineticEnergy(): number {
    return 0.5 * this.mass * Math.pow(this.velocity, 2);
  }

  get mass(): number {
    const ballVolume = (4 / 3) * Math.PI * Math.pow(this.radius, 3);
    return IronDensity * ballVolume;
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

      // TODO: Experiment only, remove later
      if (i === 0) {
        console.log({ velocity: cannonBall.velocity, kineticEnergy: cannonBall.kineticEnergy });
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
    this.cannonBalls.push(new CannonBall(position, radius, movement));
  }
}