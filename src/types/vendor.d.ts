// rollup-plugin-visualizer ships no type declarations (CJS package).
declare module "rollup-plugin-visualizer" {
  import type { Plugin } from "vite";
  const pkg: {
    visualizer: (options?: {
      open?: boolean;
      gzipSize?: boolean;
      filename?: string;
      template?: string;
    }) => Plugin;
  };
  export default pkg;
}
