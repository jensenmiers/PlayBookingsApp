#!/usr/bin/env tsx
/**
 * Schema Inspector Runner
 * 
 * Run this script to inspect your Supabase database schema:
 *   npm run inspect:schema
 * 
 * Or directly:
 *   npx tsx scripts/inspect-schema.ts
 */

import { inspectDatabaseSchema } from '../src/lib/supabase/schema-inspector'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

async function main() {
  console.log('🚀 Database Schema Inspector\n')
  console.log('Environment check:')
  console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}`)
  console.log(`  SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing'}\n`)

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables!')
    console.error('   Please ensure .env.local contains:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  try {
    await inspectDatabaseSchema()
    console.log('\n✅ Schema inspection complete!')
  } catch (error) {
    console.error('\n❌ Schema inspection failed!')
    process.exit(1)
  }
}

main()

