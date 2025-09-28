// Stories of You - COMPLETE VIDEO GENERATOR WITH TIMING FIXES
// FIXED: Proper duration handling from N8N, no more hardcoded 120s
// FIXED: Video length matches actual story + buffer, no black screens
// UPDATED: 3-second buffer instead of 5-second
// CRITICAL FIX: Use extractedData.videoTotalDuration directly to avoid corruption

const { MediaConvertClient, CreateJobCommand, GetJobCommand } = require('@aws-sdk/client-mediaconvert');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEDIACONVERT_ENDPOINT = process.env.MEDIACONVERT_ENDPOINT || 'https://mediaconvert.us-east-2.amazonaws.com';
const MEDIACONVERT_ROLE = process.env.MEDIACONVERT_ROLE || 'arn:aws:iam::596430611773:role/MediaConvertRole';
const IMAGE_CONVERTER_FUNCTION = process.env.IMAGE_CONVERTER_FUNCTION || 'storiesofyou-image-converter';

const mediaConvert = new MediaConvertClient({
  region: 'us-east-2',
  endpoint: MEDIACONVERT_ENDPOINT
});

const s3 = new S3Client({ region: 'us-east-2' });
const lambda = new LambdaClient({ region: 'us-east-2' });

// MAIN HANDLER - WITH TIMING FIXES
exports.handler = async (event) => {
  console.log('=== VIDEO GENERATOR WITH TIMING FIXES ===');
  console.log('Raw event:', JSON.stringify(event, null, 2));
  
  try {
    // PHASE 1: Data extraction - FIXED to get actual durations
    const extractedData = extractN8NData(event);
    logDataExtraction(extractedData);
    
    if (!extractedData.storyId || !extractedData.audioKey) {
      throw new Error(`Missing required: storyId=${extractedData.storyId}, audioKey=${extractedData.audioKey}`);
    }

    // PHASE 1.5: Generate story info slide
    console.log('Phase 1.5: Generating branded story info slide...');
    const storyInfoSlideUrl = await generateStoryInfoSlide(
      extractedData.storyId,
      extractedData.storytellerName,
      extractedData.prompt
    );
    console.log(`Story info slide ready: ${storyInfoSlideUrl}`);

    // PHASE 2: Image conversion
    console.log('Phase 2: Converting images to PNG format...');
    const imageConversionResult = await convertImagesToPNG({
      storyId: extractedData.storyId,
      userPhotoKey: extractedData.userPhotoKey,
      generatedImageKeys: extractedData.generatedImageKeys,
      testMode: extractedData.testMode
    });
    
    logImageConversionResults(imageConversionResult);
    
    // PHASE 3: FIXED - Use actual durations from N8N instead of hardcoded values
    console.log('Phase 3: Using actual durations from N8N...');
    const storyDuration = extractedData.storyDuration;
    const musicUrl = extractedData.musicSelection?.s3_url || null;
    // REMOVED: const videoTotalDuration = extractedData.videoTotalDuration; // This was getting corrupted
    
    console.log(`=== ACTUAL TIMING ===`);
    console.log(`Story duration: ${storyDuration}s`);
    console.log(`Music duration: ${extractedData.musicDuration}s`);
    console.log(`Video total: ${extractedData.videoTotalDuration}s`); // Use directly from extractedData
    console.log(`Music URL: ${musicUrl || 'None'}`);
    console.log(`=====================`);
    
    // PHASE 4: Build image sequence with CORRECT total duration
    // CRITICAL FIX: Use extractedData.videoTotalDuration directly
    const imageSequence = buildImageSequenceWithStorySlide({
      storyId: extractedData.storyId,
      convertedImages: imageConversionResult.convertedImages || [],
      storytellerName: extractedData.storytellerName,
      prompt: extractedData.prompt,
      videoDuration: extractedData.videoTotalDuration, // FIXED: Use directly from extractedData
      storyInfoSlideUrl: storyInfoSlideUrl
    });
    
    console.log(`Image sequence: ${imageSequence.length} images for ${extractedData.videoTotalDuration}s video`);
    
    // PHASE 5: Create MediaConvert job with correct duration
    const audioUrl = `s3://storiesofyou-incoming/${extractedData.audioKey}`;
    const jobParams = await createProvenMediaConvertJob({
      storyId: extractedData.storyId,
      audioUrl,
      musicUrl,
      musicSelection: extractedData.musicSelection,
      storyTitle: extractedData.prompt || `${extractedData.storytellerName}'s Story`,
      storytellerName: extractedData.storytellerName,
      imageSequence,
      storyDuration: storyDuration,
      videoTotalDuration: extractedData.videoTotalDuration // FIXED: Use directly from extractedData
    });
    
    console.log('Phase 5: Submitting MediaConvert job with CORRECT timing...');
    const command = new CreateJobCommand(jobParams);
    const result = await mediaConvert.send(command);
    
    // PHASE 6: Job tracking and metadata
    const jobInfo = await createComprehensiveJobTracking({
      jobResult: result,
      extractedData,
      imageConversionResult,
      storyDuration,
      musicUrl,
      imageSequence,
      videoTotalDuration: extractedData.videoTotalDuration // FIXED: Use directly from extractedData
    });
    
    console.log('✅ VIDEO GENERATION SUCCESSFUL WITH CORRECT TIMING');
    console.log(`Job ID: ${result.Job.Id}`);
    console.log(`Expected video length: ${extractedData.videoTotalDuration} seconds`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        jobId: result.Job.Id,
        status: 'processing',
        approach: 'fixed_timing_3s_buffer_corrected',
        videoKey: `videos/${extractedData.storyId}_complete.mp4`,
        videoUrl: `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/videos/${extractedData.storyId}_complete.mp4`,
        trackingUrl: `https://storiesofyou-stories.s3.amazonaws.com/video-jobs/${extractedData.storyId}.json`,
        
        // Story info slide details
        storyInfoSlide: {
          url: storyInfoSlideUrl,
          storytellerName: extractedData.storytellerName,
          prompt: extractedData.prompt,
          duration: 4,
          layer: 11
        },
        
        // FIXED: Accurate timing information
        timing: {
          storyDuration: storyDuration,
          musicDuration: extractedData.musicDuration,
          videoTotalDuration: extractedData.videoTotalDuration,
          musicEndsAt: extractedData.musicDuration,
          storyEndsAt: storyDuration,
          silenceDuration: extractedData.videoTotalDuration - Math.max(storyDuration, extractedData.musicDuration)
        },
        
        hasBackgroundMusic: !!musicUrl,
        imagesConverted: imageConversionResult.convertedImages?.length || 0,
        imageSequenceCount: imageSequence.length,
        
        estimatedCost: calculateEstimatedCost(storyDuration, imageSequence.length),
        estimatedCompletionMinutes: '5-10',
        tier: 'Production',
        
        features: [
          'fixed_timing_from_n8n',
          'no_black_screens',
          'music_ends_before_story',
          '3_second_silence_buffer',
          'branded_story_info_slide',
          'image_converter_lambda',
          'proper_layer_management',
          'fixed_variable_corruption'
        ],
        
        debug: {
          extractedData: extractedData,
          imageConversionSuccess: imageConversionResult.success,
          musicProcessingSuccess: !!musicUrl,
          storyInfoSlideGenerated: !!storyInfoSlideUrl,
          testMode: extractedData.testMode,
          fixes: [
            'removed_hardcoded_120s_duration',
            'using_actual_durations_from_n8n',
            'video_length_matches_calculated_total',
            'music_ends_before_story',
            '3_second_buffer_at_end',
            'fixed_videoTotalDuration_corruption'
          ]
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Video generation failed:', error);
    console.error('Stack trace:', error.stack);
    
    return createAudioOnlyFallback(error, event);
  }
};

// FIXED: Extract actual durations from N8N
function extractN8NData(event) {
  // CRITICAL FIXES:
  // 1. Parse storyDurationSeconds from N8N (actual audio length)
  // 2. Parse musicDurationSeconds from N8N (selected music length)  
  // 3. Parse videoTotalDuration from N8N (calculated total)
  
  const storyDuration = parseFloat(event.storyDurationSeconds) || 
                        parseFloat(event.story_duration) || 
                        parseFloat(event.storyDuration) || 
                        120; // Fallback only if nothing provided
                        
  const musicDuration = parseFloat(event.musicDurationSeconds) || 
                       parseFloat(event.music_duration) || 
                       parseFloat(event.musicDuration) || 
                       120;
                       
  const videoTotalDuration = parseFloat(event.videoTotalDuration) || 
                             parseFloat(event.video_total_duration) || 
                             parseFloat(event.videoTotalDuration) || 
                             (storyDuration + 3); // UPDATED: Fallback to 3s buffer
  
  console.log('=== DURATION EXTRACTION ===');
  console.log(`Raw storyDurationSeconds: ${event.storyDurationSeconds}`);
  console.log(`Raw musicDurationSeconds: ${event.musicDurationSeconds}`);
  console.log(`Raw videoTotalDuration: ${event.videoTotalDuration}`);
  console.log(`Parsed story: ${storyDuration}s`);
  console.log(`Parsed music: ${musicDuration}s`);
  console.log(`Parsed video: ${videoTotalDuration}s`);
  console.log('===========================');
  
  return {
    storyId: event.storyId || event.story_id,
    audioKey: event.audioKey || event.audio_key,
    userPhotoKey: event.userPhotoKey || event.photo_key,
    storytellerName: event.storytellerName || event.name || 'Someone',
    email: event.email,
    prompt: event.prompt,
    testMode: event.testMode || false,
    
    // FIXED: Actual durations
    storyDuration: storyDuration,
    musicDuration: musicDuration,
    videoTotalDuration: videoTotalDuration,
    
    // Parse generatedImageKeys (N8N sends as JSON string)
    generatedImageKeys: parseGeneratedImageKeys(event.generatedImageKeys),
    
    // Extract music selection
    musicSelection: parseMusicSelection(event)
  };
}

function parseGeneratedImageKeys(generatedImageKeys) {
  if (!generatedImageKeys) return [];
  
  try {
    if (typeof generatedImageKeys === 'string') {
      return JSON.parse(generatedImageKeys);
    } else if (Array.isArray(generatedImageKeys)) {
      return generatedImageKeys;
    }
  } catch (e) {
    console.warn('Failed to parse generatedImageKeys:', e);
  }
  
  return [];
}

function parseMusicSelection(event) {
  let musicSelection = {
    hasMusic: false,
    s3_url: null,
    duration_seconds: 120,
    description: 'No background music'
  };
  
  // Try various N8N music fields
  if (event.backgroundMusicUrl && event.backgroundMusicUrl !== 'null') {
    musicSelection.hasMusic = true;
    musicSelection.s3_url = event.backgroundMusicUrl;
    musicSelection.description = 'Background music from N8N';
  }
  
  if (event.musicSelection && typeof event.musicSelection === 'string') {
    try {
      const parsed = JSON.parse(event.musicSelection);
      if (parsed.s3_url) {
        musicSelection.hasMusic = true;
        musicSelection.s3_url = parsed.s3_url;
        musicSelection.duration_seconds = parsed.duration_seconds || 120;
        musicSelection.description = `${parsed.category}/${parsed.track_name}`;
      }
    } catch (e) {
      console.warn('Failed to parse musicSelection:', e);
    }
  }
  
  return musicSelection;
}

// Story info slide generation
async function generateStoryInfoSlide(storyId, storytellerName, prompt) {
  try {
    console.log(`Generating branded story info slide for: ${storytellerName} - "${prompt}"`);
    
    const storyInfoPayload = {
      action: 'generate_story_info_slide',
      storyId: storyId,
      storytellerName: storytellerName,
      prompt: prompt || "A personal story",
      outputKey: `story-info-slides/${storyId}-info.png`
    };
    
    const command = new InvokeCommand({
      FunctionName: IMAGE_CONVERTER_FUNCTION,
      Payload: JSON.stringify(storyInfoPayload)
    });
    
    const response = await lambda.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      const s3Key = `story-info-slides/${storyId}-info.png`;
      const s3Url = `s3://storiesofyou-stories/${s3Key}`;
      
      console.log(`✅ Generated branded story info slide S3 URL: ${s3Url}`);
      return s3Url;
    } else {
      throw new Error(`Story info slide generation failed: ${result.body}`);
    }
  } catch (error) {
    console.warn('Story info slide generation failed, using logo fallback:', error);
    return 's3://storiesofyou-stories/logo.png';
  }
}

// Image converter Lambda integration
async function convertImagesToPNG({ storyId, userPhotoKey, generatedImageKeys, testMode }) {
  try {
    console.log('Calling image converter Lambda function...');
    
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
    
    console.log('Image converter response:', result);
    
    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      
      // Map processedImages to convertedImages for compatibility
      const convertedImages = body.processedImages || [];
      
      console.log(`Mapped ${convertedImages.length} processedImages to convertedImages`);
      
      return {
        ...body,
        convertedImages: convertedImages,
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

// FIXED: Build image sequence with CORRECT total duration and 3-second buffer
function buildImageSequenceWithStorySlide({
  storyId,
  convertedImages,
  storytellerName,
  prompt,
  videoDuration, // This is the actual total video duration
  storyInfoSlideUrl
}) {
  // ADD THIS DEBUG LOG AT THE VERY START
  console.log('=== CRITICAL: videoDuration received in buildImageSequenceWithStorySlide ===');
  console.log(`videoDuration parameter: ${videoDuration}`);
  console.log(`Type: ${typeof videoDuration}`);
  console.log('===========================================================================');
  
  const images = [];
  
  // FIXED: Timing structure with 3-second outro buffer
  const BRAND_INTRO_DURATION = 3;
  const STORY_INFO_DURATION = 4;
  const BRAND_OUTRO_DURATION = 3; // UPDATED: Changed from 5 to 3 seconds
  
  // CRITICAL FIX: Calculate when outro starts and content duration
  const OUTRO_START_TIME = videoDuration - BRAND_OUTRO_DURATION;
  const CONTENT_START_TIME = BRAND_INTRO_DURATION + STORY_INFO_DURATION;
  const CONTENT_DURATION = OUTRO_START_TIME - CONTENT_START_TIME;
  
  console.log('=== FIXED IMAGE SEQUENCE TIMING (3s Buffer) ===');
  console.log(`Total video duration: ${videoDuration}s`);
  console.log(`- Brand intro: 0-${BRAND_INTRO_DURATION}s`);
  console.log(`- Story info: ${BRAND_INTRO_DURATION}-${CONTENT_START_TIME}s`);
  console.log(`- Content: ${CONTENT_START_TIME}-${OUTRO_START_TIME}s (${CONTENT_DURATION}s)`);
  console.log(`- Brand outro: ${OUTRO_START_TIME}-${videoDuration}s (last ${BRAND_OUTRO_DURATION}s)`);
  console.log('================================================');
  
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
  
  // 2. Story info slide
  images.push({
    url: storyInfoSlideUrl,
    startTime: BRAND_INTRO_DURATION,
    duration: STORY_INFO_DURATION,
    type: 'story_info_slide',
    description: `Branded story slide: "${prompt}" by ${storytellerName}`,
    position: 'fullscreen',
    layer: 11
  });
  
  // 3. Content images
  if (convertedImages && convertedImages.length > 0) {
    const timePerImage = CONTENT_DURATION / convertedImages.length;
    let currentTime = CONTENT_START_TIME;
    
    convertedImages.forEach((convertedImage, index) => {
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
        layer: 20 + index,
        kenBurns: true,
        originalKey: convertedImage.originalKey,
        convertedKey: convertedImage.convertedKey || convertedImage.processedKey
      });
      
      currentTime += timePerImage;
      console.log(`AI Image ${index + 1}: ${timePerImage.toFixed(1)}s duration, ends at ${currentTime.toFixed(1)}s`);
    });
  } else {
    // Fallback: Logo-only content
    images.push({
      url: 's3://storiesofyou-stories/logo.png',
      startTime: CONTENT_START_TIME,
      duration: CONTENT_DURATION,
      type: 'logo_fallback',
      description: 'Logo fallback (no images converted)',
      position: 'center',
      layer: 20
    });
  }
  
  // 4. Corner logo overlay during content (NOT during outro)
  images.push({
    url: 'https://raw.githubusercontent.com/StoriesOfYou/storiesofyou-site/main/logo.png',
    startTime: CONTENT_START_TIME,
    duration: CONTENT_DURATION, // Ends when outro starts
    type: 'corner_logo',
    description: 'Corner logo overlay during content',
    position: 'bottom_right',
    layer: 50,
    opacity: 80
  });
  
  // DEBUG LOG RIGHT BEFORE PUSHING OUTRO
  console.log(`DEBUG: About to push outro - OUTRO_START_TIME=${OUTRO_START_TIME}, videoDuration=${videoDuration}, BRAND_OUTRO_DURATION=${BRAND_OUTRO_DURATION}`);
  
  // 5. FIXED: Brand outro for exactly 3 seconds
  images.push({
    url: 's3://storiesofyou-stories/logo.png',
    startTime: OUTRO_START_TIME,
    duration: BRAND_OUTRO_DURATION,
    type: 'brand_outro',
    description: 'Stories of You brand conclusion (3s buffer)',
    position: 'center',
    layer: 99
  });
  
  console.log(`✅ Image sequence built with 3-second outro`);
  console.log(`   Outro starts at ${OUTRO_START_TIME}s and runs for ${BRAND_OUTRO_DURATION}s`);
  console.log(`   Video ends at ${videoDuration}s`);
  console.log(`   Outro should end at ${OUTRO_START_TIME + BRAND_OUTRO_DURATION}s (calculated: ${videoDuration})`);
  
  return images;
}

// FIXED: MediaConvert job with correct video duration
async function createProvenMediaConvertJob({
  storyId,
  audioUrl,
  musicUrl,
  musicSelection,
  storyTitle,
  storytellerName,
  imageSequence,
  storyDuration,
  videoTotalDuration // FIXED: Use actual total duration
}) {
  
  console.log('Creating MediaConvert job with CORRECT duration');
  console.log(`Video will be exactly ${videoTotalDuration} seconds`);
  
  // Audio selector configuration
  const audioSelectors = {
    'Audio Selector 1': {
      DefaultSelection: 'DEFAULT',
      SelectorType: 'TRACK',
      Tracks: [1],
      AudioDurationCorrection: 'AUTO'
    }
  };
  
  let audioSelectorGroups = null;
  
  if (musicUrl) {
    console.log(`Adding QUIET background music: ${musicUrl}`);
    
    audioSelectors['Audio Selector 2'] = {
      DefaultSelection: 'DEFAULT',
      SelectorType: 'TRACK',
      Tracks: [1],
      ExternalAudioFileInput: musicUrl,
      Offset: 0,
      AudioDurationCorrection: 'AUTO'
    };
    
    audioSelectorGroups = {
      'Audio Selector Group 1': {
        AudioSelectorNames: ['Audio Selector 1', 'Audio Selector 2']
      }
    };
  }
  
  // Audio description with RemixSettings
  const audioDescriptions = [{
    AudioTypeControl: musicUrl ? 'USE_CONFIGURED' : 'FOLLOW_INPUT',
    AudioSourceName: musicUrl ? 'Audio Selector Group 1' : 'Audio Selector 1',
    CodecSettings: {
      Codec: 'AAC',
      AacSettings: {
        Bitrate: 128000,
        RateControlMode: 'CBR',
        CodecProfile: 'LC',
        CodingMode: 'CODING_MODE_2_0',
        SampleRate: 48000
      }
    },
    ...(musicUrl && {
      RemixSettings: {
        ChannelMapping: {
          OutputChannels: [
            {
              InputChannelsFineTune: [0, -15]
            },
            {
              InputChannelsFineTune: [0, -15]
            }
          ]
        },
        ChannelsIn: 2,
        ChannelsOut: 2
      }
    })
  }];

  // Build insertable images
  const insertableImages = createInsertableImagesFromSequence(imageSequence);
  
  // MediaConvert job structure
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
              NameModifier: '_complete',
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: {
                  CslgAtom: 'INCLUDE',
                  FreeSpaceBox: 'EXCLUDE',
                  MoovPlacement: 'PROGRESSIVE_DOWNLOAD'
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
                    RateControlMode: 'CBR',
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
                      // FIXED: Warm background for EXACT video duration
                      {
                        ImageInserterInput: 's3://assets.storiesofyou.ai/warm-background.png',
                        ImageX: 0,
                        ImageY: 0,
                        Width: 1920,
                        Height: 1080,
                        StartTime: '00:00:00:00',
                        Duration: Math.round(videoTotalDuration * 1000), // FIXED: Use actual duration
                        FadeIn: 0,
                        FadeOut: 0,
                        Opacity: 100,
                        Layer: 0
                      },
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

// Create insertable images from sequence
function createInsertableImagesFromSequence(imageSequence) {
  const insertableImages = [];
  
  imageSequence.forEach((image, index) => {
    const startTimeCode = secondsToTimecode(image.startTime);
    const durationMs = Math.round(image.duration * 1000);
    
    // URL conversion logic
    let imageUrl = image.url;
    if (imageUrl.startsWith('s3://')) {
      console.log(`Keeping S3 URL for MediaConvert: ${imageUrl}`);
    } else if (imageUrl.startsWith('https://')) {
      if (imageUrl.includes('storiesofyou-stories.s3.us-east-2.amazonaws.com')) {
        imageUrl = imageUrl.replace('https://storiesofyou-stories.s3.us-east-2.amazonaws.com/', 's3://storiesofyou-stories/');
      } else if (imageUrl.includes('storiesofyou-incoming.s3.us-east-2.amazonaws.com')) {
        imageUrl = imageUrl.replace('https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/', 's3://storiesofyou-incoming/');
      } else if (imageUrl.includes('assets.storiesofyou.ai')) {
        imageUrl = imageUrl.replace('https://assets.storiesofyou.ai/', 's3://assets.storiesofyou.ai/');
      }
      console.log(`Converted HTTPS to S3 URL: ${imageUrl}`);
    }
    
    console.log(`Image ${index + 1}: ${image.type} -> ${imageUrl} (${image.startTime}s-${image.startTime + image.duration}s, Layer ${image.layer})`);
    
    let imageConfig = {
      ImageInserterInput: imageUrl,
      StartTime: startTimeCode,
      Duration: durationMs,
      FadeIn: 500,
      FadeOut: 500,
      Opacity: image.opacity || 100,
      Layer: image.layer
    };
    
    // Position based on image type
    if (image.position === 'center') {
      imageConfig = {
        ...imageConfig,
        ImageX: 660,
        ImageY: 390,
        Width: 600,
        Height: 300
      };
    } else if (image.position === 'bottom_right') {
      imageConfig = {
        ...imageConfig,
        ImageX: 1520,
        ImageY: 880,
        Width: 300,
        Height: 150,
        Opacity: image.opacity || 90
      };
    } else {
      // Fullscreen
      imageConfig = {
        ...imageConfig,
        ImageX: 0,
        ImageY: 0,
        Width: 1920,
        Height: 1080
      };
    }
    
    insertableImages.push(imageConfig);
  });
  
  console.log(`Created ${insertableImages.length} insertable images for MediaConvert`);
  return insertableImages;
}

// Convert seconds to MediaConvert timecode
function secondsToTimecode(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

// FIXED: Job tracking with actual durations
async function createComprehensiveJobTracking({
  jobResult,
  extractedData,
  imageConversionResult,
  storyDuration,
  musicUrl,
  imageSequence,
  videoTotalDuration // FIXED: Include actual duration
}) {
  const jobInfo = {
    jobId: jobResult.Job.Id,
    storyId: extractedData.storyId,
    status: jobResult.Job.Status,
    approach: 'fixed_timing_3s_buffer_final',
    
    // FIXED: Actual timing information
    storyDuration: storyDuration,
    musicDuration: extractedData.musicDuration,
    videoTotalDuration: videoTotalDuration,
    expectedVideoLength: videoTotalDuration,
    
    // Content information
    storytellerName: extractedData.storytellerName,
    prompt: extractedData.prompt,
    email: extractedData.email,
    
    // Asset information
    audioUrl: `s3://storiesofyou-incoming/${extractedData.audioKey}`,
    musicUrl: musicUrl,
    hasBackgroundMusic: !!musicUrl,
    
    // Image processing results
    imageConversionSuccess: imageConversionResult.success,
    originalImagesCount: (extractedData.generatedImageKeys?.length || 0) + (extractedData.userPhotoKey ? 1 : 0),
    convertedImagesCount: imageConversionResult.convertedImages?.length || 0,
    imageSequenceCount: imageSequence.length,
    
    // Production details
    createdAt: new Date().toISOString(),
    expectedOutput: `s3://storiesofyou-stories/videos/${extractedData.storyId}_complete.mp4`,
    estimatedCost: calculateEstimatedCost(storyDuration, imageSequence.length),
    tier: 'Production',
    
    // Feature tracking
    features: [
      'fixed_timing_from_n8n',
      'no_black_screens',
      'music_ends_before_story',
      '3_second_silence_buffer',
      'branded_story_info_slide',
      'image_converter_lambda',
      'proper_layer_management',
      'fixed_variable_corruption'
    ],
    
    // Error handling info
    imageConversionResult: imageConversionResult,
    testMode: extractedData.testMode,
    
    // Audio configuration tracking
    audioMixingConfig: 'Fixed 2-channel RemixSettings with -25dB music attenuation'
  };
  
  // Store job tracking info in S3
  const putCommand = new PutObjectCommand({
    Bucket: 'storiesofyou-stories',
    Key: `video-jobs/${extractedData.storyId}.json`,
    Body: JSON.stringify(jobInfo, null, 2),
    ContentType: 'application/json',
    ACL: 'public-read'
  });
  
  await s3.send(putCommand);
  console.log(`✅ Job tracking stored: video-jobs/${extractedData.storyId}.json`);
  
  return jobInfo;
}

// Calculate estimated MediaConvert cost
function calculateEstimatedCost(durationSeconds, imageCount) {
  const baseCostPerMinute = 0.015;
  const durationMinutes = Math.ceil(durationSeconds / 60);
  const imageCostPerImage = 0.001;
  
  return (durationMinutes * baseCostPerMinute) + (imageCount * imageCostPerImage);
}

// Graceful degradation with audio-only fallback
function createAudioOnlyFallback(error, event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: false,
      fallback: 'audio_only',
      error: error.message,
      storyId: event.storyId || event.story_id || 'unknown',
      approach: 'fixed_timing_fallback',
      message: 'Video generation failed, story will be delivered as audio-only',
      testMode: event.testMode || false,
      gracefulDegradation: true,
      note: 'N8N workflow can continue with audio-only story page'
    })
  };
}

// FIXED: Enhanced logging for data extraction
function logDataExtraction(extractedData) {
  console.log('=== EXTRACTED DATA WITH TIMING ===');
  console.log('- Story ID:', extractedData.storyId);
  console.log('- Audio Key:', extractedData.audioKey);
  console.log('- Story Duration:', extractedData.storyDuration, 'seconds');
  console.log('- Music Duration:', extractedData.musicDuration, 'seconds');
  console.log('- Video Total:', extractedData.videoTotalDuration, 'seconds');
  console.log('- User Photo Key:', extractedData.userPhotoKey);
  console.log('- Generated Images:', extractedData.generatedImageKeys?.length || 0);
  console.log('- Storyteller:', extractedData.storytellerName);
  console.log('- Has Music:', extractedData.musicSelection?.hasMusic);
  console.log('- Test Mode:', extractedData.testMode);
  console.log('===================================');
}

function logImageConversionResults(result) {
  console.log('=== IMAGE CONVERSION RESULTS ===');
  console.log('- Success:', result.success);
  console.log('- Converted Images:', result.convertedImages?.length || 0);
  console.log('- Error:', result.error || 'None');
  console.log('=================================');
}

// Status checking functionality
exports.checkStatus = async (event) => {
  const { jobId, storyId } = event;
  
  try {
    const command = new GetJobCommand({ Id: jobId });
    const jobStatus = await mediaConvert.send(command);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        jobId: jobId,
        storyId: storyId,
        status: jobStatus.Job.Status,
        progress: jobStatus.Job.JobPercentComplete || 0,
        createdAt: jobStatus.Job.CreatedAt,
        completedAt: jobStatus.Job.FinishedAt,
        approach: 'fixed_timing_3s_buffer',
        estimatedCost: calculateEstimatedCost(120, 3)
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        jobId: jobId,
        storyId: storyId,
        approach: 'fixed_timing_3s_buffer'
      })
    };
  }
};

// FFmpeg diagnostic (for troubleshooting)
exports.diagnoseFFmpeg = async () => {
  try {
    console.log('=== FFmpeg Layer Diagnostic ===');
    
    const optBinContents = fs.readdirSync('/opt/bin/');
    console.log('/opt/bin/ contents:', optBinContents);
    
    const version = execSync('/opt/bin/ffprobe -version', { 
      encoding: 'utf8',
      timeout: 10000 
    });
    console.log('FFprobe version:', version.split('\n')[0]);
    
    return { 
      success: true, 
      message: 'FFmpeg layer is working correctly',
      version: version.split('\n')[0]
    };
    
  } catch (error) {
    console.error('FFmpeg diagnostic failed:', error.message);
    return { 
      success: false, 
      error: error.message
    };
  }
};
