import { describe, it, expect } from 'bun:test';
import { generateTypeScriptClient } from '../../src/generators/typescript.js';
import type { ApiSpec } from '../../src/core/types.js';

/**
 * These tests verify that generated output is syntactically valid TypeScript.
 * We compile each generated output with Bun to catch syntax errors.
 */
describe('Output validity', () => {
  async function compilesWithoutError(code: string): Promise<boolean> {
    const tempFile = `/tmp/tscg-check-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`;
    await Bun.write(tempFile, code);
    
    try {
      const result = await Bun.build({
        entrypoints: [tempFile],
        outdir: '/tmp/tscg-out',
        target: 'browser',
      });
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