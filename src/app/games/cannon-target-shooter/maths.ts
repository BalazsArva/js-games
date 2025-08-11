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
  a: Point;
  b: Point;
}

export interface Triangle {
  a: Point;
  b: Point;
  c: Point;
}

export interface Circle {
  center: Point;
  radius: number;
}

// Parameters for standard y=mx+b form (x:x-axis value, m:gradient/slope, b:Y-value at x=0)
export interface LineEquationParams {
  m: number;
  b: number;
}

export type IntersectionType = 'NoIntersection' | 'IntersectEverywhere' | 'IntersectAt';
export interface LineIntersectionResult {
  type: IntersectionType;
  intersectAt?: Point;
}

export type LineCircleIntersectionType = 'NoIntersection' | 'Touches' | 'Intersects';
export interface LineCircleIntersectionResult {
  type: LineCircleIntersectionType;
  intersection?: {
    p1: Point;
    p2: Point;
  };
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

// TODO: When returning 'Intersects', need to check if the resulting points fall within the designated segment of the line.
export function findLineCircleIntersection(line: LineSegment, circle: Circle): LineCircleIntersectionResult {
  const lineEqParams = findEquationOfLine(line);

  // Vertical line
  if (lineEqParams.m === Infinity) {
    const diff = line.a.x - circle.center.x;
    if (diff === circle.radius) {
      // line touches right side of circle
      return {
        type: 'Touches',
        intersection: {
          p1: { x: circle.center.x + circle.radius, y: circle.center.y },
          p2: { x: circle.center.x + circle.radius, y: circle.center.y },
        },
      };
    } else if (-diff === circle.radius) {
      // line touches left side of circle
      return {
        type: 'Touches',
        intersection: {
          p1: { x: circle.center.x - circle.radius, y: circle.center.y },
          p2: { x: circle.center.x - circle.radius, y: circle.center.y },
        },
      };
    } else if (diff < circle.radius || -diff < circle.radius) {
      // intersects 
      return {
        type: 'Intersects',
        intersection: {
          // TODO: y is incorrect here! Need to find it from circle eq.
          p1: { x: circle.center.x + diff, y: circle.center.y - circle.radius },
          p2: { x: circle.center.x + diff, y: circle.center.y + circle.radius },
        },
      }
    } else {
      // does not touch/intersect
      return { type: 'NoIntersection' };
    }
  }

  // Equation of circle with center (h,k) is: '(x-h)^2 + (y-k)^2 = r^2'. Here x and y are variables and their values which satisfy the equation for a known 'r' and (h,k)
  // are points on the circle's perimeter.
  // Equation of line is 'y=mx+b' where 'm' is the gradient and 'b' is the Y-value at x=0.
  // 
  // In the circle equation above, h,k,r are known values (circle center and radius), x is what we look for and y can be substituted for an equation that only contains x
  // as variable by using the line equation, i.e. y=mx+b. Doing the substitution yields:
  //
  // (x-h)^2 + ((mx+b)-k)^2 = r2
  // 
  // Which when unwrapped and after some simplifications and reorganizations yields:
  //
  // x^2 - 2xh + h^2 + (mx)^2 + 2mxb + b^2 - 2mxk - 2bk + k^2 - r^2 = 0
  // 
  // Here x is the only variable, the rest are constants and x is present as x^2, x^1 and x^0, so this is a quadratic equation where (ax^2 + bx + c):
  //
  // a=(1+m^2)
  // b=(-2h + 2mb - 2mk)
  // c=(h^2 + b^2 - 2bk + k^2 - r^2)
  //
  // Substituting these values into the quadratic formula potentially yields x1,x2 values which are the X-coordinates of the intersections. Substituting these X values back
  // into the y=mx+b line equation yields the corresponding Y values, which combined show the intersection points. When there is only 1 solution (i.e. value under sqrt in
  // the quadratic equation is 0) then the line only touches the circle but does not cross it. When the value under sqrt is negative, then there is no solution to the
  // quadratic equation meaning the line does not cross the circle.
  //
  // Only other extremity case is when the line is vertical (i.e. infinitely steep), which needs to be handled separately.
  const quadraticEqParamA = 1 + Math.pow(lineEqParams.m, 2);
  const quadraticEqParamB = (-2 * circle.center.x) + (2 * lineEqParams.m * lineEqParams.b) - (2 * lineEqParams.m * circle.center.y);
  const quadraticEqParamC = Math.pow(circle.center.x, 2) + Math.pow(lineEqParams.b, 2) - (2 * lineEqParams.b * circle.center.y) + Math.pow(circle.center.y, 2) - Math.pow(circle.radius, 2);

  const quadraticTermUnderSqrt = quadraticEqParamB * quadraticEqParamB - (4 * quadraticEqParamA * quadraticEqParamC);
  if (quadraticTermUnderSqrt < 0) {
    // No solution to the quadratic eq - no intersection
    return { type: 'NoIntersection' };
  }
  const quadraticTermSqrt = Math.sqrt(quadraticTermUnderSqrt);
  const quadraticSolutionX1 = (-quadraticEqParamB + quadraticTermSqrt) / (2 * quadraticEqParamA);
  const quadraticSolutionX2 = (-quadraticEqParamB - quadraticTermSqrt) / (2 * quadraticEqParamA);

  // y can be found from line equation: y=mx+b
  const y1 = lineEqParams.m * quadraticSolutionX1 + lineEqParams.b;
  const y2 = lineEqParams.m * quadraticSolutionX2 + lineEqParams.b;

  // Also known as X1 === X2
  if (quadraticTermUnderSqrt === 0) {
    return {
      type: 'Touches',
      intersection: {
        p1: { x: quadraticSolutionX1, y: y1 },
        p2: { x: quadraticSolutionX1, y: y1 },
      },
    };
  }

  return {
    type: 'Intersects',
    intersection: {
      p1: { x: quadraticSolutionX1, y: y1 },
      p2: { x: quadraticSolutionX2, y: y2 },
    },
  };
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

// TODO: Finish implementation
export function isPointWithinTriangle(point: Point, triangle: Triangle) {
  const verticalLineCrossingPoint: LineSegment = { a: point, b: { x: point.x, y: point.y + 1 } };
  const horizontalLineCrossingPoint: LineSegment = { a: point, b: { x: point.x + 1, y: point.y } };

  const verticalLineCrossingPointEq = findEquationOfLine(verticalLineCrossingPoint);
  const horizontalLineCrossingPointEq = findEquationOfLine(horizontalLineCrossingPoint);

  let existsPolygonEdgeCrossingAbovePoint = false;
  let existsPolygonEdgeCrossingBelowPoint = false;
  let existsPolygonEdgeCrossingLeftToPoint = false;
  let existsPolygonEdgeCrossingRightToPoint = false;

  const edges: LineSegment[] = [
    { a: triangle.a, b: triangle.b },
    { a: triangle.b, b: triangle.c },
    { a: triangle.c, b: triangle.a },
  ];

  // TODO: Don't forget the final edge, connecting the last vertex to the first
  for (let i = 1; i < edges.length; ++i) {
    const line: LineSegment = { a: edges[i - i].a, b: edges[i].b };

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