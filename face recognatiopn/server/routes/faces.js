const express = require('express');
const router = express.Router();
const db = require('../database/db');
const faceRecognition = require('../utils/faceRecognition');

// Get all faces
router.get('/', (req, res) => {
  db.all("SELECT id, name, photo_path, created_at FROM faces ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching faces', error: err.message });
    }
    res.json({ faces: rows });
  });
});

// Store a new face
router.post('/store', async (req, res) => {
  try {
    const { name, imageData, faceDescriptor } = req.body;

    if (!name || !imageData || !faceDescriptor) {
      return res.status(400).json({ 
        message: 'Name, image data, and face descriptor are required' 
      });
    }

    // Check if face already exists
    console.log('Checking for existing faces...');
    const existingFace = await faceRecognition.findMatchingFace(faceDescriptor);
    
    if (existingFace) {
      console.log(`Face match found: ${existingFace.name} (confidence: ${existingFace.confidence.toFixed(3)})`);
      return res.status(409).json({ 
        message: 'Face already exists in database',
        existingFace: {
          id: existingFace.id,
          name: existingFace.name,
          confidence: existingFace.confidence
        }
      });
    }
    
    console.log('No matching face found - saving new face');

    // Save image to file (in production, use proper storage)
    const photoPath = await faceRecognition.saveImage(imageData, name);

    // Store face in database
    const descriptorString = JSON.stringify(faceDescriptor);
    
    db.run(
      "INSERT INTO faces (name, photo_path, face_descriptor) VALUES (?, ?, ?)",
      [name, photoPath, descriptorString],
      function(err) {
        if (err) {
          return res.status(500).json({ 
            message: 'Error storing face', 
            error: err.message 
          });
        }

        res.status(201).json({
          message: 'Face stored successfully',
          faceId: this.lastID,
          name: name
        });
      }
    );
  } catch (error) {
    console.error('Error storing face:', error);
    res.status(500).json({ 
      message: 'Error storing face', 
      error: error.message 
    });
  }
});

// Compare face with existing faces
router.post('/compare', async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor) {
      return res.status(400).json({ 
        message: 'Face descriptor is required' 
      });
    }

    // Find matching face
    const match = await faceRecognition.findMatchingFace(faceDescriptor);

    if (match) {
      // Log recognition
      db.run(
        "INSERT INTO recognition_logs (face_id, confidence, match_found) VALUES (?, ?, ?)",
        [match.id, match.confidence, true]
      );

      res.json({
        matchFound: true,
        face: {
          id: match.id,
          name: match.name,
          photo_path: match.photo_path,
          confidence: match.confidence
        }
      });
    } else {
      // Log failed recognition
      db.run(
        "INSERT INTO recognition_logs (confidence, match_found) VALUES (?, ?)",
        [0, false]
      );

      res.json({
        matchFound: false,
        message: 'No matching face found'
      });
    }
  } catch (error) {
    console.error('Error comparing face:', error);
    res.status(500).json({ 
      message: 'Error comparing face', 
      error: error.message 
    });
  }
});

// Get recognition logs
router.get('/logs', (req, res) => {
  const query = `
    SELECT rl.*, f.name as face_name 
    FROM recognition_logs rl 
    LEFT JOIN faces f ON rl.face_id = f.id 
    ORDER BY rl.created_at DESC 
    LIMIT 50
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching logs', error: err.message });
    }
    res.json({ logs: rows });
  });
});

// Delete a face
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM faces WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error deleting face', error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Face not found' });
    }
    res.json({ message: 'Face deleted successfully' });
  });
});

module.exports = router;
