/// <summary>
/// Bezier Spline methods
/// </summary>
/// <summary>
/// Get open-ended Bezier Spline Control Points.
/// </summary>
/// <param name="knots">Input Knot Bezier spline points.</param>
/// <param name="firstControlPoints">Output First Control points
/// array of knots.Length - 1 length.</param>
/// <param name="secondControlPoints">Output Second Control points
/// array of knots.Length - 1 length.</param>
/// <exception cref="ArgumentNullException"><paramref name="knots"/>
/// parameter must be not null.</exception>
/// <exception cref="ArgumentException"><paramref name="knots"/>

import { useMemo } from "react";

/// array must contain at least two points.</exception>
type Point = { x: number; y: number };

export function useCurveControlPoints(
  points: Point[]
): [firstControlPoints: Point[], secondControlPoints: Point[]] {
  return useMemo(() => getCurveControlPoints(points), [points]);
}

function getCurveControlPoints(knots: Point[]): [Point[], Point[]] {
  const firstControlPoints: Point[] = [];
  const secondControlPoints: Point[] = [];
  const n = knots.length - 1;

  if (n == 1) {
    // Special case: Bezier curve should be a straight line.
    firstControlPoints.push({
      // 3P1 = 2P0 + P3
      x: (2 * knots[0].x + knots[1].x) / 3,
      y: (2 * knots[0].y + knots[1].y) / 3,
    });

    secondControlPoints.push({
      // P2 = 2P1 – P0
      x: 2 * firstControlPoints[0].x - knots[0].x,
      y: 2 * firstControlPoints[0].y - knots[0].y,
    });
    return [firstControlPoints, secondControlPoints];
  }

  // Calculate first Bezier control points
  // Right hand side vector
  const rhs: number[] = new Array(n);

  // Set right hand side X values
  for (let i = 1; i < n - 1; ++i) rhs[i] = 4 * knots[i].x + 2 * knots[i + 1].x;
  rhs[0] = knots[0].x + 2 * knots[1].x;
  rhs[n - 1] = (8 * knots[n - 1].x + knots[n].x) / 2.0;
  // Get first control points X-values
  const x = GetFirstControlPoints(rhs);

  // Set right hand side Y values
  for (let i = 1; i < n - 1; ++i) rhs[i] = 4 * knots[i].y + 2 * knots[i + 1].y;
  rhs[0] = knots[0].y + 2 * knots[1].y;
  rhs[n - 1] = (8 * knots[n - 1].y + knots[n].y) / 2.0;
  // Get first control points Y-values
  const y = GetFirstControlPoints(rhs);

  // Fill output arrays.
  // firstControlPoints = new Point[n]();
  // secondControlPoints = new Point[n]();
  for (let i = 0; i < n; ++i) {
    // First control point
    firstControlPoints.push({ x: x[i], y: y[i] });
    // Second control point
    if (i < n - 1)
      secondControlPoints.push({
        x: 2 * knots[i + 1].x - x[i + 1],
        y: 2 * knots[i + 1].y - y[i + 1],
      });
    else
      secondControlPoints.push({
        x: (knots[n].x + x[n - 1]) / 2,
        y: (knots[n].y + y[n - 1]) / 2,
      });
  }

  return [firstControlPoints, secondControlPoints];
}

/// <summary>
/// Solves a tridiagonal system for one of coordinates (x or y)
/// of first Bezier control points.
/// </summary>
/// <param name="rhs">Right hand side vector.</param>
/// <returns>Solution vector.</returns>
function GetFirstControlPoints(rhs: number[]): number[] {
  const n = rhs.length;
  const x = new Array(n); // Solution vector.
  let tmp = new Array(n); // Temp workspace.

  let b = 2.0;
  x[0] = rhs[0] / b;
  for (
    let i = 1;
    i < n;
    i++ // Decomposition and forward substitution.
  ) {
    tmp[i] = 1 / b;
    b = (i < n - 1 ? 4.0 : 3.5) - tmp[i];
    x[i] = (rhs[i] - x[i - 1]) / b;
  }
  for (let i = 1; i < n; i++) x[n - i - 1] -= tmp[n - i] * x[n - i]; // Backsubstitution.

  return x;
}

export function useCleanPath(points: Point[]): Point[] {
  return useMemo(() => {
    const cleanPoints = [...(points || [])].sort((a, b) => a.y - b.y);

    if (cleanPoints.length < 2)
      return [
        { x: 0.5, y: 0 },
        { x: 0.5, y: 1 },
      ];

    const [first] = cleanPoints;
    const last = cleanPoints[cleanPoints.length - 1];
    if (first.y > 0.01) cleanPoints.unshift({ x: first.x, y: 0 });
    if (last.y < 0.99) cleanPoints.push({ x: last.x, y: 1 });

    return cleanPoints;
  }, [points]);
}

export function useSvgPath(
  points: Point[],
  scaleX = 100,
  scaleY = 100
): string {
  return useMemo(() => {
    return createSmoothPath(points, scaleX, scaleY);
  }, [points]);
}

export function createSmoothPath(
  points: Point[],
  scaleX: number,
  scaleY: number
): string {
  const [firstControlPoints, secondControlPoints] =
    getCurveControlPoints(points);
  let path = `M ${points[0].x * scaleX} ${points[0].y * scaleY}`;
  for (let i = 0; i < points.length - 1; i++) {
    path += ` C ${firstControlPoints[i].x * scaleX} ${
      firstControlPoints[i].y * scaleY
    } ${secondControlPoints[i].x * scaleX} ${
      secondControlPoints[i].y * scaleY
    } ${points[i + 1].x * scaleX} ${points[i + 1].y * scaleY}`;
  }

  return path;
}
