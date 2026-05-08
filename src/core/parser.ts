import yaml from 'js-yaml';
import type { OpenAPIDocument } from './openapi-types.js';
import type { ApiSpec, Endpoint, TypeSchema, Parameter, RequestBody, ResponseDef } from './types.js';

export function parseSpec(rawSpec: string, format: 'yaml' | 'json'): ApiSpec {
  const doc: OpenAPIDocument = format === 'yaml' 
    ? yaml.load(rawSpec) as OpenAPIDocument
    : JSON.parse(rawSpec);

  const schemas = extractSchemas(doc);
  const endpoints = extractEndpoints(doc, schemas);
  const baseUrl = doc.servers?.[0]?.url ?? '';

  return {
    info: { title: doc.info.title, version: doc.info.version },
    baseUrl,
    endpoints,
    schemas,
  };
}

function extractSchemas(doc: OpenAPIDocument): Map<string, TypeSchema> {
  const schemas = new Map<string, TypeSchema>();
  const components = doc.components?.schemas;
  
  if (!components) return schemas;

  // Pass 1: Register all names with placeholders (forward declaration)
  for (const name of Object.keys(components)) {
    schemas.set(name, { kind: 'any' });
  }

  // Pass 2: Resolve everything with full reference map available
  for (const [name, schema] of Object.entries(components)) {
    schemas.set(name, convertSchemaObject(schema, schemas));
  }

  return schemas;
}

function extractEndpoints(doc: OpenAPIDocument, schemas: Map<string, TypeSchema>): Endpoint[] {
  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) continue;

    const methods = [
      { method: 'get' as const, operation: pathItem.get },
      { method: 'post' as const, operation: pathItem.post },
      { method: 'put' as const, operation: pathItem.put },
      { method: 'delete' as const, operation: pathItem.delete },
      { method: 'patch' as const, operation: pathItem.patch },
    ];

    for (const { method, operation } of methods) {
      if (!operation) continue;

      endpoints.push({
        id: operation.operationId ?? `${method}_${path.replace(/[\/{}]/g, '_')}`,
        method,
        path,
        summary: operation.summary,
        parameters: parseParameters(operation.parameters, schemas),
        requestBody: parseRequestBody(operation.requestBody, schemas),
        responses: parseResponses(operation.responses, schemas),
      });
    }
  }

  return endpoints;
}

function convertSchemaObject(schema: any, schemas: Map<string, TypeSchema>): TypeSchema {
  // Handle $ref (must come first—a $ref object should not be processed as anything else)
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()!;
    // Check if the referenced schema is already resolved
    const resolved = schemas.get(refName);
    if (resolved && resolved.kind !== 'any') {
      return resolved; // Return the resolved type directly, not a ref
    }
    return { kind: 'ref', name: refName };
  }

  // Handle allOf (merge first item for now—full merge is a future enhancement)
  if (schema.allOf) {
    return convertSchemaObject(schema.allOf[0], schemas);
  }

  // Handle oneOf, anyOf (union types)
  if (schema.oneOf || schema.anyOf) {
    const items = schema.oneOf || schema.anyOf;
    return {
      kind: 'union',
      members: items.map((item: any) => convertSchemaObject(item, schemas)),
    };
  }

  // Handle enum
  if (schema.enum) {
    const type = schema.type || typeof schema.enum[0];
    if (type === 'string') return { kind: 'string', enum: schema.enum };
    if (type === 'number' || type === 'integer') return { kind: type, enum: schema.enum };
  }

  // Handle arrays
  if (schema.type === 'array') {
    return {
      kind: 'array',
      items: convertSchemaObject(schema.items, schemas),
    };
  }

  // Handle objects
  if (schema.type === 'object' || schema.properties) {
    const properties: Record<string, TypeSchema> = {};
    for (const [name, prop] of Object.entries(schema.properties ?? {})) {
      properties[name] = convertSchemaObject(prop, schemas);
    }
    return {
      kind: 'object',
      properties,
      required: schema.required ?? [],
    };
  }

  // Primitives
  switch (schema.type) {
    case 'string': return { kind: 'string' };
    case 'number': return { kind: 'number' };
    case 'integer': return { kind: 'integer' };
    case 'boolean': return { kind: 'boolean' };
    case 'null': return { kind: 'null' };
    default: return { kind: 'any' };
  }
}

function parseParameters(params: any[] | undefined, schemas: Map<string, TypeSchema>): Parameter[] {
  if (!params) return [];
  return params.map(p => ({
    name: p.name,
    in: p.in,
    required: p.required ?? false,
    schema: p.schema ? convertSchemaObject(p.schema, schemas) : { kind: 'string' },
    description: p.description,
  }));
}

function parseRequestBody(body: any, schemas: Map<string, TypeSchema>): RequestBody | undefined {
  if (!body) return undefined;
  const content = body.content?.['application/json'];
  if (!content) return undefined;
  
  return {
    required: body.required ?? false,
    contentType: 'application/json',
    schema: convertSchemaObject(content.schema, schemas),
  };
}

function parseResponses(responses: any, schemas: Map<string, TypeSchema>): ResponseDef[] {
  const result: ResponseDef[] = [];
  
  for (const [statusCode, response] of Object.entries(responses ?? {})) {
    const resp = response as any;
    const content = resp.content?.['application/json'];
    if (content) {
      result.push({
        statusCode,
        contentType: 'application/json',
        schema: convertSchemaObject(content.schema, schemas),
      });
    }
  }

  return result;
}