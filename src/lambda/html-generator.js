// FIXED Generate Story Page HTML - with absolute URLs for OG and favicon
// Critical fixes: Using S3 URLs for favicon and OG image

const data = $json;

// Data extraction logic (keeping your existing logic)
let safeName = 'Someone';
let safeEmail = '';
let safePrompt = '';
let safeTranscript = '';
let safeAudioKey = '';
let safePhotoKey = '';
let safeCreatedAt = new Date().toISOString();
let safeStoryId = 'story-' + Date.now();
let audioUrl = '';

// Try to get data from current node first
const userData = data.body || data;
safeName = userData.name || data.name || safeName;
safeEmail = safeEmail === '' ? (userData.email || data.email || safeEmail) : safeEmail;
safePrompt = safePrompt === '' ? (userData.prompt || data.prompt || safePrompt) : safePrompt;
safeAudioKey = safeAudioKey === '' ? (userData.audio_key || data.audio_key || safeAudioKey) : safeAudioKey;
safePhotoKey = safePhotoKey === '' ? (userData.photo_key || data.photo_key || safePhotoKey) : safePhotoKey;
safeCreatedAt = userData.recorded_at || data.created_at || safeCreatedAt;
safeStoryId = data.story_id || safeStoryId;
audioUrl = data.audio_url || userData.audio_url || audioUrl;

// Get data from previous nodes (keeping your existing logic)
try {
  const prepareNode = $('Prepare Story Data').first().json;
  if (prepareNode) {
    safeName = safeName === 'Someone' ? (prepareNode.name || safeName) : safeName;
    safeEmail = safeEmail === '' ? (prepareNode.email || safeEmail) : safeEmail;
    safePrompt = safePrompt === '' ? (prepareNode.prompt || safePrompt) : safePrompt;
    safeAudioKey = safeAudioKey === '' ? (prepareNode.audio_key || safeAudioKey) : safeAudioKey;
    safePhotoKey = safePhotoKey === '' ? (prepareNode.photo_key || safePhotoKey) : safePhotoKey;
    safeCreatedAt = prepareNode.created_at || safeCreatedAt;
    safeStoryId = prepareNode.story_id || safeStoryId;
    audioUrl = audioUrl === '' ? (prepareNode.audio_url || audioUrl) : audioUrl;
  }
} catch (e) {
  console.log('Could not access Prepare Story Data node');
}

// Build URLs
if (audioUrl === '' && safeAudioKey !== '') {
  audioUrl = `https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/${safeAudioKey}`;
}

// FIXED: Remove .html extension from story ID for video URL construction
const baseStoryId = safeStoryId.replace('.html', '');
const videoUrl = `https://stories.storiesofyou.ai/videos/${baseStoryId}_complete.mp4`;
const storyTitle = safePrompt && safePrompt.trim() !== '' ? safePrompt : `${safeName}'s Story`;

// Transcript processing (keeping your existing logic)
let originalTranscript = '';
let cleanedTranscript = '';

try {
  const assemblyNode = $('Check AssemblyAI Status').first().json;
  if (Array.isArray(assemblyNode) && assemblyNode[0] && assemblyNode[0].text) {
    originalTranscript = assemblyNode[0].text;
  } else if (assemblyNode && assemblyNode.text) {
    originalTranscript = assemblyNode.text;
  }
} catch (e) {
  console.log('Could not access AssemblyAI Status node:', e);
}

try {
  const claudeParserResponse = $('Parse Claude JSON').first().json;
  if (claudeParserResponse && claudeParserResponse.cleaned_transcript) {
    cleanedTranscript = claudeParserResponse.cleaned_transcript;
  }
} catch (e) {
  console.log('Could not access Parse Claude JSON node:', e);
}

const transcript = cleanedTranscript || originalTranscript || 'Transcript will be available soon.';
const originalForTabs = originalTranscript || 'Original transcript not available.';

// Date formatting
let recordingDate;
try {
  recordingDate = new Date(safeCreatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
} catch (error) {
  recordingDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
}

// CRITICAL FIX: Use S3 URLs for logo and favicon
const logoUrl = "https://storiesofyou-stories.s3.us-east-2.amazonaws.com/logo.png";
const faviconUrl = "https://storiesofyou-stories.s3.us-east-2.amazonaws.com/favicon.ico";
const cleanStoryUrl = `https://stories.storiesofyou.ai/${safeStoryId}.html`;

// ENHANCED HTML template with FIXED favicon and OG image URLs
const storyTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${storyTitle} - Stories of You</title>
    <meta name="description" content="A personal story recorded and preserved forever in ${safeName}'s own voice.">
    
    <!-- FIXED: Use absolute S3 URL for favicon -->
    <link rel="icon" href="${faviconUrl}" />
    <link rel="shortcut icon" href="${faviconUrl}" />
    
    <!-- FIXED: Use S3 URL for Open Graph image -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Stories of You">
    <meta property="og:title" content="${storyTitle} - Stories of You">
    <meta property="og:description" content="A personal story recorded and preserved forever in ${safeName}'s own voice.">
    <meta property="og:image" content="${logoUrl}">
    <meta property="og:image:secure_url" content="${logoUrl}">
    <meta property="og:image:width" content="400">
    <meta property="og:image:height" content="400">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="Stories of You logo">
    <meta property="og:url" content="${cleanStoryUrl}">
    
    <!-- FIXED: Use S3 URL for Twitter Card image -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${storyTitle} - Stories of You">
    <meta name="twitter:description" content="A personal story preserved in ${safeName}'s voice">
    <meta name="twitter:image" content="${logoUrl}">
    
    <style>
        :root {
            --brand-navy: #0f2c4c;
            --brand-orange: #e09a1b;
            --brand-charcoal: #3d3528;
            --warm-light: #faf3e7;
            --warm-mid: #e0cba7;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #374151;
            background: radial-gradient(1200px 500px at 50% -200px, #fff7e9 0%, #fce8c8 50%, #e0cba7 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px; 
            margin: 2rem auto; 
            padding: 2rem;
            background: white; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
            border-radius: 16px;
        }
        
        .header { 
            text-align: center; 
            margin-bottom: 3rem; 
            padding-bottom: 2rem; 
            border-bottom: 2px solid #f3f4f6;
        }
        
        .logo img { 
            height: 56px; 
            width: auto; 
            border-radius: 6px;
            margin-bottom: 2rem;
        }
        
        .story-title { 
            font-size: 2.75rem; 
            font-weight: 800; 
            color: var(--brand-navy); 
            margin-bottom: 0.75rem; 
            line-height: 1.1;
        }
        
        .story-subtitle { 
            font-size: 1.25rem; 
            color: #6b7280; 
            font-style: italic;
            font-weight: 500;
        }
        
        .recording-date { 
            color: #6b7280; 
            font-size: 1rem; 
            margin-bottom: 2.5rem; 
            text-align: center;
            font-weight: 500;
            padding: 0.75rem 1.5rem;
            background: rgba(15, 44, 76, 0.05);
            border-radius: 25px;
            display: inline-block;
        }
        
        /* Video section */
        .video-section { 
            background: linear-gradient(135deg, var(--warm-light) 0%, #f8f4e8 100%);
            padding: 2.5rem; 
            border-radius: 20px; 
            margin: 3rem 0; 
            text-align: center; 
            border: 1px solid rgba(224, 203, 167, 0.3);
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }
        
        .video-container {
            position: relative;
            width: 100%; 
            max-width: 640px; 
            margin: 0 auto;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            background: #000;
            aspect-ratio: 16 / 9;
        }
        
        .video-player { 
            width: 100%; 
            height: 100%;
            display: block;
        }
        
        .video-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 1.1rem;
            z-index: 10;
        }
        
        .video-error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
            z-index: 10;
            padding: 2rem;
            max-width: 90%;
        }
        
        .video-error h3 {
            margin-bottom: 1rem;
            color: #fbbf24;
        }
        
        .video-retry-btn {
            background: var(--brand-orange);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 1rem;
            font-weight: 600;
        }
        
        .video-retry-btn:hover {
            background: #d4841c;
        }
        
        .audio-fallback {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(224, 203, 167, 0.3);
        }
        
        .audio-fallback-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--brand-charcoal);
            margin-bottom: 1rem;
        }
        
        .audio-player audio {
            width: 100%;
            max-width: 500px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .transcript-section { 
            margin: 4rem 0; 
        }
        
        .transcript-header { 
            font-size: 1.875rem; 
            font-weight: 700; 
            color: var(--brand-navy); 
            margin-bottom: 2rem; 
            display: flex; 
            align-items: center; 
            gap: 1rem;
        }
        
        .transcript-icon {
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--brand-orange) 0%, #d4841c 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            flex-shrink: 0;
            box-shadow: 0 4px 15px rgba(224, 154, 27, 0.3);
        }

        .transcript-tabs {
            display: flex;
            gap: 0;
            margin-bottom: 0;
            border-radius: 12px 12px 0 0;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .transcript-tab {
            flex: 1;
            padding: 1rem 1.5rem;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 600;
            color: #6b7280;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
        }

        .transcript-tab:hover {
            background: #f1f3f4;
            color: var(--brand-charcoal);
        }

        .transcript-tab.active {
            background: white;
            color: var(--brand-navy);
            border-bottom-color: var(--brand-orange);
        }

        .transcript-content {
            background: white;
            border-radius: 0 0 16px 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            overflow: hidden;
        }

        .transcript-panel {
            display: none;
            padding: 2.5rem;
            border-left: 6px solid var(--brand-orange);
            font-size: 1.125rem;
            line-height: 1.8;
            color: var(--brand-charcoal);
            background: linear-gradient(135deg, var(--warm-light) 0%, #f8f4e8 100%);
        }

        .transcript-panel.active {
            display: block;
        }

        .transcript-panel.raw {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left-color: #6c757d;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 1rem;
            color: #495057;
        }

        .transcript-placeholder { 
            background: #f9fafb;
            padding: 2.5rem; 
            border-radius: 16px; 
            border-left: 6px solid #d1d5db; 
            font-size: 1.125rem; 
            color: #6b7280; 
            font-style: italic;
            text-align: center;
        }
        
        .sharing-section { 
            background: linear-gradient(135deg, var(--brand-charcoal) 0%, #4a453b 100%);
            color: white; 
            padding: 3rem 2.5rem; 
            border-radius: 20px; 
            text-align: center; 
            margin: 4rem 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .share-url {
            background: rgba(255,255,255,0.15); 
            padding: 1.25rem; 
            border-radius: 12px; 
            font-family: monospace; 
            font-size: 0.9rem; 
            word-break: break-all; 
            border: 2px solid rgba(255,255,255,0.2); 
            color: rgba(255,255,255,0.95);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .footer { 
            text-align: center; 
            padding-top: 3rem; 
            border-top: 2px solid #f3f4f6; 
            color: #6b7280;
            margin-top: 2rem;
        }
        
        .footer-link { 
            color: var(--brand-navy); 
            text-decoration: none; 
            font-weight: 600; 
            padding: 0.5rem 1rem;
            border-radius: 8px;
            display: inline-block;
        }
        
        @media (max-width: 768px) { 
            .container { margin: 1rem; padding: 1.5rem; }
            .story-title { font-size: 2.25rem; }
            .video-section { padding: 2rem 1.5rem; }
            .transcript-panel { padding: 2rem; }
            .sharing-section { padding: 2rem 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <a href="https://storiesofyou.ai">
                    <img src="${logoUrl}" alt="Stories of You logo" />
                </a>
            </div>
            <h1 class="story-title">${storyTitle}</h1>
            <p class="story-subtitle">A memory in ${safeName}'s voice</p>
        </div>
        
        <div style="text-align: center;">
            <div class="recording-date">Recorded on ${recordingDate}</div>
        </div>
        
        <!-- Video section with iOS Safari fixes -->
        <div class="video-section">
            <div class="video-container">
                <div class="video-loading" id="videoLoading">
                    Loading your story video...
                </div>
                
                <video 
                    class="video-player" 
                    id="storyVideo"
                    controls 
                    preload="metadata"
                    playsinline
                    webkit-playsinline
                    style="display: none;"
                    onloadstart="handleVideoLoadStart()"
                    oncanplay="handleVideoCanPlay()"
                    onloadeddata="handleVideoLoaded()"
                    onerror="handleVideoError()"
                >
                    <source src="${videoUrl}" type="video/mp4">
                    <p>Your browser does not support video playback.</p>
                </video>
                
                <div class="video-error" id="videoError" style="display: none;">
                    <h3>Video Still Processing</h3>
                    <p>Your video is being generated and will be available shortly. Please try refreshing the page in a few minutes.</p>
                    <button class="video-retry-btn" onclick="retryVideo()">Try Again</button>
                </div>
            </div>
            
            ${audioUrl ? `
            <div class="audio-fallback">
                <p class="audio-fallback-title">Original story audio</p>
                <div class="audio-player">
                    <audio controls preload="metadata">
                        <source src="${audioUrl}" type="audio/webm">
                        <source src="${audioUrl}" type="audio/mp4">
                        <source src="${audioUrl}" type="audio/wav">
                        <source src="${audioUrl}" type="audio/mpeg">
                        <p>Audio playback not supported.</p>
                    </audio>
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="transcript-section">
            <h2 class="transcript-header">
                <div class="transcript-icon">📄</div>
                Transcript
            </h2>
            
            ${transcript === 'Transcript will be available soon.' ? `
            <div class="transcript-placeholder">
                ${transcript}
            </div>
            ` : `
            <div class="transcript-tabs">
                <button class="transcript-tab active" onclick="switchTranscript('cleaned')" id="cleaned-tab">
                    <span>✨</span> Enhanced
                </button>
                <button class="transcript-tab" onclick="switchTranscript('raw')" id="raw-tab">
                    <span>🎙️</span> Original
                </button>
            </div>
            
            <div class="transcript-content">
                <div class="transcript-panel active" id="cleaned-panel">
                    ${transcript}
                </div>
                
                <div class="transcript-panel raw" id="raw-panel">
                    ${originalForTabs}
                </div>
            </div>
            `}
        </div>
        
        <div class="sharing-section">
            <h3>Share this story with family</h3>
            <p>Share this link with family and friends:</p>
            <div class="share-url" onclick="copyToClipboard()">${cleanStoryUrl}</div>
            <p style="margin-top: 0.75rem; font-size: 0.875rem; opacity: 0.7;">Click to copy</p>
        </div>
        
        <div class="footer">
            <p><a href="https://storiesofyou.ai" class="footer-link">← Back to Stories of You</a></p>
            <p style="margin-top: 1.5rem; font-style: italic; color: #9ca3af;">Your voice, your story — preserved forever</p>
        </div>
    </div>
    
    <script>
        let videoRetryAttempts = 0;
        const maxRetries = 3;
        
        function handleVideoLoadStart() {
            console.log('Video load started');
            document.getElementById('videoLoading').style.display = 'block';
            document.getElementById('videoError').style.display = 'none';
        }
        
        function handleVideoLoaded() {
            console.log('Video loaded successfully');
            document.getElementById('videoLoading').style.display = 'none';
            document.getElementById('storyVideo').style.display = 'block';
        }
        
        function handleVideoCanPlay() {
            console.log('Video can play');
            document.getElementById('videoLoading').style.display = 'none';
            document.getElementById('storyVideo').style.display = 'block';
        }
        
        function handleVideoError() {
            console.error('Video failed to load');
            videoRetryAttempts++;
            
            if (videoRetryAttempts < maxRetries) {
                console.log(\`Retrying video load (attempt \${videoRetryAttempts + 1}/\${maxRetries})\`);
                setTimeout(() => {
                    document.getElementById('storyVideo').load();
                }, 2000);
            } else {
                showVideoError();
            }
        }
        
        function showVideoError() {
            document.getElementById('videoLoading').style.display = 'none';
            document.getElementById('videoError').style.display = 'block';
        }
        
        function retryVideo() {
            videoRetryAttempts = 0;
            document.getElementById('videoError').style.display = 'none';
            document.getElementById('videoLoading').style.display = 'block';
            document.getElementById('storyVideo').load();
        }
        
        function switchTranscript(type) {
            document.querySelectorAll('.transcript-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.transcript-panel').forEach(panel => panel.classList.remove('active'));
            
            document.getElementById(type + '-tab').classList.add('active');
            document.getElementById(type + '-panel').classList.add('active');
        }
        
        function copyToClipboard() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const element = document.querySelector('.share-url');
                const original = element.textContent;
                element.textContent = '✓ Copied!';
                element.style.background = 'rgba(34, 197, 94, 0.3)';
                setTimeout(() => {
                    element.textContent = original;
                    element.style.background = 'rgba(255,255,255,0.15)';
                }, 2000);
            });
        }
        
        // Check video availability on page load
        document.addEventListener('DOMContentLoaded', function() {
            const video = document.getElementById('storyVideo');
            
            // Set up video load timeout
            setTimeout(() => {
                if (video.readyState === 0) {
                    console.log('Video not loaded after 10 seconds, showing error');
                    showVideoError();
                }
            }, 10000);
        });
    </script>
</body>
</html>`;

// CRITICAL FIX: Extract and exclude videoUrl from incoming data to prevent override
const { videoUrl: incomingVideoUrl, ...dataWithoutVideo } = data;

// Log if there's a conflict for debugging
if (incomingVideoUrl && incomingVideoUrl !== videoUrl) {
  console.log('WARNING: Incoming videoUrl differs from constructed URL');
  console.log('Incoming (ignored):', incomingVideoUrl);
  console.log('Using constructed:', videoUrl);
}

return {
  json: {
    ...dataWithoutVideo, // Spread data WITHOUT the videoUrl field
    email: safeEmail,
    name: safeName,
    prompt: safePrompt,
    transcript: transcript,
    transcript_clean: cleanedTranscript,
    transcript_raw: originalTranscript,
    storyTitle: storyTitle,
    storyHtml: storyTemplate,
    storyUrl: cleanStoryUrl,
    fileName: `${safeStoryId}.html`,
    videoUrl: videoUrl, // This now won't be overridden by Lambda's S3 URL
    audioUrl: audioUrl
  }
};
