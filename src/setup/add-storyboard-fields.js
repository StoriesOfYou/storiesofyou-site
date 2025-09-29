// Migration script to add storyboard fields to existing storiesofyou-recordings records
// Run this once to add new fields to existing stories

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-2' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'storiesofyou-recordings';

async function addStoryboardFields() {
  console.log('Starting migration to add storyboard fields...');
  
  try {
    // Scan all records
    const scanParams = {
      TableName: TABLE_NAME,
      ProjectionExpression: 'story_id, photo_key, story_url, created_at, status'
    };
    
    const result = await dynamodb.scan(scanParams).promise();
    console.log(`Found ${result.Items.length} stories to update`);
    
    for (const item of result.Items) {
      const updateParams = {
        TableName: TABLE_NAME,
        Key: { story_id: item.story_id },
        UpdateExpression: 'SET #audio_duration = :audio_duration, #video_url = :video_url, #thumbnail_url = :thumbnail_url, #story_created_day = :story_created_day, #file_size_mb = :file_size_mb',
        ExpressionAttributeNames: {
          '#audio_duration': 'audio_duration_seconds',
          '#video_url': 'video_url',
          '#thumbnail_url': 'thumbnail_url',
          '#story_created_day': 'story_created_day',
          '#file_size_mb': 'file_size_mb'
        },
        ExpressionAttributeValues: {
          ':audio_duration': null, // Will be populated by future stories
          ':video_url': item.status === 'completed' ? generateVideoUrl(item) : null,
          ':thumbnail_url': generateThumbnailUrl(item),
          ':story_created_day': item.status === 'completed' ? item.created_at : null,
          ':file_size_mb': null // Will be populated by future stories
        }
      };
      
      await dynamodb.update(updateParams).promise();
      console.log(`Updated story: ${item.story_id}`);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

function generateThumbnailUrl(item) {
  // If user provided photo, use that
  if (item.photo_key && item.photo_key !== 'default-story-image.jpg') {
    return `https://storiesofyou-incoming.s3.us-east-2.amazonaws.com/${item.photo_key}`;
  }
  
  // Otherwise, use first AI-generated image
  if (item.story_id) {
    return `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/generated-images/${item.story_id}-1.png`;
  }
  
  return null;
}

function generateVideoUrl(item) {
  // Generate video URL from story_id
  if (item.story_id) {
    return `https://storiesofyou-stories.s3.us-east-2.amazonaws.com/videos/${item.story_id}_complete.mp4`;
  }
  
  return null;
}

// Run the migration
if (require.main === module) {
  addStoryboardFields()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { addStoryboardFields };
