import fs from "fs";
import path from "path";

const ROOT_MARKERS = ["config.yaml", "pnpm-workspace.yaml"];

function hasProjectMarkers(directory: string): boolean {
  return ROOT_MARKERS.every((marker) => fs.existsSync(path.join(directory, marker)));
}

function findProjectRoot(startDirectory: string): string | null {
  let current = path.resolve(startDirectory);

  while (true) {
    if (hasProjectMarkers(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export const projectRoot = process.env.PULSE_ROOT
  ? path.resolve(process.env.PULSE_ROOT)
  : findProjectRoot(process.cwd()) ?? process.cwd();

export function resolveProjectPath(...segments: string[]): string {
  return path.resolve(projectRoot, ...segments);
}
