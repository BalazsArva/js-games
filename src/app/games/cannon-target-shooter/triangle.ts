import { PointDistance } from "./maths";
import { BoundingBox, Point } from "./types";

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
    const minimumPointDistance = 2;

    // TODO: Not sure whether to use || or &&. A triangle may have a very long and a very short edge, what to do then?
    if (
      PointDistance(this.a, this.b) <= minimumPointDistance ||
      PointDistance(this.a, this.c) <= minimumPointDistance ||
      PointDistance(this.b, this.c) <= minimumPointDistance) {
      return [this];
    }

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

    return [
      new Triangle(this.a, ab, ac),
      new Triangle(this.b, ab, bc),
      new Triangle(this.c, ac, bc),
      new Triangle(ac, ab, bc),
    ];
  }
}