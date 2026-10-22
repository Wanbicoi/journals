import { CliRenderer } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useEffect } from "react";

// Track monkey-patching once globally
let isPatched = false;

interface RawMouseEventPayload {
  x: number;
  y: number;
  button?: number;
  type: string;
}

function ensureRendererMousePatched() {
  if (isPatched) return;
  isPatched = true;

  // biome-ignore lint/suspicious/noExplicitAny: hooking private method on prototype
  const proto = CliRenderer.prototype as any;
  const originalProcess = proto.processSingleMouseEvent;
  // biome-ignore lint/suspicious/noExplicitAny: monkey-patching core CliRenderer prototype
  proto.processSingleMouseEvent = function (mouseEvent: any) {
    this.emit("mouse", mouseEvent);
    return originalProcess.call(this, mouseEvent);
  };
}

export function useMouseClick(
  handler: (coords: { x: number; y: number; button: number; type: string }) => void,
) {
  ensureRendererMousePatched();
  const renderer = useRenderer();

  useEffect(() => {
    const onMouse = (e: RawMouseEventPayload) => {
      // e.type can be "down", "up", "drag", "move", "scroll"
      handler({
        x: e.x,
        y: e.y,
        button: e.button ?? 0,
        type: e.type,
      });
    };

    // biome-ignore lint/suspicious/noExplicitAny: event emitter listener
    renderer.on("mouse", onMouse as any);
    return () => {
      // biome-ignore lint/suspicious/noExplicitAny: event emitter listener
      renderer.off("mouse", onMouse as any);
    };
  }, [renderer, handler]);
}
