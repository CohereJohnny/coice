# Sprint 6 Test Plan - Image Viewing: Card & List Views

## Overview
This test plan covers the Card and List view components for image browsing, including metadata display, view switching, and responsive design.

## Test Environment Setup
- Browser: Chrome, Firefox, Safari (latest versions)
- Devices: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- Test Data: Library with 50+ images of various formats (JPEG, PNG, WebP)
- Network Conditions: Fast 3G, Slow 3G, Offline

## Test Cases

### 1. Card View Functionality

#### TC-CV-001: Card Grid Layout
**Objective:** Verify card view displays images in responsive grid
**Steps:**
1. Navigate to library with images
2. Select Card view mode
3. Verify images display in grid layout
4. Resize browser window
5. Verify grid adapts responsively

**Expected Results:**
- Images display in clean grid layout
- Grid columns adjust based on screen size
- Proper spacing between cards
- No layout breaks or overlaps

#### TC-CV-002: Thumbnail Display
**Objective:** Verify thumbnails load and display correctly
**Steps:**
1. Open Card view with 20+ images
2. Scroll through all images
3. Verify thumbnail quality and aspect ratios
4. Check loading states

**Expected Results:**
- Thumbnails load progressively
- Proper aspect ratios maintained
- Loading skeletons show during load
- No broken image icons

#### TC-CV-003: Hover Effects
**Objective:** Verify hover interactions work properly
**Steps:**
1. Hover over various image cards
2. Verify hover effects activate
3. Check metadata overlay appears
4. Test hover on mobile (touch)

**Expected Results:**
- Smooth hover animations
- Metadata overlay shows filename, size, date
- Hover effects work consistently
- Touch interactions work on mobile

#### TC-CV-004: Image Selection
**Objective:** Verify image selection functionality
**Steps:**
1. Click on image cards to select
2. Use Ctrl+click for multi-select
3. Use Shift+click for range select
4. Verify selection state persistence

**Expected Results:**
- Single selection works
- Multi-select with Ctrl works
- Range select with Shift works
- Selection state visually clear

### 2. List View Functionality

#### TC-LV-001: Table Display
**Objective:** Verify TanStack Table displays correctly
**Steps:**
1. Switch to List view
2. Verify table columns display
3. Check thumbnail column
4. Verify metadata columns

**Expected Results:**
- Table renders with all columns
- Thumbnails display in first column
- Metadata columns show correct data
- Table is properly styled

#### TC-LV-002: Column Sorting
**Objective:** Verify all columns can be sorted
**Steps:**
1. Click on each column header
2. Verify ascending sort
3. Click again for descending sort
4. Test with different data types

**Expected Results:**
- All columns sortable
- Sort indicators show correctly
- Data sorts properly (alphabetical, numerical, date)
- Sort state persists during session

#### TC-LV-003: Row Selection
**Objective:** Verify row selection in table
**Steps:**
1. Click on table rows
2. Use checkbox selection
3. Test select all functionality
4. Verify selection feedback

**Expected Results:**
- Rows select on click
- Checkboxes work independently
- Select all works correctly
- Selection state clearly visible

#### TC-LV-004: Table Pagination
**Objective:** Verify pagination for large datasets
**Steps:**
1. Load library with 100+ images
2. Verify pagination controls appear
3. Navigate between pages
4. Test items per page selector

**Expected Results:**
- Pagination appears for large datasets
- Page navigation works smoothly
- Items per page selector functions
- Page state persists

### 3. View Switching

#### TC-VS-001: View Toggle
**Objective:** Verify switching between Card and List views
**Steps:**
1. Start in Card view
2. Click List view toggle
3. Verify view switches
4. Switch back to Card view

**Expected Results:**
- View switches smoothly
- No data loss during switch
- Toggle state reflects current view
- Transition is smooth

#### TC-VS-002: View State Persistence
**Objective:** Verify view preference persists
**Steps:**
1. Switch to List view
2. Navigate away from page
3. Return to library
4. Verify view state maintained

**Expected Results:**
- View preference saved in URL
- State persists across navigation
- Correct view loads on return
- No flash of wrong view

### 4. Metadata Display

#### TC-MD-001: Metadata Accuracy
**Objective:** Verify metadata displays correctly
**Steps:**
1. Upload images with known metadata
2. View in both Card and List views
3. Compare displayed metadata with actual
4. Test various image formats

**Expected Results:**
- Filename displays correctly
- File size accurate
- Date information correct
- EXIF data when available

#### TC-MD-002: Metadata Tooltips
**Objective:** Verify metadata tooltips in Card view
**Steps:**
1. Hover over images in Card view
2. Verify tooltip appears
3. Check tooltip content
4. Test tooltip positioning

**Expected Results:**
- Tooltips appear on hover
- Content is accurate and formatted
- Tooltips position correctly
- No tooltip overlap issues

### 5. Performance Testing

#### TC-PF-001: Large Dataset Performance
**Objective:** Verify performance with many images
**Steps:**
1. Load library with 500+ images
2. Measure initial load time
3. Test scrolling performance
4. Monitor memory usage

**Expected Results:**
- Initial load < 3 seconds
- Smooth scrolling performance
- Memory usage reasonable
- No performance degradation

#### TC-PF-002: Lazy Loading
**Objective:** Verify lazy loading works correctly
**Steps:**
1. Load library with many images
2. Monitor network requests
3. Scroll through images
4. Verify images load on demand

**Expected Results:**
- Only visible images load initially
- Images load as they come into view
- Network requests optimized
- No unnecessary loading

### 6. Responsive Design

#### TC-RD-001: Mobile Card View
**Objective:** Verify Card view on mobile devices
**Steps:**
1. Open Card view on mobile
2. Test touch interactions
3. Verify grid layout
4. Test image selection

**Expected Results:**
- Grid adapts to mobile screen
- Touch interactions work
- Images remain accessible
- Selection works with touch

#### TC-RD-002: Mobile List View
**Objective:** Verify List view on mobile devices
**Steps:**
1. Switch to List view on mobile
2. Test horizontal scrolling
3. Verify column visibility
4. Test touch interactions

**Expected Results:**
- Table scrolls horizontally
- Important columns visible
- Touch interactions smooth
- Readable on small screens

### 7. Error Handling

#### TC-EH-001: Image Load Failures
**Objective:** Verify handling of failed image loads
**Steps:**
1. Simulate network failures
2. Test with corrupted images
3. Verify error states
4. Test recovery mechanisms

**Expected Results:**
- Graceful error handling
- Placeholder for failed images
- Error messages when appropriate
- Retry mechanisms work

#### TC-EH-002: Empty States
**Objective:** Verify empty library handling
**Steps:**
1. Navigate to empty library
2. Verify empty state display
3. Test upload prompts
4. Verify messaging

**Expected Results:**
- Clear empty state message
- Upload prompts visible
- Helpful guidance provided
- No broken layouts

## Acceptance Criteria

### Functional Requirements
- [ ] Card view displays images in responsive grid
- [ ] List view shows sortable table with metadata
- [ ] View switching works smoothly
- [ ] Image selection works in both views
- [ ] Metadata displays accurately
- [ ] Performance acceptable with large datasets

### Non-Functional Requirements
- [ ] Load time < 3 seconds for 100 images
- [ ] Smooth scrolling at 60fps
- [ ] Mobile responsive design
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Cross-browser compatibility
- [ ] Error handling for edge cases

## Test Data Requirements
- Library with 10-20 small images (< 1MB each)
- Library with 50+ medium images (1-5MB each)
- Library with 100+ mixed format images
- Images with various EXIF metadata
- Images without metadata
- Corrupted/invalid image files

## Risk Areas
- Performance with very large image sets
- Memory usage on mobile devices
- Network handling for slow connections
- Browser compatibility for advanced features
- Touch interaction edge cases 