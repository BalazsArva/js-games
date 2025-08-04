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

export const GravityAcceleration = 9.81;

// 7,874 kg/m³
export const IronDensity = 7874;

// dry air at sea level and 20°C has a density of approximately 1.204 kg/m³
export const AirDensity = 1.204;

// Note: this is not a physical constant, but will use it as such for simplicity.
export const DragCoefficientSphere = 0.47;