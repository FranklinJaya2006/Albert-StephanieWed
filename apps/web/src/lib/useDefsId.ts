import { useId } from "react";

// A unique, CSS/SVG-safe id per component instance, so gradients defined inside one <svg> never
// collide with the same gradient in another.
export function useDefsId() {
  return useId().replace(/[^a-zA-Z0-9]/g, "");
}
