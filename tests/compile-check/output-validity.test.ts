import { describe, it, expect } from 'bun:test';
import { generateTypeScriptClient } from '../../src/generators/typescript.js';
import type { ApiSpec } from '../../src/core/types.js';

/**
 * These tests verify that generated output is syntactically valid TypeScript.
 * We compile each generated output with Bun to catch syntax errors.
 */
describe('Output validity', () => {
  async function compilesWithoutError(code: string): Promise<boolean> {
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect } from 'bun:test';
import type { ApiSpec } from '../../src/core/types.js';

async function compilesWithoutError(code: string): Promise<boolean> {
    const tempDir = await mkdtemp(join(tmpdir(), 'tscg-check-'));
    const tempFile = join(tempDir, 'index.ts');
    await Bun.write(tempFile, code);
    
    try {
      const result = await Bun.build({
        entrypoints: [tempFile],
        outdir: join(tempDir, 'dist'),
        target: 'browser',
      });
      return result.success;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
      return result.success;
    } finally {
      await Bun.file(tempFile).delete().catch(() => {});
    }
  }

  it('generates compilable TypeScript for empty spec', async () => {
    const spec: ApiSpec = {
      info: { title: 'Test', version: '1.0' },
      baseUrl: '',
      endpoints: [],
      schemas: new Map(),
    };
    
    const output = generateTypeScriptClient(spec);
    const valid = await compilesWithoutError(output);
    expect(valid).toBe(true);
  });

  it('generates compilable TypeScript for complex spec', async () => {
    const spec: ApiSpec = {
      info: { title: 'Test', version: '1.0' },
      baseUrl: 'https://api.example.com',
      endpoints: [
        {
          id: 'getUser',
          method: 'get',
          path: '/users/{id}',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { kind: 'integer' } },
            { name: 'include', in: 'query', required: false, schema: { kind: 'string', enum: ['profile', 'posts'] } },
          ],
          responses: [
            { statusCode: '200', contentType: 'application/json', schema: { kind: 'ref', name: 'User' } },
          ],
        },
        {
          id: 'createUser',
          method: 'post',
          path: '/users',
          parameters: [],
          requestBody: {
            required: true,
            contentType: 'application/json',
            schema: { kind: 'ref', name: 'CreateUserRequest' },
          },
          responses: [
            { statusCode: '201', contentType: 'application/json', schema: { kind: 'ref', name: 'User' } },
          ],
        },
      ],
      schemas: new Map([
        ['User', {
          kind: 'object',
          properties: {
            id: { kind: 'integer' },
            name: { kind: 'string' },
            email: { kind: 'string' },
          },
          required: ['id', 'name', 'email'],
        }],
        ['CreateUserRequest', {
          kind: 'object',
          properties: {
            name: { kind: 'string' },
            email: { kind: 'string' },
          },
          required: ['name', 'email'],
        }],
      ]),
    };
    
    const output = generateTypeScriptClient(spec);
    const valid = await compilesWithoutError(output);
    expect(valid).toBe(true);
  });
});