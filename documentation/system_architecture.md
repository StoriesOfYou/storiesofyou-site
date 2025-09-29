# Stories of You - System Architecture Overview

## Executive Summary

Stories of You is a voice recording platform that preserves family memories by transforming audio recordings into polished, shareable story pages with video content. The system uses a serverless AWS architecture orchestrated by N8N workflows, processing audio through AI services to generate transcripts, clean content, create visual assets, and produce branded video stories.

**Core Value Proposition:** Transform a simple voice recording into a professional story page with video, transcript, and sharing capabilities in 5-10 minutes of automated processing.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Processing    │    │   Storage &     │
│   (Static)      │    │   (N8N + AWS)   │    │   Delivery      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
│                      │                      │
│ • GitHub Pages       │ • N8N Workflows     │ • S3 Buckets
│ • Recording UI       │ • AssemblyAI        │ • CloudFront CDN
│ • Story Display      │ • Claude AI         │ • DynamoDB
│                      │ • MediaConvert      │ • Email Delivery
│                      │ • Lambda Functions  │
```

## Component Architecture

### 1. Frontend Layer (Static Hosting)

**Primary Domain:** `storiesofyou.ai` (GitHub Pages)
- **Technology:** Static HTML/CSS/JavaScript
- **Hosting:** GitHub Pages with custom domain
- **Key Features:**
  - Audio recording interface with MediaRecorder API
  - Story prompt selection (100+ categorized prompts)
  - File upload handling (audio + optional photos)
  - Responsive design for mobile/desktop

**Story Delivery:** `stories.storiesofyou.ai` (CloudFront + S3)
- **Technology:** S3 static website hosting + CloudFront distribution
- **Purpose:** Delivers individual story pages with optimized performance
- **CDN:** CloudFront for global content delivery and HTTPS termination

### 2. Processing Layer (N8N Orchestration)

**N8N Instance:** `mikelandin.app.n8n.cloud`
- **Role:** Central workflow orchestration engine
- **Webhook Endpoint:** `/webhook/storiesofyou-submit`
- **Workflow:** 33-node "StoriesOfYouCreator" workflow
- **Execution Time:** 5-10 minutes per story

**Core Processing Steps:**
1. **Data Validation & Storage** → DynamoDB
2. **Audio Transcription** → AssemblyAI API
3. **Content Moderation** → AssemblyAI toxicity detection
4. **Transcript Enhancement** → Claude AI
5. **Image Generation** → Replicate/Ideogram AI
6. **Video Creation** → AWS Lambda + MediaConvert
7. **Story Page Generation** → HTML template + S3 upload
8. **Email Notification** → SMTP delivery

### 3. Storage & Data Layer

**S3 Buckets:**
```
storiesofyou-incoming/
├── {session_id}/
│   ├── audio.webm          # Original recordings
│   └── photo.jpg           # Optional user photos
└── presigned-uploads/      # Temporary upload URLs

storiesofyou-stories/
├── videos/
│   └── {story_id}_complete.mp4    # Generated videos
├── generated-images/
│   └── {story_id}-{n}.png         # AI-generated images
├── {story_id}.html                # Individual story pages
└── logo.png                       # Brand assets
```

**DynamoDB Table:** `storiesofyou-recordings`
```json
{
  "story_id": "story-1234567890-abc123",
  "name": "Storyteller Name",
  "email": "user@example.com", 
  "prompt": "What was your childhood home like?",
  "audio_key": "session-id/audio.webm",
  "photo_key": "session-id/photo.jpg",
  "transcript": "Original transcription text",
  "transcript_clean": "Enhanced by Claude",
  "toxicity_score": 0.1,
  "status": "completed",
  "story_url": "https://stories.storiesofyou.ai/story-123.html",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z"
}
```

## Detailed Processing Workflow

### Phase 1: Story Submission & Validation
```
User Records Story
      ↓
Frontend JavaScript
      ↓
Lambda Presigned URLs ← S3 Upload → storiesofyou-incoming/
      ↓
N8N Webhook Trigger
      ↓
Prepare Story Data (Generate story_id, validate inputs)
      ↓
Create Story in DynamoDB (status: "submitted")
```

### Phase 2: Audio Processing & Transcription
```
Start AssemblyAI Transcription
      ↓
Update DynamoDB (status: "transcribing")
      ↓
Wait 60 seconds
      ↓
Check AssemblyAI Status (poll until complete)
      ↓
Extract Transcript + Toxicity Analysis
```

**AssemblyAI Configuration:**
- **Endpoint:** `https://api.assemblyai.com/v2/transcript`
- **Features:** Transcription + content safety detection
- **Toxicity Threshold:** 0.5 (stories above this are rejected)
- **Processing Time:** 30-120 seconds depending on audio length

### Phase 3: Content Enhancement & Moderation
```
Toxicity Score ≤ 0.5?
      ↓ (Yes)
Claude AI Processing
├── Clean transcript (remove filler words)
├── Fix grammar and punctuation
├── Generate detailed image prompt
└── Maintain authentic voice
      ↓ (No)
Update DynamoDB (status: "rejected")
```

**Claude Integration:**
- **Model:** Claude 3 Haiku
- **Task:** Transcript cleaning + image prompt generation
- **Input:** Raw AssemblyAI transcript
- **Output:** Enhanced transcript + detailed visual scene description
- **Processing Time:** 10-30 seconds

### Phase 4: Visual Asset Generation

**Image Generation Path:**
```
User Photo Provided?
├── Yes → Use user photo as Image 1
│         Generate AI Images 2,3 (Replicate API)
└── No  → Generate AI Images 1,2,3 (Replicate API)
      ↓
Download Images from Stream URLs
      ↓
Upload to S3 (storiesofyou-stories/generated-images/)
      ↓
Smart Music Selection (based on story content)
```

**Replicate Configuration:**
- **Model:** `ideogram-ai/ideogram-v3-turbo`
- **Aspect Ratio:** 16:9 for video compatibility
- **Prompt Enhancement:** Claude-generated descriptions + family-friendly constraints
- **Processing Time:** 30-60 seconds per image

**Music Selection Algorithm:**
- **Categories:** nostalgic, family, adventurous, reflective
- **Keyword Matching:** Story content → music category
- **Duration Variants:** 30s, 60s, 90s, 120s, 150s, 180s, 210s, 240s
- **Audio Mixing:** -25dB background music with speech at 0dB

### Phase 5: Video Generation & Assembly
```
AWS Lambda: storiesofyou-video-generation
      ↓
MediaConvert Job Creation
├── Audio Track: Story recording (0dB)
├── Background Music: Selected track (-25dB)  
├── Image Sequence: Ken Burns effects
├── Brand Overlays: Logo + attribution
└── Output: 1920x1080 MP4, H.264, AAC
      ↓
S3 Output: storiesofyou-stories/videos/{story_id}_complete.mp4
```

**MediaConvert Configuration:**
- **Video:** 1920x1080, H.264, 3Mbps CBR, 30fps
- **Audio:** 2-channel stereo, AAC, 128kbps
- **Processing Time:** 3-8 minutes depending on story length
- **Features:** Ken Burns effects, branded intro/outro, corner logo overlay

### Phase 6: Story Page Generation & Delivery
```
Generate Story Page HTML
├── Responsive template with branded styling
├── Embedded video player with fallback audio
├── Enhanced transcript with toggle view
├── Social sharing buttons (Facebook, Twitter, Email)
└── Download options (MP4, MP3, PDF)
      ↓
Upload to S3 (public-read)
      ↓
Update DynamoDB (story_url, status: "completed")
      ↓
Send Email Notification (SMTP)
```

## Integration Architecture

### External Services

**AssemblyAI** (Primary Transcription)
- **API:** REST with polling pattern
- **Authentication:** API key in N8N credentials
- **Features:** Speech-to-text + content moderation
- **SLA:** 99.9% uptime, typically 30-120s processing

**Claude AI** (Content Enhancement)
- **API:** Anthropic REST API
- **Model:** Claude 3 Haiku (cost-optimized)
- **Usage:** ~500-2000 tokens per story
- **Cost:** ~$0.01-0.05 per story

**Replicate** (Image Generation)
- **API:** REST with webhook callbacks
- **Model:** Ideogram v3 Turbo
- **Output:** High-quality 16:9 images
- **Cost:** ~$0.002 per image

### AWS Services Integration

**Lambda Functions:**
- `storiesofyou-presigned-urls`: Generate S3 upload URLs
- `storiesofyou-video-generation`: MediaConvert orchestration  
- `storiesofyou-image-converter`: PNG conversion for video

**MediaConvert:**
- **Queue:** Default queue for cost optimization
- **Templates:** Custom job template for Stories of You branding
- **IAM Role:** MediaConvertRole with S3 and CloudWatch permissions

**CloudFront Distribution:**
- **Domain:** stories.storiesofyou.ai
- **Origin:** storiesofyou-stories S3 bucket
- **Caching:** 24-hour TTL for story pages, 1-year for assets
- **Security:** HTTPS only, HSTS headers

## Security Architecture

### Authentication & Authorization
- **Current State:** No user authentication (open beta)
- **Planned:** OTP-based email authentication for storyboard access
- **Session Management:** JWT tokens with httpOnly cookies
- **CSRF Protection:** Double-submit cookie pattern

### Data Protection
- **Encryption in Transit:** HTTPS/TLS 1.3 for all communications
- **Encryption at Rest:** S3 server-side encryption (SSE-S3)
- **Access Control:** S3 bucket policies + CloudFront OAC
- **Content Moderation:** AssemblyAI toxicity detection + manual review capability

### API Security
- **N8N Webhooks:** Header-based authentication
- **Rate Limiting:** CloudFront + AWS WAF (planned)
- **Input Validation:** Comprehensive validation in N8N workflows
- **Error Handling:** Sanitized error messages, detailed logging

## Performance Characteristics

### Processing Times
- **Audio Upload:** 5-30 seconds (depends on file size/connection)
- **Transcription:** 30-120 seconds (depends on audio length)
- **Content Enhancement:** 10-30 seconds (Claude processing)
- **Image Generation:** 30-60 seconds per image
- **Video Creation:** 3-8 minutes (MediaConvert)
- **Total End-to-End:** 5-10 minutes typical

### Scalability Limits
- **N8N Concurrent Executions:** 5 workflows (current plan limit)
- **AssemblyAI:** 32 concurrent jobs (API limit)
- **MediaConvert:** No practical limit with proper queue management
- **S3/CloudFront:** Virtually unlimited scale
- **Current Bottleneck:** N8N workflow concurrency

### Cost Structure (Per Story)
- **AssemblyAI:** ~$0.006 per minute of audio
- **Claude AI:** ~$0.01-0.05 per story  
- **Replicate Images:** ~$0.006 (3 images × $0.002 each)
- **MediaConvert:** ~$0.02-0.08 per minute of video
- **AWS Storage/Bandwidth:** ~$0.001-0.005 per story
- **Total Estimated Cost:** $0.05-0.15 per story

## Deployment Architecture

### Environments
- **Production:** storiesofyou.ai + stories.storiesofyou.ai
- **Development:** Local testing + N8N test workflows
- **Staging:** Planned for post-MVP

### Monitoring & Observability
- **N8N:** Built-in execution logs and error tracking
- **AWS CloudWatch:** Lambda metrics, MediaConvert job status
- **Manual Monitoring:** Email notifications for failed workflows
- **Planned:** Comprehensive dashboard with success/failure metrics

### Backup & Recovery
- **DynamoDB:** Point-in-time recovery enabled
- **S3:** Versioning enabled, cross-region replication planned
- **Code:** GitHub repositories with automated backups
- **Recovery RTO:** 4-8 hours for complete system restore

## Technical Debt & Future Architecture

### Current Limitations
1. **Single Point of Failure:** N8N instance dependency
2. **Limited Scalability:** 5 concurrent workflow limit
3. **Manual Monitoring:** No automated alerting system
4. **No User Authentication:** Open access during beta
5. **Monolithic Workflow:** 33-node workflow difficult to maintain

### Migration Path (Post-MVP)
1. **Authentication System:** OTP-based login with storyboard access
2. **Microservices Migration:** Break N8N workflow into discrete services
3. **Container Deployment:** ECS/Fargate for better scalability
4. **API Gateway:** Centralized API management with rate limiting
5. **Enhanced Monitoring:** CloudWatch dashboards + SNS alerting

### Scalability Targets
- **100 stories/day:** Current architecture sufficient
- **1,000 stories/day:** Requires N8N plan upgrade or migration
- **10,000+ stories/day:** Full microservices architecture needed

## Decision Log & Rationale

### Why This Architecture?

**N8N Choice:**
- ✅ Rapid prototyping and workflow visualization
- ✅ Built-in integrations for AWS, AI services
- ✅ No backend infrastructure management required
- ❌ Vendor lock-in and scalability limitations

**Static Hosting Choice:**
- ✅ Cost-effective and globally distributed
- ✅ High availability and performance
- ✅ Simple deployment and maintenance
- ❌ Limited dynamic functionality

**AWS Services Choice:**
- ✅ Mature, reliable services with good documentation
- ✅ Pay-per-use pricing model
- ✅ Strong integration ecosystem
- ❌ Potential for complex billing and configuration

### Key Architectural Decisions

1. **AssemblyAI over AWS Transcribe:** Better content moderation and accuracy
2. **Claude for Enhancement:** Superior output quality vs. GPT alternatives
3. **MediaConvert for Video:** Professional-grade video processing capabilities
4. **S3 Static Hosting:** Cost-effective, scalable story delivery
5. **Single Workflow Approach:** Faster MVP development vs. microservices complexity

This architecture successfully balances rapid development, cost-effectiveness, and professional output quality while maintaining a clear path for future scalability and feature enhancement.