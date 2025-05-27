# Sprint 3 Test Plan

## Overview
This test plan covers navigation, layout, and theme switching for Sprint 3.

## Test Areas
- Navbar functionality and responsiveness
- Sidebar navigation and collapsibility
- Layout responsiveness (desktop/mobile)
- Theme switching (light/dark mode)
- Routing for main sections (Libraries, Analysis, Search)
- User profile dropdown

## Test Cases

### Navbar
- [ ] Navbar is always visible at the top
- [ ] Logo and navigation links are present
- [ ] User controls (profile/avatar) are visible when logged in
- [ ] Navbar is responsive on mobile (collapses or adapts)

### Sidebar
- [ ] Sidebar is visible on desktop
- [ ] Sidebar can be collapsed/expanded
- [ ] Sidebar navigation links work and highlight active section
- [ ] Sidebar is hidden or accessible via hamburger menu on mobile

### Layout
- [ ] Main content area resizes correctly with sidebar/nav
- [ ] Layout adapts to different screen sizes (mobile, tablet, desktop)
- [ ] No horizontal scroll on mobile

### Theme Switcher
- [ ] Theme switcher toggles between light and dark mode
- [ ] Theme persists across page reloads
- [ ] All UI elements update colors appropriately

### Routing
- [ ] Navigation links route to correct pages (Libraries, Analysis, Search)
- [ ] Browser back/forward works as expected
- [ ] Direct URL access to main sections works

### User Profile Dropdown
- [ ] Clicking avatar/profile opens dropdown
- [ ] Dropdown shows user info and logout option
- [ ] Dropdown closes when clicking outside

## Manual Test Instructions
- Test on Chrome, Firefox, and Safari
- Test on desktop and mobile devices
- Verify accessibility (keyboard navigation, ARIA labels)

## Notes
- Update this plan as new features or edge cases are identified during the sprint. 