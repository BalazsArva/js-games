import { convertLengthInMetersToPixels, Viewport } from "./types";
import { Triangle, Terrain } from "./terrain";
import { CannonBall, ViewportElements } from "./game";

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

  paintTerrain(terrain: Triangle[], viewport: Viewport, ctx: CanvasRenderingContext2D, zoomFactor: number) {
    ctx.fillStyle = '#089654ff';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'yellow';

    for (let i = 0; i < terrain.length; ++i) {
      const triangle = terrain[i];
      const vertices = [triangle.a, triangle.b, triangle.c];

      const path = new Path2D();
      path.moveTo(
        convertLengthInMetersToPixels(vertices[0].x - viewport.x, zoomFactor),
        this.canvasHeight - convertLengthInMetersToPixels(vertices[0].y - viewport.y, zoomFactor));

      for (let j = 1; j < vertices.length; ++j) {
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