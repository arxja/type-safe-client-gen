# Type-Safe API Client Generator

**Generate fully typed TypeScript HTTP clients from OpenAPI 3.0 specifications.**

[![npm version](https://img.shields.io/npm/v/type-safe-client-gen.svg)](https://www.npmjs.com/package/type-safe-client-gen)
[![CI](https://github.com/YOUR_USERNAME/type-safe-client-gen/actions/workflows/ci.yml/badge.svg)](https://github.com/arxja/type-safe-client-gen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Problem

Your backend team changes an API response shape. Your frontend breaks silently at runtime. You find out from a user bug report three days later.

## The Solution

A single command that reads your OpenAPI spec and generates a TypeScript client where **every endpoint, parameter, and response is fully typed**. When the API changes, your build fails at compile time—not at 3 AM.

```bash
npx tscg -i ./api-spec.yaml -o ./src/api-client
```

## Tech Stack

- Bun for development (parsing, testing, building)
- Runs on Node.js 18+, Bun, Deno, browsers
- Dependencies: `js-yaml` (only dependency, used for YAML parsing)

## Features

- Zero runtime dependencies — generated code uses native fetch
- Full type safety — request bodies, query params, path params, headers, responses
- Single file output — drop index.ts into any TypeScript project
- Runtime agnostic — works in browsers, Node.js, Bun, Deno
- No code generation in your CI — commit the generated file, review API changes in PRs
- OpenAPI 3.0 support — YAML and JSON input, local files or URLs

## Quick Start

1. Installation

```bash
npm install -D type-safe-client-gen # Not available now
```

2. Generate a Client

```bash
# From a local file
npx tscg -i ./api-spec.yaml -o ./src/api-client

# From a URL
npx tscg -i https://api.example.com/swagger.json -o ./src/generated

# Force format if auto-detection fails
npx tscg -i ./spec.txt -o ./src/api-client -f yaml
```

3. Use the Generated Client

```typescript
import { createClient } from './src/api-client';

const api = createClient({ 
  baseUrl: 'https://api.example.com',
  headers: { 'Authorization': 'Bearer token' }
});

// Every method is fully typed
const pets = await api.listPets({ query: { limit: 10 } });
//      ^? Pet[]

const pet = await api.getPetById({ params: { petId: 1 } });
//    ^? Pet

const newPet = await api.createPet({ body: { name: 'Rex' } });
//      ^? Pet
```

## Example: Before and After

**Without This Tool**

```typescript
// Hand-written, no guarantees
const res = await fetch('/api/pets/1');
const pet = await res.json() as any;
console.log(pet.nam); // Typo, no error. Bug ships to production.
```

**With This Tool**

```typescript
import { getPetById } from './api-client';

const pet = await getPetById({ params: { petId: 1 } });
console.log(pet.nam); // Compile error: Property 'nam' does not exist on type 'Pet'
```

## How It Works

```text
OpenAPI Spec (YAML/JSON)
        │
        ▼
    [ Parser ]
        │
        ▼
  Internal Model  ─── TypeScript Generator ─── typed-client.ts
        │
        ▼
   Ready to use in your project
```

The parser reads your OpenAPI 3.0 specification and builds an internal representation of every endpoint, parameter, schema, and response. The generator walks that model and produces idiomatic TypeScript with proper interfaces, union types, and a factory function.

## Configuration

### Client Options

```typescript
const api = createClient({
  baseUrl: 'https://api.example.com',  // Required
  headers: {                            // Optional: default headers
    'Authorization': 'Bearer token',
    'X-API-Key': 'your-key',
  },
});
```

### Per-Request Headers

```typescript
// Methods return standard fetch responses wrapped in Promise<T>
// For custom per-request behavior, use the generated client as a base
const pet = await api.getPetById({ params: { petId: 1 } });
```

## OpenAPI Feature Support

| Feature | Support |
|---------|---------|
| Path parameters | ✅ |
| Query parameters | ✅ |
| Request bodies (JSON) | ✅ |
| $ref schemas | ✅ |
| Inline object schemas | ✅ |
| Enums (string, number) | ✅ |
| Arrays | ✅ |
| Nested objects | ✅ |
| Union types (oneOf, anyOf) | ✅ |
| All HTTP methods | ✅ |
| allOf | ⚠️ Merges first schema |
| Header parameters | ❌ Planned |
| Cookie parameters | ❌ Planned |
| Multipart/form-data | ❌ Planned |
| OpenAPI 3.1 | ❌ Planned |


