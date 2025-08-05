import { map } from "rxjs";

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

        /*
        const vertices: Point[] = [
            { x: 0, y: 0 },
            { x: 0, y: 10 },
            { x: mapWidthMeters * (2 / 8), y: 10 },
            { x: mapWidthMeters * (3 / 8), y: 50 },
            { x: mapWidthMeters * (4 / 8), y: 125 },
            { x: mapWidthMeters * (5 / 8), y: 50 },
            { x: mapWidthMeters * (6 / 8), y: 10 },
            { x: mapWidthMeters, y: 10 },
            { x: mapWidthMeters, y: 0 },
        ];
        */
        const vertices: Point[] = [
            { x: 0, y: 0 },
            { x: 0, y: 10 },
        ];

        for (let i = 10; i < mapWidthMeters; i += 10) {
            const y = 5 + (Math.random() * 10);

            vertices.push({ x: i, y: y });
        }
        vertices.push({ x: mapWidthMeters, y: 10 });
        vertices.push({ x: mapWidthMeters, y: 0 });

        const ground: Polygon = {
            vertices: vertices
        }

        const result = new Terrain(mapWidthMeters, mapHeightMeters)
        result.landPolygons.push(ground);

        return result;
    }
}