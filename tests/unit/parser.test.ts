import { describe, it, expect } from 'bun:test';
import { parseSpec } from '../../src/core/parser.js';

const minimalSpec = `
openapi: "3.0.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
`;

describe('Parser', () => {
  it('parses a minimal spec and extracts endpoints', () => {
    const spec = parseSpec(minimalSpec, 'yaml');
    
    expect(spec.info.title).toBe('Test API');
    expect(spec.endpoints).toHaveLength(1);
    expect(spec.endpoints[0].id).toBe('getUsers');
    expect(spec.endpoints[0].method).toBe('get');
    expect(spec.endpoints[0].path).toBe('/users');
  });

  it('extracts response schemas', () => {
    const spec = parseSpec(minimalSpec, 'yaml');
    
    const endpoint = spec.endpoints[0];
    expect(endpoint.responses).toHaveLength(1);
    expect(endpoint.responses[0].statusCode).toBe('200');
    expect(endpoint.responses[0].schema.kind).toBe('array');
  });
});