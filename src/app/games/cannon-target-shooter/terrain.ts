import { Circle, DegToRad, findLineCircleIntersection, isPointWithinTriangle, PointDistance } from "./maths";
import { TerrainSegment } from "./terrain-segment";
import { Triangle } from "./triangle";
import { BoundingBox, BoundingBoxesIntersect, IsPointInBoundingBox, Point } from "./types";

export class Terrain {
  // TODO: The 'string' key is not really ideal due to the fact that triangle splitting may cause some new triangles to fall outside of the original bounding box.
  // Maybe it would be better to just remove these keys and use a hierarchical segmentation instead (segments may themselves contain smaller segments)
  terrainSegments: Record<string, TerrainSegment> = {};

  constructor(public mapWidthMeters: number, public mapHeightMeters: number) {
  }

  public pointCollidesWithTerrain(point: Point): boolean {
    for (let key in this.terrainSegments) {
      const segment = this.terrainSegments[key];

      if (IsPointInBoundingBox(point, segment.boundingBox)) {
        for (let triangle of segment.iterateTriangles()) {
          // Bounding box check here is to save on more expensive computations since even if there is a collision,
          // it will only be for a tiny fraction of all the triangles in the segment.
          if (IsPointInBoundingBox(point, triangle.boundingBox) && isPointWithinTriangle(point, triangle)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public damageTerrainAtPosition(point: Point, radius: number) {
    const radiusSizedBoundingBoxOfPoint = new BoundingBox(point.x - radius, point.y - radius, 2 * radius, 2 * radius);

    const circle: Circle = { center: point, radius: radius };

    for (let key in this.terrainSegments) {
      const segment = this.terrainSegments[key];

      if (!BoundingBoxesIntersect(radiusSizedBoundingBoxOfPoint, segment.boundingBox)) {
        continue;
      }

      const splitList: Triangle[] = [];

      splitList.push(...segment.iterateTriangles());

      while (splitList.length) {
        const triangle = splitList.shift()!;

        const distA = PointDistance(triangle.a, point);
        const distB = PointDistance(triangle.b, point);
        const distC = PointDistance(triangle.c, point);

        // Triangle completely covered by impact radius - destroy it entirely
        if (distA <= radius && distB <= radius && distC <= radius) {
          segment.removeTriangles([triangle]);
        } else if (
          // At least 1 vertex falls within radius - triangle is partially covered by impact radius. This check is
          // technically redundant as the circle-line intersection would also show this, but this is a much cheaper calculation.
          distA < radius ||
          distB < radius ||
          distC < radius ||

          // When circle perimeter cuts through the triangle's edge
          findLineCircleIntersection({ a: triangle.a, b: triangle.b }, circle).type === 'Intersects' ||
          findLineCircleIntersection({ a: triangle.b, b: triangle.c }, circle).type === 'Intersects' ||
          findLineCircleIntersection({ a: triangle.c, b: triangle.a }, circle).type === 'Intersects') {

          // TODO: Divided triangles may not fall to the same segment as their origins
          // (currently segment is determined by the bounding box center point, which is different for newer smaller triangles)
          const splitTriangles = triangle.divide();
          if (splitTriangles.length > 1) {
            // When =1, divide returned the same, it cannot be divided any further
            // TODO: Maybe add a way to recompute the bounding box only once for the whole segment
            segment.removeTriangles([triangle]);
            segment.addTriangles(splitTriangles);

            splitList.push(...splitTriangles);
          }
        }
      }
    }
  }

  private getOrCreateTerrainSegmentForPosition(point: Point) {
    const segmentSize = 100;

    const segmentIndexX = Math.floor(point.x / segmentSize);
    const segmentIndexY = Math.floor(point.y / segmentSize);

    const key = `[${segmentIndexX};${segmentIndexY}]`;

    this.terrainSegments[key] = this.terrainSegments[key] || new TerrainSegment();

    return this.terrainSegments[key];
  }

  public static createRandom(mapWidthMeters: number, mapHeightMeters: number): Terrain {
    // TODO: Maybe configurable?
    const triangleEdgeLength = 30;
    const result = new Terrain(mapWidthMeters, mapHeightMeters);
    const triangleHeight = Math.sin(DegToRad(60)) * triangleEdgeLength;

    // TODO: Later this shouldn't be a static value
    const rowCount = 8;

    for (let i = 0; i < mapWidthMeters / triangleEdgeLength; ++i) {
      for (let j = 0; j < rowCount; ++j) {
        const rowBottom = j * triangleHeight;
        const rowTop = (j + 1) * triangleHeight;

        const triangle1 = new Triangle(
          { x: i * triangleEdgeLength, y: rowBottom },
          { x: (i + 1) * triangleEdgeLength, y: rowBottom },
          { x: (i * triangleEdgeLength) + (triangleEdgeLength / 2), y: rowTop });

        const triangle2 = new Triangle(
          { x: (i * triangleEdgeLength) - (triangleEdgeLength / 2), y: rowTop },
          { x: i * triangleEdgeLength, y: rowBottom },
          { x: (i * triangleEdgeLength) + (triangleEdgeLength / 2), y: rowTop });

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