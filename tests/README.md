# Auth Redirect Regression Tests

This directory contains regression tests for the authentication redirect flow changes.

## Test Files

### `auth-redirect-regression.md`
Manual test checklist with 10 test cases covering:
- Default redirect to `/book`
- `returnTo` parameter preservation
- Navigation home link behavior
- AuthRequiredDialog functionality
- Security (open redirect prevention)
- Success message updates
- Role-based behavior (venue owners)
- First-time vs returning users

**Usage**: Follow the test cases step-by-step and mark results in the checklist.

### `auth-redirect.test.ts`
Automated test suite that validates the redirect logic programmatically.

**Usage**: Run with `npm run test:auth-redirect`

## Running the Tests

### Automated Tests
```bash
npm run test:auth-redirect
```

This will run 13 automated tests covering:
- Default redirect behavior
- Valid returnTo handling
- Open redirect prevention (security)
- URL construction logic
- Edge cases (query params, hashes, etc.)

### Manual Tests
1. Open `auth-redirect-regression.md`
2. Follow each test case step-by-step
3. Mark results in the checklist
4. Document any issues in the "Test Execution Log"

## What These Tests Verify

✅ **Default Redirect**: Users redirect to `/book` instead of `/dashboard`  
✅ **returnTo Preservation**: Original destination is preserved through OAuth flow  
✅ **Security**: Malicious redirects are prevented  
✅ **Navigation**: Home link points to `/book` for logged-in users  
✅ **AuthRequiredDialog**: Auto-captures current path or uses explicit returnTo  

## Test Coverage

- **Callback Page**: Redirect logic and returnTo validation
- **Login Page**: returnTo parameter forwarding
- **Register Page**: returnTo parameter forwarding  
- **Navigation Component**: Home link behavior
- **AuthRequiredDialog**: returnTo prop and auto-capture

## Notes

- Manual tests require a running application with Supabase configured
- Automated tests validate logic only (no actual OAuth flow)
- Both test suites should be run before deploying changes


