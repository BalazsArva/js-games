import { Triangle } from "./triangle";
import { BoundingBox, IsBoundingBoxInRegion, IsPointInBoundingBox, Point, Region } from "./types";
import { isPointWithinTriangle } from "./maths";

export class TerrainObjectHierarchy {
  private childHierarchies: TerrainObjectHierarchy[] = [];
  private childTriangles: Record<string, Triangle> = {};
  private boundingBox: BoundingBox;

  constructor(
    private readonly rows: number,
    private readonly cols: number,
    private readonly currentLevel: number,
    private readonly totalLevels: number,
    private readonly ownedSpace: Region) {

    if (!this.isLeafNode) {
      const childOwnedSpaceW = ownedSpace.width / cols;
      const childOwnedSpaceH = ownedSpace.height / rows;

      for (let row = 0; row < rows; ++row) {
        for (let col = 0; col < cols; ++col) {
          this.childHierarchies.push(
            new TerrainObjectHierarchy(
              rows,
              cols,
              currentLevel + 1,
              totalLevels,
              {
                height: childOwnedSpaceH,
                width: childOwnedSpaceW,
                x: ownedSpace.x + (col * childOwnedSpaceW),
                y: ownedSpace.y + (row * childOwnedSpaceH),
              }));
        }
      }
    }

    this.boundingBox = this.computeBoundingBox();
  }

  get isLeafNode(): boolean { return this.currentLevel === this.totalLevels; }

  addTriangles(triangles: Triangle[]) {
    if (!triangles.length) {
      return;
    }

    if (this.isLeafNode) {
      for (let i = 0; i < triangles.length; ++i) {
        this.childTriangles[triangles[i].id] = triangles[i];
      }
    } else {
      const trianglesGroupedByIndex: Record<string, Triangle[]> = {};

      for (let i = 0; i < triangles.length; ++i) {
        const index = this.computeChildIndexForTriangle(triangles[i]).toString();

        if (!trianglesGroupedByIndex[index]) {
          trianglesGroupedByIndex[index] = [];
        }

        trianglesGroupedByIndex[index].push(triangles[i]);
      }

      for (let key in trianglesGroupedByIndex) {
        const index = parseInt(key);

        this.childHierarchies[index].addTriangles(trianglesGroupedByIndex[key]);
      }
    }

    this.boundingBox = this.computeBoundingBox();
  }

  removeTriangles(triangles: Triangle[]) {
    if (!triangles.length) {
      return;
    }

    if (this.isLeafNode) {
      for (let i = 0; i < triangles.length; ++i) {
        delete this.childTriangles[triangles[i].id];
      }
    } else {
      const trianglesGroupedByIndex: Record<string, Triangle[]> = {};

      // group triangles by which hierarchy they belong to, so they can be removed in a single call
      // this saves a lot on recomputing bounding boxes
      for (let i = 0; i < triangles.length; ++i) {
        const triangle = triangles[i];
        const index = this.computeChildIndexForTriangle(triangle).toString();

        if (!trianglesGroupedByIndex[index]) {
          trianglesGroupedByIndex[index] = [];
        }

        trianglesGroupedByIndex[index].push(triangles[i]);
      }

      // call remove only once for every child hierarchy using only their own triangles
      for (let key in trianglesGroupedByIndex) {
        const index = parseInt(key);

        this.childHierarchies[index].removeTriangles(trianglesGroupedByIndex[key]);
      }
    }

    this.boundingBox = this.computeBoundingBox();
  }

  // TODO: This is temporary only - moved from Terrain
  pointCollidesWithTerrain(point: Point): boolean {
    if (this.isLeafNode) {
      const triangles = Object.values(this.childTriangles);
      
      for (let i = 0; i < triangles.length; ++i) {
        const triangle = triangles[i];
        // Bounding box check here is to save on more expensive computations since even if there is a collision,
        // it will only be for a tiny fraction of all the triangles in the segment.
        if (IsPointInBoundingBox(point, triangle.boundingBox) && isPointWithinTriangle(point, triangle)) {
          return true;
        }
      }
    } else {
      for (let i = 0; i < this.childHierarchies.length; ++i) {
        if (
          IsPointInBoundingBox(point, this.childHierarchies[i].boundingBox) &&
          this.childHierarchies[i].pointCollidesWithTerrain(point)) {
          return true;
        }
      }
    }

    return false;
  }

  getObjectsInRegion(region: Region): Triangle[] {
    const result: Triangle[] = [];
    if (!IsBoundingBoxInRegion(this.boundingBox, region)) {
      return result;
    }

    if (this.isLeafNode) {
      const triangles = Object.values(this.childTriangles);

      for (let i = 0; i < triangles.length; ++i) {
        if (IsBoundingBoxInRegion(triangles[i].boundingBox, region)) {
          result.push(triangles[i]);
        }
      }
    } else {
      for (let i = 0; i < this.childHierarchies.length; ++i) {
        result.push(... this.childHierarchies[i].getObjectsInRegion(region));
      }
    }

    return result;
  }

  private computeChildIndexForTriangle(triangle: Triangle) {
    // TODO: Currently the topmost level's owned space is form (0,0) to (width,height). 
    // Check what happens for triangles near the edges whose BB center is negative or exceeds width/height.
    const triangleMiddleXRelativeToOwnedSpace = triangle.boundingBox.middle.x - this.ownedSpace.x;
    const triangleMiddleYRelativeToOwnedSpace = triangle.boundingBox.middle.y - this.ownedSpace.y;

    const colWidth = this.ownedSpace.width / this.cols;
    const rowHeight = this.ownedSpace.height / this.rows;

    const colIndex = Math.floor(triangleMiddleXRelativeToOwnedSpace / colWidth);
    const rowIndex = Math.floor(triangleMiddleYRelativeToOwnedSpace / rowHeight);

    // row by row index
    return ((this.cols * rowIndex) + colIndex);
  }

  private computeBoundingBox(): BoundingBox {
    if (!this.isLeafNode && this.childHierarchies.length === 0) {
      return new BoundingBox(this.ownedSpace.x, this.ownedSpace.y, this.ownedSpace.width, this.ownedSpace.height);
    }

    if (this.isLeafNode && !Object.keys(this.childTriangles).length) {
      return new BoundingBox(this.ownedSpace.x, this.ownedSpace.y, this.ownedSpace.width, this.ownedSpace.height);
    }

    let boundingBoxPoints: Point[];
    if (this.isLeafNode) {
      boundingBoxPoints = Object.values(this.childTriangles)
        .flatMap(t => [t.boundingBox.bottomLeft, t.boundingBox.bottomRight, t.boundingBox.topLeft, t.boundingBox.topRight]);
    } else {
      boundingBoxPoints = this.childHierarchies
        .flatMap(h => [h.boundingBox.bottomLeft, h.boundingBox.bottomRight, h.boundingBox.topLeft, h.boundingBox.topRight]);
    }

    const boundingBoxPointXCoords = boundingBoxPoints.map(p => p.x).sort((a, b) => a - b);
    const boundingBoxPointYCoords = boundingBoxPoints.map(p => p.y).sort((a, b) => a - b);

    const minX = boundingBoxPointXCoords[0];
    const maxX = boundingBoxPointXCoords[boundingBoxPointXCoords.length - 1];
    const minY = boundingBoxPointYCoords[0];
    const maxY = boundingBoxPointYCoords[boundingBoxPointYCoords.length - 1];

    return new BoundingBox(minX, minY, maxX - minX, maxY - minY);
  }
}