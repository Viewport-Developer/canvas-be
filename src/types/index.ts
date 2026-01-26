// 클라이언트와 동일한 타입 정의
export type Point = {
  x: number;
  y: number;
};

export type BoundingBox = {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
};

export type Path = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  boundingBox: BoundingBox;
};

export type ShapeType = "rectangle" | "diamond" | "circle";

export type Shape = {
  id: string;
  type: ShapeType;
  startPoint: Point;
  endPoint: Point;
  color: string;
  width: number;
  boundingBox: BoundingBox;
};

export type Text = {
  id: string;
  position: Point;
  content: string;
  color: string;
  fontSize: number;
  boundingBox: BoundingBox;
};
