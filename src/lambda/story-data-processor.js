// Generate unique story ID and prepare data for DynamoDB
const storyId = 'story-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
const currentTime = new Date().toISOString();

// ===== CLOUDFRONT WEBHOOK DIAGNOSTICS =====
console.log('=== CLOUDFRONT WEBHOOK DEBUG ===');
console.log('Raw $json:', JSON.stringify($json, null, 2));
console.log('Type of $json.body:', typeof $json.body);
console.log('Headers received:', JSON.stringify($json.headers || {}, null, 2));

// FIXED: Parse the JSON string that comes from CloudFront
const webhookData = typeof $json.body === 'string' ? JSON.parse($json.body) : ($json.body || {});

// Log parsed data and check for missing fields
console.log('Parsed webhookData:', JSON.stringify(webhookData, null, 2));
console.log('Critical fields check:');
console.log('- videoTargetLength:', webhookData.videoTargetLength);
console.log('- videoTotalDuration:', webhookData.videoTotalDuration);
console.log('- storyDurationSeconds:', webhookData.storyDurationSeconds);
console.log('- musicDurationSeconds:', webhookData.musicDurationSeconds);
console.log('=================================');

// Required fields - use defaults if missing
const name = (webhookData.name && typeof webhookData.name === 'string' && webhookData.name.trim()) 
  ? webhookData.name.trim() 
  : 'Unknown';

const email = (webhookData.email && typeof webhookData.email === 'string' && webhookData.email.trim()) 
  ? webhookData.email.trim() 
  : '';

const audioKey = (webhookData.audio_key && typeof webhookData.audio_key === 'string' && webhookData.audio_key.trim()) 
  ? webhookData.audio_key.trim() 
  : '';

// Optional fields - provide meaningful defaults instead of empty values
const prompt = (webhookData.prompt && typeof webhookData.prompt === 'string' && webhookData.prompt.trim()) 
  ? webhookData.prompt.trim() 
  : 'Share a story';

const photoKey = (webhookData.photo_key && typeof webhookData.photo_key === 'string' && webhookData.photo_key.trim()) 
  ? webhookData.photo_key.trim() 
  : 'default-story-image.jpg';

const userAgent = (webhookData.user_agent && typeof webhookData.user_agent === 'string' && webhookData.user_agent.trim()) 
  ? webhookData.user_agent.trim() 
  : '';

const recordedAt = (webhookData.recorded_at && typeof webhookData.recorded_at === 'string') 
  ? webhookData.recorded_at 
  : currentTime;

// Build full S3 URL for audio (only if audio_key exists)
const audioUrl = audioKey ? `https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/${audioKey}` : '';

// Prepare data for DynamoDB - use empty strings for optional fields
// DynamoDB expects these fields to always be present
const storyData = {
  story_id: storyId,
  name: name,
  email: email,
  prompt: prompt || '', // empty string if not provided
  audio_key: audioKey,
  photo_key: photoKey || '', // empty string if not provided  
  audio_url: audioUrl,
  status: 'submitted',
  created_at: recordedAt,
  updated_at: currentTime,
  transcribe_job_name: storyId + '-transcription',
  user_agent: userAgent || '' // empty string if not provided
};

// Log the prepared data for debugging
console.log('Prepared story data:', JSON.stringify(storyData, null, 2));

// Validate required fields
if (!name || name === 'Unknown') {
  throw new Error('Name is required');
}

if (!email) {
  throw new Error('Email is required');
}

if (!audioKey) {
  throw new Error('Audio key is required');
}

return {
  json: storyData
};
