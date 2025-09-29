# Stories of You - Security Requirements

## Executive Summary

Stories of You's current static hosting architecture with N8N webhook authentication faces **7 critical security vulnerabilities** that must be addressed before MVP launch. The most severe risk is direct exposure of N8N webhook URLs in client-side code, which could allow attackers to bypass authentication entirely. This document provides a prioritized security roadmap balancing protection requirements with development timeline constraints.

**Implementation Priority:** 80-hour MVP security budget allocated as follows:
- 30% on authentication security (24 hours)
- 25% on infrastructure hardening (20 hours) 
- 20% on monitoring setup (16 hours)
- 15% on security headers (12 hours)
- 10% on documentation and testing (8 hours)

## Current Security Assessment

### ⚠️ CRITICAL VULNERABILITIES (Fix Immediately)

#### 1. N8N Webhook URL Exposure
**Risk Level:** CRITICAL
**Current Issue:** Webhook URLs visible in JavaScript source code
```javascript
// VULNERABLE - Exposed in client code
const METADATA_WEBHOOK = "https://mikelandin.app.n8n.cloud/webhook/storiesofyou-submit";
```

**Impact:** Attackers can bypass authentication entirely and submit malicious content
**Solution Required:** Proxy layer with CloudFront Functions or Lambda@Edge

#### 2. Insecure JWT Storage  
**Risk Level:** CRITICAL
**Current Issue:** JWTs stored in localStorage (planned for authentication)
**Impact:** XSS attacks can steal authentication tokens
**Solution Required:** httpOnly cookies + in-memory storage pattern

#### 3. Missing CSRF Protection
**Risk Level:** HIGH  
**Current Issue:** No CSRF tokens for state-changing operations
**Impact:** Cross-site request forgery attacks possible
**Solution Required:** Double-submit cookie pattern

#### 4. Inadequate Input Validation
**Risk Level:** HIGH
**Current Issue:** Basic validation only in N8N workflow
**Impact:** XSS, injection, and data corruption attacks
**Solution Required:** Comprehensive validation framework

#### 5. Missing Security Headers
**Risk Level:** MEDIUM
**Current Issue:** No Content-Security-Policy or security headers
**Impact:** XSS attacks and clickjacking possible
**Solution Required:** CloudFront security headers implementation

#### 6. No Rate Limiting
**Risk Level:** MEDIUM
**Current Issue:** Unlimited webhook submissions possible
**Impact:** DDoS and brute force attacks
**Solution Required:** CloudFront Functions rate limiting

#### 7. Weak Session Management
**Risk Level:** MEDIUM  
**Current Issue:** No secure session handling (for planned authentication)
**Impact:** Session hijacking and unauthorized access
**Solution Required:** Secure session tokens with proper expiration

## Security Architecture Requirements

### Authentication & Authorization Model

#### Current State (Beta)
- **No authentication required** - Open story submission
- **Email-based identification** - Stories linked to email addresses
- **Basic content moderation** - AssemblyAI toxicity detection

#### Target State (MVP)
```
OTP-Based Email Authentication
         ↓
Session Token (httpOnly cookie + in-memory)
         ↓
Storyboard Access Control
         ↓
Story Creation/Sharing Permissions
```

#### Implementation Requirements

**1. OTP Generation & Verification**
```javascript
// Secure OTP implementation
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit code
};

const storeOTP = async (email, code) => {
  await dynamodb.putItem({
    TableName: 'storiesofyou-otp-codes',
    Item: {
      email: { S: email },
      otp_code: { S: code },
      expires_at: { N: (Date.now() + 600000).toString() }, // 10-minute expiry
      created_at: { S: new Date().toISOString() },
      attempts: { N: '0' }
    }
  });
};
```

**2. Session Management**
```javascript
// Dual-token pattern for security
const sessionPattern = {
  accessToken: {
    storage: 'memory', // JavaScript variable only
    duration: '15-30 minutes',
    purpose: 'API requests'
  },
  refreshToken: {
    storage: 'httpOnly cookie',
    duration: '7-14 days', 
    purpose: 'Token refresh'
  }
};

// Session validation
const validateSession = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.exp > Date.now() / 1000;
  } catch (error) {
    return false;
  }
};
```

### Infrastructure Security Requirements

#### S3 Bucket Security Configuration

**storiesofyou-incoming (Private Content)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDirectAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::storiesofyou-incoming/*",
      "Condition": {
        "StringNotEquals": {
          "aws:SourceVpce": "vpce-1234567890abcdef0"
        }
      }
    },
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::storiesofyou-incoming/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::596430611773:distribution/CLOUDFRONT_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

**storiesofyou-stories (Public Content with Access Control)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::storiesofyou-stories/*.html",
        "arn:aws:s3:::storiesofyou-stories/videos/*",
        "arn:aws:s3:::storiesofyou-stories/assets/*"
      ]
    },
    {
      "Sid": "RestrictDirectAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::storiesofyou-stories/private/*",
      "Condition": {
        "StringNotEquals": {
          "aws:SourceVpce": "vpce-1234567890abcdef0"
        }
      }
    }
  ]
}
```

#### CloudFront Security Configuration

**Origin Access Control (OAC) Setup**
```json
{
  "Name": "StoriesOfYou-OAC",
  "Description": "Origin access control for Stories of You S3 buckets",
  "OriginAccessControlConfig": {
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4",
    "OriginAccessControlOriginType": "s3"
  }
}
```

**Security Headers Policy**
```json
{
  "SecurityHeadersConfig": {
    "StrictTransportSecurity": {
      "AccessControlMaxAgeSec": 31536000,
      "IncludeSubdomains": true,
      "Preload": true
    },
    "ContentTypeOptions": {
      "Override": true
    },
    "FrameOptions": {
      "FrameOption": "DENY",
      "Override": true
    },
    "ReferrerPolicy": {
      "ReferrerPolicy": "strict-origin-when-cross-origin",
      "Override": true
    },
    "ContentSecurityPolicy": {
      "ContentSecurityPolicy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';",
      "Override": true
    }
  }
}
```

### N8N Webhook Security Implementation

#### Proxy Architecture (REQUIRED)
```javascript
// CloudFront Function for webhook proxy
function handler(event) {
  const request = event.request;
  
  // Validate JWT token
  const authHeader = request.headers.authorization;
  if (!authHeader || !validateJWT(authHeader.value)) {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: {
        'content-type': { value: 'application/json' }
      },
      body: JSON.stringify({ error: 'Invalid authentication' })
    };
  }
  
  // Rate limiting check
  const clientIP = event.viewer.ip;
  if (isRateLimited(clientIP)) {
    return {
      statusCode: 429,
      statusDescription: 'Too Many Requests',
      headers: {
        'retry-after': { value: '60' }
      },
      body: JSON.stringify({ error: 'Rate limit exceeded' })
    };
  }
  
  // Add request signature for N8N validation
  const signature = generateHMAC(request.body, process.env.WEBHOOK_SECRET);
  request.headers['x-webhook-signature'] = { value: signature };
  
  // Forward to N8N
  request.uri = '/webhook/storiesofyou-submit';
  return request;
}
```

#### N8N Webhook Authentication
```javascript
// N8N webhook node - signature validation
const crypto = require('crypto');

const validateWebhookSignature = (body, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// In N8N webhook processing
const incomingSignature = $node["Webhook"].json.headers['x-webhook-signature'];
const isValid = validateWebhookSignature($json.body, incomingSignature, process.env.WEBHOOK_SECRET);

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

### Input Validation & Sanitization

#### Comprehensive Validation Framework
```javascript
const validateStorySubmission = (data) => {
  const errors = [];
  
  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  } else if (data.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  } else if (data.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(data.name.trim())) {
    errors.push('Name contains invalid characters');
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Valid email address is required');
  } else if (data.email.length > 254) {
    errors.push('Email address is too long');
  }
  
  // Prompt validation
  if (data.prompt && data.prompt.length > 500) {
    errors.push('Prompt must be 500 characters or less');
  }
  
  // Audio key validation
  if (!data.audio_key || typeof data.audio_key !== 'string') {
    errors.push('Audio key is required');
  } else if (!data.audio_key.match(/^[a-zA-Z0-9\-\/\.]+$/)) {
    errors.push('Audio key contains invalid characters');
  }
  
  // File extension validation
  const allowedAudioExts = ['.webm', '.mp4', '.wav', '.mp3'];
  const hasValidAudioExt = allowedAudioExts.some(ext => 
    data.audio_key.toLowerCase().endsWith(ext)
  );
  if (!hasValidAudioExt) {
    errors.push('Audio file must have a valid extension (.webm, .mp4, .wav, .mp3)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitized: {
      name: data.name ? data.name.trim() : '',
      email: data.email ? data.email.trim().toLowerCase() : '',
      prompt: data.prompt ? data.prompt.trim() : '',
      audio_key: data.audio_key ? data.audio_key.trim() : '',
      photo_key: data.photo_key ? data.photo_key.trim() : null
    }
  };
};
```

#### XSS Prevention
```javascript
const sanitizeHTML = (input) => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Content Security Policy for additional XSS protection
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline'", 
  "img-src 'self' data: https:",
  "media-src 'self' https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');
```

### Data Protection & Privacy

#### Content Moderation Pipeline
```javascript
const contentModerationLayers = {
  layer1: {
    service: 'AssemblyAI',
    type: 'Real-time toxicity detection',
    threshold: 0.5,
    action: 'Automatic rejection'
  },
  layer2: {
    service: 'Manual review queue',
    type: 'Human moderation',
    trigger: 'Toxicity score 0.3-0.5',
    action: 'Review required'
  },
  layer3: {
    service: 'Community reporting',
    type: 'User-generated reports',
    trigger: 'Published content reports',
    action: 'Investigation'
  }
};

// Implement content safety checks
const checkContentSafety = async (transcript, contentSafetyLabels) => {
  const unsafeLabels = ['hate_speech', 'harassment', 'violence_graphic', 'sexual_content'];
  const hasHighConfidenceUnsafeContent = contentSafetyLabels.some(label =>
    unsafeLabels.includes(label.label) && label.confidence > 0.75
  );
  
  if (hasHighConfidenceUnsafeContent) {
    await logModerationAction({
      action: 'content_rejected',
      reason: 'High confidence unsafe content detected',
      labels: contentSafetyLabels.filter(l => l.confidence > 0.75),
      timestamp: new Date().toISOString()
    });
    return { approved: false, reason: 'Content safety violation' };
  }
  
  return { approved: true };
};
```

#### Data Retention & Deletion
```javascript
const dataRetentionPolicy = {
  audioFiles: {
    retention: '90 days',
    location: 's3://storiesofyou-incoming',
    lifecycle: 'Automatic deletion after 90 days'
  },
  transcripts: {
    retention: '7 years',
    location: 'DynamoDB',
    lifecycle: 'Manual deletion on user request'
  },
  personalInfo: {
    retention: 'Until account deletion',
    location: 'DynamoDB + email systems',
    lifecycle: 'Immediate deletion on GDPR request'
  },
  storyPages: {
    retention: 'Indefinite',
    location: 's3://storiesofyou-stories',
    lifecycle: 'Deletion on user request only'
  }
};

// GDPR compliance implementation
const processDataDeletionRequest = async (email) => {
  const userStories = await findStoriesByEmail(email);
  
  for (const story of userStories) {
    // Delete from S3
    await deleteS3Objects([
      { Bucket: 'storiesofyou-incoming', Key: story.audio_key },
      { Bucket: 'storiesofyou-stories', Key: `${story.story_id}.html` },
      { Bucket: 'storiesofyou-stories', Key: `videos/${story.story_id}_complete.mp4` }
    ]);
    
    // Remove from DynamoDB
    await deleteDynamoDBItem('storiesofyou-recordings', { story_id: story.story_id });
  }
  
  // Log deletion for compliance
  await logGDPRAction({
    action: 'data_deletion',
    email: email,
    timestamp: new Date().toISOString(),
    stories_affected: userStories.length
  });
};
```

## Security Implementation Roadmap

### Week 1: Critical Security Foundation (40 hours)

#### Day 1-2: Authentication Security (16 hours)
```javascript
// Priority tasks:
const week1AuthTasks = [
  'Implement OTP generation and verification workflow',
  'Create session management with httpOnly cookies',
  'Add JWT token validation in CloudFront Functions',
  'Build secure logout with token revocation',
  'Test authentication flow end-to-end'
];
```

#### Day 3-4: Infrastructure Hardening (16 hours)
```javascript
const week1InfraTasks = [
  'Configure Origin Access Control for S3 buckets',
  'Implement CloudFront security headers',
  'Set up webhook proxy with signature validation',
  'Configure HTTPS enforcement and HSTS',
  'Deploy CloudFront Functions for rate limiting'
];
```

#### Day 5: Monitoring & Validation (8 hours)
```javascript
const week1MonitoringTasks = [
  'Set up CloudWatch alarms for authentication failures',
  'Implement security event logging',
  'Create comprehensive input validation',
  'Test XSS prevention measures',
  'Document security configurations'
];
```

### Week 2: Enhanced Security Controls (40 hours)

#### Advanced Authentication Features
- Multi-factor authentication options
- Account lockout after failed attempts
- Password-less login alternatives
- Social authentication integration

#### Security Monitoring & Alerting
```javascript
const securityAlerts = {
  authenticationFailures: {
    threshold: '10 failures per minute',
    action: 'SNS notification + IP blocking'
  },
  unusualGeographicAccess: {
    threshold: 'Access from new country',
    action: 'Email verification required'
  },
  contentModerationFailures: {
    threshold: 'High toxicity content detected',
    action: 'Manual review queue + admin notification'
  },
  apiRateLimitExceeded: {
    threshold: '100 requests per minute per IP',
    action: 'Temporary IP blocking + logging'
  }
};
```

### Post-MVP Security Enhancements

#### Advanced Threat Protection
1. **Web Application Firewall (WAF)**
   - SQL injection protection
   - Cross-site scripting (XSS) filtering
   - Geographic IP blocking
   - Bot protection

2. **DDoS Protection**
   - CloudFlare Pro integration
   - Auto-scaling mechanisms
   - Traffic pattern analysis
   - Fail-safe mechanisms

3. **Advanced Monitoring**
   - Security Information and Event Management (SIEM)
   - Anomaly detection using machine learning
   - Real-time threat intelligence integration
   - Automated incident response

## Compliance Requirements

### GDPR Implementation
```javascript
const gdprCompliance = {
  dataProcessingBasis: 'Legitimate interest for story preservation',
  userRights: [
    'Right to access personal data',
    'Right to rectification of incorrect data', 
    'Right to erasure (right to be forgotten)',
    'Right to data portability',
    'Right to object to processing'
  ],
  dataProtectionMeasures: [
    'Encryption in transit and at rest',
    'Regular security assessments',
    'Staff privacy training',
    'Data breach notification procedures'
  ],
  consentManagement: 'Explicit consent for marketing communications'
};
```

### CCPA Requirements
- **Transparency:** Clear privacy policy describing data collection
- **Control:** User ability to delete and download their data
- **Accountability:** Regular privacy impact assessments
- **Security:** Implementation of reasonable security measures

## Security Testing Strategy

### Automated Security Testing
```javascript
const securityTestSuite = {
  staticAnalysis: {
    tool: 'ESLint with security rules',
    frequency: 'Every commit',
    scope: 'JavaScript code analysis'
  },
  dependencyScanning: {
    tool: 'npm audit + Snyk',
    frequency: 'Daily',
    scope: 'Third-party vulnerability detection'
  },
  dynamicTesting: {
    tool: 'OWASP ZAP',
    frequency: 'Weekly',
    scope: 'Runtime vulnerability scanning'
  },
  penetrationTesting: {
    tool: 'Professional security firm',
    frequency: 'Quarterly',
    scope: 'Comprehensive security assessment'
  }
};
```

### Manual Security Reviews
1. **Code Review Checklist**
   - Input validation verification
   - Authentication bypass attempts
   - Authorization boundary testing
   - Error handling assessment

2. **Infrastructure Review**
   - AWS security group configuration
   - S3 bucket policy validation
   - IAM role permission audit
   - CloudFront security settings

## Incident Response Plan

### Security Incident Classification
```javascript
const incidentSeverity = {
  critical: {
    examples: ['Data breach', 'Authentication bypass', 'System compromise'],
    responseTime: '1 hour',
    escalation: 'CEO + Legal team'
  },
  high: {
    examples: ['DDoS attack', 'Toxic content publication', 'API abuse'],
    responseTime: '4 hours', 
    escalation: 'Technical lead + Product manager'
  },
  medium: {
    examples: ['Failed login attempts', 'Content moderation edge cases'],
    responseTime: '24 hours',
    escalation: 'Development team'
  },
  low: {
    examples: ['Minor configuration issues', 'Monitoring alerts'],
    responseTime: '72 hours',
    escalation: 'Individual developer'
  }
};
```

### Response Procedures
1. **Detection:** Automated alerts + manual reporting
2. **Assessment:** Severity classification + impact analysis
3. **Containment:** Immediate threat mitigation
4. **Investigation:** Root cause analysis + evidence collection
5. **Recovery:** System restoration + monitoring
6. **Lessons Learned:** Process improvement + documentation update

This comprehensive security framework provides the foundation for a secure, compliant, and resilient Stories of You platform while maintaining the flexibility needed for rapid development and feature iteration.