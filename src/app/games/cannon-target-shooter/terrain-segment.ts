import { Triangle } from "./triangle";
import { BoundingBox } from "./types";

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