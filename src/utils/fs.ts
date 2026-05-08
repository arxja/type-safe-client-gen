export async function readFile(input: string): Promise<string> {
  // Handle URLs
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch spec: HTTP ${response.status}`);
    }
    return response.text();
  }

  // Handle local files
  // Bun global - available only in Bun runtime
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(input);
    if (!(await file.exists())) {
      throw new Error(`File not found: ${input}`);
    }
    return file.text();
  }

  // Node.js fallback
  const fs = await import('node:fs/promises');
  return fs.readFile(input, 'utf-8');
}

export async function writeFile(path: string, content: string): Promise<void> {
  // Ensure directory exists
  const dir = path.substring(0, path.lastIndexOf('/'));
  
  if (typeof Bun !== 'undefined') {
    // Bun handles directory creation implicitly with Bun.write
    await Bun.write(path, content);
    return;
  }

  // Node.js fallback
  const fs = await import('node:fs/promises');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path, content, 'utf-8');
}