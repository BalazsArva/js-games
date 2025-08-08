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