# Vercel Deployment Guide for Coice

This guide helps you deploy Coice to Vercel and resolve common issues like broken image links.

## 🚀 Quick Fix for Broken Images

If your images are showing as broken placeholders on Vercel, follow these steps:

### Step 1: Extract Service Account Credentials

1. Open your `service-account-key.json` file locally
2. Extract the following values:
   - `project_id`
   - `private_key_id` 
   - `private_key`
   - `client_email`
   - `client_id`

### Step 2: Configure Vercel Environment Variables

In your Vercel dashboard, add these environment variables:

```bash
# Required Supabase Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Required GCS Variables for Vercel
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GCS_BUCKET_NAME=your_gcs_bucket_name
GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_content\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=your_client_id

# Other Required Variables
COHERE_API_KEY=your_cohere_api_key
REDIS_URL=your_redis_url
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app.vercel.app
```

⚠️ **Important Notes:**
- For `GOOGLE_CLOUD_PRIVATE_KEY`, make sure to wrap the entire private key in quotes
- Include the newlines (`\n`) in the private key string
- Do NOT include `GOOGLE_APPLICATION_CREDENTIALS` on Vercel (file paths don't work)

### Step 3: Redeploy

After adding the environment variables, trigger a new deployment in Vercel.

## 🔍 Testing Your Deployment

### Test GCS Connection

Visit: `https://your-app.vercel.app/api/debug/gcs-test`

This endpoint will show:
- ✅ Configuration method being used
- ✅ Environment variables status
- ✅ GCS connection status
- ✅ File listing capability
- ✅ Signed URL generation

### Expected Success Response:
```json
{
  "success": true,
  "diagnostics": {
    "configMethod": "environment_variables",
    "envCheck": {
      "hasProjectId": true,
      "hasBucketName": true,
      "hasPrivateKey": true,
      "hasClientEmail": true,
      "hasClientId": true,
      "hasPrivateKeyId": true
    },
    "gcsConnection": true,
    "filesFound": 5
  },
  "results": {
    "signedUrlTest": "Generated successfully"
  }
}
```

## 🛠️ Common Issues & Solutions

### Issue 1: "GCS connection failed"
**Cause:** Invalid service account credentials
**Solution:** 
1. Verify all GCS environment variables are set correctly
2. Check that the private key includes proper newline characters
3. Ensure the service account has Storage Object Admin permissions

### Issue 2: "Failed to generate signed URL"
**Cause:** Insufficient permissions or wrong bucket
**Solution:**
1. Verify the service account has access to the bucket
2. Check the bucket name is correct
3. Ensure the bucket exists and has proper IAM policies

### Issue 3: Images still broken after env vars
**Cause:** Deployment cache or incomplete environment setup
**Solution:**
1. Force a new deployment in Vercel
2. Clear Vercel's deployment cache
3. Check all required environment variables are set

## 📝 Environment Variables Checklist

### ✅ Supabase (Required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### ✅ Google Cloud Storage (Required)
- [ ] `GOOGLE_CLOUD_PROJECT_ID`
- [ ] `GCS_BUCKET_NAME`
- [ ] `GOOGLE_CLOUD_PRIVATE_KEY_ID`
- [ ] `GOOGLE_CLOUD_PRIVATE_KEY`
- [ ] `GOOGLE_CLOUD_CLIENT_EMAIL`
- [ ] `GOOGLE_CLOUD_CLIENT_ID`

### ✅ Other Services (Optional)
- [ ] `COHERE_API_KEY` (for AI features)
- [ ] `REDIS_URL` (for job queues)
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`

## 🔒 Security Best Practices

1. **Never commit service account keys** to your repository
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** regularly
4. **Limit service account permissions** to minimum required
5. **Monitor GCS access logs** for unusual activity

## 🐛 Debug Tools

### Local Debug Commands
```bash
# Test GCS connection locally
curl http://localhost:3000/api/debug/gcs-test

# Check image metadata
curl http://localhost:3000/api/debug/image-metadata
```

### Production Debug
```bash
# Test GCS on Vercel
curl https://your-app.vercel.app/api/debug/gcs-test

# Check logs
vercel logs your-app
```

## 📞 Need Help?

If you're still experiencing issues:

1. Check the Vercel function logs for detailed error messages
2. Verify your GCS bucket permissions and policies
3. Test the debug endpoints to isolate the problem
4. Ensure all environment variables are properly formatted

The most common issue is incorrectly formatted private keys - make sure they include proper newlines and are wrapped in quotes! 