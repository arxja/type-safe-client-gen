import { describe, it, expect } from 'bun:test';
import { generateTypeScriptClient } from '../../src/generators/typescript.js';
import type { ApiSpec, Endpoint } from '../../src/core/types.js';

function makeSpec(overrides: Partial<ApiSpec> = {}): ApiSpec {
  return {
    info: { title: 'Test API', version: '1.0' },
    baseUrl: 'https://api.example.com',
    endpoints: [],
    schemas: new Map(),
    ...overrides,
  };
}

describe('Generator', () => {
  describe('Output structure', () => {
    it('always includes header comment', () => {
      const spec = makeSpec();
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('Auto-generated API client');
      expect(output).toContain('DO NOT EDIT MANUALLY');
    });

    it('always includes ClientConfig interface', () => {
      const spec = makeSpec();
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('export interface ClientConfig');
      expect(output).toContain('baseUrl: string');
    });

    it('always includes createClient function', () => {
      const spec = makeSpec();
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('export function createClient');
    });
  });

  describe('Type generation', () => {
    it('generates interface for object schemas', () => {
      const spec = makeSpec({
        schemas: new Map([
          ['User', {
            kind: 'object',
            properties: {
              id: { kind: 'integer' },
              name: { kind: 'string' },
            },
            required: ['id', 'name'],
          }],
        ]),
      });
      
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('export interface User {');
      expect(output).toContain('  id: number;');
      expect(output).toContain('  name: string;');
    });

    it('marks non-required properties as optional', () => {
      const spec = makeSpec({
        schemas: new Map([
          ['User', {
            kind: 'object',
            properties: {
              id: { kind: 'integer' },
              email: { kind: 'string' },
            },
            required: ['id'], // email is not required
          }],
        ]),
      });
      
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('  email?: string;');
    });

    it('generates union types for enums', () => {
      const spec = makeSpec({
        schemas: new Map([
          ['Status', { kind: 'string', enum: ['active', 'inactive'] }],
        ]),
      });
      
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain(`export type Status = 'active' | 'inactive'`);
    });

    it('generates array types', () => {
      const spec = makeSpec({
        schemas: new Map([
          ['PetList', {
            kind: 'array',
            items: { kind: 'ref', name: 'Pet' },
          }],
        ]),
      });
      
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('export type PetList = Array<Pet>');
    });

    it('skips unresolved placeholder schemas', () => {
      const spec = makeSpec({
        schemas: new Map([
          ['Unresolved', { kind: 'any' }],
          ['Resolved', { kind: 'string' }],
        ]),
      });
      
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('Resolved');
      expect(output).not.toContain('Unresolved');
    });
  });

  describe('Endpoint method generation', () => {
    it('generates method for GET endpoint with no params', () => {
      const endpoint: Endpoint = {
        id: 'getUsers',
        method: 'get',
        path: '/users',
        parameters: [],
        responses: [
          { statusCode: '200', contentType: 'application/json', schema: { kind: 'string' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('getUsers: async (): Promise<string> => {');
      expect(output).toContain("let path = '/users';");
      expect(output).toContain("return request<string>('GET', path);");
    });

    it('generates method with path parameters', () => {
      const endpoint: Endpoint = {
        id: 'getUserById',
        method: 'get',
        path: '/users/{userId}',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { kind: 'integer' } },
        ],
        responses: [
          { statusCode: '200', contentType: 'application/json', schema: { kind: 'ref', name: 'User' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('params: { userId: number }');
      expect(output).toContain("path = path.replace('{userId}', String(options.params.userId));");
    });

    it('generates method with query parameters', () => {
      const endpoint: Endpoint = {
        id: 'searchUsers',
        method: 'get',
        path: '/users/search',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { kind: 'string' } },
          { name: 'page', in: 'query', required: false, schema: { kind: 'integer' } },
        ],
        responses: [
          { statusCode: '200', contentType: 'application/json', schema: { kind: 'ref', name: 'User' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('query?: { q: string; page?: number }');
      expect(output).toContain('query: options.query');
    });

    it('generates method with request body', () => {
      const endpoint: Endpoint = {
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
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('body: CreateUserRequest');
      expect(output).toContain('body: options.body');
    });

    it('generates method with both path params and body', () => {
      const endpoint: Endpoint = {
        id: 'updateUser',
        method: 'put',
        path: '/users/{userId}',
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { kind: 'integer' } },
        ],
        requestBody: {
          required: true,
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'UpdateUserRequest' },
        },
        responses: [
          { statusCode: '200', contentType: 'application/json', schema: { kind: 'ref', name: 'User' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('params: { userId: number }');
      expect(output).toContain('body: UpdateUserRequest');
      expect(output).toContain('body: options.body');
    });
  });

  describe('Response type resolution', () => {
    it('uses schema reference name for response type', () => {
      const endpoint: Endpoint = {
        id: 'getPet',
        method: 'get',
        path: '/pets/{id}',
        parameters: [],
        responses: [
          { statusCode: '200', contentType: 'application/json', schema: { kind: 'ref', name: 'Pet' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('Promise<Pet>');
    });

    it('uses 201 response for POST endpoints', () => {
      const endpoint: Endpoint = {
        id: 'createPet',
        method: 'post',
        path: '/pets',
        parameters: [],
        requestBody: {
          required: true,
          contentType: 'application/json',
          schema: { kind: 'ref', name: 'CreatePetRequest' },
        },
        responses: [
          { statusCode: '201', contentType: 'application/json', schema: { kind: 'ref', name: 'Pet' } },
          { statusCode: '400', contentType: 'application/json', schema: { kind: 'string' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      // Should use 201 response, not 400
      expect(output).toContain('Promise<Pet>');
    });

    it('falls back to unknown for empty responses', () => {
      const endpoint: Endpoint = {
        id: 'deletePet',
        method: 'delete',
        path: '/pets/{id}',
        parameters: [],
        responses: [
          { statusCode: '204', contentType: 'application/json', schema: { kind: 'any' } },
        ],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('Promise<unknown>');
    });
  });

  describe('Edge cases', () => {
    it('handles specs with no endpoints', () => {
      const spec = makeSpec({ endpoints: [] });
      const output = generateTypeScriptClient(spec);
      
      expect(output).toContain('return {');
      expect(output).toContain('};');
      // Should not crash
    });

    it('handles endpoints with no responses', () => {
      const endpoint: Endpoint = {
        id: 'weirdEndpoint',
        method: 'get',
        path: '/weird',
        parameters: [],
        responses: [],
      };
      
      const spec = makeSpec({ endpoints: [endpoint] });
      
      // Should not throw
      expect(() => generateTypeScriptClient(spec)).not.toThrow();
    });

    it('handles multiple endpoints with mixed parameter types', () => {
      const endpoints: Endpoint[] = [
        {
          id: 'noParams',
          method: 'get',
          path: '/simple',
          parameters: [],
          responses: [{ statusCode: '200', contentType: 'application/json', schema: { kind: 'string' } }],
        },
        {
          id: 'withParams',
          method: 'get',
          path: '/complex/{id}',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { kind: 'integer' } },
            { name: 'filter', in: 'query', required: false, schema: { kind: 'string' } },
          ],
          responses: [{ statusCode: '200', contentType: 'application/json', schema: { kind: 'ref', name: 'User' } }],
        },
      ];
      
      const spec = makeSpec({ endpoints });
      
      expect(() => generateTypeScriptClient(spec)).not.toThrow();
    });
  });
});