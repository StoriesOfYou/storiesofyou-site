// FIXED: Generate Multiple AI Images using Claude's unique progressive prompts
const claudeData = $json;
const originalData = $('Prepare Story Data').first().json;
const hasUserPhoto = originalData.photo_key && originalData.photo_key !== 'default-story-image.jpg';

// Determine how many images to generate
const imagesToGenerate = hasUserPhoto ? 2 : 3;

console.log(`Generating ${imagesToGenerate} AI images (user photo: ${hasUserPhoto})`);

// CRITICAL FIX: Use Claude's three unique progressive prompts
const imagePrompts = [];

if (hasUserPhoto) {
  // User has photo, so skip first AI image, use prompts 2 and 3
  imagePrompts.push(claudeData.image_prompt_2 || 'nostalgic scene, warm golden lighting, no people');
  imagePrompts.push(claudeData.image_prompt_3 || 'nostalgic scene, warm golden lighting, no people');
} else {
  // No user photo, use all three unique prompts from Claude
  imagePrompts.push(claudeData.image_prompt_1 || 'nostalgic scene, warm golden lighting, no people');
  imagePrompts.push(claudeData.image_prompt_2 || 'nostalgic scene, warm golden lighting, no people');
  imagePrompts.push(claudeData.image_prompt_3 || 'nostalgic scene, warm golden lighting, no people');
}

console.log('Using unique progressive prompts:', imagePrompts);

// Return the data needed for multiple Replicate calls
return {
  json: {
    ...claudeData,
    
    // Image generation config
    images_to_generate: imagesToGenerate,
    has_user_photo: hasUserPhoto,
    image_prompts: imagePrompts, // Now contains unique prompts
    
    // Keep the individual prompts for reference
    image_prompt_1: claudeData.image_prompt_1,
    image_prompt_2: claudeData.image_prompt_2,
    image_prompt_3: claudeData.image_prompt_3,
    
    // For downstream nodes
    story_id: originalData.story_id,
    
    // Keep all existing data
    music_selection: claudeData.music_selection,
    backgroundMusicUrl: claudeData.backgroundMusicUrl,
    storyDurationSeconds: claudeData.storyDurationSeconds,
    videoTargetLength: claudeData.videoTargetLength
  }
};
