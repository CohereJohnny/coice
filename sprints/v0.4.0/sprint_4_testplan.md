# Sprint 4 Test Plan

## Test Objectives
Verify catalog and library management functionality, role-based permissions, and admin panel features work correctly across all user roles.

## Test Environment Setup
- [ ] Ensure test users exist for each role (Admin, Manager, Viewer)
- [ ] Verify authentication system is working
- [ ] Confirm database schema is up to date
- [ ] Test with clean database state

## Test Cases

### 1. Catalog Management Tests

#### 1.1 Catalog Creation (Manager Role)
- [ ] **TC-001**: Manager can create new catalog with valid data
- [ ] **TC-002**: Manager cannot create catalog with duplicate name
- [ ] **TC-003**: Manager can add description and metadata to catalog
- [ ] **TC-004**: Viewer cannot access catalog creation interface
- [ ] **TC-005**: Form validation works for required fields

#### 1.2 Catalog Editing (Manager Role)
- [ ] **TC-006**: Manager can edit existing catalog details
- [ ] **TC-007**: Manager can update catalog description
- [ ] **TC-008**: Changes are saved and reflected immediately
- [ ] **TC-009**: Viewer cannot edit catalog details

#### 1.3 Catalog Deletion (Manager Role)
- [ ] **TC-010**: Manager can delete empty catalog
- [ ] **TC-011**: Confirmation dialog appears before deletion
- [ ] **TC-012**: Catalog with libraries shows warning before deletion
- [ ] **TC-013**: Viewer cannot delete catalogs

### 2. Library Management Tests

#### 2.1 Library Creation
- [ ] **TC-014**: User can create root-level library in accessible catalog
- [ ] **TC-015**: User can create nested library with parent selection
- [ ] **TC-016**: Library hierarchy is correctly established
- [ ] **TC-017**: User cannot create library in inaccessible catalog

#### 2.2 Library Hierarchy
- [ ] **TC-018**: Library tree displays correct parent-child relationships
- [ ] **TC-019**: Nested libraries show proper indentation
- [ ] **TC-020**: Expand/collapse functionality works for library branches
- [ ] **TC-021**: Maximum nesting depth is enforced (if applicable)

#### 2.3 Library Operations
- [ ] **TC-022**: User can edit library details
- [ ] **TC-023**: User can move library to different parent
- [ ] **TC-024**: Library deletion removes all child libraries
- [ ] **TC-025**: Confirmation required for library deletion

### 3. Sidebar Navigation Tests

#### 3.1 Catalog Display
- [ ] **TC-026**: Sidebar shows only accessible catalogs for user
- [ ] **TC-027**: Catalog sections are expandable/collapsible
- [ ] **TC-028**: Catalog icons and names display correctly
- [ ] **TC-029**: Context menus appear on right-click (if implemented)

#### 3.2 Library Navigation
- [ ] **TC-030**: Library tree navigation works correctly
- [ ] **TC-031**: Clicking library navigates to library view
- [ ] **TC-032**: Breadcrumb navigation shows current location
- [ ] **TC-033**: Library icons indicate hierarchy level

### 4. Permission System Tests

#### 4.1 Role-Based Access Control
- [ ] **TC-034**: Admin can access all catalogs and libraries
- [ ] **TC-035**: Manager can manage assigned catalogs only
- [ ] **TC-036**: Viewer can only view accessible content
- [ ] **TC-037**: API endpoints enforce role permissions

#### 4.2 Catalog Access Restrictions
- [ ] **TC-038**: Users cannot access unauthorized catalogs
- [ ] **TC-039**: API returns appropriate error for unauthorized access
- [ ] **TC-040**: UI hides inaccessible catalog options
- [ ] **TC-041**: Permission changes take effect immediately

### 5. Admin Panel Tests

#### 5.1 User Management Interface
- [ ] **TC-042**: Admin can view list of all users
- [ ] **TC-043**: User list shows roles and status correctly
- [ ] **TC-044**: Admin can search/filter users
- [ ] **TC-045**: Non-admin users cannot access admin panel

#### 5.2 User Operations
- [ ] **TC-046**: Admin can create new user accounts
- [ ] **TC-047**: Admin can assign/change user roles
- [ ] **TC-048**: Admin can edit user details
- [ ] **TC-049**: Admin can deactivate/delete users
- [ ] **TC-050**: User role changes affect permissions immediately

### 6. UI/UX Tests

#### 6.1 Responsive Design
- [ ] **TC-051**: Catalog/library interfaces work on mobile devices
- [ ] **TC-052**: Sidebar navigation adapts to screen size
- [ ] **TC-053**: Forms are usable on tablet devices
- [ ] **TC-054**: Touch interactions work properly

#### 6.2 User Experience
- [ ] **TC-055**: Loading states appear during operations
- [ ] **TC-056**: Error messages are clear and helpful
- [ ] **TC-057**: Success feedback is provided for actions
- [ ] **TC-058**: Confirmation dialogs prevent accidental actions

### 7. API Integration Tests

#### 7.1 Catalog API
- [ ] **TC-059**: GET /api/catalogs returns user's accessible catalogs
- [ ] **TC-060**: POST /api/catalogs creates catalog with proper validation
- [ ] **TC-061**: PUT /api/catalogs/:id updates catalog correctly
- [ ] **TC-062**: DELETE /api/catalogs/:id removes catalog and dependencies

#### 7.2 Library API
- [ ] **TC-063**: GET /api/libraries returns library hierarchy
- [ ] **TC-064**: POST /api/libraries creates library with parent relationship
- [ ] **TC-065**: PUT /api/libraries/:id updates library details
- [ ] **TC-066**: DELETE /api/libraries/:id handles cascade deletion

## Performance Tests
- [ ] **PT-001**: Catalog listing loads within 2 seconds
- [ ] **PT-002**: Library tree renders quickly for 100+ libraries
- [ ] **PT-003**: Permission checks don't significantly impact response time
- [ ] **PT-004**: Admin panel loads user list efficiently

## Security Tests
- [ ] **ST-001**: SQL injection attempts are prevented
- [ ] **ST-002**: Cross-site scripting (XSS) is prevented
- [ ] **ST-003**: Authentication tokens are properly validated
- [ ] **ST-004**: Role escalation attempts are blocked

## Browser Compatibility
- [ ] **BC-001**: Chrome (latest version)
- [ ] **BC-002**: Firefox (latest version)
- [ ] **BC-003**: Safari (latest version)
- [ ] **BC-004**: Edge (latest version)

## Test Completion Criteria
- [ ] All test cases pass
- [ ] No critical bugs identified
- [ ] Performance meets acceptable thresholds
- [ ] Security vulnerabilities addressed
- [ ] Cross-browser compatibility confirmed

## Notes
*Test execution notes and results will be documented here* 