/**
 * Auth Redirect Regression Test
 * 
 * This test verifies the logic for redirect handling in the authentication flow.
 * Run with: tsx tests/auth-redirect.test.ts
 */

// Test utility functions for redirect logic validation

/**
 * Validates returnTo parameter (matches callback page logic)
 */
function validateReturnTo(returnTo: string | null): string {
  const defaultPath = '/book'
  
  if (!returnTo) {
    return defaultPath
  }
  
  // Security check: only allow relative paths starting with / (but not //)
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo
  }
  
  return defaultPath
}

/**
 * Constructs callback URL with returnTo parameter (matches login/register logic)
 */
function constructCallbackUrl(returnTo: string | null, origin: string = 'http://localhost:3000'): string {
  if (returnTo) {
    return `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`
  }
  return `${origin}/auth/callback`
}

/**
 * Constructs login URL with returnTo parameter (matches AuthRequiredDialog logic)
 */
function constructLoginUrl(returnTo: string | null, currentPath: string = '/'): string {
  const redirectPath = returnTo || currentPath
  if (redirectPath) {
    return `/auth/login?returnTo=${encodeURIComponent(redirectPath)}`
  }
  return '/auth/login'
}

// Test Cases

interface TestCase {
  name: string
  fn: () => boolean
}

const tests: TestCase[] = []

// Test 1: Default redirect to /book
tests.push({
  name: 'Default redirect should be /book',
  fn: () => {
    const result = validateReturnTo(null)
    return result === '/book'
  }
})

// Test 2: Valid returnTo parameter
tests.push({
  name: 'Valid returnTo should be preserved',
  fn: () => {
    const result = validateReturnTo('/book/venue/123')
    return result === '/book/venue/123'
  }
})

// Test 3: Open redirect prevention - double slash
tests.push({
  name: 'Double slash returnTo should be rejected',
  fn: () => {
    const result = validateReturnTo('//evil.com')
    return result === '/book'
  }
})

// Test 4: Open redirect prevention - http protocol
tests.push({
  name: 'HTTP protocol returnTo should be rejected',
  fn: () => {
    const result = validateReturnTo('http://evil.com')
    return result === '/book'
  }
})

// Test 5: Open redirect prevention - https protocol
tests.push({
  name: 'HTTPS protocol returnTo should be rejected',
  fn: () => {
    const result = validateReturnTo('https://evil.com')
    return result === '/book'
  }
})

// Test 6: Callback URL construction without returnTo
tests.push({
  name: 'Callback URL without returnTo',
  fn: () => {
    const result = constructCallbackUrl(null)
    return result === 'http://localhost:3000/auth/callback'
  }
})

// Test 7: Callback URL construction with returnTo
tests.push({
  name: 'Callback URL with returnTo should encode parameter',
  fn: () => {
    const result = constructCallbackUrl('/book/venue/123')
    return result === 'http://localhost:3000/auth/callback?returnTo=%2Fbook%2Fvenue%2F123'
  }
})

// Test 8: Login URL construction without returnTo
tests.push({
  name: 'Login URL without returnTo',
  fn: () => {
    const result = constructLoginUrl(null, '/')
    return result === '/auth/login?returnTo=%2F'
  }
})

// Test 9: Login URL with explicit returnTo
tests.push({
  name: 'Login URL with explicit returnTo should use it',
  fn: () => {
    const result = constructLoginUrl('/dashboard/settings', '/book')
    return result === '/auth/login?returnTo=%2Fdashboard%2Fsettings'
  }
})

// Test 10: Login URL auto-capture current path
tests.push({
  name: 'Login URL should auto-capture current path when returnTo not provided',
  fn: () => {
    const result = constructLoginUrl(null, '/book/venue/456')
    return result === '/auth/login?returnTo=%2Fbook%2Fvenue%2F456'
  }
})

// Test 11: Edge case - root path
tests.push({
  name: 'Root path returnTo should be valid',
  fn: () => {
    const result = validateReturnTo('/')
    return result === '/'
  }
})

// Test 12: Edge case - path with query params
tests.push({
  name: 'Path with query params should be valid',
  fn: () => {
    const result = validateReturnTo('/book?venue=123&date=2024-01-01')
    return result === '/book?venue=123&date=2024-01-01'
  }
})

// Test 13: Edge case - path with hash
tests.push({
  name: 'Path with hash should be valid',
  fn: () => {
    const result = validateReturnTo('/book#section')
    return result === '/book#section'
  }
})

// Run tests
console.log('🧪 Running Auth Redirect Regression Tests\n')
console.log('=' .repeat(60))

let passed = 0
let failed = 0
const failures: string[] = []

tests.forEach((test, index) => {
  try {
    const result = test.fn()
    if (result) {
      console.log(`✅ Test ${index + 1}: ${test.name}`)
      passed++
    } else {
      console.log(`❌ Test ${index + 1}: ${test.name}`)
      failed++
      failures.push(test.name)
    }
  } catch (error) {
    console.log(`❌ Test ${index + 1}: ${test.name}`)
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    failed++
    failures.push(test.name)
  }
})

console.log('=' .repeat(60))
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failures.length > 0) {
  console.log('\n❌ Failed Tests:')
  failures.forEach((failure, index) => {
    console.log(`   ${index + 1}. ${failure}`)
  })
  process.exit(1)
} else {
  console.log('\n✅ All tests passed!')
  process.exit(0)
}

