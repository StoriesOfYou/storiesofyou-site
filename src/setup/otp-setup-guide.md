# OTP Authentication Setup Guide

## Overview
This guide walks you through setting up the OTP (One-Time Password) authentication system for Stories of You.

## Prerequisites
- AWS account with DynamoDB access
- N8N instance at `mikelandin.app.n8n.cloud`
- SES configured in `us-east-2` region
- Email address verified in SES (or use your verified email for testing)

## Step 1: Create DynamoDB Table

### Option A: AWS Console
1. Go to DynamoDB in AWS Console (us-east-2 region)
2. Click "Create table"
3. Use the configuration from `dynamodb-otp-table.json`:
   - **Table name**: `storiesofyou-otp-codes`
   - **Partition key**: `email` (String)
   - **Sort key**: `code` (String)
   - **Billing mode**: On-demand
   - **TTL**: Enable with attribute `expires_at`

### Option B: AWS CLI
```bash
aws dynamodb create-table --cli-input-json file://dynamodb-otp-table.json --region us-east-2
```

## Step 2: Configure N8N Credentials

### AWS Credentials
1. In N8N, go to Settings > Credentials
2. Create new AWS credential:
   - **Name**: `AWS Credentials`
   - **Access Key ID**: Your AWS access key
   - **Secret Access Key**: Your AWS secret key
   - **Region**: `us-east-2`

### SMTP Credentials (for SES)
1. In N8N, go to Settings > Credentials
2. Create new SMTP credential:
   - **Name**: `SMTP Credentials`
   - **Host**: `email-smtp.us-east-2.amazonaws.com`
   - **Port**: `587`
   - **Username**: Your SES SMTP username
   - **Password**: Your SES SMTP password
   - **Secure**: Yes (TLS)

## Step 3: Import N8N Workflows

### Import Workflows
1. In N8N, go to Workflows
2. Click "Import from file"
3. Import each workflow:
   - `generate-otp.json`
   - `verify-otp.json`
   - `storyboard-data.json`

### Activate Workflows
1. Open each workflow
2. Click "Activate" to enable the webhooks
3. Note the webhook URLs:
   - `https://mikelandin.app.n8n.cloud/webhook/generate-otp`
   - `https://mikelandin.app.n8n.cloud/webhook/verify-otp`
   - `https://mikelandin.app.n8n.cloud/webhook/storyboard-data`

## Step 4: Test the System

### Test Generate OTP
```bash
curl -X POST https://mikelandin.app.n8n.cloud/webhook/generate-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Test Verify OTP
```bash
curl -X POST https://mikelandin.app.n8n.cloud/webhook/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "code": "123456"}'
```

### Test Storyboard Data
```bash
curl -X GET "https://mikelandin.app.n8n.cloud/webhook/storyboard-data?session_token=YOUR_JWT_TOKEN"
```

## Step 5: Frontend Integration

### Login Page
The frontend should call:
1. **Generate OTP**: `POST /generate-otp` with `{"email": "user@example.com"}`
2. **Verify OTP**: `POST /verify-otp` with `{"email": "user@example.com", "code": "123456"}`
3. **Store session token** in localStorage or httpOnly cookie

### Storyboard Page
The frontend should call:
1. **Get Stories**: `GET /storyboard-data?session_token=YOUR_JWT_TOKEN`
2. **Display stories** with status indicators
3. **Handle expired sessions** by redirecting to login

## Security Considerations

### JWT Secret Key
- The current JWT secret is hardcoded: `storiesofyou-jwt-secret-key-2024-production`
- **For production**: Generate a secure random key and store it as an environment variable
- **Recommended**: Use a proper JWT library instead of the simple implementation

### Rate Limiting
- **Current**: 3 OTP codes per email per hour
- **Code expiry**: 10 minutes
- **Session expiry**: 2 hours

### Email Security
- **From address**: `noreply@storiesofyou.ai` (once verified)
- **Reply-to**: `support@storiesofyou.ai`
- **Rate limiting**: Built into the workflow

## Troubleshooting

### Common Issues

1. **"Valid email address is required"**
   - Check email format in request body
   - Ensure email field is present and not empty

2. **"Too many requests"**
   - Rate limiting triggered (3 codes per hour)
   - Wait before requesting another code

3. **"Code has expired"**
   - OTP codes expire after 10 minutes
   - Request a new code

4. **"Invalid session token"**
   - JWT token is malformed or expired
   - User needs to log in again

5. **DynamoDB errors**
   - Check AWS credentials in N8N
   - Verify table exists in us-east-2
   - Check IAM permissions

### Monitoring

1. **N8N Execution Logs**
   - Check workflow execution history
   - Look for error messages in failed executions

2. **DynamoDB Metrics**
   - Monitor read/write capacity
   - Check for throttling

3. **SES Metrics**
   - Monitor email delivery rates
   - Check bounce/complaint rates

## Next Steps

1. **Create the DynamoDB table**
2. **Import the N8N workflows**
3. **Test the API endpoints**
4. **Build the frontend login page**
5. **Build the storyboard page**
6. **Test end-to-end flow**

## Support

If you encounter issues:
1. Check N8N execution logs
2. Verify AWS credentials and permissions
3. Test individual workflow nodes
4. Check DynamoDB table configuration
5. Verify SES email delivery

---

*This setup guide is part of the Stories of You Week 1 development plan.*
