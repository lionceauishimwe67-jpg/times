const fs = require('fs').promises;
const path = require('path');
const db = require('../database/db');

// Save image from base64 data
async function saveImage(base64Data, name) {
  try {
    // Remove data URL prefix if present
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `${name.replace(/\s+/g, '_')}_${timestamp}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    
    await fs.writeFile(filepath, buffer);
    
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

// Find matching face from database using Euclidean distance
// Threshold: lower = stricter matching (0.5 is recommended for production)
async function findMatchingFace(inputDescriptor, threshold = 0.5) {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, name, photo_path, face_descriptor FROM faces", [], (err, rows) => {
      if (err) {
        return reject(err);
      }

      if (!rows || rows.length === 0) {
        return resolve(null);
      }

      let bestMatch = null;
      let bestDistance = Infinity;

      for (const row of rows) {
        try {
          const storedDescriptor = JSON.parse(row.face_descriptor);
          
          // Calculate Euclidean distance
          const distance = calculateEuclideanDistance(inputDescriptor, storedDescriptor);
          
          if (distance < bestDistance && distance < threshold) {
            bestDistance = distance;
            bestMatch = {
              id: row.id,
              name: row.name,
              photo_path: row.photo_path,
              confidence: 1 - distance
            };
          }
        } catch (parseError) {
          console.error('Error parsing face descriptor:', parseError);
          continue;
        }
      }

      resolve(bestMatch);
    });
  });
}

// Calculate Euclidean distance between two face descriptors
function calculateEuclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

module.exports = {
  saveImage,
  findMatchingFace,
  calculateEuclideanDistance
};
