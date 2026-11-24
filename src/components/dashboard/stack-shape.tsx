"use client";

import { Rectangle, type BarShapeProps } from "recharts";

/**
 * A bar segment that rounds its data end only when it is the top segment of
 * its stack, so every stacked column ends in the same rounded cap whichever
 * series happens to be on top. `keys` is the stack order, bottom first.
 */
export function stackShape(keys: readonly string[], key: string) {
  const above = keys.slice(keys.indexOf(key) + 1);
  return function StackSegment(props: BarShapeProps) {
    const datum = (props.payload ?? {}) as Record<string, number>;
    const top = above.every((k) => !datum[k]);
    return <Rectangle {...props} radius={top ? [3, 3, 0, 0] : 0} />;
  };
}
