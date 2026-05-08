import type { ApiSpec, TypeSchema, Endpoint } from '../core/types.js';

export function generateTypeScriptClient(spec: ApiSpec): string {
  const parts: string[] = [];
  
  // Header
  parts.push(`/**`);
  parts.push(` * Auto-generated API client for ${spec.info.title}`);
  parts.push(` * Version: ${spec.info.version}`);
  parts.push(` * Generated at: ${new Date().toISOString()}`);
  parts.push(` * DO NOT EDIT MANUALLY`);
  parts.push(` */`);
  parts.push(``);
  
  // Type definitions from schemas
  parts.push(`// ─── Type Definitions ───`);
  parts.push(``);
  
  for (const [name, schema] of spec.schemas) {
    if (schema.kind === 'any') continue; // Skip unresolved placeholders
    parts.push(generateTypeDefinition(name, schema));
    parts.push(``);
  }

  // Inline request/response types (only for non-$ref schemas)
  for (const endpoint of spec.endpoints) {
    // Request body type
    if (endpoint.requestBody && endpoint.requestBody.schema.kind !== 'ref') {
      const reqType = getRequestTypeName(endpoint);
      parts.push(`export type ${reqType} = ${typeSchemaToTypeScript(endpoint.requestBody.schema)};`);
      parts.push(``);
    }
    
    // Response type
    const successResponse = endpoint.responses.find(r => r.statusCode === '200' || r.statusCode === '201');
    if (successResponse && successResponse.schema.kind !== 'ref' && successResponse.schema.kind !== 'any') {
      const resType = getResponseTypeName(endpoint);
      parts.push(`export type ${resType} = ${typeSchemaToTypeScript(successResponse.schema)};`);
      parts.push(``);
    }
  }

  // Client factory
  parts.push(`// ─── Client ───`);
  parts.push(``);
  parts.push(generateClientFactory(spec));
  
  return parts.join('\n');
}

function generateTypeDefinition(name: string, schema: TypeSchema): string {
  if (schema.kind === 'object') {
    const props = Object.entries(schema.properties)
      .map(([propName, propSchema]) => {
        const optional = !schema.required.includes(propName) ? '?' : '';
        return `  ${propName}${optional}: ${typeSchemaToTypeScript(propSchema)};`;
      })
      .join('\n');
    
    return `export interface ${name} {\n${props}\n}`;
  }
  
  if (schema.kind === 'union') {
    const members = schema.members.map(m => typeSchemaToTypeScript(m)).join(' | ');
    return `export type ${name} = ${members};`;
  }
  
  return `export type ${name} = ${typeSchemaToTypeScript(schema)};`;
}

function typeSchemaToTypeScript(schema: TypeSchema): string {
  switch (schema.kind) {
    case 'string':
      return schema.enum 
        ? schema.enum.map(e => `'${e}'`).join(' | ')
        : 'string';
    case 'number':
    case 'integer':
      return schema.enum
        ? schema.enum.join(' | ')
        : 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'any':
      return 'unknown';
    case 'array':
      return `Array<${typeSchemaToTypeScript(schema.items)}>`;
    case 'object': {
      const props = Object.entries(schema.properties)
        .map(([name, prop]) => {
          const optional = !schema.required.includes(name) ? '?' : '';
          return `${name}${optional}: ${typeSchemaToTypeScript(prop)};`;
        })
        .join(' ');
      return `{ ${props} }`;
    }
    case 'ref':
      return schema.name;
    case 'union':
      return schema.members.map(m => typeSchemaToTypeScript(m)).join(' | ');
  }
}

function getRequestTypeName(endpoint: Endpoint): string {
  return `${capitalize(endpoint.id)}RequestBody`;
}

function getResponseTypeName(endpoint: Endpoint): string {
  return `${capitalize(endpoint.id)}Response`;
}

function getBodyType(endpoint: Endpoint): string {
  if (!endpoint.requestBody) return 'undefined';
  return endpoint.requestBody.schema.kind === 'ref'
    ? endpoint.requestBody.schema.name
    : getRequestTypeName(endpoint);
}

function getResponseType(endpoint: Endpoint): string {
  const success = endpoint.responses.find(r => r.statusCode === '200' || r.statusCode === '201');
  if (!success) return 'unknown';
  return success.schema.kind === 'ref'
    ? success.schema.name
    : success.schema.kind === 'any'
      ? 'unknown'
      : getResponseTypeName(endpoint);
}

function generateClientFactory(spec: ApiSpec): string {
  const lines: string[] = [];
  
  lines.push(`export interface ClientConfig {`);
  lines.push(`  baseUrl: string;`);
  lines.push(`  headers?: Record<string, string>;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function createClient(config: ClientConfig) {`);
  lines.push(`  const baseUrl = config.baseUrl.replace(/\\/$/, '');`);
  lines.push(``);
  lines.push(`  async function request<T>(method: string, path: string, options?: {`);
  lines.push(`    query?: Record<string, string | number | boolean>;`);
  lines.push(`    body?: unknown;`);
  lines.push(`    headers?: Record<string, string>;`);
  lines.push(`  }): Promise<T> {`);
  lines.push(`    let url = \`\${baseUrl}\${path}\`;`);
  lines.push(``);
  lines.push(`    if (options?.query) {`);
  lines.push(`      const params = new URLSearchParams();`);
  lines.push(`      for (const [key, value] of Object.entries(options.query)) {`);
  lines.push(`        if (value !== undefined && value !== null) {`);
  lines.push(`          params.set(key, String(value));`);
  lines.push(`        }`);
  lines.push(`      }`);
  lines.push(`      const qs = params.toString();`);
  lines.push(`      if (qs) url += \`?\${qs}\`;`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    const response = await fetch(url, {`);
  lines.push(`      method,`);
  lines.push(`      headers: {`);
  lines.push(`        'Content-Type': 'application/json',`);
  lines.push(`        ...config.headers,`);
  lines.push(`        ...options?.headers,`);
  lines.push(`      },`);
  lines.push(`      body: options?.body ? JSON.stringify(options.body) : undefined,`);
  lines.push(`    });`);
  lines.push(``);
  lines.push(`    if (!response.ok) {`);
  lines.push(`      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    return response.json() as Promise<T>;`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  return {`);
  
  for (const endpoint of spec.endpoints) {
    lines.push(generateEndpointMethod(endpoint));
  }
  
  lines.push(`  };`);
  lines.push(`}`);
  
  return lines.join('\n');
}

function generateEndpointMethod(endpoint: Endpoint): string {
  const pathParams = endpoint.parameters.filter(p => p.in === 'path');
  const queryParams = endpoint.parameters.filter(p => p.in === 'query');
  const resType = getResponseType(endpoint);
  const bodyType = getBodyType(endpoint);
  
  // Build parameter destructuring
  const paramParts: string[] = [];
  
  if (pathParams.length > 0) {
    const props = pathParams.map(p => `${p.name}${p.required ? '' : '?'}: ${typeSchemaToTypeScript(p.schema)}`);
    paramParts.push(`params: { ${props.join('; ')} }`);
  }
  
  if (queryParams.length > 0) {
    const props = queryParams.map(p => `${p.name}${p.required ? '' : '?'}: ${typeSchemaToTypeScript(p.schema)}`);
    paramParts.push(`query: { ${props.join('; ')} }`);
  }
  
  if (endpoint.requestBody) {
    paramParts.push(`body: ${bodyType}`);
  }
  
  const paramsStr = paramParts.length > 0 ? `{ ${paramParts.join('; ')} }` : '';
  
  // Build function body
  const methodUpper = endpoint.method.toUpperCase();
  const optionsParts: string[] = [];
  
  if (queryParams.length > 0) optionsParts.push('query');
  if (endpoint.requestBody) optionsParts.push('body');
  const optionsStr = optionsParts.length > 0 ? `{ ${optionsParts.join(', ')} }` : '';
  
  let body = '';
  body += `    ${endpoint.id}: async (${paramsStr}): Promise<${resType}> => {\n`;
  body += `      let path = '${endpoint.path}';\n`;
  
  for (const param of pathParams) {
    body += `      path = path.replace('{${param.name}}', String(params.${param.name}));\n`;
  }
  
  body += `      return request<${resType}>('${methodUpper}', path`;
  if (optionsStr) {
    body += `, ${optionsStr}`;
  }
  body += `);\n`;
  body += `    },`;
  
  return body;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}