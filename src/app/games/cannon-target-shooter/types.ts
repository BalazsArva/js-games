export interface Vector {
  x: number;
  y: number;
}

export interface Region {
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

export type IsBoundingBoxInRegionResult = 'NotInRegion' | 'PartiallyInRegion' | 'CompletelyInRegion';
export function IsBoundingBoxInRegion(boundingBox: BoundingBox, region: Region): IsBoundingBoxInRegionResult {
  const val1 = IsPointInRegion(boundingBox.bottomLeft, region);
  const val2 = IsPointInRegion(boundingBox.bottomRight, region);
  const val3 = IsPointInRegion(boundingBox.topLeft, region);
  const val4 = IsPointInRegion(boundingBox.topRight, region);

  if (val1 && val2 && val3 && val4) {
    return 'CompletelyInRegion';
  }

  if (val1 || val2 || val3 || val4) {
    return 'PartiallyInRegion';
  }

  return 'NotInRegion';
}

export function IsPointInRegion(point: Point, region: Region): boolean {
  return (
    point.x >= region.x && point.x <= (region.x + region.width) &&
    point.y >= region.y && point.y <= (region.y + region.height));
}

export function IsPointInBoundingBox(point: Point, boundingBox: BoundingBox): boolean {
  return (
    point.x >= boundingBox.bottomLeft.x &&
    point.x <= boundingBox.bottomRight.x &&
    point.y >= boundingBox.bottomLeft.y &&
    point.y <= boundingBox.topLeft.y);
}

export function BoundingBoxesIntersect(boundingBox1: BoundingBox, boundingBox2: BoundingBox): boolean {
  // TODO: Not 100% sure about this logic, recheck (special cases: overlap in '+' shape, complete containment, completely separate, touching each other, corners touch)
  const smallerLeftX = Math.min(boundingBox1.bottomLeft.x, boundingBox2.bottomLeft.x);
  const largerRightX = Math.max(boundingBox1.bottomRight.x, boundingBox2.bottomRight.x);

  const smallerBottomY = Math.min(boundingBox1.bottomLeft.y, boundingBox2.bottomLeft.y);
  const largerTopY = Math.max(boundingBox1.topLeft.y, boundingBox2.topLeft.y);

  const diffX = largerRightX - smallerLeftX;
  const diffY = largerTopY - smallerBottomY;

  const totalWidth = boundingBox1.width + boundingBox2.width;
  const totalHeight = boundingBox1.height + boundingBox2.height;

  return (diffX < totalWidth) && (diffY < totalHeight);
}

export interface Command { }

export class ZoomInCommand implements Command { }
export class ZoomOutCommand implements Command { }
export class DragScreenCommand implements Command {
  constructor(public deltaXPixels: number, public deltaYPixels: number) {
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