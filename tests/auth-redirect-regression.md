# Auth Redirect Regression Test Suite

## Overview
This test suite verifies that the authentication flow correctly redirects users to `/book` instead of `/dashboard`, and that the `returnTo` parameter is properly preserved through the OAuth flow.

## Test Cases

### TC-1: Default Redirect to /book
**Objective**: Verify that after successful authentication, users are redirected to `/book` by default.

**Steps**:
1. Navigate to `/auth/login` (without any query parameters)
2. Complete Google OAuth authentication
3. Wait for callback to process
4. Observe redirect destination

**Expected Result**: 
- User is redirected to `/book` after successful authentication
- Success message displays: "Let's find you a venue to book..."

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-2: returnTo Parameter Preservation
**Objective**: Verify that the `returnTo` parameter is preserved through the OAuth flow.

**Steps**:
1. Navigate to `/auth/login?returnTo=/book/venue/123`
2. Complete Google OAuth authentication
3. Wait for callback to process
4. Observe redirect destination

**Expected Result**: 
- User is redirected to `/book/venue/123` (the returnTo value)
- The returnTo parameter is properly encoded and passed through OAuth callback

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-3: Register Page returnTo Forwarding
**Objective**: Verify that the register page forwards `returnTo` parameter correctly.

**Steps**:
1. Navigate to `/auth/register?returnTo=/dashboard/bookings`
2. Complete Google OAuth authentication
3. Wait for callback to process
4. Observe redirect destination

**Expected Result**: 
- User is redirected to `/dashboard/bookings` after registration
- The returnTo parameter is preserved through the OAuth flow

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-4: Navigation Home Link for Logged-In Users
**Objective**: Verify that the "Home" link in navigation points to `/book` for authenticated users.

**Steps**:
1. Log in to the application
2. Observe the navigation bar
3. Click the "Home" link

**Expected Result**: 
- The "Home" link navigates to `/book`
- The link is visible and functional

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-5: AuthRequiredDialog returnTo Auto-Capture
**Objective**: Verify that AuthRequiredDialog automatically captures the current pathname when no explicit returnTo is provided.

**Steps**:
1. Navigate to `/book/venue/456` (while logged out)
2. Trigger an action that requires authentication (e.g., click "Book Now")
3. Observe the AuthRequiredDialog
4. Click "Sign In" button
5. Complete authentication
6. Observe redirect destination

**Expected Result**: 
- The login URL includes `?returnTo=/book/venue/456`
- After authentication, user is redirected back to `/book/venue/456`

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-6: AuthRequiredDialog Explicit returnTo
**Objective**: Verify that AuthRequiredDialog uses explicit returnTo prop when provided.

**Steps**:
1. Navigate to any page (e.g., `/book`)
2. Trigger AuthRequiredDialog with explicit `returnTo="/dashboard/settings"`
3. Click "Sign In" button
4. Complete authentication
5. Observe redirect destination

**Expected Result**: 
- The login URL includes `?returnTo=/dashboard/settings`
- After authentication, user is redirected to `/dashboard/settings` (not the current page)

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-7: Security - Open Redirect Prevention
**Objective**: Verify that malicious returnTo values are rejected.

**Test Cases**:
- `returnTo=//evil.com` - Should redirect to `/book` (default)
- `returnTo=http://evil.com` - Should redirect to `/book` (default)
- `returnTo=https://evil.com` - Should redirect to `/book` (default)
- `returnTo=/book/venue/123` - Should redirect to `/book/venue/123` (valid)

**Steps**:
1. Manually construct callback URL: `/auth/callback?returnTo=//evil.com`
2. Complete authentication
3. Observe redirect destination

**Expected Result**: 
- Only relative paths starting with `/` (but not `//`) are accepted
- Malicious URLs are rejected and default to `/book`

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-8: Success Message Update
**Objective**: Verify that the success message has been updated.

**Steps**:
1. Complete authentication
2. Observe the success screen message

**Expected Result**: 
- Message displays: "Let's find you a venue to book..."
- Message does NOT display: "Redirecting you to your dashboard..."

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-9: Venue Owner Redirect
**Objective**: Verify that venue owners also redirect to `/book` (not dashboard).

**Steps**:
1. Log in as a venue owner (user with `is_venue_owner: true`)
2. Complete authentication
3. Observe redirect destination

**Expected Result**: 
- Venue owner is redirected to `/book` (same as renters)
- No special handling based on user role

**Status**: ⬜ Pass / ⬜ Fail

---

### TC-10: First-Time vs Returning User
**Objective**: Verify that both first-time sign-ups and returning users have the same redirect behavior.

**Steps**:
1. **First-time user**: Create a new account and complete authentication
2. **Returning user**: Log out, then log back in
3. Observe redirect destinations for both

**Expected Result**: 
- Both users redirect to `/book` (or returnTo if specified)
- No difference in behavior between first-time and returning users

**Status**: ⬜ Pass / ⬜ Fail

---

## Test Execution Log

| Test Case | Date | Tester | Result | Notes |
|-----------|------|--------|--------|-------|
| TC-1 | | | | |
| TC-2 | | | | |
| TC-3 | | | | |
| TC-4 | | | | |
| TC-5 | | | | |
| TC-6 | | | | |
| TC-7 | | | | |
| TC-8 | | | | |
| TC-9 | | | | |
| TC-10 | | | | |

## Regression Notes

- **Previous Behavior**: Users were redirected to `/dashboard` after authentication
- **New Behavior**: Users are redirected to `/book` after authentication (or returnTo if specified)
- **Breaking Changes**: None - this is a UX improvement, not a breaking change
- **Dependencies**: Requires Supabase authentication to be configured and working


