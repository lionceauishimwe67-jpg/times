import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import './App.css';

const MODEL_URL = '/models';

function App() {
  const [activeTab, setActiveTab] = useState('register');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      setLoading(false);
    } catch (error) {
      console.error('Error loading models:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading AI Models...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">👤</div>
          <h1>Face Recognition AI</h1>
        </div>
        <nav className="nav">
          <button 
            className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register Face
          </button>
          <button 
            className={`nav-btn ${activeTab === 'recognize' ? 'active' : ''}`}
            onClick={() => setActiveTab('recognize')}
          >
            Recognize Face
          </button>
          <button 
            className={`nav-btn ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            Face Database
          </button>
        </nav>
      </header>

      <main className="main-content">
        {!modelsLoaded ? (
          <div className="error-message">
            <h3>Failed to load AI models</h3>
            <p>Please refresh the page and try again.</p>
          </div>
        ) : (
          <>
            {activeTab === 'register' && <FaceRegister />}
            {activeTab === 'recognize' && <FaceRecognize />}
            {activeTab === 'database' && <FaceDatabase />}
          </>
        )}
      </main>

      <footer className="footer">
        <p>&copy; 2024 Face Recognition AI System. Powered by React & face-api.js</p>
      </footer>
    </div>
  );
}

// Face Registration Component
function FaceRegister() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const fileInputRef = useRef(null);
  const [name, setName] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [inputMode, setInputMode] = useState('camera'); // 'camera' or 'upload'
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionInterval, setDetectionIntervalState] = useState(null);

  useEffect(() => {
    if (inputMode === 'camera') {
      startVideo();
    }
    return () => {
      stopVideo();
      stopDetection();
    };
  }, [inputMode]);

  const startDetection = () => {
    if (detectionInterval) clearInterval(detectionInterval);
    
    const interval = setInterval(async () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      
      if (!video || !overlay || video.readyState !== 4) return;
      
      try {
        const detection = await faceapi.detectSingleFace(video, 
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
        );
        
        // Clear overlay
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        
        if (detection) {
          setFaceDetected(true);
          // Draw detection box
          const box = detection.box;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw label
          ctx.fillStyle = '#00ff00';
          ctx.font = '16px Arial';
          ctx.fillText('✓ Face Detected', box.x, box.y - 5);
        } else {
          setFaceDetected(false);
        }
      } catch (err) {
        // Ignore detection errors
      }
    }, 200);
    
    setDetectionIntervalState(interval);
  };

  const stopDetection = () => {
    if (detectionInterval) {
      clearInterval(detectionInterval);
      setDetectionIntervalState(null);
    }
    setFaceDetected(false);
  };

  const startVideo = async () => {
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      console.log('Camera stream obtained:', stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          console.log('Video data loaded, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          // Start real-time detection once video is ready
          if (overlayRef.current) {
            overlayRef.current.width = videoRef.current.videoWidth || 640;
            overlayRef.current.height = videoRef.current.videoHeight || 480;
            console.log('Overlay canvas set to:', overlayRef.current.width, 'x', overlayRef.current.height);
          }
          startDetection();
        };
        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setMessage('Video playback error. Please refresh.');
          setMessageType('error');
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      setMessage('Error accessing camera: ' + error.message);
      setMessageType('error');
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file');
      setMessageType('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setMessage('');
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData) => {
    if (!name.trim()) {
      setMessage('Please enter a name');
      setMessageType('error');
      return;
    }

    setIsCapturing(true);
    setMessage('Processing...');
    setMessageType('info');

    try {
      // Create image element from uploaded data
      const img = await faceapi.fetchImage(imageData);
      
      // Detect face with better options
      const detectionOptions = new faceapi.SsdMobilenetv1Options({ 
        minConfidence: 0.3,
        maxResults: 1 
      });
      
      console.log('Attempting face detection on uploaded image...');
      const detection = await faceapi.detectSingleFace(img, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage('No face detected. Try: 1) Clearer photo 2) Face looking at camera 3) Good lighting 4) No sunglasses');
        setMessageType('error');
        setIsCapturing(false);
        return;
      }
      
      console.log('Face detected in uploaded image! Confidence:', detection.detection.score);

      const faceDescriptor = Array.from(detection.descriptor);

      // Send to backend
      const response = await fetch('/api/faces/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          imageData,
          faceDescriptor
        })
      });

      const result = await response.json();

      if (response.status === 409) {
        setMessage(`Face already exists! This person is registered as: ${result.existingFace.name}`);
        setMessageType('warning');
      } else if (response.ok) {
        setMessage(`✓ Face registered successfully for: ${name}`);
        setMessageType('success');
        setName('');
        setUploadedImage(null);
      } else {
        setMessage('Error: ' + result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
      setMessageType('error');
    }

    setIsCapturing(false);
  };

  const captureAndRegister = async () => {
    if (!name.trim()) {
      setMessage('Please enter a name');
      setMessageType('error');
      return;
    }

    const video = videoRef.current;
    
    // Check if video is ready
    if (!video || video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage('Camera not ready. Please wait a moment and try again.');
      setMessageType('error');
      return;
    }

    setIsCapturing(true);
    setMessage('Processing...');
    setMessageType('info');

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect face with options for better detection
      const detectionOptions = new faceapi.SsdMobilenetv1Options({ 
        minConfidence: 0.3,
        maxResults: 1 
      });
      
      console.log('Attempting face detection...');
      const detection = await faceapi.detectSingleFace(canvas, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log('No face detected. Canvas size:', canvas.width, 'x', canvas.height);
        setMessage('No face detected. Tips: 1) Ensure good lighting 2) Face the camera directly 3) Keep face centered 4) Remove glasses/mask if possible');
        setMessageType('error');
        setIsCapturing(false);
        return;
      }
      
      console.log('Face detected! Confidence:', detection.detection.score);

      // Get image data
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const faceDescriptor = Array.from(detection.descriptor);

      // Send to backend
      const response = await fetch('/api/faces/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          imageData,
          faceDescriptor
        })
      });

      const result = await response.json();

      if (response.status === 409) {
        setMessage(`Face already exists! This person is registered as: ${result.existingFace.name}`);
        setMessageType('warning');
      } else if (response.ok) {
        setMessage(`✓ Face registered successfully for: ${name}`);
        setMessageType('success');
        setName('');
      } else {
        setMessage('Error: ' + result.message);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
      setMessageType('error');
    }

    setIsCapturing(false);
  };

  return (
    <div className="face-register">
      <h2>Register New Face</h2>
      <p className="subtitle">Choose how to add a face to the database</p>

      {/* Input Mode Toggle */}
      <div className="input-mode-toggle">
        <button
          className={`mode-btn ${inputMode === 'camera' ? 'active' : ''}`}
          onClick={() => setInputMode('camera')}
        >
          📷 Camera
        </button>
        <button
          className={`mode-btn ${inputMode === 'upload' ? 'active' : ''}`}
          onClick={() => setInputMode('upload')}
        >
          📤 Upload Photo
        </button>
      </div>

      {inputMode === 'camera' ? (
        <div className="camera-container">
          <div className="video-wrapper" style={{ position: 'relative', minHeight: '360px' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="video-feed"
              style={{ 
                width: '100%', 
                height: '360px',
                objectFit: 'cover',
                backgroundColor: '#000'
              }}
            />
            <canvas 
              ref={overlayRef} 
              className="detection-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '360px',
                pointerEvents: 'none'
              }}
            />
            <div className={`detection-status ${faceDetected ? 'detected' : ''}`}>
              {faceDetected ? '✓ Face Detected - Ready to Capture' : '⏳ Looking for face...'}
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      ) : (
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          
          {uploadedImage ? (
            <div className="image-preview">
              <img src={uploadedImage} alt="Preview" />
              <button
                className="change-image-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                🔄 Change Image
              </button>
            </div>
          ) : (
            <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-icon">📤</div>
              <p>Click to upload a photo</p>
              <span>Supports: JPG, PNG, WEBP</span>
            </div>
          )}
        </div>
      )}

      <div className="register-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="name-input"
          disabled={isCapturing}
        />
        
        {inputMode === 'camera' ? (
          <button
            onClick={captureAndRegister}
            disabled={isCapturing || !name.trim()}
            className={`capture-btn ${isCapturing ? 'capturing' : ''}`}
          >
            {isCapturing ? 'Processing...' : '📷 Capture & Register'}
          </button>
        ) : (
          <button
            onClick={() => uploadedImage && processImage(uploadedImage)}
            disabled={isCapturing || !name.trim() || !uploadedImage}
            className={`capture-btn ${isCapturing ? 'capturing' : ''}`}
          >
            {isCapturing ? 'Processing...' : '📤 Upload & Register'}
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  );
}

// Face Recognition Component
function FaceRecognize() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    startVideo();
    return () => stopVideo();
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setMessage('Error accessing camera: ' + error.message);
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const recognizeFace = async () => {
    const video = videoRef.current;
    
    // Check if video is ready
    if (!video || video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage('Camera not ready. Please wait a moment and try again.');
      return;
    }

    setIsRecognizing(true);
    setResult(null);
    setMessage('Analyzing face...');

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect face
      const detection = await faceapi.detectSingleFace(canvas)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage('No face detected. Please position your face in the frame.');
        setIsRecognizing(false);
        return;
      }

      const faceDescriptor = Array.from(detection.descriptor);

      // Compare with database
      const response = await fetch('/api/faces/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceDescriptor })
      });

      const data = await response.json();

      if (data.matchFound) {
        setResult({
          match: true,
          name: data.face.name,
          confidence: Math.round(data.face.confidence * 100),
          photo: data.face.photo_path
        });
        setMessage('');
      } else {
        setResult({ match: false });
        setMessage('No matching face found in database.');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    }

    setIsRecognizing(false);
  };

  return (
    <div className="face-recognize">
      <h2>Face Recognition</h2>
      <p className="subtitle">Position your face to check if you exist in the database</p>

      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="video-feed"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <button
        onClick={recognizeFace}
        disabled={isRecognizing}
        className={`recognize-btn ${isRecognizing ? 'recognizing' : ''}`}
      >
        {isRecognizing ? '🔍 Analyzing...' : '🔍 Scan Face'}
      </button>

      {message && (
        <div className="message info">
          {message}
        </div>
      )}

      {result && (
        <div className={`result-card ${result.match ? 'match' : 'no-match'}`}>
          {result.match ? (
            <>
              <div className="result-icon">✓</div>
              <h3>Match Found!</h3>
              <p className="result-name">{result.name}</p>
              <p className="confidence">Confidence: {result.confidence}%</p>
            </>
          ) : (
            <>
              <div className="result-icon">✗</div>
              <h3>No Match Found</h3>
              <p>This face is not registered in the database.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Face Database Component
function FaceDatabase() {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaces();
  }, []);

  const fetchFaces = async () => {
    try {
      const response = await fetch('/api/faces');
      const data = await response.json();
      setFaces(data.faces || []);
    } catch (error) {
      console.error('Error fetching faces:', error);
    }
    setLoading(false);
  };

  const deleteFace = async (id) => {
    if (!window.confirm('Are you sure you want to delete this face?')) return;

    try {
      const response = await fetch(`/api/faces/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFaces(faces.filter(face => face.id !== id));
      }
    } catch (error) {
      console.error('Error deleting face:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading database...</div>;
  }

  return (
    <div className="face-database">
      <h2>Face Database</h2>
      <p className="subtitle">{faces.length} face(s) registered</p>

      <div className="faces-grid">
        {faces.map(face => (
          <div key={face.id} className="face-card">
            <img 
              src={face.photo_path} 
              alt={face.name}
              className="face-photo"
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
            />
            <div className="face-info">
              <h4>{face.name}</h4>
              <p className="face-date">
                Registered: {new Date(face.created_at).toLocaleDateString()}
              </p>
            </div>
            <button 
              className="delete-btn"
              onClick={() => deleteFace(face.id)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {faces.length === 0 && (
        <div className="empty-state">
          <p>No faces registered yet.</p>
          <p>Go to "Register Face" to add faces to the database.</p>
        </div>
      )}
    </div>
  );
}

export default App;
