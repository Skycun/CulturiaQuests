import 'dotenv/config';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { StrapiClient } from './strapi-client.js';
import { DialogPopulator } from './populators/dialog-populator.js';
import { NpcPopulator } from './populators/npc-populator.js';
import { NpcEntriesArraySchema, NpcCreateInputArraySchema, type CLIOptions, type PopulationResult } from './types.js';

// ============================================
// CLI Argument Parsing
// ============================================

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  let type = 'dialog';
  let input = ''; // Will be set default later based on type if empty
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--type' || arg === '-t') {
      type = args[++i];
    } else if (arg === '--input' || arg === '-i') {
      input = args[++i];
    } else if (arg === '--dry-run' || arg === '-d') {
      dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // Set default input based on type if not provided
  if (!input) {
    if (type === 'npc') input = './data/npcs.json';
    else if (type === 'dialog') input = './data/npc_entries.json';
    else input = './data/npc_entries.json'; // Fallback
  }

  return { type, input, dryRun, verbose };
}

function printHelp(): void {
  console.log(`
Usage: npx tsx src/index.ts [options]

Options:
  -t, --type <type>     Content type to populate (dialog, npc)
  -i, --input <file>    Input JSON file path (defaults based on type)
  -d, --dry-run         Run without making changes
  -v, --verbose         Show detailed output
  -h, --help            Show this help message

Examples:
  npx tsx src/index.ts --type npc
  npx tsx src/index.ts --type dialog --input ./data/npc_entries.json
`);
}

// ============================================
// Environment Validation
// ============================================

function validateEnvironment(): { baseUrl: string; apiToken: string } {
  const baseUrl = process.env.STRAPI_BASE_URL;
  const apiToken = process.env.STRAPI_API_TOKEN;

  if (!baseUrl) {
    console.error('ERROR: STRAPI_BASE_URL is not set in .env file');
    process.exit(1);
  }

  if (!apiToken) {
    console.error('ERROR: STRAPI_API_TOKEN is not set in .env file');
    console.error('Generate an API token in Strapi Admin: Settings > API Tokens');
    process.exit(1);
  }

  return { baseUrl, apiToken };
}

// ============================================
// Data Loading
// ============================================

async function loadInputData(inputPath: string): Promise<unknown> {
  const absolutePath = resolve(process.cwd(), inputPath);

  try {
    const content = await readFile(absolutePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`ERROR: Input file not found: ${absolutePath}`);
    } else {
      console.error(`ERROR: Failed to read input file: ${error}`);
    }
    process.exit(1);
  }
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log('\n=== Strapi Database Populator ===\n');

  // Parse CLI arguments
  const options = parseArgs();

  console.log(`Type: ${options.type}`);
  console.log(`Input: ${options.input}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log(`Verbose: ${options.verbose}`);
  console.log('');

  // Validate environment
  const { baseUrl, apiToken } = validateEnvironment();
  console.log(`Strapi URL: ${baseUrl}`);
  console.log('');

  // Initialize client
  const client = new StrapiClient({ baseUrl, apiToken });

  // Load and validate input data
  const rawData = await loadInputData(options.input);

  let result: PopulationResult;

  // Run the appropriate populator
  switch (options.type) {
    case 'npc': {
      const parseResult = NpcCreateInputArraySchema.safeParse(rawData);
      if (!parseResult.success) {
        console.error('ERROR: Input validation failed:');
        console.error(parseResult.error.format());
        process.exit(1);
      }
      const populator = new NpcPopulator(client, options.dryRun, options.verbose);
      result = await populator.populate(parseResult.data);
      break;
    }

    case 'dialog': {
      // Validate input schema
      const parseResult = NpcEntriesArraySchema.safeParse(rawData);
      if (!parseResult.success) {
        console.error('ERROR: Input validation failed:');
        console.error(parseResult.error.format());
        process.exit(1);
      }

      const populator = new DialogPopulator(client, options.dryRun, options.verbose);
      result = await populator.populate(parseResult.data);
      break;
    }

    default:
      console.error(`ERROR: Unknown content type: ${options.type}`);
      console.error('Available types: npc, dialog');
      process.exit(1);
  }

  // Print results
  console.log('\n=== Results ===');
  console.log(`Created: ${result.created}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors detail:');
    for (const { item, error } of result.errors) {
      console.log(`  - ${item}: ${error}`);
    }
    process.exit(1);
  }

  console.log('\nDone!');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
