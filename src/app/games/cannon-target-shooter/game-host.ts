import { Game } from "./game";
import { Renderer } from "./renderer";
import { BallRadiusInMeter, CheckCollisionCommand, Command, convertPixelsToMeters, DestroyTerrainCommand, DragScreenCommand, DropCannonBallCommand, ShootCannonBallCommand, Viewport, ZoomInCommand, ZoomOutCommand } from "./types";

export class GameHost {
  zoomFactorStep = 0.01;
  zoomFactorMin = 0.05;
  zoomFactorMax = 1;

  viewportBottomLeft = {
    x: 0,
    y: 0,
  };

  zoomSetting = {
    issuedAt: 0,
    value: 0.05,
    previousValue: 0.05,
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
    else if (command instanceof CheckCollisionCommand) {
      this.checkCollision(<CheckCollisionCommand>command);
    }
    else if (command instanceof DestroyTerrainCommand) {
      const height = convertPixelsToMeters(this.renderer.canvasHeight, this.zoomFactor());
      const vp = this.getViewport();

      this.game.terrain.damageTerrainAtPosition(
        {
          x: vp.x + convertPixelsToMeters(command.xPixels, this.zoomFactor()),
          y: height - (vp.y + convertPixelsToMeters(command.yPixels, this.zoomFactor())),
        },
        4);
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

    this.game.spawnNewCannonBall({ x: 1, y: 100 }, { x: vX, y: vY }, BallRadiusInMeter);
  }

  private dropCannonBall(command: DropCannonBallCommand) {
    this.game.spawnNewCannonBall({ x: command.x, y: command.y }, { x: 0, y: 0 }, BallRadiusInMeter);
  }

  private checkCollision(command: CheckCollisionCommand) {
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

      // The 10k and div 10 transforms the value to have 1 decimal digit
      const fps = Math.round(10000 / elapsedMillis) / 10;

      this.renderFrame(fps);

      this.doGameLoop(now);
    });
  }

  renderFrame(fps: number) {
    const zoomFactor = this.zoomFactor();
    const viewport = this.getViewport();
    const viewportElements = this.game.getViewportElements(viewport, true);

    this.renderer.render(viewport, viewportElements, zoomFactor, fps);
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
