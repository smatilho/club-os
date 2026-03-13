import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(currentDir, "../.."),
};

export default nextConfig;
