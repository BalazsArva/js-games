import { DegToRad } from "./maths";
import { BoundingBox, IsPointInBoundingBox, Point } from "./types";

export class TerrainSegment {
  private _boundingBox: BoundingBox;
  private triangles: Triangle[] = [];

  constructor() {
    this._boundingBox = this.computeBoundingBox();
  }

  * iterateTriangles(): Generator<Triangle> {
    for (let i = 0; i < this.triangles.length; ++i) {
      yield this.triangles[i];
    }
  }

  addTriangles(triangles: Triangle[]) {
    this.triangles.push(...triangles);
    this._boundingBox = this.computeBoundingBox();
  }

  removeTriangles(triangles: Triangle[]) {
    // TODO: Need to do this faster, maybe generate a triangle id and use a lookup
    this.triangles = this.triangles.filter(t => !triangles.includes(t));
    this._boundingBox = this.computeBoundingBox();
  }

  get boundingBox(): BoundingBox {
    return this._boundingBox;
  }

  private computeBoundingBox() {
    if (this.triangles.length === 0) {
      return new BoundingBox(0, 0, 0, 0);
    }

    const boundingBoxPoints = this.triangles.flatMap(t => [t.boundingBox.bottomLeft, t.boundingBox.bottomRight, t.boundingBox.topLeft, t.boundingBox.topRight]);
    const boundingBoxPointXCoords = boundingBoxPoints.map(p => p.x).sort((a, b) => a - b);
    const boundingBoxPointYCoords = boundingBoxPoints.map(p => p.y).sort((a, b) => a - b);

    const minX = boundingBoxPointXCoords[0];
    const maxX = boundingBoxPointXCoords[boundingBoxPointXCoords.length - 1];
    const minY = boundingBoxPointYCoords[0];
    const maxY = boundingBoxPointYCoords[boundingBoxPointYCoords.length - 1];

    return new BoundingBox(minX, minY, maxX - minX, maxY - minY);
  }
}

export class Triangle {
  private _boundingBox: BoundingBox;

  constructor(public a: Point, public b: Point, public c: Point) {
    const xCoords = [a.x, b.x, c.x].sort((v1, v2) => v1 - v2);
    const yCoords = [a.y, b.y, c.y].sort((v1, v2) => v1 - v2);

    const minX = xCoords[0];
    const minY = yCoords[0];
    const w = xCoords[xCoords.length - 1] - minX;
    const h = yCoords[yCoords.length - 1] - minY;

    this._boundingBox = new BoundingBox(minX, minY, w, h);
  }

  get boundingBox(): BoundingBox {
    return this._boundingBox;
  }

  divide(): Triangle[] {
    // Halving points' coords
    const abX = (this.a.x + this.b.x) / 2;
    const abY = (this.a.y + this.b.y) / 2;
    const acX = (this.a.x + this.c.x) / 2;
    const acY = (this.a.y + this.c.y) / 2;
    const bcX = (this.b.x + this.c.x) / 2;
    const bcY = (this.b.y + this.c.y) / 2;

    // Halving points
    const ab: Point = { x: abX, y: abY };
    const ac: Point = { x: acX, y: acY };
    const bc: Point = { x: bcX, y: bcY };

    // TODO: Check edge length and don't divide if falls under a threshold
    // Which length? Longest or shortest? Currently regular triangle shape is not enforced and probably shouldn't be
    return [
      new Triangle(this.a, ab, ac),
      new Triangle(this.b, ab, bc),
      new Triangle(this.c, ac, bc),
      new Triangle(ac, ab, bc),
    ];
  }
}

export class Terrain {
  terrainSegments: Record<string, TerrainSegment> = {};

  constructor(public mapWidthMeters: number, public mapHeightMeters: number) {
  }

  public splitTrianglesAtPosition(x: number, y: number, radius: number) {
    const trianglesToSplit: { triangles: Triangle[], segment: TerrainSegment }[] = [];

    for (let key in this.terrainSegments) {
      const segment = this.terrainSegments[key];
      const item = {
        triangles: <Triangle[]>[],
        segment,
      };

      if (!IsPointInBoundingBox({ x, y }, segment.boundingBox)) {
        continue;
      }

      for (let triangle of segment.iterateTriangles()) {
        if (IsPointInBoundingBox({ x, y }, triangle.boundingBox)) {
          item.triangles.push(triangle);
        }
      }

      if (item.triangles.length) {
        trianglesToSplit.push(item);
      }
    }

    for (let i = 0; i < trianglesToSplit.length; ++i) {
      const item = trianglesToSplit[i];

      item.segment.removeTriangles(item.triangles);

      for (let j = 0; j < item.triangles.length; ++j) {
        const triangle = item.triangles[j];

        // TODO: Maybe the new triangles don't all belong to the original terrain segment
        item.segment.addTriangles(triangle.divide());
      }
    }
  }

  private getOrCreateTerrainSegmentForPosition(point: Point) {
    const segmentSize = 10;

    const segmentIndexX = Math.floor(point.x / segmentSize);
    const segmentIndexY = Math.floor(point.y / segmentSize);

    const key = `[${segmentIndexX};${segmentIndexY}]`;

    this.terrainSegments[key] = this.terrainSegments[key] || new TerrainSegment();

    return this.terrainSegments[key];
  }

  public static createRandom(mapWidthMeters: number, mapHeightMeters: number): Terrain {
    // TODO: Maybe configurable?
    const triangleEdgeLength = 10;
    const result = new Terrain(mapWidthMeters, mapHeightMeters);
    const triangleHeight = Math.sin(DegToRad(60)) * triangleEdgeLength;

    // TODO: With this method, triangles may overflow the segment they are stored in. Clipping may occur.
    for (let i = 0; i < mapWidthMeters / triangleEdgeLength; ++i) {
      const triangle1 = new Triangle(
        { x: i * triangleEdgeLength, y: 0 },
        { x: (i + 1) * triangleEdgeLength, y: 0 },
        { x: (i * triangleEdgeLength) + (triangleEdgeLength / 2), y: triangleHeight });

      const triangle2 = new Triangle(
        { x: (i * triangleEdgeLength) - (triangleEdgeLength / 2), y: triangleHeight },
        { x: i * triangleEdgeLength, y: 0 },
        { x: (i * triangleEdgeLength) + (triangleEdgeLength / 2), y: triangleHeight });

      const segment1 = result.getOrCreateTerrainSegmentForPosition(triangle1.boundingBox.middle);
      const segment2 = result.getOrCreateTerrainSegmentForPosition(triangle2.boundingBox.middle);

      // TODO: May be able to simplify this by generating all triangles upfront, then categorizing them into their respective segments.
      // Then only 1 compute of bounding box per segment happens.
      if (segment1 === segment2) {
        segment1.addTriangles([triangle1, triangle2]);
      }
      else {
        segment1.addTriangles([triangle1]);
        segment2.addTriangles([triangle2]);
      }
    }

    return result;
  }

  /*
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
*/
  /*
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
  */
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