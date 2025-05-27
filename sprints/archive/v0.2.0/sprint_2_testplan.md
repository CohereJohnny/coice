# Sprint 2 Test Plan

## Test Objectives
Verify that Supabase integration is properly implemented, authentication system works correctly, and database schema is functional with proper security policies.

## Test Environment
- Supabase project with Auth, PostgreSQL, and Real-time enabled
- Next.js development environment
- Modern web browser with developer tools
- Test user accounts with different roles

## Database Schema Tests

### TC-001: Database Connection
**Objective:** Verify Supabase connection is working
**Steps:**
1. Check environment variables are properly configured
2. Test Supabase client initialization
3. Verify database connection from Next.js app
4. Check real-time subscription capability
**Expected Result:** Successful connection to Supabase with all services available

### TC-002: Table Creation
**Objective:** Verify all database tables are created correctly
**Steps:**
1. Run database migration
2. Check that all 14 tables exist in the database
3. Verify table schemas match datamodel.md specifications
4. Check foreign key relationships are properly established
**Expected Result:** All tables created with correct structure and relationships

### TC-003: Row Level Security Policies
**Objective:** Verify RLS policies are properly implemented
**Steps:**
1. Test access control for each table
2. Verify role-based permissions (admin, manager, end_user)
3. Test data isolation between users
4. Check that unauthorized access is blocked
**Expected Result:** RLS policies enforce proper access control

## Authentication Tests

### TC-004: User Registration
**Objective:** Verify user registration functionality
**Steps:**
1. Navigate to registration page
2. Fill in valid user details
3. Submit registration form
4. Check email verification process
5. Verify user profile is created
**Expected Result:** User successfully registered with profile created

### TC-005: Email/Password Login
**Objective:** Verify email/password authentication
**Steps:**
1. Navigate to login page
2. Enter valid credentials
3. Submit login form
4. Verify successful authentication
5. Check auth state is properly set
**Expected Result:** User successfully logged in with auth state updated

### TC-006: Google OAuth Login
**Objective:** Verify Google OAuth integration
**Steps:**
1. Click Google OAuth login button
2. Complete Google authentication flow
3. Verify user is redirected back to app
4. Check that user profile is created/updated
5. Verify auth state is properly set
**Expected Result:** Google OAuth login works seamlessly

### TC-007: Logout Functionality
**Objective:** Verify logout process
**Steps:**
1. Log in as a user
2. Click logout button
3. Verify auth state is cleared
4. Check that protected routes are no longer accessible
5. Verify user is redirected to login page
**Expected Result:** User successfully logged out with auth state cleared

### TC-008: Password Reset
**Objective:** Verify password reset functionality
**Steps:**
1. Navigate to password reset page
2. Enter email address
3. Check password reset email is sent
4. Follow reset link and set new password
5. Verify login with new password works
**Expected Result:** Password reset process works correctly

## Role-Based Access Control Tests

### TC-009: Admin Role Access
**Objective:** Verify admin role permissions
**Steps:**
1. Log in as admin user
2. Access admin-only features
3. Verify user management capabilities
4. Check feature flag management access
5. Test catalog/library creation permissions
**Expected Result:** Admin has full access to all features

### TC-010: Manager Role Access
**Objective:** Verify manager role permissions
**Steps:**
1. Log in as manager user
2. Test catalog/library creation
3. Verify prompt/pipeline management access
4. Check job submission capabilities
5. Verify no access to admin-only features
**Expected Result:** Manager has appropriate permissions without admin access

### TC-011: End User Role Access
**Objective:** Verify end user role permissions
**Steps:**
1. Log in as end user
2. Test library browsing capabilities
3. Verify job submission for predefined pipelines
4. Check no access to management features
5. Verify read-only access to appropriate data
**Expected Result:** End user has limited, appropriate access

## Protected Route Tests

### TC-012: Route Protection
**Objective:** Verify protected routes require authentication
**Steps:**
1. Navigate to protected routes while logged out
2. Verify redirect to login page
3. Log in and verify access is granted
4. Test role-based route restrictions
**Expected Result:** Protected routes properly enforce authentication

### TC-013: Role-Based Route Access
**Objective:** Verify role-based route restrictions
**Steps:**
1. Test admin-only routes with different user roles
2. Verify manager-only routes with end user account
3. Check appropriate error messages for unauthorized access
4. Test route guards work correctly
**Expected Result:** Role-based route access properly enforced

## API Endpoint Tests

### TC-014: Authentication API
**Objective:** Verify authentication API endpoints
**Steps:**
1. Test POST /api/auth/login endpoint
2. Test POST /api/auth/register endpoint
3. Test POST /api/auth/logout endpoint
4. Test POST /api/auth/reset-password endpoint
5. Verify proper error handling for invalid requests
**Expected Result:** All auth API endpoints work correctly

### TC-015: Profile API
**Objective:** Verify user profile API endpoints
**Steps:**
1. Test GET /api/profile endpoint
2. Test PUT /api/profile endpoint
3. Test role assignment API (admin-only)
4. Verify proper authorization checks
**Expected Result:** Profile API endpoints work with proper authorization

## State Management Tests

### TC-016: Auth State Persistence
**Objective:** Verify auth state persists across sessions
**Steps:**
1. Log in as a user
2. Refresh the page
3. Close and reopen browser
4. Verify auth state is maintained
5. Test auth state synchronization
**Expected Result:** Auth state properly persists and synchronizes

### TC-017: Auth State Updates
**Objective:** Verify auth state updates correctly
**Steps:**
1. Test login state updates
2. Test logout state updates
3. Test profile updates reflect in auth state
4. Verify role changes update auth state
**Expected Result:** Auth state updates correctly for all operations

## Error Handling Tests

### TC-018: Authentication Errors
**Objective:** Verify proper error handling for auth failures
**Steps:**
1. Test login with invalid credentials
2. Test registration with existing email
3. Test password reset with invalid email
4. Verify user-friendly error messages
**Expected Result:** Proper error handling with clear user feedback

### TC-019: Database Errors
**Objective:** Verify database error handling
**Steps:**
1. Test database connection failures
2. Test RLS policy violations
3. Test invalid data submissions
4. Verify graceful error handling
**Expected Result:** Database errors handled gracefully

## Performance Tests

### PT-001: Authentication Performance
**Objective:** Verify authentication operations are performant
**Steps:**
1. Measure login response time
2. Test auth state loading time
3. Measure database query performance
4. Test concurrent user authentication
**Expected Result:** Authentication operations complete in under 2 seconds

### PT-002: Database Performance
**Objective:** Verify database operations are performant
**Steps:**
1. Test table query performance
2. Measure RLS policy evaluation time
3. Test concurrent database operations
4. Verify real-time subscription performance
**Expected Result:** Database operations complete in under 1 second

## Security Tests

### ST-001: SQL Injection Protection
**Objective:** Verify protection against SQL injection
**Steps:**
1. Test SQL injection attempts in auth forms
2. Test malicious input in API endpoints
3. Verify parameterized queries are used
4. Test RLS policy bypass attempts
**Expected Result:** SQL injection attempts are blocked

### ST-002: Session Security
**Objective:** Verify session security measures
**Steps:**
1. Test JWT token validation
2. Verify token expiration handling
3. Test session hijacking protection
4. Check secure cookie settings
**Expected Result:** Sessions are properly secured

## Integration Tests

### IT-001: End-to-End Auth Flow
**Objective:** Verify complete authentication workflow
**Steps:**
1. Register new user
2. Verify email and activate account
3. Log in and access protected features
4. Update profile information
5. Log out and verify session cleanup
**Expected Result:** Complete auth workflow functions correctly

### IT-002: Role-Based Workflow
**Objective:** Verify role-based feature access
**Steps:**
1. Test admin creating catalogs and users
2. Test manager creating libraries and pipelines
3. Test end user browsing and submitting jobs
4. Verify proper data isolation between users
**Expected Result:** Role-based workflows function correctly

## Acceptance Criteria
- [ ] All database tables created with proper schema
- [ ] RLS policies properly enforce access control
- [ ] User registration and login work correctly
- [ ] Google OAuth integration functional
- [ ] Role-based access control implemented
- [ ] Protected routes require authentication
- [ ] Auth state persists across sessions
- [ ] Error handling provides clear feedback
- [ ] Performance meets requirements (< 2s auth operations)
- [ ] Security measures protect against common attacks

## Test Execution Notes
*Notes from test execution will be added here* 