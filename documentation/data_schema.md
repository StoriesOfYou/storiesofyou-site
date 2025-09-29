# Stories of You - Data Schema and Models

## Overview

This document defines all data structures, schemas, and models used throughout the Stories of You platform. Understanding these schemas is critical for maintaining data consistency during development and migration.

## DynamoDB Table Schemas

### Primary Table: `storiesofyou-recordings`

**Purpose:** Central repository for all story metadata and processing status
**Region:** us-east-2
**Billing Mode:** On-demand
**Backup:** Point-in-time recovery enabled

#### Table Structure

```json
{
  "TableName": "storiesofyou-recordings",
  "KeySchema": [
    {
      "AttributeName": "story_id",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "story_id",
      "AttributeType": "S"
    }
  ]
}
```

#### Complete Record Schema

```json
{
  "story_id": {
    "type": "String",
    "format": "story-{timestamp}-{random}",
    "example": "story-1692123456789-abc123def",
    "description": "Unique identifier generated at story creation",
    "required": true,
    "index": "Primary Key"
  },
  "name": {
    "type": "String",
    "maxLength": 100,
    "example": "Sarah Johnson",
    "description": "Storyteller's display name",
    "required": true,
    "validation": "Non-empty, trimmed"
  },
  "email": {
    "type": "String",
    "format": "email",
    "example": "sarah.johnson@email.com",
    "description": "Storyteller's email for notifications",
    "required": true,
    "validation": "Valid email format"
  },
  "prompt": {
    "type": "String",
    "maxLength": 500,
    "example": "What was your childhood home like?",
    "description": "Story prompt or custom topic",
    "required": false,
    "default": "Share a story"
  },
  "audio_key": {
    "type": "String",
    "format": "s3-key",
    "example": "21a5aeaa-5edf-422a-9ba8-a56b26d0f347/audio.webm",
    "description": "S3 key for original audio recording in storiesofyou-incoming bucket",
    "required": true
  },
  "photo_key": {
    "type": "String",
    "format": "s3-key",
    "example": "22d21234-5300-4907-ba62-2204f02ac851/photo.jpg",
    "description": "S3 key for user-uploaded photo, or 'default-story-image.jpg'",
    "required": false,
    "default": "default-story-image.jpg"
  },
  "audio_url": {
    "type": "String",
    "format": "url",
    "example": "https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/session/audio.webm",
    "description": "Full S3 URL for audio file access",
    "required": true,
    "computed": true
  },
  "transcript": {
    "type": "String",
    "maxLength": 50000,
    "example": "When I was growing up, our house was a small two-story home...",
    "description": "Raw transcript from AssemblyAI",
    "required": false,
    "processing_stage": "After transcription"
  },
  "transcript_clean": {
    "type": "String",
    "maxLength": 50000,
    "example": "When I was growing up, our house was a small two-story home on Maple Street...",
    "description": "Enhanced transcript processed by Claude AI",
    "required": false,
    "processing_stage": "After content enhancement"
  },
  "toxicity_score": {
    "type": "Number",
    "format": "float",
    "range": "0.0 - 1.0",
    "example": 0.1,
    "description": "Content safety score from AssemblyAI (lower is safer)",
    "required": false,
    "threshold": 0.5
  },
  "content_safety_labels": {
    "type": "Array",
    "example": "[{\"label\": \"profanity\", \"confidence\": 0.2}]",
    "description": "Detailed content safety analysis from AssemblyAI",
    "required": false
  },
  "image_prompts": {
    "type": "String",
    "maxLength": 2000,
    "example": "Cozy 1950s family home interior, warm lighting, vintage furniture...",
    "description": "AI image generation prompt created by Claude",
    "required": false,
    "processing_stage": "After content enhancement"
  },
  "status": {
    "type": "String",
    "enum": ["submitted", "transcribing", "generating", "completed", "rejected", "failed"],
    "example": "completed",
    "description": "Current processing status",
    "required": true,
    "default": "submitted"
  },
  "story_url": {
    "type": "String",
    "format": "url",
    "example": "https://stories.storiesofyou.ai/story-1692123456789-abc123def.html",
    "description": "Public URL for completed story page",
    "required": false,
    "processing_stage": "After completion"
  },
  "created_at": {
    "type": "String",
    "format": "ISO8601",
    "example": "2024-01-15T10:30:00.000Z",
    "description": "Story creation timestamp",
    "required": true,
    "source": "recorded_at from frontend or server timestamp"
  },
  "updated_at": {
    "type": "String",
    "format": "ISO8601",
    "example": "2024-01-15T10:35:00.000Z",
    "description": "Last modification timestamp",
    "required": true,
    "auto_update": true
  },
  "transcribe_job_name": {
    "type": "String",
    "format": "job-name",
    "example": "story-1692123456789-abc123def-transcription",
    "description": "AssemblyAI job identifier for status tracking",
    "required": false,
    "processing_stage": "During transcription"
  },
  "user_agent": {
    "type": "String",
    "maxLength": 500,
    "example": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    "description": "Browser/device information for analytics",
    "required": false
  },
  "audio_duration_seconds": {
    "type": "Number",
    "format": "integer",
    "example": 180,
    "description": "Audio duration in seconds from AssemblyAI",
    "required": false,
    "processing_stage": "After transcription"
  },
  "video_url": {
    "type": "String",
    "format": "url",
    "example": "https://storiesofyou-stories.s3.us-east-2.amazonaws.com/videos/story-123_complete.mp4",
    "description": "S3 URL for generated video file",
    "required": false,
    "processing_stage": "After video generation"
  }
}
```

### Future Tables (Roadmap)

#### `storiesofyou-otp-codes`
**Purpose:** Email-based authentication for storyboard access
```json
{
  "email": "String (Hash Key)",
  "otp_code": "String (6-digit)",
  "expires_at": "Number (Unix timestamp)",
  "created_at": "String (ISO8601)",
  "attempts": "Number (retry counter)"
}
```

#### `storiesofyou-sessions`
**Purpose:** User session management
```json
{
  "session_token": "String (Hash Key)",
  "email": "String",
  "created_at": "String (ISO8601)",
  "expires_at": "Number (Unix timestamp)",
  "last_activity": "String (ISO8601)"
}
```

#### `storiesofyou-share-links`
**Purpose:** Family sharing permissions
```json
{
  "share_token": "String (Hash Key)",
  "storyteller_email": "String",
  "recipient_email": "String",
  "story_access": "Array (story_ids)",
  "created_at": "String (ISO8601)",
  "expires_at": "Number (Unix timestamp)"
}
```

## S3 Storage Schema

### Bucket: `storiesofyou-incoming`
**Purpose:** Temporary storage for user uploads
**Region:** us-east-2
**Versioning:** Disabled
**Lifecycle:** Delete objects after 30 days

#### Directory Structure
```
storiesofyou-incoming/
├── {session-uuid}/
│   ├── audio.webm                 # Original audio recording
│   ├── audio.mp4                  # Alternative format
│   ├── audio.wav                  # Alternative format
│   └── photo.jpg                  # Optional user photo
└── presigned-uploads/             # Temporary upload staging
    └── {upload-uuid}/
        └── {filename}
```

#### File Naming Conventions
```javascript
// Session ID format
const sessionId = crypto.randomUUID(); // "21a5aeaa-5edf-422a-9ba8-a56b26d0f347"

// Audio file naming
const audioKey = `${sessionId}/audio.${extension}`; // webm, mp4, wav

// Photo file naming  
const photoKey = `${sessionId}/photo.${extension}`; // jpg, png, webp
```

### Bucket: `storiesofyou-stories`
**Purpose:** Public story delivery and generated assets
**Region:** us-east-2
**Versioning:** Enabled
**Website Hosting:** Enabled
**CloudFront:** stories.storiesofyou.ai

#### Directory Structure
```
storiesofyou-stories/
├── {story-id}.html                # Individual story pages
├── videos/
│   └── {story-id}_complete.mp4    # Generated video files
├── generated-images/
│   ├── {story-id}-1.png          # AI-generated image 1
│   ├── {story-id}-2.png          # AI-generated image 2
│   └── {story-id}-3.png          # AI-generated image 3
├── video-jobs/
│   └── {story-id}.json           # Video generation job tracking
├── assets/
│   ├── logo.png                  # Brand assets
│   ├── favicon.ico              # Site favicon
│   └── warm-background.png       # Video background
└── music-library/                # Background music files
    ├── adventurous/
    ├── family/
    ├── nostalgic/
    └── reflective/
```

## API Data Models

### N8N Webhook Input Schema

#### Story Submission Webhook
**Endpoint:** `https://mikelandin.app.n8n.cloud/webhook/storiesofyou-submit`
**Method:** POST
**Content-Type:** application/json

```json
{
  "name": {
    "type": "string",
    "required": true,
    "maxLength": 100,
    "validation": "Non-empty, trimmed"
  },
  "email": {
    "type": "string", 
    "required": true,
    "format": "email"
  },
  "prompt": {
    "type": "string",
    "required": false,
    "maxLength": 500,
    "default": ""
  },
  "audio_key": {
    "type": "string",
    "required": true,
    "format": "s3-key",
    "description": "S3 key after successful upload"
  },
  "photo_key": {
    "type": "string",
    "required": false,
    "format": "s3-key",
    "description": "S3 key for user photo, null if none"
  },
  "recorded_at": {
    "type": "string",
    "required": true,
    "format": "ISO8601"
  },
  "user_agent": {
    "type": "string",
    "required": false,
    "maxLength": 500
  }
}
```

### External API Schemas

#### AssemblyAI Transcription Request
```json
{
  "audio_url": "string (https URL)",
  "content_safety": true,
  "content_safety_confidence": 75,
  "punctuate": true,
  "format_text": true
}
```

#### AssemblyAI Response Schema
```json
{
  "id": "string",
  "status": "enum [queued, processing, completed, error]",
  "text": "string (transcript)",
  "audio_duration": "number (seconds)",
  "content_safety_labels": {
    "status": "string",
    "results": [
      {
        "text": "string",
        "labels": [
          {
            "label": "string",
            "confidence": "number (0-1)"
          }
        ]
      }
    ]
  }
}
```

#### Claude AI Request Schema
```json
{
  "model": "claude-3-haiku-20240307",
  "max_tokens": 4000,
  "messages": [
    {
      "role": "user",
      "content": "string (processing prompt + transcript)"
    }
  ]
}
```

#### Claude AI Response Schema
```json
{
  "cleaned_transcript": "string (enhanced text)",
  "image_prompt": "string (visual description)"
}
```

#### Replicate Image Generation Request
```json
{
  "version": "ideogram-ai/ideogram-v3-turbo",
  "input": {
    "prompt": "string (enhanced with safety constraints)",
    "aspect_ratio": "16:9"
  }
}
```

## Processing State Machine

### Story Status Progression
```
submitted → transcribing → generating → completed
    ↓              ↓           ↓
  failed       rejected    failed
```

#### Status Definitions
- **submitted:** Initial state after webhook receipt
- **transcribing:** AssemblyAI processing audio
- **generating:** Content enhancement and asset generation
- **completed:** Story page generated and accessible
- **rejected:** Failed toxicity check (score > 0.5)
- **failed:** Technical error during processing

### Data Dependencies
```
Audio Upload (Frontend)
    ↓
Story Metadata (DynamoDB)
    ↓
AssemblyAI Transcript + Toxicity
    ↓
Claude Enhancement + Image Prompts
    ↓
Replicate Image Generation
    ↓
MediaConvert Video Assembly
    ↓
Story Page Generation
    ↓
Email Notification
```

## Data Validation Rules

### Input Validation
```javascript
// Name validation
const nameValid = name.trim().length > 0 && name.length <= 100;

// Email validation  
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailValid = emailRegex.test(email);

// Audio key validation
const audioKeyValid = audioKey && audioKey.includes('/') && 
                     (audioKey.endsWith('.webm') || audioKey.endsWith('.mp4') || audioKey.endsWith('.wav'));

// Prompt validation
const promptValid = !prompt || prompt.length <= 500;
```

### Content Safety Rules
```javascript
// Toxicity threshold
const TOXICITY_THRESHOLD = 0.5;
const contentSafe = toxicityScore <= TOXICITY_THRESHOLD;

// Required safety labels to check
const UNSAFE_LABELS = ['hate_speech', 'harassment', 'violence_graphic', 'sexual_content'];
const hasUnsafeContent = contentSafetyLabels.some(label => 
  UNSAFE_LABELS.includes(label.label) && label.confidence > 0.75
);
```

### File Size Limits
```javascript
const FILE_LIMITS = {
  audio: {
    maxSize: 100 * 1024 * 1024,    // 100MB
    maxDuration: 600,               // 10 minutes
    allowedFormats: ['webm', 'mp4', 'wav', 'mp3']
  },
  photo: {
    maxSize: 10 * 1024 * 1024,     // 10MB
    maxDimensions: 4096,            // 4K max width/height
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp']
  }
};
```

## Error Handling Schema

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)",
    "timestamp": "string (ISO8601)",
    "story_id": "string (if available)"
  }
}
```

### Common Error Codes
```javascript
const ERROR_CODES = {
  VALIDATION_ERROR: 'Invalid input data',
  TRANSCRIPTION_FAILED: 'Audio transcription failed',
  CONTENT_REJECTED: 'Content failed safety check',
  GENERATION_FAILED: 'Asset generation failed',
  STORAGE_ERROR: 'File storage operation failed',
  SERVICE_UNAVAILABLE: 'External service temporarily unavailable'
};
```

## Migration Considerations

### Data Consistency Rules
1. **Never delete story_id** - it's referenced across all systems
2. **Preserve audio_key** - required for video regeneration
3. **Maintain status progression** - don't skip states
4. **Keep timestamps in UTC** - all dates in ISO8601 format
5. **Validate before updates** - use schema validation

### Backup Strategy
```javascript
// Critical fields that must be preserved
const CRITICAL_FIELDS = [
  'story_id', 'name', 'email', 'audio_key', 
  'created_at', 'status', 'story_url'
];

// Regenerable fields (can be recomputed)
const REGENERABLE_FIELDS = [
  'transcript', 'transcript_clean', 'image_prompts',
  'video_url', 'toxicity_score', 'audio_duration_seconds'
];
```

### Schema Evolution Guidelines
- **Additive changes only** during production
- **Default values** for new optional fields
- **Migration scripts** for breaking changes
- **Version tracking** in metadata
- **Rollback procedures** documented

This schema documentation ensures data consistency and provides clear guidelines for development, migration, and troubleshooting across the entire Stories of You platform.