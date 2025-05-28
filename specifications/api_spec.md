API Specification: Coice
Base URL
/api (Next.js API routes)
Authentication

Supabase Auth with JWT tokens.
Role-based access control (RBAC) via Supabase policies.

Endpoints
1. Auth: Login

Endpoint: POST /api/auth/login
Description: Authenticate user.
Request Body:{
  "email": "user@example.com",
  "password": "password"
}


Response:
200 OK:{
  "access_token": "jwt-token",
  "user": { "id": "uuid", "email": "user@example.com", "role": "end_user" }
}


401 Unauthorized:{"error": "Invalid credentials"}





2. Catalog: List

Endpoint: GET /api/catalogs
Description: List catalogs.
Response:
200 OK:[
  { "id": 1, "name": "Oil & Gas", "user_id": "uuid", "created_at": "2025-05-27T11:00:00Z" }
]


403 Forbidden:{"error": "Access denied"}





3. Catalog: Create

Endpoint: POST /api/catalogs
Description: Create a catalog (Managers).
Request Body:{
  "name": "Oil & Gas",
  "description": "Energy sector images"
}


Response:
201 Created:{"message": "Catalog created", "id": 1}


403 Forbidden:{"error": "Only managers can create catalogs"}





4. Library: List

Endpoint: GET /api/libraries?catalog_id=<id>
Description: List libraries in a catalog.
Response:
200 OK:[
  { "id": 1, "catalog_id": 1, "name": "Wells", "created_at": "2025-05-27T11:00:00Z" }
]


403 Forbidden:{"error": "Access denied"}





5. Library: Create

Endpoint: POST /api/libraries
Description: Create a library (Managers).
Request Body:{
  "catalog_id": 1,
  "name": "Wells",
  "parent_id": null
}


Response:
201 Created:{"message": "Library created", "id": 1}


403 Forbidden:{"error": "Only managers can create libraries"}





6. Image: Upload

Endpoint: POST /api/images
Description: Upload images to GCS; save metadata to Supabase (Managers).
Request: Form-data:
library_id: Library ID.
files: Image files.


Response:
201 Created:{
  "message": "Uploaded 3 images",
  "image_ids": ["uuid1", "uuid2", "uuid3"]
}


400 Bad Request:{"error": "Invalid file type"}





7. Image: List

Endpoint: GET /api/images?library_id=<id>
Description: List images in a library.
Response:
200 OK:[
  {
    "id": "uuid",
    "gcs_path": "gs://coice/catalogs/1/wells/image.jpg",
    "metadata": { "title": "Well Site", "exif": { "DateTimeOriginal": "2025-05-27T10:00:00Z" } }
  }
]


403 Forbidden:{"error": "Access denied"}





8. Prompt: Create

Endpoint: POST /api/prompts
Description: Create a reusable prompt (Managers).
Request Body:{
  "name": "Flare Detection",
  "prompt": "Are there flares? True/false",
  "type": "boolean"
}


Response:
201 Created:{"message": "Prompt created", "id": "uuid"}


403 Forbidden:{"error": "Only managers can create prompts"}





9. Pipeline: Create

Endpoint: POST /api/pipelines
Description: Create a multi-stage pipeline (Managers).
Request Body:{
  "library_id": 1,
  "name": "Flare Analysis",
  "description": "Detect and describe flares",
  "stages": [
    { "prompt_id": "uuid1", "stage_order": 1, "filter_condition": null },
    { "prompt_id": "uuid2", "stage_order": 2, "filter_condition": { "stage_1.result": true } }
  ]
}


Response:
201 Created:{"message": "Pipeline created", "id": "uuid"}


403 Forbidden:{"error": "Only managers can create pipelines"}





10. Job: Run

Endpoint: POST /api/jobs/run
Description: Submit a pipeline job.
Request Body:{
  "pipeline_id": "uuid",
  "library_id": 1,
  "image_ids": ["uuid1", "uuid2"]
}


Response:
201 Created:{
  "message": "Job submitted",
  "job_id": "uuid",
  "total_images": 2
}


500 Internal Server Error:{"error": "Failed to start job"}





11. Job: Details

Endpoint: GET /api/jobs/:id
Description: Get job details and progress.
Response:
200 OK:{
  "id": "uuid",
  "pipeline_id": "uuid",
  "library_id": 1,
  "status": "running",
  "total_images": 20,
  "processed_images": 10,
  "created_by": "uuid",
  "created_at": "2025-05-27T12:00:00Z",
  "pipeline": { "name": "Flare Analysis" },
  "library": { "name": "Wells" }
}


403 Forbidden:{"error": "Access denied"}





12. Job: Results

Endpoint: GET /api/jobs/:id/results
Description: Get job results.
Response:
200 OK:[
  {
    "id": "uuid",
    "job_id": "uuid",
    "image_id": "uuid",
    "stage_id": "uuid",
    "result": { "result": true },
    "executed_at": "2025-05-27T12:01:00Z",
    "image": { "gcs_path": "gs://coice/..." },
    "stage": { "prompt_id": { "name": "Flare Detection" } }
  }
]


403 Forbidden:{"error": "Access denied"}





13. Job: History

Endpoint: GET /api/jobs/history?library_id=<id>
Description: List historical jobs for a library.
Response:
200 OK:[
  {
    "id": "uuid",
    "pipeline_id": "uuid",
    "status": "completed",
    "total_images": 20,
    "processed_images": 20,
    "created_at": "2025-05-27T12:00:00Z",
    "pipeline": { "name": "Flare Analysis" }
  }
]


403 Forbidden:{"error": "Access denied"}





14. Admin: Manage Users

Endpoint: POST /api/admin/users
Description: Manage users (Administrators).
Request Body:{
  "action": "create",
  "user": { "email": "newuser@example.com", "role": "end_user" }
}


Response:
200 OK:{"message": "User created", "user_id": "uuid"}


403 Forbidden:{"error": "Admin access required"}





15. Admin: Manage Groups

Endpoint: GET /api/admin/groups
Description: List all groups and their members (Administrators).
Response:
200 OK: [
  { "id": "uuid", "name": "Group 1", "created_at": "2025-05-27T11:00:00Z", "members": [
    { "id": "uuid", "email": "user@example.com", "role": "manager" }
  ] }
]
403 Forbidden: {"error": "Admin access required"}

Endpoint: POST /api/admin/groups
Description: Create a group and/or add a user to a group (Administrators).
Request Body:
{
  "group_name": "Group 1",
  "user_email": "user@example.com" // optional
}
Response:
200 OK: { "group": { ... }, "user": { ... }, "user_group": { ... } }
403 Forbidden: {"error": "Admin access required"}

Endpoint: DELETE /api/admin/groups/membership
Description: Remove a user from a group (Administrators).
Request Body:
{
  "group_id": "uuid",
  "user_id": "uuid"
}
Response:
200 OK: { "message": "User removed from group" }
403 Forbidden: {"error": "Admin access required"}

Endpoint: DELETE /api/admin/groups
Description: Delete a group (Administrators).
Request Body:
{
  "group_id": "uuid"
}
Response:
200 OK: { "message": "Group deleted" }
403 Forbidden: {"error": "Admin access required"}





16. GCS: List Buckets

Endpoint: GET /api/buckets
Description: List GCS buckets.
Response:
200 OK:["coice", "bucket2"]


500 Internal Server Error:{"error": "Failed to list buckets"}





17. Search

Endpoint: GET /api/search?q=<query>
Description: Search catalogs, libraries, images, job results.
Response:
200 OK:{
  "catalogs": [{ "id": 1, "name": "Oil & Gas" }],
  "libraries": [{ "id": 1, "name": "Wells" }],
  "images": [{ "id": "uuid", "gcs_path": "gs://coice/..." }],
  "job_results": [{ "id": "uuid", "result": { "result": true } }]
}


400 Bad Request:{"error": "Invalid query"}





