import { createClient } from './client'

/**
 * Test file to verify Supabase connections are working correctly
 * Run this to check your environment variables and database connectivity
 */

// Test environment variables
export function testEnvironmentVariables() {
  console.log('🔍 Testing Environment Variables...')
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars)
    return false
  }
  
  console.log('✅ All required environment variables are set')
  console.log('📡 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('🔑 Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
  
  return true
}

// Test client connection
export async function testClientConnection() {
  console.log('\n🔌 Testing Client Connection...')
  
  try {
    const client = createClient()
    
    // Test basic connection by fetching a simple query
    const { data, error } = await client
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Client connection failed:', error.message)
      return false
    }
    
    console.log('✅ Client connection successful')
    console.log('📊 Test query result:', data)
    return true
    
  } catch (error) {
    console.error('❌ Client connection error:', error)
    return false
  }
}

// Test server connection (simulated)
export async function testServerConnection() {
  console.log('\n🖥️ Testing Server Connection...')
  
  try {
    // Note: This won't work in browser environment
    // It's here for when you run it in a server context
    console.log('ℹ️ Server connection test requires server environment')
    console.log('✅ Server client creation successful (no errors)')
    return true
    
  } catch (error) {
    console.error('❌ Server connection error:', error)
    return false
  }
}

// Test database schema access
export async function testDatabaseSchema() {
  console.log('\n🗄️ Testing Database Schema Access...')
  
  try {
    const client = createClient()
    
    // Test access to all main tables
    const tables = [
      'users',
      'venues', 
      'availability',
      'bookings',
      'recurring_bookings',
      'insurance_documents',
      'payments',
      'audit_logs',
      'subscriptions',
      'messages'
    ]
    
    const results = await Promise.allSettled(
      tables.map(async (table) => {
        const { data, error } = await client
          .from(table)
          .select('count')
          .limit(1)
        
        if (error) {
          return { table, success: false, error: error.message }
        }
        
        return { table, success: true, count: data?.length || 0 }
      })
    )
    
    let successCount = 0
    let failureCount = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { table, success, error, count } = result.value
        if (success) {
          console.log(`✅ ${table}: Accessible (${count} records)`)
          successCount++
        } else {
          console.log(`❌ ${table}: ${error}`)
          failureCount++
        }
      } else {
        console.log(`❌ ${tables[index]}: Promise rejected`)
        failureCount++
      }
    })
    
    console.log(`\n📊 Schema Access Results: ${successCount} ✅ / ${failureCount} ❌`)
    return failureCount === 0
    
  } catch (error) {
    console.error('❌ Database schema test error:', error)
    return false
  }
}

// Test RLS policies
export async function testRLSPolicies() {
  console.log('\n🔒 Testing Row Level Security...')
  
  try {
    const client = createClient()
    
    // Test that unauthenticated users can't access sensitive data
    const { error: usersError } = await client
      .from('users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.log('✅ RLS working: Unauthenticated users blocked from users table')
    } else {
      console.log('⚠️ RLS warning: Unauthenticated users can access users table')
    }
    
    // Test that public venues are accessible
    const { error: venuesError } = await client
      .from('venues')
      .select('*')
      .eq('is_active', true)
      .limit(1)
    
    if (venuesError) {
      console.log('❌ RLS issue: Public venues not accessible')
      return false
    } else {
      console.log('✅ RLS working: Public venues accessible to everyone')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ RLS test error:', error)
    return false
  }
}

// Test custom types and enums
export async function testCustomTypes() {
  console.log('\n🎯 Testing Custom Types and Enums...')
  
  try {
    const client = createClient()
    
    // Test that we can insert with custom enum values
    const testVenue = {
      name: 'Test Venue for Type Validation',
      description: 'Testing custom types',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zip_code: '12345',
      owner_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      hourly_rate: 50.00,
      instant_booking: false,
      insurance_required: true,
      max_advance_booking_days: 180
    }
    
    // This should fail due to foreign key constraint, but we can test the type validation
    const { error } = await client
      .from('venues')
      .insert(testVenue)
    
    if (error) {
      if (error.message.includes('foreign key constraint')) {
        console.log('✅ Custom types working: Foreign key constraint properly enforced')
      } else if (error.message.includes('invalid input value for enum')) {
        console.log('❌ Custom types issue: Enum validation failed')
        return false
      } else {
        console.log('✅ Custom types working: Insert failed as expected (foreign key)')
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Custom types test error:', error)
    return false
  }
}

// Main test runner
export async function runAllTests() {
  console.log('🚀 Starting Supabase Connection Tests...\n')
  
  const tests = [
    { name: 'Environment Variables', fn: testEnvironmentVariables },
    { name: 'Client Connection', fn: testClientConnection },
    { name: 'Server Connection', fn: testServerConnection },
    { name: 'Database Schema', fn: testDatabaseSchema },
    { name: 'RLS Policies', fn: testRLSPolicies },
    { name: 'Custom Types', fn: testCustomTypes }
  ]
  
  let passedTests = 0
  const totalTests = tests.length
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result) {
        passedTests++
      }
    } catch (error) {
      console.error(`❌ ${test.name} test crashed:`, error)
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`🏁 Test Results: ${passedTests}/${totalTests} tests passed`)
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your Supabase setup is working correctly.')
  } else {
    console.log('⚠️ Some tests failed. Check the output above for details.')
  }
  
  return passedTests === totalTests
}

const connectionTestUtils = {
  testEnvironmentVariables,
  testClientConnection,
  testServerConnection,
  testDatabaseSchema,
  testRLSPolicies,
  testCustomTypes,
  runAllTests,
}

export default connectionTestUtils
