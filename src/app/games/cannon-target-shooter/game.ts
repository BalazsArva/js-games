import {
  AirDensity,
  DragCoefficientSphere,
  GravityAcceleration,
  IronDensity,
  Vector,
  Viewport,
  IsBoundingBoxInViewport
} from "./types";
import { Terrain, Triangle } from "./terrain";

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

  // TODO: Cache the non-varying ones of these

  get surfaceArea(): number {
    return 4 * Math.PI * this.radius * this.radius;
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

  get dragForce(): number {
    return 0.5 * AirDensity * this.surfaceArea * DragCoefficientSphere * Math.pow(this.velocity, 2);
  }

  get dragDeceleration(): number {
    return this.dragForce / this.mass;
  }
}

export interface ViewportElements {
  cannonBalls: CannonBall[];
  terrain: Triangle[];
}

export class Game {
  private cannonBalls: CannonBall[] = [];

  constructor(public terrain: Terrain) {
  }

  updateState(elapsedSeconds: number) {
    if (!this.cannonBalls.length) {
      return;
    }

    const gravityAccelerationOverElapsedTime: Vector = { x: 0, y: -(elapsedSeconds * GravityAcceleration) };

    for (let i = this.cannonBalls.length - 1; i >= 0; --i) {
      const cannonBall = this.cannonBalls[i];

      let newMovementVector = addVectors(cannonBall.movementVector, gravityAccelerationOverElapsedTime);

      // air resistance
      const dragDeceleration = cannonBall.dragDeceleration;
      const angleRad = cannonBall.movementVector.x === 0
        ? (Math.PI / 2) * Math.sign(cannonBall.movementVector.y)
        : Math.atan(cannonBall.movementVector.y / cannonBall.movementVector.x);

      // Angle opposite to movement (PI rad = 180 deg)
      const dragDecelerationAngleRad = angleRad + Math.PI;
      const dragDecelerationX = Math.cos(dragDecelerationAngleRad) * dragDeceleration;
      const dragDecelerationY = Math.sin(dragDecelerationAngleRad) * dragDeceleration;

      const dragDecelerationVector: Vector = { x: dragDecelerationX, y: dragDecelerationY };

      newMovementVector = addVectors(newMovementVector, multiplyVectorByScalar(dragDecelerationVector, elapsedSeconds));
      // end of air resistance

      const newPositionVector = addVectors(
        cannonBall.position,
        multiplyVectorByScalar(newMovementVector, elapsedSeconds));

      cannonBall.movementVector = newMovementVector;
      cannonBall.position = newPositionVector;

      // Ball went off the map - delete it
      if (newPositionVector.x < (- 2 * cannonBall.radius) ||
        newPositionVector.x > (this.terrain.mapWidthMeters + 2 * cannonBall.radius) ||
        newPositionVector.y < (-2 * cannonBall.radius) ||
        newPositionVector.y > (this.terrain.mapHeightMeters + 2 * cannonBall.radius)) {
        this.cannonBalls.splice(i, 1);
      } else if (this.terrain.pointCollidesWithTerrain({ x: newPositionVector.x, y: newPositionVector.y })) {

        // TODO: Maybe instead of radius, pass the energy to the destruction function. Each triangle destroyed should consume some amount of energy?
        console.log(`COLLISION - E=${cannonBall.kineticEnergy}`)
        this.cannonBalls.splice(i, 1);
        this.terrain.damageTerrainAtPosition({ x: newPositionVector.x, y: newPositionVector.y }, 1.55 * (cannonBall.kineticEnergy / (10000000)))
      }
    }
  }

  getViewportElements(viewport: Viewport): ViewportElements {
    const triangles: Triangle[] = [];

    for (let key in this.terrain.terrainSegments) {
      const segment = this.terrain.terrainSegments[key];
      const segmentBoundingBox = segment.boundingBox;

      const isBoundingBoxInViewportResult = IsBoundingBoxInViewport(segmentBoundingBox, viewport);

      if (isBoundingBoxInViewportResult === 'CompletelyInViewport') {
        for (let triangle of segment.iterateTriangles()) {
          triangles.push(triangle);
        }
      } else if (isBoundingBoxInViewportResult === 'PartiallyInViewport') {
        for (let triangle of segment.iterateTriangles()) {
          if (IsBoundingBoxInViewport(triangle.boundingBox, viewport)) {
            triangles.push(triangle);
          }
        }
      }
    }

    // TODO: Improve fitlering - it only returns elements whose center are in the VP, but clipping will occur
    return {
      terrain: triangles,
      cannonBalls: this.cannonBalls.filter(cb =>
      (cb.position.x >= viewport.x && cb.position.x <= (viewport.x + viewport.width) &&
        (cb.position.y >= viewport.y && cb.position.y <= (viewport.y + viewport.height)))),
    };
  }

  spawnNewCannonBall(position: Vector, movement: Vector, radius: number) {
    this.cannonBalls.push(new CannonBall(position, radius, movement));
  }
}