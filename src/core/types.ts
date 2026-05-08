export interface ApiSpec {
  info: {
    title: string;
    version: string;
  };
  baseUrl: string;
  endpoints: Endpoint[];
  schemas: Map<string, TypeSchema>;
}

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: ResponseDef[];
}
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: TypeSchema;
  description?: string;
}

export interface RequestBody {
  required: boolean;
  contentType: string;
  schema: TypeSchema;
}

export interface ResponseDef {
  statusCode: string;
  contentType: string;
  schema: TypeSchema;
}

export type TypeSchema = 
  | { kind: 'string'; enum?: string[] }
  | { kind: 'number'; enum?: number[] }
  | { kind: 'integer'; enum?: number[] }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'array'; items: TypeSchema }
  | { kind: 'object'; properties: Record<string, TypeSchema>; required: string[] }
  | { kind: 'ref'; name: string }
  | { kind: 'union'; members: TypeSchema[] }
  | { kind: 'any' };