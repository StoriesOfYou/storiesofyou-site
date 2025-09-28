// N8N Smart Music Selection - FIXED for Shorter Music Selection
// Place this after "Parse Claude JSON" in your workflow

// Get all the data we need
const claudeData = $json;
const originalData = $('Prepare Story Data').first().json;

// Get story duration from Toxicity Check node (AssemblyAI provides this)
const storyDuration = $('Toxicity Check').first().json.audio_duration_seconds || 180;

console.log('=== PRODUCTION MUSIC SELECTION ===');
console.log('Story duration:', storyDuration, 'seconds');
console.log('Original prompt:', originalData.prompt);

// Extract content for analysis
const transcript = claudeData.transcript || originalData.transcript || '';
const prompt = originalData.prompt || '';
const storyContent = (transcript + ' ' + prompt).toLowerCase();

// PRODUCTION MUSIC LIBRARY - matches your actual S3 structure
const musicLibrary = {
  adventurous: [
    { name: 'Easy-Day', mood: 'calm_country', keywords: ['easy', 'calm', 'peaceful', 'simple'] },
    { name: 'Yard-Sale', mood: 'community_folk', keywords: ['community', 'people', 'social', 'gathering', 'sale'] }
  ],
  family: [
    { name: 'Dancing-Star', mood: 'happy_celebration', keywords: ['dancing', 'happy', 'joy', 'celebration', 'party'] },
    { name: 'Seasonal', mood: 'holiday_tradition', keywords: ['season', 'holiday', 'christmas', 'thanksgiving', 'tradition'] },
    { name: 'Serenity', mood: 'peaceful_family', keywords: ['calm', 'peaceful', 'serenity', 'quiet', 'together'] }
  ],
  nostalgic: [
    { name: 'Mysterious-Sorrows', mood: 'general_nostalgia', keywords: ['memory', 'remember', 'past', 'childhood'] },
    { name: 'The-Opening', mood: 'new_beginnings', keywords: ['beginning', 'start', 'new', 'opening', 'first'] },
    { name: 'We-Are-The-Rain', mood: 'loss_sadness', keywords: ['rain', 'sad', 'lost', 'miss', 'gone', 'passed away'] }
  ],
  reflective: [
    { name: 'Passing-Time', mood: 'deep_time_reflection', keywords: ['time', 'aging', 'years', 'lifetime', 'decades', 'mortality'] },
    { name: 'Terminal-D', mood: 'serious_contemplation', keywords: ['serious', 'deep', 'contemplation', 'difficult', 'terminal'] },
    { name: 'Waterfall', mood: 'nature_meditation', keywords: ['nature', 'water', 'waterfall', 'flowing', 'meditation', 'natural'] }
  ]
};

// Available duration variants (what you created manually)
const availableDurations = [30, 60, 90, 120, 150, 180, 210, 240];

/**
 * Smart category detection with keyword scoring
 */
function detectStoryCategory(content) {
  const scores = { adventurous: 0, family: 0, nostalgic: 0, reflective: 0 };
  
  // Category-specific keyword groups with weights
  const categoryKeywords = {
    nostalgic: {
      keywords: ['childhood', 'young', 'growing up', 'remember', 'back then', 'used to', 'school', 'grandpa', 'grandma', 'old house', 'years ago'],
      weight: 2
    },
    family: {
      keywords: ['family', 'home', 'mother', 'father', 'children', 'wedding', 'holiday', 'celebration', 'together', 'siblings', 'relatives'],
      weight: 1.5
    },
    adventurous: {
      keywords: ['travel', 'adventure', 'journey', 'trip', 'explore', 'mountain', 'road trip', 'vacation', 'community', 'country', 'outdoors'],
      weight: 1.5
    },
    reflective: {
      keywords: ['learned', 'wisdom', 'lesson', 'difficult', 'challenge', 'time', 'aging', 'life', 'meaning', 'death', 'serious', 'deep'],
      weight: 1.8
    }
  };
  
  // Score each category
  for (const [category, data] of Object.entries(categoryKeywords)) {
    data.keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        scores[category] += data.weight;
      }
    });
  }
  
  // Find highest scoring category
  const topCategory = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  
  return {
    category: scores[topCategory] > 0 ? topCategory : 'family', // Default to family
    confidence: scores[topCategory],
    allScores: scores
  };
}

/**
 * Select specific track within category using keyword matching
 */
function selectSpecificTrack(category, content) {
  const tracks = musicLibrary[category];
  let bestMatch = tracks[0]; // Default to first track
  let bestScore = 0;
  
  // Score each track based on keyword matches
  tracks.forEach(track => {
    let score = 0;
    track.keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        score += 1;
      }
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = track;
    }
  });
  
  return bestMatch;
}

/**
 * Find optimal duration variant - FIXED to select SHORTER music
 * Music should end BEFORE the story ends, leaving room for outro
 */
function selectOptimalDuration(storyDurationSeconds) {
  // FIXED LOGIC: We want music SHORTER than the story
  // Find the LONGEST music that is still SHORTER than the story
  
  let optimalDuration = 30; // Start with minimum
  
  // Iterate through durations to find the longest that's still shorter
  for (let i = availableDurations.length - 1; i >= 0; i--) {
    const duration = availableDurations[i];
    if (duration <= storyDurationSeconds - 5) { // Leave at least 5 seconds for story to finish without music
      optimalDuration = duration;
      break;
    }
  }
  
  // If story is very short (< 35 seconds), use the 30-second minimum
  if (storyDurationSeconds < 35) {
    optimalDuration = 30;
  }
  
  console.log(`Duration calculation: ${storyDurationSeconds}s story -> selected ${optimalDuration}s music`);
  console.log(`Music will end ${storyDurationSeconds - optimalDuration}s before story ends`);
  return optimalDuration;
}

// Execute main selection logic
const categoryResult = detectStoryCategory(storyContent);
const selectedTrack = selectSpecificTrack(categoryResult.category, storyContent);
const optimalDuration = selectOptimalDuration(storyDuration);

// Build S3 paths using your actual bucket structure
const musicFileName = `${selectedTrack.name}-${optimalDuration}s.mp3`;
const s3Key = `music-library/${categoryResult.category}/${selectedTrack.name}/${musicFileName}`;
const s3Url = `s3://assets.storiesofyou.ai/${s3Key}`;
const httpUrl = `https://assets.storiesofyou.ai/${s3Key}`;

// Audio mixing settings by mood - ADJUSTED for better balance when music ends early
const mixingSettings = {
  adventurous: { volume: 0.12, fadeIn: 2, fadeOut: 3 },
  family: { volume: 0.11, fadeIn: 2, fadeOut: 4 },
  nostalgic: { volume: 0.10, fadeIn: 3, fadeOut: 5 },
  reflective: { volume: 0.08, fadeIn: 4, fadeOut: 6 }
};

const selectedSettings = mixingSettings[categoryResult.category];

// Create comprehensive music selection object
const musicSelection = {
  // Core selection
  category: categoryResult.category,
  track_name: selectedTrack.name,
  track_mood: selectedTrack.mood,
  duration_seconds: optimalDuration,
  
  // File paths
  s3_key: s3Key,
  s3_url: s3Url,
  http_url: httpUrl,
  filename: musicFileName,
  
  // Audio settings - ADJUSTED for early music ending
  volume_level: selectedSettings.volume,
  fade_in_seconds: selectedSettings.fadeIn,
  fade_out_seconds: selectedSettings.fadeOut,
  
  // Selection metadata
  confidence_score: categoryResult.confidence,
  category_scores: categoryResult.allScores,
  keywords_matched: selectedTrack.keywords.filter(k => storyContent.includes(k)),
  
  // Video timing - FIXED for shorter music
  story_duration: storyDuration,
  music_duration: optimalDuration,
  music_ends_before_story_by: storyDuration - optimalDuration,
  
  // Selection reasoning - UPDATED
  selection_reasoning: `Selected "${categoryResult.category}/${selectedTrack.name}" (${selectedTrack.mood}) based on ${categoryResult.confidence} keyword matches. Duration: ${optimalDuration}s music for ${storyDuration}s story. Music ends ${storyDuration - optimalDuration}s before story completion.`
};

console.log('=== MUSIC SELECTION COMPLETE ===');
console.log(`Selected: ${musicSelection.category}/${musicSelection.track_name}`);
console.log(`Duration: ${musicSelection.duration_seconds}s music for ${storyDuration}s story`);
console.log(`Music ends: ${musicSelection.music_ends_before_story_by}s before story`);
console.log(`File: ${musicSelection.filename}`);
console.log(`Confidence: ${categoryResult.confidence} points`);
console.log(`Keywords matched: ${musicSelection.keywords_matched.join(', ')}`);
console.log(`S3 URL: ${s3Url}`);

// Validate selection
if (!selectedTrack || !optimalDuration) {
  throw new Error('Music selection failed - invalid parameters');
}

// Calculate total video duration (story + 3-second buffer for outro)
const videoTotalDuration = storyDuration + 3;

// Return enhanced data for video generation
return {
  json: {
    // Keep all existing Claude data
    ...claudeData,
    
    // Add music selection
    music_selection: musicSelection,
    
    // CRITICAL: Fields for video generation Lambda - ALL 4 FIELDS ADDED
    backgroundMusicUrl: s3Url,
    musicUrl: httpUrl,
    storyDurationSeconds: storyDuration,
    musicDurationSeconds: optimalDuration,
    videoTotalDuration: videoTotalDuration,
    videoTargetLength: videoTotalDuration,  // <-- ADDED THIS MISSING FIELD
    
    // Enhanced metadata for downstream processing
    story_id: originalData.story_id,
    name: originalData.name,
    email: originalData.email,
    prompt: originalData.prompt,
    
    // Processing status
    music_ready: true,
    duration_detected: true,
    processing_step: 'music_selection_complete',
    timestamp: new Date().toISOString(),
    
    // For MediaConvert job - UPDATED for shorter music
    video_generation_params: {
      story_duration: storyDuration,
      music_duration: optimalDuration,
      video_total_duration: videoTotalDuration,
      music_volume: selectedSettings.volume,
      music_fade_in: selectedSettings.fadeIn,
      music_fade_out: selectedSettings.fadeOut,
      music_ends_at: optimalDuration,
      story_ends_at: storyDuration,
      outro_starts_at: storyDuration,
      video_ends_at: videoTotalDuration,
      approach: 'music_shorter_than_story'
    }
  }
};
