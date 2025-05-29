# COICE Project Backlog

This file tracks new feature ideas, non-critical enhancements, and "nice-to-haves" that are deferred from active sprints for future consideration.

---

## Prompt Edit/Delete Functionality

**Added**: Sprint 8  
**Priority**: High  
**Complexity**: Medium  
**Estimated Effort**: 0.5-1 sprint  

### Description
Implement comprehensive edit and delete functionality for prompts with proper permissions and safety checks:
- Edit prompt name, content, and type
- Delete prompts with dependency checking
- Permission-based access control
- Toast notifications using Sonner
- Real-time list refresh after operations

### Technical Considerations
- **Permission System**: Only creators and admins can edit/delete prompts
- **Dependency Checking**: Prevent deletion of prompts used in active pipelines
- **Database Operations**: Use service role client to bypass RLS restrictions
- **UI Integration**: Consistent with pipeline management patterns
- **Form Validation**: Proper validation for prompt content and type changes
- **Error Handling**: Comprehensive error messages and user feedback

### User Stories
- As a prompt creator, I want to edit my prompts to improve their effectiveness
- As a prompt creator, I want to delete prompts I no longer need
- As a manager, I want to edit any prompt to maintain quality standards
- As a user, I want to be warned if I try to delete a prompt that's being used by pipelines
- As a user, I want immediate feedback when operations succeed or fail

### Implementation Tasks
1. Add edit/delete buttons to prompt list actions dropdown
2. Create prompt edit form (reuse/extend existing PromptForm)
3. Implement PUT endpoint for prompt updates
4. Implement DELETE endpoint with dependency checking
5. Add refresh mechanism to PromptList component
6. Integrate Sonner toast notifications
7. Add permission checks in UI and API
8. Handle type conversion issues (similar to pipeline fixes)

### Dependencies
- Prompt management system (✅ completed in Sprint 8)
- User permission system (✅ available)
- Pipeline system (✅ completed in Sprint 8) - for dependency checking
- Sonner integration (✅ available)

### Notes
- Follow the same patterns established in pipeline management for consistency
- Ensure proper error handling and user feedback
- Consider impact on pipeline integrity when editing prompts

---

## Prompt Versioning System

**Added**: Sprint 8  
**Priority**: Medium  
**Complexity**: High  
**Estimated Effort**: 1-2 sprints  

### Description
Implement a comprehensive versioning system for prompts that allows users to:
- Track changes to prompts over time
- Revert to previous versions
- Compare different versions
- Maintain audit trails for prompt evolution

### Technical Considerations
- **Database Schema**: Need to design version storage (separate table vs. JSON history)
- **UI/UX Design**: Version comparison interface, rollback workflows, version navigation
- **Performance**: How to handle large version histories efficiently
- **Storage**: Optimization for storing multiple versions without excessive storage growth
- **Permissions**: Who can create versions, rollback, etc.
- **Pipeline Impact**: How versioning affects existing pipelines using those prompts

### User Stories
- As a prompt creator, I want to see the history of changes I've made to a prompt
- As a manager, I want to rollback a prompt to a previous version if the current one isn't working
- As an analyst, I want to compare two versions of a prompt to understand what changed
- As an admin, I want to see who made changes and when for audit purposes

### Dependencies
- Prompt management system (✅ completed in Sprint 8)
- User permission system (✅ available)
- Pipeline system integration (✅ completed in Sprint 8)

### Notes
This feature requires careful design consideration around:
1. How versions are stored and retrieved efficiently
2. Integration with the existing pipeline system
3. User interface for version management
4. Migration strategy for existing prompts

---
