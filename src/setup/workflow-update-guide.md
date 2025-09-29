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

### **RECOMMENDED APPROACH: Add Fields Only at the End**

Since most fields aren't available until the workflow completes, the **safest approach** is to add all new fields only in the **final DynamoDB update**. This avoids any risk of overwriting data or having incomplete information.

### **RECOMMENDED APPROACH: Minimal Updates for Rejected, Full Updates for Completed**

Since DynamoDB field values must map to actual workflow data, we need to:

1. **For rejected stories**: Direct field mapping (minimal data)
2. **For completed stories**: Code node + DynamoDB update (full data)

### **Step 1: Update "Update DynamoDB for Toxicity Fail" (Rejected Stories)**
**Location**: After "Toxicity Check" fails
**Add only these fields** (minimal data for rejected stories):
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "={{ $json.audio_duration_seconds || 0 }}"
},
{
  "fieldId": "video_url",
  "fieldValue": "rejected"
},
{
  "fieldId": "thumbnail_url",
  "fieldValue": "rejected"
},
{
  "fieldId": "story_created_day",
  "fieldValue": "rejected"
},
{
  "fieldId": "file_size_mb",
  "fieldValue": "0"
}
```

**Why minimal data?**
- No images generated → No thumbnail URL
- No video created → No video URL  
- Story rejected → No completion date
- Only audio duration is useful for analytics

### **Step 2: Add Code Node for Completed Stories**
**Location**: Before "Final Dynamo Update with Page URL"
**Add new Code node**:
```javascript
// Prepare storyboard fields for completed stories
const originalData = $('Prepare Story Data').first().json;
const toxicityData = $('Toxicity Check').first().json;

// Audio duration
const audioDuration = toxicityData.audio_duration_seconds || 0;

// Video URL
const videoUrl = `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/videos/${originalData.story_id}_complete.mp4`;

// Thumbnail logic
let thumbnailUrl = '';
if (originalData.photo_key && originalData.photo_key !== 'default-story-image.jpg') {
  thumbnailUrl = `https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/${originalData.photo_key}`;
} else {
  thumbnailUrl = `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/generated-images/${originalData.story_id}-1.png`;
}

// Story created day (completion date)
const storyCreatedDay = new Date().toISOString();

return {
  json: {
    ...originalData,
    ...toxicityData,
    audio_duration_seconds: audioDuration,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    story_created_day: storyCreatedDay,
    file_size_mb: 0 // Could calculate from audio file if needed
  }
};
```

### **Step 3: Update "Final Dynamo Update with Page URL"**
**Add these fields**:
```json
{
  "fieldId": "audio_duration_seconds",
  "fieldValue": "={{ $json.audio_duration_seconds }}"
},
{
  "fieldId": "video_url",
  "fieldValue": "={{ $json.video_url }}"
},
{
  "fieldId": "thumbnail_url",
  "fieldValue": "={{ $json.thumbnail_url }}"
},
{
  "fieldId": "story_created_day",
  "fieldValue": "={{ $json.story_created_day }}"
},
{
  "fieldId": "file_size_mb",
  "fieldValue": "={{ $json.file_size_mb }}"
}
```

### **Why This Approach is Better:**

1. **No risk of overwriting** - Only updates at the very end
2. **All data available** - Video URL, completion date, etc. are all ready
3. **Simpler logic** - Don't need to track field availability throughout workflow
4. **Safer** - Less chance of breaking existing functionality

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
