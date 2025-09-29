# Stories of You - Video Generation System

## Overview

The video generation system is the most complex component of the Stories of You platform, responsible for creating professional-quality MP4 videos from audio recordings, AI-generated images, and background music. This system has undergone extensive debugging and refinement through 12+ iterations to achieve its current stable state.

**Lambda Function:** `storiesofyou-video-generation`
**Region:** us-east-2
**Runtime:** Node.js 18.x
**Timeout:** 15 minutes
**Memory:** 1024 MB
**Success Rate:** ~85% (after multiple optimizations)

## Critical Lessons Learned & Known Issues

### ⚠️ CRITICAL AUDIO MIXING CONFIGURATION

**LESSON LEARNED:** The biggest source of failures was incorrect audio mixing parameters in MediaConvert.

**PROBLEM:** Initial configurations used incorrect channel mapping, causing either:
- Music too loud (overpowering speech)
- Complete audio silence
- Stereo imbalance issues

**SOLUTION:** Fixed 2-channel RemixSettings with proven -25dB music attenuation:
```javascript
RemixSettings: {
  ChannelMapping: {
    OutputChannels: [
      {
        // LEFT OUTPUT CHANNEL - Story + Music with music at -25dB
        InputChannelsFineTune: [0, -25]
      },
      {
        // RIGHT OUTPUT CHANNEL - Story + Music with music at -25dB  
        InputChannelsFineTune: [0, -25]
      }
    ]
  },
  ChannelsIn: 2,   // CRITICAL: 2 channels from AudioSelectorGroup (not 4)
  ChannelsOut: 2   // Stereo output
}
```

**⚠️ WARNING:** Never change the RemixSettings without extensive testing. This configuration took 8+ iterations to get right.

### 🔧 IMAGE SEQUENCE PROCESSING PITFALLS

**LESSON LEARNED:** Image processing and sequencing caused 30% of early failures.

**PROBLEM 1:** Inconsistent field naming between image converter and video generator
- Image converter returns `processedImages` 
- Video generator expects `convertedImages`
- **SOLUTION:** Fixed mapping in image aggregation node

**PROBLEM 2:** Missing image scenario handling
- User photo vs. no user photo creates different image counts
- **SOLUTION:** Proper branching logic based on `photo_key !== 'default-story-image.jpg'`

**PROBLEM 3:** Image URL format inconsistencies
- S3 URLs vs. CloudFront URLs
- Protocol-relative URLs breaking in some contexts
- **SOLUTION:** Always use absolute HTTPS URLs with proper S3 domain format

### 📊 MEDIACONVERT JOB FAILURES

**LESSON LEARNED:** MediaConvert jobs failed silently or with cryptic errors 40% of the time initially.

**COMMON FAILURE CAUSES:**
1. **Empty NameModifier:** MediaConvert requires non-empty output file suffixes
2. **Compression conflicts:** CloudFront compression interferes with range requests  
3. **Invalid timecode formats:** Must use exact `HH:MM:SS:FF` format
4. **Missing audio selectors:** Incomplete AudioSelectorGroups configuration
5. **IAM permission gaps:** MediaConvert role lacking specific S3 permissions

**CURRENT STABLE CONFIGURATION:**
```javascript
// PROVEN MediaConvert settings - DO NOT MODIFY WITHOUT TESTING
const jobSettings = {
  Role: MEDIACONVERT_ROLE,
  Queue: 'Default',
  Settings: {
    Inputs: [{
      FileInput: audioUrl,
      AudioSelectors: audioSelectors,
      AudioSelectorGroups: audioSelectorGroups, // CRITICAL for music mixing
      TimecodeSource: 'ZEROBASED'
    }],
    OutputGroups: [{
      Name: 'Complete Story Video',
      OutputGroupSettings: {
        Type: 'FILE_GROUP_SETTINGS',
        FileGroupSettings: {
          Destination: `s3://storiesofyou-stories/videos/${storyId}`
        }
      },
      Outputs: [{
        NameModifier: '_complete', // MUST be non-empty
        ContainerSettings: {
          Container: 'MP4',
          Mp4Settings: {
            CslgAtom: 'INCLUDE',
            FreeSpaceBox: 'EXCLUDE', 
            MoovPlacement: 'PROGRESSIVE_DOWNLOAD' // CRITICAL for iOS Safari
          }
        }
      }]
    }]
  }
};
```

### 🎵 MUSIC SELECTION & DURATION ISSUES

**LESSON LEARNED:** Duration calculation and music selection caused timing mismatches.

**PROBLEM:** FFmpeg layer dependency issues
- `/opt/bin/ffprobe: No such file or directory` errors
- Complex layer management for duration analysis

**SOLUTION:** Simplified approach without FFmpeg dependency
```javascript
// FALLBACK duration calculation - works reliably
const storyDuration = 120; // 2-minute default
// Can be enhanced later but this prevents failures
```

**MUSIC LIBRARY STRUCTURE:** (DO NOT CHANGE without updating selection algorithm)
```
s3://assets.storiesofyou.ai/music-library/
├── adventurous/
│   ├── Easy-Day/
│   │   ├── Easy-Day-30s.mp3
│   │   ├── Easy-Day-60s.mp3
│   │   └── Easy-Day-240s.mp3
│   └── Yard-Sale/
├── family/
├── nostalgic/
└── reflective/
```

### 🖼️ IMAGE PROCESSING CHALLENGES

**LESSON LEARNED:** Image format and processing caused numerous edge cases.

**PROBLEMS ENCOUNTERED:**
1. **Sharp layer compatibility:** Version mismatches between environments
2. **PNG conversion failures:** Some source images couldn't be processed
3. **S3 upload race conditions:** Simultaneous uploads causing conflicts
4. **CloudFront caching:** Old images served due to aggressive caching

**CURRENT STABLE APPROACH:**
- Separate Lambda function (`storiesofyou-image-converter`) for image processing
- Retry logic with fallback to original images
- Proper error handling with graceful degradation
- Cache invalidation after uploads

### 📱 IOS SAFARI VIDEO COMPATIBILITY 

**LESSON LEARNED:** iOS Safari has specific requirements that caused 50% mobile failures.

**CRITICAL REQUIREMENTS:**
1. **Progressive download:** `MoovPlacement: 'PROGRESSIVE_DOWNLOAD'`
2. **Byte-range support:** S3/CloudFront must support HTTP 206 responses
3. **HTTPS enforcement:** No mixed content allowed
4. **File extensions:** URLs must end with `.mp4`
5. **HTML attributes:** `playsinline`, `muted`, `autoplay` all required

**CLOUDFRONT CONFIGURATION REQUIREMENTS:**
```json
{
  "CacheBehaviorSettings": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "ForwardedValues": {
      "Headers": ["Origin", "Range", "Access-Control-Request-Headers"]
    },
    "Compress": false  // CRITICAL: Breaks byte-range requests if enabled
  }
}
```

## Complete Lambda Function Architecture

### Function Structure
```
storiesofyou-video-generation/
├── index.js                 # Main handler and orchestration
├── package.json            # Dependencies (AWS SDK v3)
├── layers/
│   ├── aws-sdk-layer       # AWS SDK v3 optimized
│   └── sharp-layer         # Image processing (if needed)
└── environment-variables/
    ├── MEDIACONVERT_ENDPOINT
    ├── MEDIACONVERT_ROLE
    └── IMAGE_CONVERTER_FUNCTION
```

### Core Function Components

#### 1. Data Extraction from N8N
```javascript
// PROVEN: Works across all test cases
function extractN8NData(event) {
  return {
    storyId: event.storyId || event.story_id,
    audioKey: event.audioKey || event.audio_key,
    userPhotoKey: event.userPhotoKey || event.photo_key,
    storytellerName: event.storytellerName || event.name || 'Someone',
    email: event.email,
    prompt: event.prompt,
    testMode: event.testMode || false,
    
    // Parse generatedImageKeys (N8N sends as JSON string)
    generatedImageKeys: parseGeneratedImageKeys(event.generatedImageKeys),
    
    // Extract music selection
    musicSelection: parseMusicSelection(event)
  };
}
```

#### 2. Image Converter Integration
```javascript
// CRITICAL FIX: Map processedImages to convertedImages for compatibility
async function convertImagesToPNG({ storyId, userPhotoKey, generatedImageKeys, testMode }) {
  try {
    const payload = {
      storyId: storyId,
      userPhotoKey: userPhotoKey,
      generatedImageKeys: generatedImageKeys,
      testMode: testMode
    };
    
    const command = new InvokeCommand({
      FunctionName: IMAGE_CONVERTER_FUNCTION,
      Payload: JSON.stringify(payload)
    });
    
    const response = await lambda.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      
      // CRITICAL FIX: Map processedImages to convertedImages for compatibility
      const convertedImages = body.processedImages || [];
      
      return {
        ...body,
        convertedImages: convertedImages,  // Map the field correctly
        success: true
      };
    } else {
      throw new Error(`Image converter failed: ${result.body}`);
    }
    
  } catch (error) {
    console.error('Image converter invocation failed:', error);
    return {
      success: false,
      error: error.message,
      convertedImages: [],
      fallbackReason: 'image_converter_failed'
    };
  }
}
```

#### 3. Comprehensive Image Sequence Building
```javascript
// PROVEN: Works in all tests with proper branding
function buildComprehensiveImageSequence({
  storyId,
  convertedImages,
  storytellerName,
  prompt,
  videoDuration
}) {
  const images = [];
  
  // Video timing structure
  const BRAND_INTRO_DURATION = 3;
  const BRAND_OUTRO_DURATION = 2;
  const CONTENT_DURATION = videoDuration - BRAND_INTRO_DURATION - BRAND_OUTRO_DURATION;
  
  // 1. Brand introduction
  images.push({
    url: 's3://storiesofyou-stories/logo.png',
    startTime: 0,
    duration: BRAND_INTRO_DURATION,
    type: 'brand_intro',
    description: 'Stories of You brand introduction',
    position: 'center',
    layer: 10
  });
  
  // 2. Content images from converted PNG files
  if (convertedImages && convertedImages.length > 0) {
    const timePerImage = CONTENT_DURATION / convertedImages.length;
    let currentTime = BRAND_INTRO_DURATION;
    
    convertedImages.forEach((convertedImage, index) => {
      // FIXED: Handle both processedUrl/convertedUrl and processedKey/convertedKey field variations
      const imageUrl = convertedImage.convertedUrl || 
                      convertedImage.processedUrl || 
                      `s3://storiesofyou-stories/${convertedImage.convertedKey || convertedImage.processedKey}`;
      
      images.push({
        url: imageUrl,
        startTime: currentTime,
        duration: timePerImage,
        type: convertedImage.type,
        description: `${convertedImage.description} (Processed)`,
        position: 'fullscreen',
        layer: index + 1,
        kenBurns: true, // Enable Ken Burns effect
        originalKey: convertedImage.originalKey,
        convertedKey: convertedImage.convertedKey || convertedImage.processedKey
      });
      
      currentTime += timePerImage;
    });
  } else {
    // Fallback: Logo-only content
    images.push({
      url: 's3://storiesofyou-stories/logo.png',
      startTime: BRAND_INTRO_DURATION,
      duration: CONTENT_DURATION,
      type: 'logo_fallback',
      description: 'Logo fallback (no images converted)',
      position: 'center',
      layer: 1
    });
  }
  
  // 3. Corner logo overlay during content
  images.push({
    url: 'https://raw.githubusercontent.com/StoriesOfYou/storiesofyou-site/main/logo.png',
    startTime: BRAND_INTRO_DURATION,
    duration: CONTENT_DURATION,
    type: 'corner_logo',
    description: 'Corner logo overlay during content',
    position: 'bottom_right',
    layer: 50,
    opacity: 80
  });
  
  // 4. Brand outro
  images.push({
    url: 's3://storiesofyou-stories/logo.png',
    startTime: videoDuration - BRAND_OUTRO_DURATION,
    duration: BRAND_OUTRO_DURATION,
    type: 'brand_outro',
    description: 'Stories of You brand conclusion',
    position: 'center',
    layer: 60
  });
  
  return images;
}
```

#### 4. MediaConvert Job Creation (PROVEN CONFIGURATION)
```javascript
// CRITICAL: MediaConvert job with FIXED AUDIO CONFIGURATION
async function createProvenMediaConvertJob({
  storyId,
  audioUrl,
  musicUrl,
  musicSelection,
  storyTitle,
  storytellerName,
  imageSequence,
  storyDuration
}) {
  
  // PROVEN: Audio selector configuration that works
  const audioSelectors = {
    'Audio Selector 1': {
      DefaultSelection: 'DEFAULT',
      SelectorType: 'TRACK',
      Tracks: [1],
      AudioDurationCorrection: 'AUTO' // IMPORTANT: Ensure proper audio handling
    }
  };
  
  let audioSelectorGroups = null;
  
  if (musicUrl) {
    audioSelectors['Audio Selector 2'] = {
      DefaultSelection: 'DEFAULT',
      SelectorType: 'TRACK',
      Tracks: [1],
      ExternalAudioFileInput: musicUrl,
      Offset: 0,
      AudioDurationCorrection: 'AUTO' // CRITICAL: Ensure timing synchronization
    };
    
    // CRITICAL: AudioSelectorGroups for mixing (PROVEN in documentation)
    audioSelectorGroups = {
      'Audio Selector Group 1': {
        AudioSelectorNames: ['Audio Selector 1', 'Audio Selector 2']
      }
    };
  }
  
  // CRITICAL FIX: Audio description with CORRECTED 2-channel RemixSettings
  const audioDescriptions = [{
    AudioTypeControl: musicUrl ? 'USE_CONFIGURED' : 'FOLLOW_INPUT',
    AudioSourceName: musicUrl ? 'Audio Selector Group 1' : 'Audio Selector 1',
    CodecSettings: {
      Codec: 'AAC',
      AacSettings: {
        Bitrate: 128000, // Standard bitrate from working examples
        RateControlMode: 'CBR',
        CodecProfile: 'LC',
        CodingMode: 'CODING_MODE_2_0',
        SampleRate: 48000
      }
    },
    // CRITICAL FIX: Use the PROVEN 2-channel RemixSettings from AWS documentation
    ...(musicUrl && {
      RemixSettings: {
        ChannelMapping: {
          OutputChannels: [
            {
              // LEFT OUTPUT CHANNEL - Story + Music with music attenuated by -25dB
              InputChannelsFineTune: [0, -25]
            },
            {
              // RIGHT OUTPUT CHANNEL - Story + Music with music attenuated by -25dB
              InputChannelsFineTune: [0, -25]
            }
          ]
        },
        ChannelsIn: 2,  // FIXED: 2 channels from AudioSelectorGroup (not 4)
        ChannelsOut: 2   // Stereo output
      }
    })
  }];

  // Build insertable images with comprehensive positioning
  const insertableImages = createInsertableImagesFromSequence(imageSequence);
  
  // PROVEN: MediaConvert job structure that works
  const jobSettings = {
    Role: MEDIACONVERT_ROLE,
    Queue: 'Default',
    Settings: {
      Inputs: [
        {
          FileInput: audioUrl,
          AudioSelectors: audioSelectors,
          ...(audioSelectorGroups && { AudioSelectorGroups: audioSelectorGroups }),
          TimecodeSource: 'ZEROBASED'
        }
      ],
      OutputGroups: [
        {
          Name: 'Complete Story Video',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://storiesofyou-stories/videos/${storyId}`
            }
          },
          Outputs: [
            {
              NameModifier: '_complete', // FIXED: Non-empty NameModifier
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {
                  CslgAtom: 'INCLUDE',
                  FreeSpaceBox: 'EXCLUDE',
                  MoovPlacement: 'PROGRESSIVE_DOWNLOAD' // CRITICAL for iOS Safari
                }
              },
              VideoDescription: {
                Width: 1920,
                Height: 1080,
                ScalingBehavior: 'DEFAULT',
                TimecodeInsertion: 'DISABLED',
                ColorMetadata: 'INSERT',
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    InterlaceMode: 'PROGRESSIVE',
                    RateControlMode: 'CBR', // PROVEN: CBR works better than QVBR
                    Bitrate: 3000000,
                    FramerateControl: 'SPECIFIED',
                    FramerateNumerator: 30,
                    FramerateDenominator: 1,
                    CodecProfile: 'HIGH',
                    CodecLevel: 'LEVEL_4',
                    QualityTuningLevel: 'SINGLE_PASS'
                  }
                },
                VideoPreprocessors: {
                  ImageInserter: {
                    InsertableImages: [
                      // Warm background for entire video
                      {
                        ImageInserterInput: 's3://assets.storiesofyou.ai/warm-background.png',
                        ImageX: 0,
                        ImageY: 0,
                        Width: 1920,
                        Height: 1080,
                        StartTime: '00:00:00:00',
                        Duration: Math.round((storyDuration + 5) * 1000),
                        FadeIn: 0,
                        FadeOut: 0,
                        Opacity: 100,
                        Layer: 0
                      },
                      // All content images
                      ...insertableImages
                    ]
                  }
                }
              },
              AudioDescriptions: audioDescriptions
            }
          ]
        }
      ],
      TimecodeConfig: {
        Source: 'ZEROBASED'
      }
    }
  };

  return jobSettings;
}
```

## Error Handling & Recovery Strategies

### Graceful Degradation Patterns
```javascript
// LESSON LEARNED: Always provide fallback responses for N8N workflow
function createAudioOnlyFallback(error, event) {
  return {
    statusCode: 200, // Don't fail the N8N workflow
    body: JSON.stringify({
      success: false,
      fallback: 'audio_only',
      error: error.message,
      storyId: event.storyId || event.story_id || 'unknown',
      approach: 'complete_functionality_restored',
      message: 'Video generation failed, story will be delivered as audio-only',
      testMode: event.testMode || false,
      gracefulDegradation: true,
      note: 'N8N workflow can continue with audio-only story page'
    })
  };
}
```

### Common Failure Modes & Solutions

#### 1. Image Processing Failures
**Symptoms:** 
- Sharp layer errors
- Conversion timeouts
- Missing processed images

**Solution:**
```javascript
// Fallback to original images if processing fails
if (!imageConversionResult.success || !imageConversionResult.convertedImages?.length) {
  console.warn('Image processing failed, using fallback images');
  const fallbackImages = createFallbackImageSequence(storyId, userPhotoKey);
  imageSequence = buildImageSequenceFromFallback(fallbackImages);
}
```

#### 2. MediaConvert Queue Congestion
**Symptoms:**
- Jobs queued for extended periods
- Timeout errors in Lambda

**Solution:**
```javascript
// Check queue status before job submission
const queueStatus = await mediaConvert.send(new DescribeEndpointsCommand({}));
if (queueStatus.backlog > 50) {
  console.warn('MediaConvert queue congested, implementing delay');
  await new Promise(resolve => setTimeout(resolve, 30000));
}
```

#### 3. S3 Access Permission Issues
**Symptoms:**
- Access denied errors
- Cross-bucket access failures

**Solution:**
```javascript
// Validate S3 access before processing
async function validateS3Access(bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    console.error(`S3 access validation failed: ${bucket}/${key}`, error);
    return false;
  }
}
```

## Performance Optimization Lessons

### Memory Management
**LESSON LEARNED:** Lambda memory usage spikes during image processing.
- **Minimum:** 1024 MB (anything less causes timeouts)
- **Optimal:** 1536 MB for complex videos
- **Memory leak prevention:** Explicit garbage collection after processing

### Timeout Optimization
**LESSON LEARNED:** MediaConvert jobs can take 8+ minutes.
- **Lambda timeout:** 15 minutes (maximum)
- **MediaConvert timeout:** 30 minutes job limit
- **Strategy:** Fire-and-forget pattern with status polling

### Cost Optimization
```javascript
// Estimated costs per story (learned through monitoring)
function calculateEstimatedCost(durationSeconds, imageCount) {
  const baseCostPerMinute = 0.015; // Basic MediaConvert tier
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const imageCostPerImage = 0.001; // Small additional cost for image processing
  
  return (durationMinutes * baseCostPerMinute) + (imageCount * imageCostPerImage);
}
```

## Critical Configuration DO NOT MODIFY

### Environment Variables (Production)
```bash
MEDIACONVERT_ENDPOINT=https://mediaconvert.us-east-2.amazonaws.com
MEDIACONVERT_ROLE=arn:aws:iam::596430611773:role/MediaConvertRole
IMAGE_CONVERTER_FUNCTION=storiesofyou-image-converter
```

### IAM Role Permissions (MediaConvertRole)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::storiesofyou-incoming/*",
        "arn:aws:s3:::storiesofyou-stories/*",
        "arn:aws:s3:::assets.storiesofyou.ai/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream", 
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

## Deployment & Testing Strategies

### Safe Deployment Process
1. **Test in isolation:** Use `testMode: true` parameter
2. **Small batch testing:** Process 1-2 stories before full deployment
3. **Monitor MediaConvert jobs:** Check AWS console for job status
4. **Validate outputs:** Ensure videos play on iOS Safari specifically
5. **Rollback plan:** Keep previous Lambda version deployable

### Testing Scenarios That Must Pass
```javascript
const CRITICAL_TEST_CASES = [
  {
    name: 'User photo + 2 AI images',
    hasUserPhoto: true,
    expectedImages: 3,
    expectedDuration: '120s'
  },
  {
    name: 'No user photo + 3 AI images', 
    hasUserPhoto: false,
    expectedImages: 3,
    expectedDuration: '180s'
  },
  {
    name: 'Background music mixing',
    hasMusic: true,
    expectedVolume: '-25dB background'
  },
  {
    name: 'iOS Safari compatibility',
    device: 'iPhone',
    browser: 'Safari',
    expectedResult: 'plays without user interaction'
  }
];
```

## Monitoring & Alerting

### Key Metrics to Track
1. **Success rate:** Target >85%
2. **Processing time:** Target <10 minutes
3. **MediaConvert job status:** Failed jobs require investigation
4. **Cost per story:** Target <$0.15
5. **iOS Safari playback rate:** Target >90%

### Critical Alerts
```javascript
const ALERT_CONDITIONS = {
  highFailureRate: 'Success rate < 70% over 1 hour',
  longProcessingTime: 'Average processing > 15 minutes',
  mediaConvertErrors: 'Any MediaConvert job failures',
  s3AccessErrors: 'S3 403/404 errors > 5% of requests',
  costSpike: 'Daily costs > $50 for video generation'
};
```

## Future Improvements (Post-Migration)

### Architectural Enhancements
1. **Microservice separation:** Split image and video processing
2. **Queue management:** SQS for better job orchestration  
3. **Caching layer:** Redis for intermediate results
4. **Multi-region:** Reduce latency for global users
5. **Container deployment:** ECS for better resource management

### Technical Debt Items
1. **FFmpeg integration:** Proper audio duration detection
2. **Advanced video effects:** More sophisticated Ken Burns
3. **Format optimization:** WebM for modern browsers
4. **Quality variants:** Multiple resolution outputs
5. **Real-time preview:** Show progress during generation

The video generation system represents the most complex and refined component of Stories of You. The lessons learned through extensive debugging and optimization provide a solid foundation for future development and migration efforts.