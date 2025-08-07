export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  vertices: Point[];
}

export class Terrain {
  landPolygons: Polygon[] = [];

  constructor(public mapWidthMeters: number, public mapHeightMeters: number) {

  }

  public static createRandom(mapWidthMeters: number, mapHeightMeters: number): Terrain {
    const result = new Terrain(mapWidthMeters, mapHeightMeters);

    for (let i = 0; i < mapWidthMeters; ++i) {
      for (let j = 0; j < mapHeightMeters; ++j) {
        const triangles: Polygon[] = [];

        for (let xOffset = 0; xOffset < 1; xOffset += 0.5) {
          for (let yOffset = 0; yOffset < 1; yOffset += 0.5) {
            triangles.push({ vertices: [{ x: i + xOffset, y: j + yOffset }, { x: i + 0.5 + xOffset, y: j + yOffset }, { x: i + 0.25 + xOffset, y: j + 0.25 + yOffset }] });
            triangles.push({ vertices: [{ x: i + xOffset, y: j + 0.5 + yOffset }, { x: i + 0.5 + xOffset, y: j + 0.5 + yOffset }, { x: i + 0.25 + xOffset, y: j + 0.25 + yOffset }] });

            triangles.push({ vertices: [{ x: i + xOffset, y: j + yOffset }, { x: i + xOffset, y: j + 0.5 + yOffset }, { x: i + 0.25 + xOffset, y: j + 0.25 + yOffset }] });
            triangles.push({ vertices: [{ x: i + 0.5 + xOffset, y: j + yOffset }, { x: i + 0.5 + xOffset, y: j + 0.5 + yOffset }, { x: i + 0.25 + xOffset, y: j + 0.25 + yOffset }] });
          }
        }

        result.landPolygons.push(...triangles);
      }
    }

    return result;
  }

  public static createRandom2(mapWidthMeters: number, mapHeightMeters: number): Terrain {
    const result = new Terrain(mapWidthMeters, mapHeightMeters);

    for (let i = 0; i < mapWidthMeters; ++i) {
      for (let j = 0; j < 10; ++j) {
        const triangleBottomLeft = { x: i + (j * 0.1), y: 0 }
        const triangleBottomRight = { x: i + (j * 0.1) + 0.1, y: 0 };
        const triangleTop = { x: i + (j * 0.1) + 0.05, y: 1 };

        const triangle: Polygon = {
          vertices: [triangleBottomLeft, triangleBottomRight, triangleTop]
        };

        result.landPolygons.push(triangle);
      }
    }

    return result;
  }


  public static createRandom1(mapWidthMeters: number, mapHeightMeters: number): Terrain {
    const layer1 = Terrain.generateSurface(mapWidthMeters, 3, 50, 100, 1);
    const layer2 = Terrain.generateSurface(mapWidthMeters, 30, 50, 30, 1);
    const layer3 = Terrain.generateSurface(mapWidthMeters, 300, 50, 10, 1);
    const layer4 = Terrain.generateSurface(mapWidthMeters, mapWidthMeters, 50, 1, 1);

    const merged = Terrain.mergeSurfaces(20, [layer1, layer2, layer3, layer4]);

    merged.unshift({ x: 0, y: 0 });
    merged.push({ x: mapWidthMeters, y: 0 });

    const ground: Polygon = {
      vertices: merged
    };

    const result = new Terrain(mapWidthMeters, mapHeightMeters)
    result.landPolygons.push(ground);

    return result;
  }

  private static generateSurface(width: number, numberOfFeaturePoints: number, baseline: number, baselineOffset: number, resolution: number) {
    const featurePoints: Point[] = [{ x: 0, y: baseline }];
    for (let i = 0; i < numberOfFeaturePoints; ++i) {
      featurePoints.push({
        x: Math.random() * width,
        y: baseline + Math.random() * baselineOffset
      });
    }
    featurePoints.push({ x: width, y: baseline })

    featurePoints.sort((a, b) => a.x - b.x);

    const result: Point[] = [
      { x: 0, y: baseline },
    ];
    for (let i = resolution; i < width; i += resolution) {
      // TODO: Check edge cases
      const succeedingFeaturePointIndex = featurePoints.findIndex(p => p.x >= i);
      const preceedingFeaturePointIndex = succeedingFeaturePointIndex - 1;

      const succeedingFeaturePoint = featurePoints[succeedingFeaturePointIndex];
      const preceedingFeaturePoint = featurePoints[preceedingFeaturePointIndex];

      const featurePointsDistance = succeedingFeaturePoint.x - preceedingFeaturePoint.x;
      const featurePointsHeightDiff = succeedingFeaturePoint.y - preceedingFeaturePoint.y;

      const currentHDistanceToPreceedingFeaturePoint = i - preceedingFeaturePoint.x;
      const currentHDistanceProportionBetweenFeaturePoints = currentHDistanceToPreceedingFeaturePoint / featurePointsDistance

      const y = preceedingFeaturePoint.y + (featurePointsHeightDiff * currentHDistanceProportionBetweenFeaturePoints);

      result.push({ x: i, y: y });
    }
    result.push({ x: width, y: baseline });

    return result;
  }

  private static mergeSurfaces(baseline: number, surfaces: Point[][]) {
    // baseline appears in every surface, so need to subtract it from the combined heights as many times
    // as there are surfaces to combine.
    const baselineAdjustment = surfaces.length * baseline;

    const result: Point[] = [];
    // TODO: Check that all inputs have same length
    for (let i = 0; i < surfaces[0].length; ++i) {
      let sum = 0;
      for (let j = 0; j < surfaces.length; ++j) {
        sum += surfaces[j][i].y;
      }
      sum -= baselineAdjustment;
      result.push({ x: i, y: sum });
    }

    return result;
  }
}