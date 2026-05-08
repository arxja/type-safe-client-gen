import { describe, it, expect } from 'bun:test';
import { generateTypeScriptClient } from '../../src/generators/typescript.js';
import type { ApiSpec } from '../../src/core/types.js';

describe('Output validity', () => {
  it('generates valid output structure for empty spec', () => {
    const spec: ApiSpec = {
      info: { title: 'Test', version: '1.0' },
      baseUrl: '',
      endpoints: [],
      schemas: new Map(),
    };
    
    const output = generateTypeScriptClient(spec);
    
    expect(output).toContain('createClient');
    expect(output).toContain('ClientConfig');
    expect(output).toContain('Auto-generated API client');
  });

  it('generates valid output structure for complex spec', () => {
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
    
    expect(output).toContain('export interface User');
    expect(output).toContain('export interface CreateUserRequest');
    expect(output).toContain('createClient');
    expect(output).toContain('getUser');
    expect(output).toContain('createUser');
  });
});