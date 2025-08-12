import { convertLengthInMetersToPixels, Viewport } from "./types";
import { TerrainSegment } from "./terrain-segment";
import { Triangle } from "./triangle";
import { CannonBall, ViewportElements } from "./game";

export class Renderer {
  canvasWidth: number;
  canvasHeight: number;

  private _renderTriangleBoundingBox = false;
  private _renderTriangleEdges = false;

  public set renderTriangleBoundingBox(v: boolean) {
    this._renderTriangleBoundingBox = v;
  }

  public get renderTriangleBoundingBox(): boolean {
    return this._renderTriangleBoundingBox;
  }

  public set renderTriangleEdges(v: boolean) {
    this._renderTriangleEdges = v;
  }

  public get renderTriangleEdges(): boolean {
    return this._renderTriangleEdges;
  }

  constructor(private canvas: HTMLCanvasElement) {
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
  }

  public render(viewport: Viewport, viewportElements: ViewportElements, zoomFactor: number, fps: number) {
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

    if (viewportElements.segments && viewportElements.segments.length) {
      this.paintSegmentBoundaries(viewportElements.segments, viewport, ctx, zoomFactor);
    }

    this.paintMinimap(ctx);
    this.paintFps(ctx, fps);
  }

  paintFps(ctx: CanvasRenderingContext2D, fps: number) {
    ctx.lineWidth = .5;
    ctx.strokeStyle = '#000000';

    ctx.strokeText(`${fps} FPS`, 10, 20);
  }

  paintSegmentBoundaries(segments: TerrainSegment[], viewport: Viewport, ctx: CanvasRenderingContext2D, zoomFactor: number) {
    for (let i = 0; i < segments.length; ++i) {
      ctx.fillStyle = 'transparent';
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;

      const segment = segments[i];
      const path = new Path2D();

      const heightPx = convertLengthInMetersToPixels(segment.boundingBox.height, zoomFactor);

      path.rect(
        convertLengthInMetersToPixels(segment.boundingBox.bottomLeft.x - viewport.x, zoomFactor),
        this.canvasHeight - heightPx - convertLengthInMetersToPixels(segment.boundingBox.bottomLeft.y - viewport.y, zoomFactor),
        convertLengthInMetersToPixels(segment.boundingBox.width, zoomFactor),
        heightPx);

      ctx.stroke(path);
    }
  }

  paintTerrain(terrain: Triangle[], viewport: Viewport, ctx: CanvasRenderingContext2D, zoomFactor: number) {
    const terrainColor = '#089654ff';
    const terrainEdgeColor = this.renderTriangleEdges ? '#0e7043ff' : terrainColor;

    for (let i = 0; i < terrain.length; ++i) {
      ctx.fillStyle = terrainColor;
      ctx.strokeStyle = terrainEdgeColor;
      ctx.lineWidth = 1;

      const triangle = terrain[i];
      const path = new Path2D();

      path.moveTo(
        convertLengthInMetersToPixels(triangle.a.x - viewport.x, zoomFactor),
        this.canvasHeight - convertLengthInMetersToPixels(triangle.a.y - viewport.y, zoomFactor));

      path.lineTo(
        convertLengthInMetersToPixels(triangle.b.x - viewport.x, zoomFactor),
        this.canvasHeight - convertLengthInMetersToPixels(triangle.b.y - viewport.y, zoomFactor));

      path.lineTo(
        convertLengthInMetersToPixels(triangle.c.x - viewport.x, zoomFactor),
        this.canvasHeight - convertLengthInMetersToPixels(triangle.c.y - viewport.y, zoomFactor));

      path.lineTo(
        convertLengthInMetersToPixels(triangle.a.x - viewport.x, zoomFactor),
        this.canvasHeight - convertLengthInMetersToPixels(triangle.a.y - viewport.y, zoomFactor));

      ctx.fill(path);
      ctx.stroke(path);
    }

    if (this.renderTriangleBoundingBox) {
      for (let i = 0; i < terrain.length; ++i) {
        const triangle = terrain[i];
        const pathBB = new Path2D();

        // TODO: Extract all these conversions somewhere
        const x = convertLengthInMetersToPixels(triangle.boundingBox.bottomLeft.x - viewport.x, zoomFactor);
        const y = this.canvasHeight - convertLengthInMetersToPixels(triangle.boundingBox.bottomLeft.y - viewport.y, zoomFactor);
        const w = convertLengthInMetersToPixels(triangle.boundingBox.width, zoomFactor);
        const h = convertLengthInMetersToPixels(triangle.boundingBox.height, zoomFactor);

        ctx.fillStyle = 'transparent';
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#40a6ff';

        pathBB.rect(x, y - h, w, h);
        ctx.stroke(pathBB);
      }
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