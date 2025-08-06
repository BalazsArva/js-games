import {
  AirDensity,
  DragCoefficientSphere,
  GravityAcceleration,
  IronDensity,
  Vector,
  Viewport
} from "./types";
import { Terrain } from "./terrain";

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

      // TODO: Experiment only
      if (i === 0) {
        const dragDeceleration = cannonBall.dragDeceleration;
        const angleRad = cannonBall.movementVector.x === 0
          ? (Math.PI / 2) * Math.sign(cannonBall.movementVector.y)
          : Math.atan(cannonBall.movementVector.y / cannonBall.movementVector.x);

        const angleDeg = (angleRad / Math.PI) * 180

        // Angle opposite to movement
        // TODO: Try not converting to deg, do the additions using rad
        const dragDecelerationAngle = angleDeg + 180;
        const dragDecelerationAngleRad = (dragDecelerationAngle * Math.PI) / 180;

        const dragDecelerationX = Math.cos(dragDecelerationAngleRad) * dragDeceleration;
        const dragDecelerationY = Math.sin(dragDecelerationAngleRad) * dragDeceleration;

        const dragDecelerationVector: Vector = { x: dragDecelerationX, y: dragDecelerationY };

        newMovementVector = addVectors(newMovementVector, multiplyVectorByScalar(dragDecelerationVector, elapsedSeconds));
      }
      // End of Experiment

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
      }
    }
  }

  getViewportElements(viewport: Viewport): ViewportElements {
    // TODO: Improve fitlering - it only returns elements whose center are in the VP, but clipping will occur
    return {
      // TODO: Only return visible terrain parts, maybe delegate filter to Terrain
      terrain: this.terrain,
      cannonBalls: this.cannonBalls.filter(cb =>
      (cb.position.x >= viewport.x && cb.position.x <= (viewport.x + viewport.width) &&
        (cb.position.y >= viewport.y && cb.position.y <= (viewport.y + viewport.height)))),
    };
  }

  spawnNewCannonBall(position: Vector, movement: Vector, radius: number) {
    this.cannonBalls.push(new CannonBall(position, radius, movement));
  }
}

export interface ViewportElements {
  cannonBalls: CannonBall[];
  terrain: Terrain;
}

export interface Command { }

export class ZoomInCommand implements Command { }
export class ZoomOutCommand implements Command { }
export class DragScreenCommand implements Command {
  constructor(public deltaXPixels: number, public deltaYPixels: number) {
  }
}
export class ShootCannonBallCommand implements Command {
  constructor(public angleDeg: number, public launchPower: number) {

  }
  // TODO: Later may need to remove this class and only send events such as keypresses.
  // Game host should know what a key means in a given scene (menu/game/etc.)
}
export class DropCannonBallCommand implements Command {
  // TODO: This class is temporary.
  constructor(public x: number, public y: number) {
  }
}




const ballRadiusInMeter = 1;//1 / 10;

export class GameHost {
  zoomFactorStep = 0.01;
  zoomFactorMin = 0.05;
  zoomFactorMax = 2;

  viewportBottomLeft = {
    x: 0,
    y: 0,
  };

  zoomSetting = {
    issuedAt: 0,
    value: 1,
    previousValue: 1,
  };

  constructor(
    private game: Game,
    private renderer: Renderer) {
  }

  startup() {
    this.doGameLoop(performance.now());
  }

  shutdown() {
  }

  sendCommand(command: Command) {
    if (command instanceof ZoomInCommand) {
      this.zoomIn();
    }
    else if (command instanceof ZoomOutCommand) {
      this.zoomOut();
    }
    else if (command instanceof DragScreenCommand) {
      this.dragScreen(<DragScreenCommand>command);
    }
    else if (command instanceof ShootCannonBallCommand) {
      this.shootCannonBall(<ShootCannonBallCommand>command);
    }
    else if (command instanceof DropCannonBallCommand) {
      this.dropCannonBall(<DropCannonBallCommand>command);
    }
  }

  private zoomIn() {
    let newVal = this.zoomSetting.value + this.zoomFactorStep;
    if (newVal > this.zoomFactorMax) {
      newVal = this.zoomFactorMax;
    }

    this.zoomSetting = {
      issuedAt: performance.now(),
      previousValue: this.zoomFactor(),
      value: newVal,
    };
  }

  private zoomOut() {
    let newVal = this.zoomSetting.value - this.zoomFactorStep;
    if (newVal < this.zoomFactorMin) {
      newVal = this.zoomFactorMin;
    }

    this.zoomSetting = {
      issuedAt: performance.now(),
      previousValue: this.zoomFactor(),
      value: newVal,
    };
  }

  private shootCannonBall(command: ShootCannonBallCommand) {

    const angleRad = (command.angleDeg * Math.PI) / 180;
    const vX = Math.cos(angleRad) * command.launchPower;
    const vY = Math.sin(angleRad) * command.launchPower;

    this.game.spawnNewCannonBall({ x: 1, y: 100 }, { x: vX, y: vY }, ballRadiusInMeter);
  }

  private dropCannonBall(command: DropCannonBallCommand) {
    this.game.spawnNewCannonBall({ x: command.x, y: command.y }, { x: 0, y: 0 }, ballRadiusInMeter);
  }

  private dragScreen(dragScreenCommand: DragScreenCommand) {
    const zoomFactor = this.zoomFactor();
    const hMovement = convertPixelsToMeters(dragScreenCommand.deltaXPixels, zoomFactor);
    const vMovement = convertPixelsToMeters(dragScreenCommand.deltaYPixels, zoomFactor);

    // TODO: Use some helper for viewport here too
    const height = convertPixelsToMeters(this.renderer.canvasHeight, zoomFactor);
    const width = convertPixelsToMeters(this.renderer.canvasWidth, zoomFactor);

    let bottomLeftX = this.viewportBottomLeft.x - hMovement;
    if (bottomLeftX < 0) {
      bottomLeftX = 0;
    } else if (bottomLeftX + width > this.game.terrain.mapWidthMeters) {
      bottomLeftX = this.game.terrain.mapWidthMeters - width;
    }

    let bottomLeftY = this.viewportBottomLeft.y + vMovement;
    if (bottomLeftY < 0) {
      bottomLeftY = 0;
    } else if (bottomLeftY + height > this.game.terrain.mapHeightMeters) {
      bottomLeftY = this.game.terrain.mapHeightMeters - height;
    }

    this.viewportBottomLeft = {
      x: bottomLeftX,
      y: bottomLeftY,
    };
  }

  zoomFactor() {
    const zoomAnimationMillis = 500;
    const now = performance.now()
    const elapsedMillis = now - this.zoomSetting.issuedAt;

    if (elapsedMillis >= zoomAnimationMillis) {
      return this.zoomSetting.value;
    }

    const diff = this.zoomSetting.value - this.zoomSetting.previousValue;

    return this.zoomSetting.previousValue + (diff * (elapsedMillis / zoomAnimationMillis));
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

  renderFrame() {
    const zoomFactor = this.zoomFactor();
    console.log(zoomFactor)
    const viewport = this.getViewport();
    const viewportElements = this.game.getViewportElements(viewport);

    this.renderer.render(viewport, viewportElements, zoomFactor);
  }

  getViewport(): Viewport {
    const zoomFactor = this.zoomFactor();
    return {
      x: this.viewportBottomLeft.x,
      y: this.viewportBottomLeft.y,
      // TODO: Review this
      height: convertPixelsToMeters(this.renderer.canvasHeight, zoomFactor),
      width: convertPixelsToMeters(this.renderer.canvasWidth, zoomFactor),
    };
  }
}

const defaultPixelsPerMeter = 50;

function convertLengthInMetersToPixels(lengthInMeters: number, zoomFactor: number) {
  return lengthInMeters * defaultPixelsPerMeter * zoomFactor;
}

function convertPixelsToMeters(pixels: number, zoomFactor: number) {
  return pixels / (defaultPixelsPerMeter * zoomFactor);
}

export class Renderer {
  canvasWidth: number;
  canvasHeight: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
  }

  public render(viewport: Viewport, viewportElements: ViewportElements, zoomFactor: number) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      console.error('No context found for drawing');
      return;
    }

    ctx.reset();

    this.paintTerrain(viewportElements.terrain, viewport, ctx, zoomFactor);

    for (let i = 0; i < viewportElements.cannonBalls.length; ++i) {
      const cannonBall = viewportElements.cannonBalls[i];

      this.paintCannonBall(cannonBall, viewport, ctx, zoomFactor);
    }

    this.paintMinimap(ctx);
  }

  paintTerrain(terrain: Terrain, viewport: Viewport, ctx: CanvasRenderingContext2D, zoomFactor: number) {
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

  paintCannonBall(cannonBall: CannonBall, viewport: Viewport, ctx: CanvasRenderingContext2D, zoomFactor: number) {
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
      const vectorMagnifier = 10 * zoomFactor;

      vecPath.moveTo(canvasX, canvasY);
      vecPath.lineTo(canvasX + (vectorMagnifier * cannonBall.movementVector.x), canvasY - (vectorMagnifier * cannonBall.movementVector.y));

      ctx.stroke(vecPath);
    }
  }

  paintMinimap(ctx: CanvasRenderingContext2D) {
    // TODO: Re-add this
    /*
    ctx.fillStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';

    const margin = 20;
    const mapWidthToHeightRatio = this.game.terrain.mapWidthMeters / this.game.terrain.mapHeightMeters;
    const minimapWidth = this.canvasWidth / 5;
    const minimapHeight = minimapWidth / mapWidthToHeightRatio;

    const viewport = this.getViewport();
    const visibleWidthPercentage = viewport.width / this.game.terrain.mapWidthMeters;
    const visibleHeightPercentage = viewport.height / this.game.terrain.mapHeightMeters;

    const minimapViewportWidth = minimapWidth * visibleWidthPercentage;
    const minimapViewportHeight = minimapHeight * visibleHeightPercentage;
    const minimapViewportX = (this.viewportBottomLeft.x / this.game.terrain.mapWidthMeters) * minimapWidth;
    const minimapViewportY = (this.viewportBottomLeft.y / this.game.terrain.mapHeightMeters) * minimapHeight;

    const minimapFull = new Path2D();
    const minimapViewport = new Path2D();

    minimapFull.rect(
      this.canvasWidth - minimapWidth - margin,
      margin,
      minimapWidth,
      minimapHeight);

    minimapViewport.rect(
      this.canvasWidth - minimapWidth - margin + minimapViewportX,
      margin + minimapHeight - minimapViewportHeight - minimapViewportY,
      minimapViewportWidth,
      minimapViewportHeight);

    ctx.stroke(minimapFull);
    ctx.stroke(minimapViewport);
    */
  }
}