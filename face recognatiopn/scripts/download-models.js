const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, '..', 'client', 'public', 'models');

// Models required for face-api.js
const MODELS = [
  // SSD MobileNet v1 - Face Detection
  {
    name: 'ssd_mobilenetv1_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json'
  },
  {
    name: 'ssd_mobilenetv1_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1'
  },
  {
    name: 'ssd_mobilenetv1_model-shard2',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2'
  },
  // Face Landmark 68 - Facial Features Detection
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1'
  },
  // Face Recognition - Face Descriptors
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json'
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1'
  },
  {
    name: 'face_recognition_model-shard2',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
  }
];

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log('✓ Created models directory');
}

// Download a single file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Download all models
async function downloadModels() {
  console.log('\n📥 Downloading face-api.js models...\n');
  
  for (const model of MODELS) {
    const destPath = path.join(MODELS_DIR, model.name);
    
    // Skip if file already exists
    if (fs.existsSync(destPath)) {
      console.log(`✓ ${model.name} (already exists)`);
      continue;
    }
    
    try {
      process.stdout.write(`⏳ Downloading ${model.name}... `);
      await downloadFile(model.url, destPath);
      console.log('✓ Done');
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Model download complete!');
  console.log(`📁 Models saved to: ${MODELS_DIR}\n`);
}

// Run the download
downloadModels().catch(console.error);
