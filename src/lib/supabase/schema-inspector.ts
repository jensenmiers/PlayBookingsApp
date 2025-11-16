import { createClient } from '@supabase/supabase-js'

/**
 * Database Schema Inspector
 * 
 * This script queries PostgreSQL's information_schema to inspect the actual
 * database structure, including tables, columns, triggers, and functions.
 * 
 * What it does:
 * 1. Uses service role key to bypass RLS (needed for schema inspection)
 * 2. Queries information_schema tables (PostgreSQL's metadata catalog)
 * 3. Retrieves actual table structures, not just migration files
 * 4. Shows all active triggers and functions
 * 
 * Why this matters:
 * - Migration files might not reflect actual deployed state
 * - Manual changes or drift can occur
 * - Need to see what triggers/functions are actually running
 */

interface SchemaInfo {
  tables: TableInfo[]
  triggers: TriggerInfo[]
  functions: FunctionInfo[]
}

interface TableInfo {
  name: string
  columns: ColumnInfo[]
  exists: boolean
}

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  character_maximum_length: number | null
}

interface TriggerInfo {
  trigger_name: string
  event_manipulation: string
  event_object_table: string
  action_statement: string
  action_timing: string
}

interface FunctionInfo {
  function_name: string
  return_type: string
  argument_types: string | null
}

export class SchemaInspector {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    // Use service role key for schema inspection (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      )
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  /**
   * Get table structure by querying information_schema via RPC
   */
  async getTableStructure(tableName: string): Promise<ColumnInfo[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_table_structure', {
        table_name_param: tableName,
      })

      if (error) {
        console.warn(`Could not get structure for ${tableName}:`, error.message)
        return []
      }

      return (data ?? []) as ColumnInfo[]
    } catch (error) {
      console.warn(`Error getting structure for ${tableName}:`, error)
      return []
    }
  }

  /**
   * Get all triggers
   */
  async getAllTriggers(): Promise<TriggerInfo[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_all_triggers', {})

      if (error) {
        console.warn('Could not get triggers:', error.message)
        return []
      }

      return (data ?? []) as TriggerInfo[]
    } catch (error) {
      console.warn('Error getting triggers:', error)
      return []
    }
  }

  /**
   * Get all functions
   */
  async getAllFunctions(): Promise<FunctionInfo[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_all_functions', {})

      if (error) {
        console.warn('Could not get functions:', error.message)
        return []
      }

      return (data ?? []) as FunctionInfo[]
    } catch (error) {
      console.warn('Error getting functions:', error)
      return []
    }
  }

  /**
   * Check if a table exists by attempting to query it
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(0)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Inspect all tables in the database
   */
  async inspectTables(): Promise<TableInfo[]> {
    const knownTables = [
      'users',
      'venues',
      'availability',
      'bookings',
      'recurring_bookings',
      'insurance_documents',
      'payments',
      'audit_logs',
      'subscriptions',
      'messages',
    ]

    const results: TableInfo[] = []

    for (const tableName of knownTables) {
      const exists = await this.tableExists(tableName)
      let columns: ColumnInfo[] = []

      if (exists) {
        columns = await this.getTableStructure(tableName)
      }

      results.push({
        name: tableName,
        columns,
        exists,
      })
    }

    return results
  }

  /**
   * Main inspection method
   */
  async inspect(): Promise<SchemaInfo> {
    console.log('🔍 Starting database schema inspection...\n')

    const [tables, triggers, functions] = await Promise.all([
      this.inspectTables(),
      this.getAllTriggers(),
      this.getAllFunctions(),
    ])

    return {
      tables,
      triggers,
      functions,
    }
  }

  /**
   * Print formatted schema information
   */
  printSchemaInfo(info: SchemaInfo) {
    console.log('='.repeat(70))
    console.log('📊 DATABASE SCHEMA INSPECTION RESULTS')
    console.log('='.repeat(70))

    console.log('\n📋 TABLES:\n')
    info.tables.forEach((table) => {
      if (table.exists) {
        console.log(`  ✓ ${table.name}`)
        if (table.columns.length > 0) {
          table.columns.forEach((col) => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
            const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
            console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
          })
        } else {
          console.log(`    (Could not retrieve column details - RPC function may not exist)`)
        }
        console.log()
      } else {
        console.log(`  ✗ ${table.name} (does not exist)`)
      }
    })

    if (info.triggers.length > 0) {
      console.log('\n🔧 TRIGGERS:\n')
      const triggersByTable = info.triggers.reduce((acc, trigger) => {
        if (!acc[trigger.event_object_table]) {
          acc[trigger.event_object_table] = []
        }
        acc[trigger.event_object_table].push(trigger)
        return acc
      }, {} as Record<string, TriggerInfo[]>)

      Object.entries(triggersByTable).forEach(([table, triggers]) => {
        console.log(`  Table: ${table}`)
        triggers.forEach((trigger) => {
          console.log(`    • ${trigger.trigger_name}`)
          console.log(`      Event: ${trigger.event_manipulation}`)
          console.log(`      Timing: ${trigger.action_timing}`)
          console.log(`      Function: ${trigger.action_statement}`)
        })
        console.log()
      })
    } else {
      console.log('\n🔧 TRIGGERS: (Could not retrieve - RPC function may not exist)')
    }

    if (info.functions.length > 0) {
      console.log('\n⚙️  FUNCTIONS:\n')
      info.functions.forEach((func) => {
        console.log(`  • ${func.function_name}`)
        console.log(`    Returns: ${func.return_type}`)
        if (func.argument_types) {
          console.log(`    Arguments: ${func.argument_types}`)
        }
      })
    } else {
      console.log('\n⚙️  FUNCTIONS: (Could not retrieve - RPC function may not exist)')
    }

    console.log('\n' + '='.repeat(70))
  }
}

/**
 * Main inspection function
 */
export async function inspectDatabaseSchema() {
  try {
    const inspector = new SchemaInspector()
    const results = await inspector.inspect()
    inspector.printSchemaInfo(results)
    return results
  } catch (error) {
    console.error('❌ Error inspecting database schema:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    throw error
  }
}

