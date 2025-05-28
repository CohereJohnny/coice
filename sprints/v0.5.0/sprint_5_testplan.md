# Sprint 5 Test Plan

## Overview
Test plan for Google Cloud Storage integration, image upload functionality, and basic image management features.

## Test Environment Setup
- [ ] GCS service account configured with test bucket
- [ ] Test images of various formats (JPEG, PNG, WEBP)
- [ ] Test images of various sizes (small, medium, large)
- [ ] Test catalogs and libraries created

## Phase 1: GCS Setup & Configuration Tests

### Test 1.1: Service Account Authentication
- **Objective**: Verify GCS service account authentication works
- **Steps**:
  1. Configure service account credentials
  2. Test connection to GCS
  3. Verify bucket access permissions
- **Expected**: Successful authentication and bucket access
- **Status**: [ ] Pass [ ] Fail

### Test 1.2: Environment Configuration
- **Objective**: Verify all GCS environment variables are properly configured
- **Steps**:
  1. Check all required environment variables are set
  2. Verify bucket name configuration
  3. Test credential file path
- **Expected**: All environment variables properly loaded
- **Status**: [ ] Pass [ ] Fail

## Phase 2: Image Upload Tests

### Test 2.1: Single Image Upload
- **Objective**: Test uploading a single image via drag-and-drop
- **Steps**:
  1. Navigate to library detail page
  2. Drag and drop a single image
  3. Verify upload progress indicator
  4. Confirm image appears in library
- **Expected**: Image successfully uploaded and displayed
- **Status**: [ ] Pass [ ] Fail

### Test 2.2: Multiple Image Upload
- **Objective**: Test batch upload of multiple images
- **Steps**:
  1. Select multiple images for upload
  2. Verify all images show in upload queue
  3. Monitor upload progress for each image
  4. Confirm all images appear in library
- **Expected**: All images uploaded successfully
- **Status**: [ ] Pass [ ] Fail

### Test 2.3: Image Validation
- **Objective**: Test image format and size validation
- **Steps**:
  1. Attempt to upload unsupported file format
  2. Attempt to upload oversized image
  3. Verify appropriate error messages
- **Expected**: Invalid uploads rejected with clear error messages
- **Status**: [ ] Pass [ ] Fail

### Test 2.4: Upload Error Handling
- **Objective**: Test upload failure scenarios
- **Steps**:
  1. Simulate network interruption during upload
  2. Test upload with invalid credentials
  3. Verify error handling and user feedback
- **Expected**: Graceful error handling with retry options
- **Status**: [ ] Pass [ ] Fail

## Phase 3: Image Storage & Organization Tests

### Test 3.1: Storage Structure
- **Objective**: Verify images are stored in correct GCS structure
- **Steps**:
  1. Upload image to specific library
  2. Check GCS bucket structure
  3. Verify path: catalogs/<catalog_id>/<library_id>/
- **Expected**: Images stored in correct hierarchical structure
- **Status**: [ ] Pass [ ] Fail

### Test 3.2: Metadata Extraction
- **Objective**: Test EXIF metadata extraction
- **Steps**:
  1. Upload image with EXIF data
  2. Verify metadata is extracted and stored
  3. Check database for metadata fields
- **Expected**: EXIF data properly extracted and stored
- **Status**: [ ] Pass [ ] Fail

### Test 3.3: Thumbnail Generation
- **Objective**: Test thumbnail creation for uploaded images
- **Steps**:
  1. Upload high-resolution image
  2. Verify thumbnail is generated
  3. Check thumbnail quality and size
- **Expected**: Thumbnails generated with appropriate quality
- **Status**: [ ] Pass [ ] Fail

## Phase 4: Image Retrieval & Management Tests

### Test 4.1: Image Listing
- **Objective**: Test image listing within libraries
- **Steps**:
  1. Navigate to library with uploaded images
  2. Verify all images are displayed
  3. Check image metadata display
- **Expected**: All images listed with correct metadata
- **Status**: [ ] Pass [ ] Fail

### Test 4.2: Image Preview
- **Objective**: Test image preview functionality
- **Steps**:
  1. Click on image thumbnail
  2. Verify full-size preview opens
  3. Test preview navigation
- **Expected**: High-quality image preview with smooth navigation
- **Status**: [ ] Pass [ ] Fail

### Test 4.3: Image Download
- **Objective**: Test image download functionality
- **Steps**:
  1. Select image for download
  2. Verify download initiates
  3. Check downloaded file integrity
- **Expected**: Original image downloaded successfully
- **Status**: [ ] Pass [ ] Fail

### Test 4.4: Image Deletion
- **Objective**: Test image deletion from GCS and database
- **Steps**:
  1. Select image for deletion
  2. Confirm deletion dialog
  3. Verify image removed from GCS and database
- **Expected**: Image completely removed from system
- **Status**: [ ] Pass [ ] Fail

## Phase 5: Integration Tests

### Test 5.1: Library Integration
- **Objective**: Test upload integration with existing library management
- **Steps**:
  1. Create new library
  2. Upload images to library
  3. Verify library image count updates
  4. Test library deletion with images
- **Expected**: Seamless integration with library management
- **Status**: [ ] Pass [ ] Fail

### Test 5.2: Performance Testing
- **Objective**: Test upload/download performance
- **Steps**:
  1. Upload large images (>10MB)
  2. Upload multiple images simultaneously
  3. Measure upload/download times
- **Expected**: Acceptable performance for typical use cases
- **Status**: [ ] Pass [ ] Fail

### Test 5.3: Mobile Responsiveness
- **Objective**: Test image upload on mobile devices
- **Steps**:
  1. Access upload interface on mobile
  2. Test touch-based drag and drop
  3. Verify mobile upload experience
- **Expected**: Functional upload interface on mobile
- **Status**: [ ] Pass [ ] Fail

## Security Tests

### Test S.1: Access Control
- **Objective**: Verify proper access control for image operations
- **Steps**:
  1. Test upload with different user roles
  2. Verify library-specific access
  3. Test unauthorized access attempts
- **Expected**: Proper role-based access enforcement
- **Status**: [ ] Pass [ ] Fail

### Test S.2: File Security
- **Objective**: Test file upload security measures
- **Steps**:
  1. Attempt to upload malicious files
  2. Test file size limits
  3. Verify file type restrictions
- **Expected**: Security measures prevent malicious uploads
- **Status**: [ ] Pass [ ] Fail

## Performance Benchmarks
- Upload time for 5MB image: < 10 seconds
- Thumbnail generation: < 3 seconds
- Image listing load time: < 2 seconds
- Preview load time: < 1 second

## Test Data Requirements
- Test images: 10 JPEG files (various sizes)
- Test images: 5 PNG files
- Test images: 3 WEBP files
- Large test image: 1 file >20MB
- Images with EXIF data: 5 files
- Images without EXIF data: 3 files

## Test Completion Criteria
- [ ] All functional tests pass
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] Mobile responsiveness verified
- [ ] Error handling tested and working
- [ ] Integration with existing features confirmed 