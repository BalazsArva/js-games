import { Point } from "./types";

export function DegToRad(angleDeg: number) {
  return (angleDeg * Math.PI) / 180;
}

export function PointDistance(a: Point, b: Point) {
  const xDist = a.x - b.x;
  const yDist = a.y - b.y;

  return Math.sqrt(xDist * xDist + yDist * yDist);
}

export interface LineSegment {
  a: Point2D;
  b: Point2D;
}

// TODO: Consolidate with other Point
export interface Point2D {
  x: number;
  y: number;
}

export interface Polygon2D {
  vertices: Point2D[];
}

// Parameters for standard y=mx+b form (x:x-axis value, m:gradient/slope, b:Y-value at x=0)
export interface LineEquationParams {
  m: number;
  b: number;
}

export type IntersectionType = 'NoIntersection' | 'IntersectEverywhere' | 'IntersectAt';
export interface LineIntersectionResult {
  type: IntersectionType;
  intersectAt?: Point2D;
}

export function findEquationOfLine(line: LineSegment): LineEquationParams {
  const gradient = findLineGradient(line);

  // 'b' is Y-value where line intersects the Y-axis (x=0)
  const b = line.a.y - (gradient * line.a.x);

  return {
    m: gradient,
    b: b,
  };
}

export function findLineGradient(line: LineSegment) {
  if (line.a.x === line.b.x) {
    if (line.a.y === line.b.y) {
      // this is a point, not a line. Not sure - 0 OK?
      return 0;
    }

    return Infinity;
  }

  return (line.b.y - line.a.y) / (line.b.x - line.a.x);
}

export function findLineIntersection(line1: LineSegment, line2: LineSegment): LineIntersectionResult {
  const equationOfLine1 = findEquationOfLine(line1);
  const equationOfLine2 = findEquationOfLine(line2);

  if (equationOfLine1.m === equationOfLine2.m) {
    // Same gradient, meaning they are parallel. They only intersect if they are the exact same, meaning 'b' is the same.
    // Otherwise they never intersect.
    if (equationOfLine1.b === equationOfLine2.b) {
      // TODO: 'Everywhere' is only really true for infinite lines.
      return {
        type: 'IntersectEverywhere',
      };
    } else {
      return {
        type: 'NoIntersection',
      };
    }
  }

  if (equationOfLine1.m === Infinity || equationOfLine2.m === Infinity) {
    let infiniteLine: LineSegment;
    let infiniteLineEq: LineEquationParams;
    let otherLine: LineSegment;
    let otherLineEq: LineEquationParams;

    if (equationOfLine1.m === Infinity) {
      infiniteLine = line1;
      infiniteLineEq = equationOfLine1;
      otherLine = line2;
      otherLineEq = equationOfLine2;
    } else {
      infiniteLine = line2;
      infiniteLineEq = equationOfLine2;
      otherLine = line1;
      otherLineEq = equationOfLine1;
    }

    const intersectionX = infiniteLine.a.x;
    const intersectionY = (otherLineEq.m * intersectionX) + otherLineEq.b;

    return {
      type: 'IntersectAt',
      intersectAt: {
        x: intersectionX,
        y: intersectionY,
      },
    };
  }

  // If lines intersect then the X coordinate of the intersection point is found from
  // e(line1) = m1x+b1
  // e(line2) = m2x+b2
  // The 2 equations are equal at the intersection point, so
  // m1x+b1 = m2x+b2
  // after reorganization this yields
  // x = (b2-b1) / (m1-m2)
  // (indices are not a typo, they really are in inverse order at the top and bottom)
  const intersectionX = (equationOfLine2.b - equationOfLine1.b) / (equationOfLine1.m - equationOfLine2.m);
  const intersectionY = (equationOfLine1.m * intersectionX) + equationOfLine1.b;

  return {
    type: 'IntersectAt',
    intersectAt: {
      x: intersectionX,
      y: intersectionY,
    },
  };
}

export function isPointWithinPolygon(point: Point2D, polygon: Polygon2D) {
  const verticalLineCrossingPoint: LineSegment = { a: point, b: { x: point.x, y: point.y + 1 } };
  const horizontalLineCrossingPoint: LineSegment = { a: point, b: { x: point.x + 1, y: point.y } };

  const verticalLineCrossingPointEq = findEquationOfLine(verticalLineCrossingPoint);
  const horizontalLineCrossingPointEq = findEquationOfLine(horizontalLineCrossingPoint);

  let existsPolygonEdgeCrossingAbovePoint = false;
  let existsPolygonEdgeCrossingBelowPoint = false;
  let existsPolygonEdgeCrossingLeftToPoint = false;
  let existsPolygonEdgeCrossingRightToPoint = false;

  // TODO: Don't forget the final edge, connecting the last vertex to the first
  for (let i = 1; i < polygon.vertices.length; ++i) {
    const line: LineSegment = { a: polygon.vertices[i - 1], b: polygon.vertices[i] };

    // TODO: Try to optimize this somehow - the line drawn from the point does not change, but this call recomputes the equation all the time
    const vIntersection = findLineIntersection(verticalLineCrossingPoint, line);
    if (vIntersection.type === 'IntersectAt') {
      const intersectAt = vIntersection.intersectAt!;

      // 1. Check that intersection point lies within the bounding box of the line
      // 2. If so, see where it lies in relation to the point - up or down, set corresponding flag
    }

    const hIntersection = findLineIntersection(horizontalLineCrossingPoint, line);
    if (hIntersection.type === 'IntersectAt') {
      const intersectAt = hIntersection.intersectAt!;

      // 1. Check that intersection point lies within the bounding box of the line
      // 2. If so, see where it lies in relation to the point - left or right, set corresponding flag
    }

    //3. If all flags are true, terminate with true
  }
}

// Test cases:
// 1. Intersection - two lines with opposite sign gradient
// 2. Intersection - two lines with both negative but inequal gradient
// 3. Intersection - two lines with both positive but inequal gradient
// 4. Intersection - one vertical and one horizontal line
// 5. Intersection - one vertical and one sloped line
// 6. Intersection - one horizontal nd one sloped line
// 7. No intersection - parallel vertical lines
// 8. No intersection - parallel horizontal lines
// 9. No intersection - parallel sloped lines

/*
// 1. x=1.5, y=1.5
findLineIntersection(
  {
    a: { x: 1, y: 1 },
    b: { x: 2, y: 2 },
  },
  {
    a: { x: 1, y: 2 },
    b: { x: 2, y: 1 },
  });

// 2. x=2, y=1
findLineIntersection(
  {
    a: { x: 1, y: 2 },
    b: { x: 2, y: 1 },
  },
  {
    a: { x: 1, y: 3 },
    b: { x: 2, y: 1 },
  });


// 3. x=, y=
findLineIntersection(
  {
    a: { x: 0, y: 0 },
    b: { x: 1, y: 1 },
  },
  {
    a: { x: 0, y: -2 },
    b: { x: 1, y: 2 },
  });
*/