# Stories of You - Development Context

*This file bridges conversations between Claude.ai and Cursor Claude*

## Project Overview

**Stories of You** is a family memory preservation service that helps people record and share personal stories in their own voice.

### Current Architecture
- **Frontend**: Static HTML/JS hosted on S3 + CloudFront
- **Backend**: N8N workflows for processing
- **Storage**: S3 for files, DynamoDB for metadata
- **Processing**: AWS Lambda for video generation
- **AI**: Claude for transcript cleaning and content generation

### Hosting Setup
- **Main site**: storiesofyou.ai (GitHub Pages)
- **Story pages**: stories.storiesofyou.ai (S3 + CloudFront)
- **Processing**: N8N at mikelandin.app.n8n.cloud

## Current State (Pre-Week 1)

### What's Working ✅
- Individual story recording and generation
- N8N workflow: audio → transcript → video → story page
- Claude integration for transcript cleaning
- Email delivery of completed stories
- Individual story pages with social sharing

### What We're Building (Week 1-6 Roadmap)

#### Week 1: Simple Storyboard 🎯
**Goal**: Basic "view all my stories" functionality
- OTP login system (email-based authentication)
- Simple storyboard page listing user's stories
- 3 new N8N workflows: generate-otp, verify-otp, storyboard-data
- New DynamoDB table: storiesofyou-otp-codes

#### Week 2: Basic Sharing 🔗
- Family sharing with email verification
- Shared access tokens
- Read-only story viewing for family members

#### Week 3: Family Billing Foundation 💳
- Separate billing accounts from storytellers
- Account holder dashboard
- Storyteller invitation system

#### Week 4: Mobile Optimization 📱
- Mobile-first storyboard experience
- Download system for stories
- PWA features

#### Week 5-6: Advanced Features ⚡
- Subscription billing (Stripe)
- Analytics and insights
- Polish and launch prep

## Week 1 Detailed Plan

### Day 1 (Today): N8N OTP Workflows
**Files to Create**:
1. `workflows/generate-otp.json` - Email → 6-digit code → DynamoDB → Email
2. `workflows/verify-otp.json` - Email + code → Session token
3. `workflows/storyboard-data.json` - Session token → User's stories

**DynamoDB Table Needed**:
- `storiesofyou-otp-codes` (email, code, expires_at, created_at)

### Day 2: Login Page
**File to Create**:
- `frontend/login.html` - Email input → OTP verification → Session

### Day 3: Storyboard Page  
**File to Create**:
- `frontend/storyboard.html` - List user's stories, record new story

### Day 4-5: Testing & Polish
- End-to-end flow testing
- Mobile responsiveness
- Error handling

## Technical Decisions Made

### Authentication Strategy
- **Method**: Email-based OTP (One-Time Password)
- **Session Duration**: 2 hours
- **Code Expiry**: 10 minutes
- **Storage**: DynamoDB for codes and sessions
- **Delivery**: Email via existing N8N SMTP

### Security Considerations
- HTTPS everywhere (CloudFront enforced)
- JWT tokens for session management
- Input validation and sanitization
- Rate limiting on OTP generation
- Secure token storage (httpOnly cookies planned)

### File Structure
```
storiesofyou/
├── workflows/           # N8N JSON exports
│   ├── StoriesOfYouCreator.json (existing)
│   ├── generate-otp.json (Week 1)
│   ├── verify-otp.json (Week 1)
│   └── storyboard-data.json (Week 1)
├── frontend/            # Static HTML/JS files
│   ├── index.html (existing - main site)
│   ├── about.html (existing)
│   ├── login.html (Week 1)
│   └── storyboard.html (Week 1)
├── lambda/              # AWS Lambda functions
│   ├── video-generator.js (existing)
│   └── image-converter.js (existing)
└── docs/               # Documentation
    └── cursor-context.md (this file)
```

## N8N Webhook Endpoints

### Existing
- `POST /storiesofyou-submit` - Story submission (working)

### Week 1 New Endpoints
- `POST /generate-otp` - Generate and send OTP code
- `POST /verify-otp` - Verify code and create session
- `GET /storyboard-data` - Get user's stories (authenticated)

## Current N8N Workflow Overview

The existing `StoriesOfYouCreator.json` workflow:
1. **Webhook** receives story submission (name, email, audio, photo)
2. **Prepare Data** generates unique story ID, validates inputs
3. **DynamoDB** stores story metadata
4. **AssemblyAI** transcribes audio with toxicity checking
5. **Claude** cleans transcript and generates image prompts
6. **Replicate** creates AI images (if no user photo)
7. **Lambda** generates video with music and images
8. **HTML Generation** creates story page
9. **S3 Upload** publishes story page
10. **Email** sends completion notification

## Key Integration Points

### DynamoDB Tables
- `storiesofyou-recordings` (existing stories)
- `storiesofyou-otp-codes` (Week 1 - new)

### S3 Buckets
- `storiesofyou-incoming` (audio uploads)
- `storiesofyou-stories` (generated content, story pages)

### External Services
- AssemblyAI (transcription)
- Claude API (content processing)
- Replicate (image generation)
- SMTP (email delivery)

## User Types & Permissions

### Current (Pre-Week 1)
- **Anonymous users**: Can record stories, receive email links
- **No authentication**: Stories accessed via direct URLs only

### Week 1 Target
- **Authenticated storytellers**: Can log in, view their stories
- **Session-based access**: 2-hour sessions with OTP login
- **Email-based identity**: No passwords, just OTP verification

### Future (Week 2+)
- **Account holders**: Pay bills, manage family storytellers
- **Family members**: Shared access to specific stories
- **Storytellers**: Create content, manage sharing

## Important Context for Cursor Claude

1. **The user (Michael) is learning to code** - explain concepts clearly
2. **N8N is the preferred backend** - familiar tool, visual workflow
3. **Static hosting strategy** - S3/CloudFront, no traditional server
4. **MVP focus** - ship in 6 weeks, iterate after
5. **Mobile-first users** - many storytellers will use phones
6. **Family-oriented product** - simplicity over features

## Next Steps

When ready to start Week 1 development:
1. Create the three N8N workflows (Day 1)
2. Set up DynamoDB table for OTP codes
3. Build login.html with OTP flow
4. Build storyboard.html with story listing
5. Test end-to-end authentication flow

## Questions for Development

- Should we implement rate limiting on OTP generation?
- How should we handle expired sessions gracefully?
- What error messages are appropriate for family users?
- Should the storyboard work on mobile devices?
- How do we handle users with no stories yet?

---

*Last updated: [Current Date]*
*Source conversation: Claude.ai chat with Michael*