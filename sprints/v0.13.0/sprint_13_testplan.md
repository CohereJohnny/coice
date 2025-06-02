# Sprint 13 Test Plan

## Overview
Test plan for Sprint 13: Admin Panel & User Management features

## Test Environment
- Browser: Chrome (latest), Safari, Firefox
- Viewport: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- Test Users: Admin role, Manager role, Viewer role

## Test Cases

### 1. Admin Panel Access Control

#### TC1.1: Admin Route Protection
- **Precondition**: User logged in with various roles
- **Steps**:
  1. Login as Viewer role
  2. Navigate to /admin
  3. Verify redirect to unauthorized page
  4. Login as Manager role
  5. Navigate to /admin
  6. Verify redirect to unauthorized page
  7. Login as Admin role
  8. Navigate to /admin
  9. Verify access granted
- **Expected**: Only Admin users can access admin panel

#### TC1.2: Admin Navigation
- **Precondition**: Logged in as Admin
- **Steps**:
  1. Navigate to admin panel
  2. Verify sidebar shows admin-specific navigation
  3. Click through each admin section
  4. Verify proper routing and page loading
- **Expected**: All admin navigation items work correctly

### 2. User Management

#### TC2.1: User Listing
- **Precondition**: Multiple users exist in system
- **Steps**:
  1. Navigate to admin users page
  2. Verify user table loads with all users
  3. Check columns: Name, Email, Role, Status, Created Date
  4. Verify pagination works
  5. Test sorting by each column
- **Expected**: User list displays correctly with all features

#### TC2.2: User Search and Filtering
- **Precondition**: Multiple users exist
- **Steps**:
  1. Search by user name
  2. Search by email
  3. Filter by role
  4. Filter by status (active/inactive)
  5. Combine search and filters
  6. Clear filters
- **Expected**: Search and filters work correctly

#### TC2.3: Create New User
- **Precondition**: Admin logged in
- **Steps**:
  1. Click "Create User" button
  2. Fill in user details (name, email, role)
  3. Submit form
  4. Verify success message
  5. Check new user appears in list
  6. Test validation (empty fields, invalid email)
- **Expected**: User creation works with proper validation

#### TC2.4: Edit User
- **Precondition**: Users exist in system
- **Steps**:
  1. Click edit button on a user
  2. Modify user details
  3. Change role
  4. Save changes
  5. Verify success message
  6. Confirm changes reflected in list
- **Expected**: User editing works correctly

#### TC2.5: Delete User
- **Precondition**: Test user exists
- **Steps**:
  1. Click delete button on user
  2. Verify confirmation dialog appears
  3. Cancel deletion
  4. Click delete again and confirm
  5. Verify user removed from list
- **Expected**: User deletion with confirmation works

#### TC2.6: Bulk Operations
- **Precondition**: Multiple users exist
- **Steps**:
  1. Select multiple users via checkboxes
  2. Choose bulk action (disable)
  3. Confirm action
  4. Verify all selected users updated
  5. Test bulk enable
  6. Test bulk role assignment
- **Expected**: Bulk operations work on selected users

### 3. Group Management

#### TC3.1: Create Group
- **Precondition**: Admin logged in
- **Steps**:
  1. Navigate to Groups section
  2. Click "Create Group"
  3. Enter group name and description
  4. Submit form
  5. Verify group created
- **Expected**: Group creation successful

#### TC3.2: Assign Users to Group
- **Precondition**: Groups and users exist
- **Steps**:
  1. Edit a group
  2. Add users to group
  3. Remove users from group
  4. Save changes
  5. Verify user assignments
- **Expected**: User-group assignments work correctly

#### TC3.3: Group Permissions
- **Precondition**: Groups exist
- **Steps**:
  1. Edit group permissions
  2. Assign catalog access
  3. Set feature flags for group
  4. Save permissions
  5. Login as group member
  6. Verify permissions applied
- **Expected**: Group permissions properly enforced

### 4. Feature Flag Management

#### TC4.1: Create Feature Flag
- **Precondition**: Admin logged in
- **Steps**:
  1. Navigate to Feature Flags
  2. Create new flag
  3. Set flag name and description
  4. Set default state
  5. Save flag
- **Expected**: Feature flag created successfully

#### TC4.2: Toggle Feature Flags
- **Precondition**: Feature flags exist
- **Steps**:
  1. Toggle global feature flag
  2. Set user-specific override
  3. Set group-specific override
  4. Verify precedence (user > group > global)
- **Expected**: Feature flag toggles work with correct precedence

### 5. Audit Logging

#### TC5.1: Admin Action Logging
- **Precondition**: Admin logged in
- **Steps**:
  1. Perform various admin actions
  2. Navigate to audit logs
  3. Verify all actions logged
  4. Check log details (user, action, timestamp)
- **Expected**: All admin actions properly logged

#### TC5.2: Audit Log Filtering
- **Precondition**: Audit logs exist
- **Steps**:
  1. Filter by date range
  2. Filter by user
  3. Filter by action type
  4. Search log messages
  5. Export filtered logs
- **Expected**: Audit log filtering and export works

### 6. User Activity Tracking

#### TC6.1: Activity Dashboard
- **Precondition**: Users have activity history
- **Steps**:
  1. View user details
  2. Check activity timeline
  3. Verify login/logout events
  4. Check API usage stats
  5. View image upload history
- **Expected**: Complete activity history displayed

### 7. Admin Dashboard Metrics

#### TC7.1: System Metrics
- **Precondition**: System has usage data
- **Steps**:
  1. View admin dashboard
  2. Check user count widget
  3. Verify active users metric
  4. Check storage usage
  5. View API call statistics
  6. Verify real-time updates
- **Expected**: All metrics display correctly

### 8. Performance Tests

#### TC8.1: Large User List Performance
- **Precondition**: 1000+ users in system
- **Steps**:
  1. Load user list
  2. Measure load time
  3. Test pagination performance
  4. Test search responsiveness
- **Expected**: Page loads in < 2 seconds, search responds in < 500ms

### 9. Security Tests

#### TC9.1: Authorization Bypass Attempts
- **Precondition**: Non-admin user logged in
- **Steps**:
  1. Attempt direct API calls to admin endpoints
  2. Try to access admin URLs directly
  3. Attempt to modify user roles via API
- **Expected**: All unauthorized attempts blocked with 403 response

### 10. Mobile Responsiveness

#### TC10.1: Admin Panel on Mobile
- **Precondition**: Mobile viewport
- **Steps**:
  1. Access admin panel on mobile
  2. Test navigation menu
  3. Check table responsiveness
  4. Test forms on mobile
  5. Verify all features accessible
- **Expected**: Admin panel fully functional on mobile

## Regression Tests

### Previous Features to Verify:
1. Regular user login still works
2. Image upload functionality unchanged
3. Job processing unaffected
4. Search functionality still works
5. Real-time notifications operational

## Known Issues / Limitations
- Document any discovered issues here during testing

## Test Execution Log
- [ ] Test environment setup complete
- [ ] Test data prepared
- [ ] Test cases executed
- [ ] Issues documented
- [ ] Regression testing complete 