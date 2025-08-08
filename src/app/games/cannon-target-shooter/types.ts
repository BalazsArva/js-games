export interface Vector {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export class BoundingBox {
  private _bottomLeft: Point;
  private _bottomRight: Point;
  private _topLeft: Point;
  private _topRight: Point;
  private _middle: Point;
  private _width: number;
  private _height: number;

  constructor(x: number, y: number, w: number, h: number) {
    this._bottomLeft = { x: x, y: y };
    this._bottomRight = { x: x + w, y: y };
    this._topLeft = { x: x, y: y + h };
    this._topRight = { x: x + w, y: y + h };
    this._middle = { x: x + (w / 2), y: y + (h / 2) };
    this._width = w;
    this._height = h;
  }

  get bottomLeft(): Point { return this._bottomLeft };
  get bottomRight(): Point { return this._bottomRight };
  get topLeft(): Point { return this._topLeft };
  get topRight(): Point { return this._topRight };
  get middle(): Point { return this._middle }
  get width(): number { return this._width };
  get height(): number { return this._height };
}

export function IsBoundingBoxInViewport(boundingBox: BoundingBox, viewport: Viewport): boolean {
  return (
    IsPointInViewport(boundingBox.bottomLeft, viewport) ||
    IsPointInViewport(boundingBox.bottomRight, viewport) ||
    IsPointInViewport(boundingBox.topLeft, viewport) ||
    IsPointInViewport(boundingBox.topRight, viewport));
}

export function IsPointInViewport(point: Point, viewport: Viewport): boolean {
  return (
    point.x >= viewport.x && point.x <= (viewport.x + viewport.width) &&
    point.y >= viewport.y && point.y <= (viewport.y + viewport.height));
}

export function IsPointInBoundingBox(point: Point, boundingBox: BoundingBox): boolean {
  return (
    point.x >= boundingBox.bottomLeft.x &&
    point.x <= boundingBox.bottomRight.x &&
    point.y >= boundingBox.bottomLeft.y &&
    point.y <= boundingBox.topLeft.y);
}

export interface Command { }

export class ZoomInCommand implements Command { }
export class ZoomOutCommand implements Command { }
export class DragScreenCommand implements Command {
  constructor(public deltaXPixels: number, public deltaYPixels: number) {
  }
}
export class CheckCollisionCommand implements Command {
  constructor(public xPixels: number, public yPixels: number) {
  }
}
// TODO: Remove later, for experiments only
export class DestroyTerrainCommand implements Command {
  constructor(public xPixels: number, public yPixels: number) {
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

export const BallRadiusInMeter = 1;//1 / 10;
export const DefaultPixelsPerMeter = 50;

export function convertLengthInMetersToPixels(lengthInMeters: number, zoomFactor: number) {
  return lengthInMeters * DefaultPixelsPerMeter * zoomFactor;
}

export function convertPixelsToMeters(pixels: number, zoomFactor: number) {
  return pixels / (DefaultPixelsPerMeter * zoomFactor);
}

export const GravityAcceleration = 9.81;

// 7,874 kg/m³
export const IronDensity = 7874;

// dry air at sea level and 20°C has a density of approximately 1.204 kg/m³
export const AirDensity = 1.204;

// Note: this is not a physical constant, but will use it as such for simplicity.
export const DragCoefficientSphere = 0.47;