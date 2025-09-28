// Get transcript and content safety from AssemblyAI response
const transcript = $json.text || '';
const audioDuration = $json.audio_duration || null; // Extract audio duration from AssemblyAI
const contentSafetyData = $json.content_safety_labels || {};
const contentSafetyResults = contentSafetyData.results || [];

// Get original story data from earlier nodes
const originalData = $('Prepare Story Data').first().json;

// Check content safety (AssemblyAI format)
// Look for high-confidence unsafe content
const hasUnsafeContent = contentSafetyResults.length > 0 && contentSafetyResults.some(result => {
  // Check if any result has confidence > 0.75 for unsafe content
  return result.confidence > 0.75 && ['profanity', 'hate_speech', 'harassment', 'violence_graphic'].includes(result.label);
});

// Calculate toxicity score from severity_score_summary if available
let maxToxicityScore = 0;
if (contentSafetyData.severity_score_summary) {
  const severityScores = Object.values(contentSafetyData.severity_score_summary);
  if (severityScores.length > 0) {
    maxToxicityScore = Math.max(...severityScores);
  }
}

// Calculate fallback duration if AssemblyAI didn't provide it
let storyDurationSeconds = audioDuration;
if (!storyDurationSeconds && transcript) {
  // Estimate from word count: average 150 words per minute
  const wordCount = transcript.split(' ').filter(word => word.length > 0).length;
  storyDurationSeconds = Math.max(30, Math.round((wordCount / 150) * 60));
}

console.log('Audio duration processing:', {
  assembly_ai_duration: audioDuration,
  calculated_duration: storyDurationSeconds,
  transcript_words: transcript ? transcript.split(' ').length : 0,
  method: audioDuration ? 'assembly_ai_native' : 'word_count_estimation'
});

return {
  json: {
    ...originalData,
    transcript: transcript,
    audio_duration_seconds: storyDurationSeconds, // Add the duration
    audio_duration_source: audioDuration ? 'assembly_ai' : 'estimated',
    toxicity_score: maxToxicityScore,
    content_safety_labels: contentSafetyResults,
    is_rejected: hasUnsafeContent,
    status: hasUnsafeContent ? 'rejected' : 'generating'
  }
};
