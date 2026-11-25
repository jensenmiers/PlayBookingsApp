'use client'

import { useState } from 'react'
import { runAllTests } from '@/lib/supabase/connection-test'

export default function TestSupabasePage() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])
  const [overallResult, setOverallResult] = useState<'pending' | 'success' | 'failure'>('pending')

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])
    setOverallResult('pending')

    // Capture console output
    const originalLog = console.log
    const originalError = console.error
    const logs: string[] = []

    console.log = (...args) => {
      logs.push(args.join(' '))
      originalLog(...args)
    }

    console.error = (...args) => {
      logs.push(`❌ ${args.join(' ')}`)
      originalError(...args)
    }

    try {
      const success = await runAllTests()
      setOverallResult(success ? 'success' : 'failure')
    } catch (error) {
      console.error('Test runner crashed:', error)
      setOverallResult('failure')
    } finally {
      // Restore console
      console.log = originalLog
      console.error = originalError
      
      setTestResults(logs)
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔍 Supabase Connection Tests</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">What These Tests Check:</h2>
        <ul className="text-blue-700 space-y-1 text-sm">
          <li>✅ Environment variables are properly set</li>
          <li>🔌 Client connection to Supabase</li>
          <li>🖥️ Server client creation</li>
          <li>🗄️ Database schema access (all tables)</li>
          <li>🔒 Row Level Security policies</li>
          <li>🎯 Custom types and enums</li>
        </ul>
      </div>

      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
        </button>
      </div>

      {overallResult !== 'pending' && (
        <div className={`mb-6 p-4 rounded-lg ${
          overallResult === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <h3 className={`font-semibold ${
            overallResult === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {overallResult === 'success' ? '🎉 All Tests Passed!' : '⚠️ Some Tests Failed'}
          </h3>
          <p className={`text-sm ${
            overallResult === 'success' ? 'text-green-700' : 'text-red-700'
          }`}>
            {overallResult === 'success' 
              ? 'Your Supabase setup is working correctly!' 
              : 'Check the test output below for details on what failed.'
            }
          </p>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
          <div className="mb-2 text-gray-300">Test Output:</div>
          {testResults.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap">{log}</div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">🔧 Troubleshooting Tips:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Make sure your <code className="bg-gray-200 px-1 rounded">.env.local</code> file has the correct Supabase credentials</li>
          <li>• Verify your Supabase project is active and the database is running</li>
          <li>• Check that you&rsquo;ve run the migration files in your Supabase dashboard</li>
          <li>• Ensure your RLS policies are properly configured</li>
          <li>• Verify your database schema matches the migration files</li>
        </ul>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</h3>
        <ul className="text-yellow-700 space-y-1 text-sm">
          <li>• These tests run in your browser, so they test client-side connections</li>
          <li>• Server-side tests are simulated since they require a server environment</li>
          <li>• Some tests may fail if your database is empty (this is normal)</li>
          <li>• RLS tests expect certain security policies to be in place</li>
        </ul>
      </div>
    </div>
  )
}
