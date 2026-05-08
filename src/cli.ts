#!/usr/bin/env node

import { parseArgs } from 'util';
import { parseSpec } from './core/parser.js';
import { generateTypeScriptClient } from './generators/typescript.js';
import { readFile, writeFile } from './utils/fs';

interface CLIOptions {
  input: string;
  output: string;
  format?: 'yaml' | 'json';
  help?: boolean;
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      input: { type: 'string', short: 'i' },
      output: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });

  const opts = values as unknown as CLIOptions;

  if (opts.help || !opts.input || !opts.output) {
    console.log(`
Type-Safe API Client Generator (tscg)

Usage:
  tscg --input <spec.yaml|spec.json|url> --output <directory> [--format yaml|json]

Options:
  -i, --input    Path or URL to OpenAPI specification
  -o, --output   Directory to write generated client
  -f, --format   Force format (yaml or json). Auto-detected if omitted.
  -h, --help     Show this help message

Examples:
  tscg -i ./api-spec.yaml -o ./src/api-client
  tscg -i https://api.example.com/swagger.json -o ./src/generated
    `);
    process.exit(0);
  }

  try {
    console.log(`Reading spec from: ${opts.input}`);
    const raw = await readFile(opts.input);
    
    // Auto-detect format if not specified
    const format = opts.format ?? (
      opts.input.endsWith('.json') ? 'json' : 'yaml'
    );

    console.log(`Parsing ${format.toUpperCase()} spec...`);
    const spec = parseSpec(raw, format);
    
    console.log(`Found ${spec.endpoints.length} endpoints and ${spec.schemas.size} schemas.`);
    console.log(`Generating TypeScript client...`);
    
    const clientCode = generateTypeScriptClient(spec);
    
    const outputPath = opts.output.replace(/\/$/, '');
    const outputFile = `${outputPath}/index.ts`;
    
    await writeFile(outputFile, clientCode);
    
    console.log(`✅ Client generated at: ${outputFile}`);
    console.log(`   Endpoints: ${spec.endpoints.length}`);
    console.log(`   Schemas: ${spec.schemas.size}`);
    
    // Print endpoint summary
    for (const endpoint of spec.endpoints) {
      console.log(`   • ${endpoint.method.toUpperCase()} ${endpoint.path} → ${endpoint.id}`);
    }
    
  } catch (error) {
    console.error('❌ Generation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();