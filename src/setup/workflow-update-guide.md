# StoriesOfYouCreator Workflow Update Guide

## Overview
This guide shows exactly which fields to add to each DynamoDB operation in the existing StoriesOfYouCreator workflow to support the storyboard functionality.

## New Fields to Add

### Field Definitions
- **`audio_duration_seconds`**: Duration of user's narration (from AssemblyAI)
- **`video_url`**: Direct link to generated video file
- **`thumbnail_url`**: User photo OR first AI-generated image
- **`story_created_day`**: Date when story was completed (for storyboard sorting)
- **`file_size_mb`**: Audio file size in megabytes

## DynamoDB Operations to Update

### 1. "Create Story in DynamoDB" (Initial Creation)
**Location**: First DynamoDB operation after "Prepare Story Data"
**Add these fields**:
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "null"
},
{
  "fieldId": "video_url", 
  "fieldValue": "null"
},
{
  "fieldId": "thumbnail_url",
  "fieldValue": "={{ $('Prepare Story Data').first().json.photo_key && $('Prepare Story Data').first().json.photo_key !== 'default-story-image.jpg' ? 'https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/' + $('Prepare Story Data').first().json.photo_key : null }}"
},
{
  "fieldId": "story_created_day",
  "fieldValue": "null"
},
{
  "fieldId": "file_size_mb",
  "fieldValue": "null"
}
```

### 2. "Update DynamoDB w Status" (Transcribing Status)
**Location**: After "Start AssemblyAI Transcription"
**Add these fields** (keep existing + add new):
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "={{ $('Toxicity Check').first().json.audio_duration_seconds || null }}"
},
{
  "fieldId": "video_url",
  "fieldValue": "null"
},
{
  "fieldId": "thumbnail_url", 
  "fieldValue": "={{ $('Prepare Story Data').first().json.photo_key && $('Prepare Story Data').first().json.photo_key !== 'default-story-image.jpg' ? 'https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/' + $('Prepare Story Data').first().json.photo_key : null }}"
},
{
  "fieldId": "story_created_day",
  "fieldValue": "null"
},
{
  "fieldId": "file_size_mb",
  "fieldValue": "null"
}
```

### 3. "Update Transcript in DynamoDB" (After Toxicity Check)
**Location**: After "Toxicity Check" passes
**Add these fields**:
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "={{ $json.audio_duration_seconds || null }}"
},
{
  "fieldId": "video_url",
  "fieldValue": "null"
},
{
  "fieldId": "thumbnail_url",
  "fieldValue": "={{ $('Prepare Story Data').first().json.photo_key && $('Prepare Story Data').first().json.photo_key !== 'default-story-image.jpg' ? 'https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/' + $('Prepare Story Data').first().json.photo_key : null }}"
},
{
  "fieldId": "story_created_day", 
  "fieldValue": "null"
},
{
  "fieldId": "file_size_mb",
  "fieldValue": "null"
}
```

### 4. "Update DynamoDB for Toxicity Fail" (Rejected Stories)
**Location**: After "Toxicity Check" fails
**Add these fields**:
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "={{ $json.audio_duration_seconds || null }}"
},
{
  "fieldId": "video_url",
  "fieldValue": "null"
},
{
  "fieldId": "thumbnail_url",
  "fieldValue": "={{ $('Prepare Story Data').first().json.photo_key && $('Prepare Story Data').first().json.photo_key !== 'default-story-image.jpg' ? 'https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/' + $('Prepare Story Data').first().json.photo_key : null }}"
},
{
  "fieldId": "story_created_day",
  "fieldValue": "null"
},
{
  "fieldId": "file_size_mb", 
  "fieldValue": "null"
}
```

### 5. "Final Dynamo Update with Page URL" (Completion)
**Location**: Final update after story page generation
**Add these fields**:
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "={{ $('Toxicity Check').first().json.audio_duration_seconds || null }}"
},
{
  "fieldId": "video_url",
  "fieldValue": "={{ 'https://storiesofyou-stories.s3.us-east-2.amazonaws.com/videos/' + $('Prepare Story Data').first().json.story_id + '_complete.mp4' }}"
},
{
  "fieldId": "thumbnail_url",
  "fieldValue": "={{ $('Prepare Story Data').first().json.photo_key && $('Prepare Story Data').first().json.photo_key !== 'default-story-image.jpg' ? 'https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/' + $('Prepare Story Data').first().json.photo_key : 'https://storiesofyou-stories.s3.us-east-2.amazonaws.com/generated-images/' + $('Prepare Story Data').first().json.story_id + '-1.png' }}"
},
{
  "fieldId": "story_created_day",
  "fieldValue": "={{ new Date().toISOString() }}"
},
{
  "fieldId": "file_size_mb",
  "fieldValue": "null"
}
```

## Important Notes

### Thumbnail URL Logic
- **If user provided photo**: Use `https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/{photo_key}`
- **If no user photo**: Use `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/generated-images/{story_id}-1.png`

### Video URL Logic
- **Format**: `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/videos/{story_id}_complete.mp4`
- **Only set when story is completed**

### Story Created Day
- **Set to current timestamp** only when story status becomes "completed"
- **Null for all other statuses**

### Audio Duration
- **Source**: From AssemblyAI response in "Toxicity Check" node
- **Fallback**: Estimated from word count if AssemblyAI doesn't provide it

## Testing Checklist

After updating the workflow:

1. **Test story creation** - Verify new fields are added
2. **Test story completion** - Verify video_url and thumbnail_url are set
3. **Test rejected stories** - Verify fields are still added
4. **Check existing stories** - Run migration script to backfill
5. **Test storyboard** - Verify all fields display correctly

## Migration Script

Run the migration script to add these fields to existing stories:
```bash
node src/setup/add-storyboard-fields.js
```

This will safely add the new fields to all existing stories without breaking anything.
