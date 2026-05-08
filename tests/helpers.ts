/**
 * Reads a fixture file relative to the project root.
 */
export async function readFile(path: string): Promise<string> {
  return Bun.file(path).text();
}