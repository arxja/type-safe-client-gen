// tests/integration/e2e.test.ts
import { describe, it, expect } from 'bun:test';
import { parseSpec } from '../../src/core/parser.js';
import { generateTypeScriptClient } from '../../src/generators/typescript.js';

describe('End-to-end', () => {
  const fixtures = [
    'minimal-petstore',
    'all-http-methods',
    'query-params',
    'path-params',
    'request-body',
    'enum-types',
    'nested-objects',
    'array-response',
    'no-endpoints',
  ];

  for (const fixture of fixtures) {
    it(`parses and generates valid output for: ${fixture}`, async () => {
      const yaml = await Bun.file(`tests/fixtures/${fixture}.yaml`).text();
      
      const spec = parseSpec(yaml, 'yaml');
      expect(spec).toBeDefined();
      expect(spec.info.title).toBeTruthy();
      
      const output = generateTypeScriptClient(spec);
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
      
      expect(output).toContain('createClient');
      expect(output).toContain('ClientConfig');
    });
  }

  it('generated output compiles without TypeScript errors', async () => {
    const yaml = await Bun.file('tests/fixtures/minimal-petstore.yaml').text();
    const spec = parseSpec(yaml, 'yaml');
    const output = generateTypeScriptClient(spec);
    
    const tempDir = '/tmp/tscg-test-' + Date.now();
    const tempFile = `${tempDir}/index.ts`;
    
    await Bun.write(tempFile, output);
    
    const result = await Bun.build({
      entrypoints: [tempFile],
      outdir: `${tempDir}/dist`,
      target: 'browser',
    });
    
    if (!result.success) {
      console.error('Build failed with errors:', result.logs);
    }
    
    expect(result.success).toBe(true);
  });
});