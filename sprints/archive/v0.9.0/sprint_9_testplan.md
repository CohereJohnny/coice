# Sprint 9 Test Plan

## Overview
Test plan for Cohere AI Integration & Job Foundation sprint, covering API integration, job submission, processing, and monitoring.

## Test Environment Setup
- [ ] Cohere API key configured in environment
- [ ] Redis instance running for job queue
- [ ] Sample images available for testing
- [ ] Test pipelines with various prompt types created

## Phase 1: Cohere V2 Integration Tests

### Cohere Client Setup
- [ ] **Test 1.1: API Authentication**
  - Action: Initialize Cohere client with valid API key
  - Expected: Client connects successfully
  - Verification: No authentication errors in logs

- [ ] **Test 1.2: Invalid API Key Handling**
  - Action: Initialize client with invalid API key
  - Expected: Graceful error handling with descriptive message
  - Verification: Error logged, no app crash

- [ ] **Test 1.3: API Rate Limit Handling**
  - Action: Make rapid API calls to trigger rate limiting
  - Expected: Proper backoff and retry behavior
  - Verification: Requests eventually succeed after backoff

## Phase 2: Job Submission API Tests

### Job Submission Endpoints
- [ ] **Test 2.1: Valid Job Submission**
  - Action: POST to `/api/jobs/submit` with valid pipeline and images
  - Expected: Job created with status "pending"
  - Verification: Job ID returned, database entry created

- [ ] **Test 2.2: Invalid Pipeline ID**
  - Action: Submit job with non-existent pipeline ID
  - Expected: 400 error with descriptive message
  - Verification: No job created in database

- [ ] **Test 2.3: Missing Required Fields**
  - Action: Submit job without pipeline_id or image_ids
  - Expected: 400 error with validation details
  - Verification: Clear error message indicating missing fields

- [ ] **Test 2.4: Unauthorized Job Submission**
  - Action: Submit job without authentication
  - Expected: 401 unauthorized error
  - Verification: No job created

### Job Retrieval Endpoints
- [ ] **Test 2.5: Get Job Details**
  - Action: GET `/api/jobs/[id]` for existing job
  - Expected: Complete job details returned
  - Verification: All job fields present and accurate

- [ ] **Test 2.6: Job History Listing**
  - Action: GET `/api/jobs/history`
  - Expected: List of user's jobs with pagination
  - Verification: Jobs sorted by creation date

## Phase 3: Job Processing Tests

### Queue System
- [ ] **Test 3.1: Job Queue Processing**
  - Action: Submit job and verify it enters queue
  - Expected: Job status changes to "processing"
  - Verification: Queue worker picks up job

- [ ] **Test 3.2: Multiple Job Handling**
  - Action: Submit multiple jobs simultaneously
  - Expected: Jobs processed in order or parallel as configured
  - Verification: All jobs complete successfully

- [ ] **Test 3.3: Queue Recovery After Restart**
  - Action: Restart application with pending jobs
  - Expected: Jobs resume processing
  - Verification: No jobs lost or stuck

### Image Analysis Processing
- [ ] **Test 3.4: Single Image Analysis**
  - Action: Process job with one image and boolean prompt
  - Expected: Cohere API called, result stored
  - Verification: Job result contains expected response format

- [ ] **Test 3.5: Multiple Image Batch**
  - Action: Process job with multiple images
  - Expected: All images analyzed, results aggregated
  - Verification: Individual results for each image

- [ ] **Test 3.6: Different Prompt Types**
  - Action: Test boolean, descriptive, and keywords prompts
  - Expected: Appropriate Cohere API calls for each type
  - Verification: Results match prompt type expectations

### Multi-Stage Pipeline Processing
- [ ] **Test 3.7: Two-Stage Pipeline**
  - Action: Create pipeline with two stages, process images
  - Expected: Stage 1 completes before Stage 2 begins
  - Verification: Stage progression tracked correctly

- [ ] **Test 3.8: Conditional Filtering**
  - Action: Use pipeline with filtering between stages
  - Expected: Only qualifying images proceed to next stage
  - Verification: Filtered images excluded from subsequent stages

## Phase 4: Error Handling Tests

### API Error Scenarios
- [ ] **Test 4.1: Cohere API Timeout**
  - Action: Simulate API timeout scenario
  - Expected: Job retried with exponential backoff
  - Verification: Retry attempts logged, eventual success or failure

- [ ] **Test 4.2: Invalid Image Format**
  - Action: Process job with corrupted image file
  - Expected: Graceful error handling, job marked as failed
  - Verification: Clear error message in job results

- [ ] **Test 4.3: Quota Exceeded**
  - Action: Simulate API quota exceeded error
  - Expected: Job paused and retried later
  - Verification: User notified of quota issue

### Job Recovery
- [ ] **Test 4.4: Failed Job Retry**
  - Action: Manually retry failed job
  - Expected: Job reprocessed from beginning
  - Verification: Previous failure cleared, new processing started

- [ ] **Test 4.5: Partial Processing Recovery**
  - Action: Simulate job failure mid-processing
  - Expected: Job can resume from last completed stage
  - Verification: No duplicate processing of completed stages

## Phase 5: User Interface Tests

### Job Submission Interface
- [ ] **Test 5.1: Job Submission Form**
  - Action: Fill out and submit job creation form
  - Expected: Form validates input and submits successfully
  - Verification: Success message displayed, job appears in history

- [ ] **Test 5.2: Pipeline Selection**
  - Action: Select different pipelines in submission form
  - Expected: Form updates based on pipeline requirements
  - Verification: Relevant fields shown/hidden appropriately

- [ ] **Test 5.3: Image Selection**
  - Action: Select images from library for job processing
  - Expected: Selected images highlighted and counted
  - Verification: Correct image count shown in submission

### Job Monitoring Dashboard
- [ ] **Test 5.4: Job Status Display**
  - Action: View job monitoring dashboard
  - Expected: All job statuses displayed accurately
  - Verification: Real-time updates when job status changes

- [ ] **Test 5.5: Progress Bar Accuracy**
  - Action: Monitor job with progress bar
  - Expected: Progress percentage updates during processing
  - Verification: Progress reflects actual completion percentage

- [ ] **Test 5.6: Job Details View**
  - Action: Click on job to view details
  - Expected: Comprehensive job information displayed
  - Verification: All relevant job data present

### Real-time Updates
- [ ] **Test 5.7: Live Status Updates**
  - Action: Monitor job status while processing
  - Expected: UI updates without page refresh
  - Verification: Status changes appear immediately

- [ ] **Test 5.8: Multiple User Sessions**
  - Action: Monitor same job from different browser sessions
  - Expected: Both sessions receive real-time updates
  - Verification: Updates synchronized across sessions

## Phase 6: Performance Tests

### Load Testing
- [ ] **Test 6.1: Concurrent Job Submission**
  - Action: Submit 10 jobs simultaneously
  - Expected: All jobs accepted and processed
  - Verification: No job submission failures

- [ ] **Test 6.2: Large Image Processing**
  - Action: Process job with 100+ images
  - Expected: Job completes successfully with reasonable time
  - Verification: Progress updates throughout processing

- [ ] **Test 6.3: Memory Usage Monitoring**
  - Action: Monitor memory during heavy job processing
  - Expected: Memory usage remains within acceptable limits
  - Verification: No memory leaks detected

### Database Performance
- [ ] **Test 6.4: Job History Pagination**
  - Action: View job history with 1000+ completed jobs
  - Expected: Fast loading with proper pagination
  - Verification: Query performance under 2 seconds

- [ ] **Test 6.5: Concurrent Database Updates**
  - Action: Multiple jobs updating status simultaneously
  - Expected: No database conflicts or deadlocks
  - Verification: All status updates applied correctly

## Integration Tests

### End-to-End Workflows
- [ ] **Test I.1: Complete Job Lifecycle**
  - Action: Submit job → Process → View results → Cleanup
  - Expected: Entire workflow completes without errors
  - Verification: Job progresses through all states correctly

- [ ] **Test I.2: Multi-User Job Processing**
  - Action: Multiple users submit jobs simultaneously
  - Expected: Jobs isolated and processed correctly per user
  - Verification: No cross-user data contamination

- [ ] **Test I.3: Job with Complex Pipeline**
  - Action: Submit job with 3-stage pipeline and conditional filtering
  - Expected: All stages execute with proper filtering
  - Verification: Results show appropriate stage progression

## Acceptance Criteria
- [ ] All job submission flows work end-to-end
- [ ] Cohere API integration processes images successfully
- [ ] Real-time job monitoring provides accurate updates
- [ ] Error scenarios handled gracefully with user feedback
- [ ] Job queue processes multiple jobs reliably
- [ ] Performance acceptable for typical usage patterns

## Test Data Requirements
- Sample images of various formats (JPEG, PNG, WebP)
- Test pipelines with different prompt types
- User accounts with different permission levels
- Large image sets for performance testing

## Test Execution Notes
*To be filled during testing*

## Known Issues
*To be documented as discovered* 