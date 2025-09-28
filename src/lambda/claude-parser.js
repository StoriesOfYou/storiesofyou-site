// Parse Claude's response - BACKWARDS COMPATIBLE with progressive images
const claudeResponse = $input.first().json;

let responseText = '';
if (claudeResponse.content && claudeResponse.content[0] && claudeResponse.content[0].text) {
  responseText = claudeResponse.content[0].text.trim();
}

// Initialize defaults
let cleanedTranscript = '';
let imagePrompt1 = '';
let imagePrompt2 = '';
let imagePrompt3 = '';
let storyPhases = {};
let parseSuccess = false;

try {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    cleanedTranscript = parsed.cleaned_transcript || '';
    
    // Extract progressive prompts from new format
    imagePrompt1 = parsed.image_prompt_1 || parsed.image_prompt || '';
    imagePrompt2 = parsed.image_prompt_2 || parsed.image_prompt || '';
    imagePrompt3 = parsed.image_prompt_3 || parsed.image_prompt || '';
    
    storyPhases = parsed.story_phases || {};
    parseSuccess = true;
  }
} catch (e) {
  console.log('JSON parsing failed:', e);
  // Fallback to defaults
  cleanedTranscript = responseText || 'Transcript processing failed';
  imagePrompt1 = imagePrompt2 = imagePrompt3 = 'nostalgic family home interior, warm golden lighting, cozy atmosphere, vintage details, no people';
}

// Return structured data maintaining backwards compatibility
return {
  json: {
    ...claudeResponse,
    cleaned_transcript: cleanedTranscript,
    
    // CRITICAL: Keep old field for compatibility
    image_prompt: imagePrompt1, // Fallback field
    
    // NEW: Individual progressive prompts
    image_prompt_1: imagePrompt1,
    image_prompt_2: imagePrompt2, 
    image_prompt_3: imagePrompt3,
    
    story_phases: storyPhases,
    parse_success: parseSuccess,
    raw_claude_response: responseText
  }
};
