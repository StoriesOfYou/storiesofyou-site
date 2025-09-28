// FIXED: Image Aggregation - Properly defines hasUserPhoto
console.log('=== FIXED IMAGE AGGREGATION FOR VIDEO GENERATION ===');

// Get story metadata from the original Prepare Story Data node
const originalData = $('Prepare Story Data').first().json;

// DEFINE hasUserPhoto - this was missing!
const hasUserPhoto = !!(originalData.photo_key && 
                      originalData.photo_key !== 'default-story-image.jpg' &&
                      originalData.photo_key !== '' &&
                      originalData.photo_key !== null);

console.log('Story ID:', originalData.story_id);
console.log('Photo key:', originalData.photo_key);
console.log('Has user photo:', hasUserPhoto);

// Process all merged items to extract AI-generated image keys
const generatedImageKeys = [];
const allItems = $input.all();

console.log('Processing', allItems.length, 'merged items');

allItems.forEach((item, index) => {
  console.log(`Item ${index}:`, JSON.stringify(item.json, null, 2));
  
  // Check for S3 upload response with Key field
  if (item.json && item.json.Key) {
    const key = item.json.Key;
    
    // Only collect AI-generated images (not user photos)
    if (key.includes('generated-images/') && key.includes(originalData.story_id)) {
      generatedImageKeys.push(key);
      console.log(`✅ Added AI image: ${key}`);
    }
  }
  
  // Alternative: Check for other possible key structures
  if (item.json && item.json.key && item.json.key.includes('generated-images/')) {
    if (!generatedImageKeys.includes(item.json.key)) {
      generatedImageKeys.push(item.json.key);
      console.log(`✅ Added AI image (alt key): ${item.json.key}`);
    }
  }
});

// Sort to ensure consistent ordering (1, 2, 3)
generatedImageKeys.sort((a, b) => {
  const getNum = (key) => {
    const match = key.match(/-(\d+)\.png$/);
    return match ? parseInt(match[1]) : 0;
  };
  return getNum(a) - getNum(b);
});

console.log('Generated image keys found:', generatedImageKeys);

// Build complete image structure for video generation
const videoImageStructure = {
  storyId: originalData.story_id,
  hasUserPhoto: hasUserPhoto,
  userPhotoKey: hasUserPhoto ? originalData.photo_key : null,
  generatedImageKeys: generatedImageKeys,
  
  // Build complete S3 URLs for video generation
  imageSequence: [],
  
  // Metadata for debugging
  totalExpectedImages: 3, // Always 3 total images
  aiImageCount: generatedImageKeys.length,
  processingTimestamp: new Date().toISOString()
};

// Build the video image sequence based on whether user provided a photo
if (hasUserPhoto) {
  // SCENARIO X: User provided photo + AI images 2,3 (AI Image 1 was not generated)
  videoImageStructure.imageSequence = [
    {
      type: 'user_photo',
      s3Key: originalData.photo_key,
      s3Url: `s3://storiesofyou-incoming/${originalData.photo_key}`
    },
    {
      type: 'ai_generated',
      s3Key: generatedImageKeys.find(key => key.includes('-2.png')) || null,
      s3Url: generatedImageKeys.find(key => key.includes('-2.png')) ? 
             `s3://storiesofyou-stories/${generatedImageKeys.find(key => key.includes('-2.png'))}` : null
    },
    {
      type: 'ai_generated', 
      s3Key: generatedImageKeys.find(key => key.includes('-3.png')) || null,
      s3Url: generatedImageKeys.find(key => key.includes('-3.png')) ? 
             `s3://storiesofyou-stories/${generatedImageKeys.find(key => key.includes('-3.png'))}` : null
    }
  ];
  
  console.log('✅ SCENARIO X: User photo + AI images 2,3');
} else {
  // SCENARIO Y: No user photo, use AI images 1,2,3
  videoImageStructure.imageSequence = [
    {
      type: 'ai_generated',
      s3Key: generatedImageKeys.find(key => key.includes('-1.png')) || null,
      s3Url: generatedImageKeys.find(key => key.includes('-1.png')) ? 
             `s3://storiesofyou-stories/${generatedImageKeys.find(key => key.includes('-1.png'))}` : null
    },
    {
      type: 'ai_generated',
      s3Key: generatedImageKeys.find(key => key.includes('-2.png')) || null, 
      s3Url: generatedImageKeys.find(key => key.includes('-2.png')) ? 
             `s3://storiesofyou-stories/${generatedImageKeys.find(key => key.includes('-2.png'))}` : null
    },
    {
      type: 'ai_generated',
      s3Key: generatedImageKeys.find(key => key.includes('-3.png')) || null,
      s3Url: generatedImageKeys.find(key => key.includes('-3.png')) ? 
             `s3://storiesofyou-stories/${generatedImageKeys.find(key => key.includes('-3.png'))}` : null
    }
  ];
  
  console.log('✅ SCENARIO Y: AI images 1,2,3');
}

// Validate that we have all required images
const missingImages = videoImageStructure.imageSequence.filter(img => !img.s3Url);
if (missingImages.length > 0) {
  console.error('❌ MISSING REQUIRED IMAGES:', {
    hasUserPhoto: hasUserPhoto,
    expectedScenario: hasUserPhoto ? 'X (user photo + AI 2,3)' : 'Y (AI 1,2,3)',
    missingCount: missingImages.length,
    allGeneratedKeys: generatedImageKeys,
    missingImages: missingImages
  });
  
  // Don't throw error, just log it and continue with available images
  console.warn('Continuing with available images...');
}

console.log('✅ Video image structure complete:', JSON.stringify(videoImageStructure, null, 2));

// Return complete structure for Lambda
return {
  json: {
    // Image data for Lambda
    ...videoImageStructure,
    
    // Keep original story data
    name: originalData.name,
    email: originalData.email,
    prompt: originalData.prompt,
    audio_key: originalData.audio_key,
    
    // For backward compatibility with existing Lambda
    allImageUrls: videoImageStructure.imageSequence.map(img => img.s3Url).filter(url => url),
    
    // Debug info
    debugInfo: {
      mergedItemCount: allItems.length,
      foundAIImages: generatedImageKeys.length,
      hasAllRequiredImages: missingImages.length === 0,
      scenario: hasUserPhoto ? 'user_photo_scenario' : 'ai_only_scenario'
    }
  }
};
