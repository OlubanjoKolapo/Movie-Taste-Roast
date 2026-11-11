import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "mt-concierge": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        size?: number | string;
        state?: "idle" | "thinking" | "answering";
        heat?: string;
        follow?: boolean;
        eyes?: "pause" | "play";
      };
    }
  }
}
