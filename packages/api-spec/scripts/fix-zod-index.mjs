import { writeFileSync } from "fs";
import { resolve } from "path";

const indexPath = resolve(import.meta.dirname, "..", "..", "api-zod", "src", "index.ts");

writeFileSync(indexPath, 'export * from "./generated/api";\n');
