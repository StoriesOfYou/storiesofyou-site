const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

// Load Sharp from the sharp layer
let sharp;
try {
  sharp = require('/opt/nodejs/node_modules/sharp');
  console.log('✅ Sharp loaded from sharp layer');
} catch (e) {
  console.error('❌ Sharp not found:', e.message);
}

// FIXED: Load Skia-Canvas with GlobalFonts (the correct API for @napi-rs/canvas)
let createCanvas, loadImage, GlobalFonts;
try {
  const skiaCanvas = require('/opt/nodejs/node_modules/@napi-rs/canvas');
  
  createCanvas = skiaCanvas.createCanvas;
  loadImage = skiaCanvas.loadImage;
  GlobalFonts = skiaCanvas.GlobalFonts;  // This is the correct font manager for @napi-rs/canvas
  
  console.log('✅ Skia-canvas loaded successfully');
  console.log('Available methods:', Object.keys(skiaCanvas));
  console.log('createCanvas type:', typeof createCanvas);
  console.log('loadImage type:', typeof loadImage);
  console.log('GlobalFonts type:', typeof GlobalFonts);
  
} catch (e) {
  console.error('❌ Canvas loading failed:', e.message);
}

const s3 = new S3Client({ region: 'us-east-2' });

// FIXED: Load fonts using GlobalFonts API
function loadCustomFonts() {
  if (GlobalFonts && GlobalFonts.registerFromPath) {
    try {
      GlobalFonts.registerFromPath('/opt/fonts/OpenSans-Regular.ttf', 'Open Sans');
      GlobalFonts.registerFromPath('/opt/fonts/OpenSans-Bold.ttf', 'Open Sans Bold');
      console.log('✅ Open Sans fonts loaded via GlobalFonts');
      
      const families = GlobalFonts.families;
      console.log('Registered font families:', families);
      return true;
    } catch (error) {
      console.warn('⚠️ GlobalFonts.registerFromPath failed:', error.message);
    }
  }
  
  console.warn('⚠️ No font loading method available');
  return false;
}

exports.handler = async (event) => {
  console.log('=== IMAGE CONVERTER LAMBDA WITH SKIA CANVAS ===');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Check if canvas functions are available
  if (!createCanvas) {
    console.error('❌ CRITICAL: createCanvas function not available');
    console.log('Attempting fallback to Sharp-only processing...');
  }
  
  // Load fonts on startup
  const fontsLoaded = loadCustomFonts();
  
  try {
    const { action, storyId, userPhotoKey, generatedImageKeys = [] } = event;
    
    // Handle story info slide generation
    if (action === 'generate_story_info_slide') {
      if (!createCanvas) {
        console.log('Using Sharp fallback for title slide...');
        return await generateSimpleTitleSlideWithSharp(event);
      }
      
      console.log('Generating story info slide with Skia Canvas...');
      const slideResult = await generateStoryInfoSlideWithSkia(event);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          storyInfoSlide: slideResult,
          fontsLoaded: fontsLoaded,
          message: 'Story info slide generated with Skia Canvas text rendering'
        })
      };
    }
    
    // Handle regular image conversion (JPEGs to PNG, etc.)
    if (storyId) {
      console.log(`Processing images for story ${storyId}...`);
      const conversionResult = await processImagesForStory(event);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          ...conversionResult,
          fontsLoaded: fontsLoaded,
          approach: 'skia_canvas_with_sharp_fallback'
        })
      };
    }
    
    // Health check
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Image converter ready',
        hasCanvas: !!createCanvas,
        hasSharp: !!sharp,
        fontsLoaded: fontsLoaded,
        features: [
          sharp ? 'sharp_image_processing' : null,
          createCanvas ? 'skia_canvas_text_rendering' : null,
          'jpeg_to_png_conversion'
        ].filter(Boolean)
      })
    };
    
  } catch (error) {
    console.error('Image converter failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        hasCanvas: !!createCanvas,
        hasSharp: !!sharp,
        approach: 'skia_canvas_with_sharp_fallback'
      })
    };
  }
};

// Sharp-only fallback for title slide (creates a simple colored background)
async function generateSimpleTitleSlideWithSharp(event) {
  const { storyId, storytellerName, prompt, outputKey } = event;
  
  console.log('Creating simple title slide with Sharp (no text rendering)');
  
  try {
    const width = 1920;
    const height = 1080;
    
    const svgImage = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#faf3e7" />
            <stop offset="50%" style="stop-color:#f4e6d1" />
            <stop offset="100%" style="stop-color:#e0cba7" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#gradient)" />
        <text x="${width/2}" y="${height/2 - 100}" text-anchor="middle" font-family="Arial" font-size="72" font-weight="bold" fill="#0f2c4c">Stories of You</text>
        <text x="${width/2}" y="${height/2 + 20}" text-anchor="middle" font-family="Arial" font-size="48" font-style="italic" fill="#3d3528">"${prompt?.substring(0, 50) || 'A personal story'}"</text>
        <text x="${width/2}" y="${height/2 + 120}" text-anchor="middle" font-family="Arial" font-size="36" fill="#6b7280">A story by ${storytellerName || 'Someone Special'}</text>
      </svg>
    `;
    
    const pngBuffer = await sharp(Buffer.from(svgImage))
      .png()
      .toBuffer();
    
    console.log(`Generated simple slide PNG: ${pngBuffer.length} bytes`);
    
    const uploadKey = outputKey || `story-info-slides/${storyId}-info.png`;
    
    await s3.send(new PutObjectCommand({
      Bucket: 'storiesofyou-stories',
      Key: uploadKey,
      Body: pngBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }));
    
    const slideUrl = `s3://storiesofyou-stories/${uploadKey}`;
    console.log(`✅ Simple title slide uploaded: ${slideUrl}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        storyInfoSlide: {
          outputKey: uploadKey,
          url: slideUrl,
          storytellerName: storytellerName,
          prompt: prompt,
          format: 'png',
          method: 'sharp_svg_fallback',
          dimensions: { width, height },
          note: 'SVG-based text rendering with Sharp'
        }
      })
    };
    
  } catch (error) {
    console.error('Sharp fallback failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        method: 'sharp_svg_fallback'
      })
    };
  }
}

// Generate story info slide using Skia Canvas for text rendering
async function generateStoryInfoSlideWithSkia(event) {
  const { storyId, storytellerName, prompt, outputKey } = event;
  
  console.log(`Creating branded story slide: "${prompt}" by ${storytellerName}`);
  
  try {
    const width = 1920;
    const height = 1080;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 1. Create warm gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#faf3e7');
    gradient.addColorStop(0.5, '#f4e6d1');
    gradient.addColorStop(1, '#e0cba7');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 2. Add subtle texture overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 3 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    // 3. Load and draw logo centered where the text was
    if (loadImage) {
      try {
        const logoResponse = await s3.send(new GetObjectCommand({
          Bucket: 'storiesofyou-stories',
          Key: 'logo.png'
        }));
        
        const logoBuffer = await streamToBuffer(logoResponse.Body);
        const logo = await loadImage(logoBuffer);
        
        // Calculate proper logo dimensions maintaining aspect ratio
        const maxLogoWidth = 400;  // Maximum width for the logo
        const maxLogoHeight = 120;  // Maximum height for the logo
        
        const logoAspect = logo.width / logo.height;
        let logoWidth, logoHeight;
        
        if (logo.width / maxLogoWidth > logo.height / maxLogoHeight) {
          // Width is the limiting factor
          logoWidth = maxLogoWidth;
          logoHeight = maxLogoWidth / logoAspect;
        } else {
          // Height is the limiting factor
          logoHeight = maxLogoHeight;
          logoWidth = maxLogoHeight * logoAspect;
        }
        
        // Draw logo centered where "Stories of You" text was
        const logoX = (width - logoWidth) / 2;
        const logoY = (height / 2) - 150;  // Positioned where the text was
        
        ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
        console.log(`✅ Logo drawn: ${logoWidth}x${logoHeight} at position ${logoX},${logoY}`);
        
      } catch (logoError) {
        console.warn('Logo loading failed, falling back to text:', logoError.message);
        // Fallback to text if logo fails
        ctx.fillStyle = '#0f2c4c';
        ctx.font = 'bold 72px "Open Sans", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Stories of You', width/2, height/2 - 100);
      }
    } else {
      // Fallback to text if loadImage not available
      ctx.fillStyle = '#0f2c4c';
      ctx.font = 'bold 72px "Open Sans", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Stories of You', width/2, height/2 - 100);
    }
    
    // 4. Draw story prompt in quotes (moved up slightly since logo might be larger)
    const maxPromptLength = 60;
    const displayPrompt = prompt && prompt.length > maxPromptLength 
      ? prompt.substring(0, maxPromptLength) + '...' 
      : prompt || 'A personal story';
    
    ctx.fillStyle = '#3d3528';
    ctx.font = 'italic 48px "Open Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`"${displayPrompt}"`, width/2, height/2 + 40);  // Adjusted Y position
    
    // 5. Draw attribution
    const attribution = `A story by ${storytellerName || 'Someone Special'}`;
    ctx.fillStyle = '#6b7280';
    ctx.font = '36px "Open Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(attribution, width/2, height/2 + 140);  // Adjusted Y position
    
    // 6. Add decorative line
    ctx.strokeStyle = '#e09a1b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width/2 - 200, height/2 + 180);  // Adjusted Y position
    ctx.lineTo(width/2 + 200, height/2 + 180);
    ctx.stroke();
    
    // 7. Convert to PNG buffer
    const pngBuffer = await canvas.toBuffer('image/png');
    console.log(`Generated slide PNG: ${pngBuffer.length} bytes`);
    
    // 8. Upload to S3
    const uploadKey = outputKey || `story-info-slides/${storyId}-info.png`;
    
    await s3.send(new PutObjectCommand({
      Bucket: 'storiesofyou-stories',
      Key: uploadKey,
      Body: pngBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }));
    
    const slideUrl = `s3://storiesofyou-stories/${uploadKey}`;
    console.log(`✅ Story info slide uploaded: ${slideUrl}`);
    
    return {
      outputKey: uploadKey,
      url: slideUrl,
      storytellerName: storytellerName,
      prompt: prompt,
      format: 'png',
      method: 'skia_canvas_text_rendering',
      dimensions: { width, height }
    };
    
  } catch (error) {
    console.error('Skia Canvas story slide generation failed:', error);
    throw new Error(`Story slide generation failed: ${error.message}`);
  }
}

// Process regular images (JPEG to PNG conversion, etc.)
async function processImagesForStory(event) {
  const { storyId, userPhotoKey, generatedImageKeys = [], testMode } = event;
  
  console.log(`Processing images for story ${storyId}:`);
  console.log(`- User photo: ${userPhotoKey || 'none'}`);
  console.log(`- AI images: ${generatedImageKeys.length}`);
  
  const processedImages = [];
  
  if (userPhotoKey) {
    try {
      const userPhotoResult = await convertImageToPNG({
        sourceKey: userPhotoKey,
        sourceBucket: 'storiesofyou-incoming',
        targetKey: `processed/${storyId}-user-photo.png`,
        targetBucket: 'storiesofyou-stories',
        type: 'user_photo',
        description: 'User uploaded photo (converted to PNG)'
      });
      
      processedImages.push(userPhotoResult);
      console.log(`✅ User photo processed: ${userPhotoResult.processedKey}`);
      
    } catch (error) {
      console.error('User photo processing failed:', error);
    }
  }
  
  for (let i = 0; i < generatedImageKeys.length; i++) {
    try {
      const aiImageResult = await ensurePNGFormat({
        sourceKey: generatedImageKeys[i],
        sourceBucket: 'storiesofyou-stories',
        targetKey: `processed/${storyId}-ai-image-${i + 1}.png`,
        targetBucket: 'storiesofyou-stories',
        type: 'ai_generated',
        description: `AI-generated illustration ${i + 1} (PNG format)`
      });
      
      processedImages.push(aiImageResult);
      console.log(`✅ AI image ${i + 1} processed: ${aiImageResult.processedKey}`);
      
    } catch (error) {
      console.error(`AI image ${i + 1} processing failed:`, error);
    }
  }
  
  return {
    storyId: storyId,
    processedImages: processedImages,
    convertedImages: processedImages,
    totalProcessed: processedImages.length,
    userPhotoProcessed: !!userPhotoKey,
    aiImagesProcessed: generatedImageKeys.length
  };
}

// Convert JPEG to PNG using Sharp
async function convertImageToPNG({ sourceKey, sourceBucket, targetKey, targetBucket, type, description }) {
  try {
    const getResponse = await s3.send(new GetObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey
    }));
    
    const sourceBuffer = await streamToBuffer(getResponse.Body);
    console.log(`Downloaded ${sourceKey}: ${sourceBuffer.length} bytes`);
    
    const pngBuffer = await sharp(sourceBuffer)
      .png({ quality: 90, compressionLevel: 6 })
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .toBuffer();
    
    console.log(`Converted to PNG: ${pngBuffer.length} bytes`);
    
    await s3.send(new PutObjectCommand({
      Bucket: targetBucket,
      Key: targetKey,
      Body: pngBuffer,
      ContentType: 'image/png',
      ACL: 'public-read'
    }));
    
    return {
      type: type,
      originalKey: sourceKey,
      processedKey: targetKey,
      processedUrl: `s3://${targetBucket}/${targetKey}`,
      convertedKey: targetKey,
      convertedUrl: `s3://${targetBucket}/${targetKey}`,
      duration: calculateImageDuration(type),
      description: description,
      format: 'png',
      method: 'sharp_conversion'
    };
    
  } catch (error) {
    console.error(`Image conversion failed for ${sourceKey}:`, error);
    throw error;
  }
}

// Ensure image is in PNG format
async function ensurePNGFormat({ sourceKey, sourceBucket, targetKey, targetBucket, type, description }) {
  try {
    if (sourceKey.endsWith('.png')) {
      return {
        type: type,
        originalKey: sourceKey,
        processedKey: sourceKey,
        processedUrl: `s3://${sourceBucket}/${sourceKey}`,
        convertedKey: sourceKey,
        convertedUrl: `s3://${sourceBucket}/${sourceKey}`,
        duration: calculateImageDuration(type),
        description: description,
        format: 'png',
        method: 'direct_reference'
      };
    }
    
    return await convertImageToPNG({ 
      sourceKey, sourceBucket, targetKey, targetBucket, type, description 
    });
    
  } catch (error) {
    console.error(`PNG format check failed for ${sourceKey}:`, error);
    throw error;
  }
}

// Calculate image duration based on type
function calculateImageDuration(type) {
  switch (type) {
    case 'user_photo': return 3.0;
    case 'ai_generated': return 2.5;
    case 'story_info_slide': return 4.0;
    default: return 2.0;
  }
}

// Utility function to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
