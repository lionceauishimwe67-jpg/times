# Face Recognition AI System

A professional AI-powered facial recognition system built with React.js and Node.js. This system allows users to register faces, scan and recognize faces, and manage a database of registered faces.

## Features

- 🎯 **Real-time Face Detection** - Uses camera to detect faces in real-time
- 📝 **Face Registration** - Register new faces with names
- 🔍 **Face Recognition** - Scan faces and compare with existing database
- 📊 **Face Database** - View and manage all registered faces
- 🎨 **Professional UI** - Modern, responsive design with smooth animations
- 🔒 **Secure Storage** - Face descriptors stored securely in SQLite database

## Tech Stack

### Frontend
- React.js 18
- face-api.js (Face detection and recognition)
- HTML5 Canvas API
- CSS3 with animations

### Backend
- Node.js
- Express.js
- SQLite3 (Database)
- face-api.js (Server-side face processing)
- Multer (File uploads)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Webcam/Camera access
- Modern browser with WebRTC support

## Installation

1. **Clone or download the project**

2. **Install root dependencies**
```bash
cd "face recognatiopn"
npm install
```

3. **Install client dependencies**
```bash
cd client
npm install
cd ..
```

4. **Download face-api.js models**

Create a `public/models` folder in the client directory and download these models:
- `ssd_mobilenetv1_model-weights_manifest.json` + shard files
- `face_landmark_68_model-weights_manifest.json` + shard files
- `face_recognition_model-weights_manifest.json` + shard files

Or download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

## Running the Application

### Development Mode (Both frontend and backend)
```bash
npm start
```

This will start:
- Backend server on http://localhost:5000
- Frontend on http://localhost:3000

### Run Backend Only
```bash
npm run server
```

### Run Frontend Only
```bash
npm run client
```

## How to Use

### 1. Register a New Face
- Go to "Register Face" tab
- Enter your name in the input field
- Position your face in the camera frame
- Click "Capture & Register"
- The system will detect your face and store it in the database

### 2. Recognize a Face
- Go to "Recognize Face" tab
- Position your face in the camera frame
- Click "Scan Face"
- The system will compare your face with the database
- If a match is found, it will display the name and confidence level
- If no match is found, it will indicate "No Match Found"

### 3. View Face Database
- Go to "Face Database" tab
- View all registered faces
- See registration dates
- Delete faces if needed

## File Structure

```
face recognatiopn/
├── client/                 # React frontend
│   ├── public/
│   │   ├── index.html
│   │   └── models/         # face-api.js models
│   ├── src/
│   │   ├── App.js          # Main application component
│   │   ├── App.css         # Styles
│   │   ├── index.js        # Entry point
│   │   └── index.css       # Global styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── database/
│   │   └── db.js           # SQLite database setup
│   ├── routes/
│   │   └── faces.js        # API routes
│   ├── utils/
│   │   └── faceRecognition.js  # Face processing utilities
│   └── index.js            # Server entry point
├── uploads/                # Stored face images
├── package.json            # Root package.json
└── README.md               # This file
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/faces` | GET | Get all registered faces |
| `/api/faces/store` | POST | Store a new face |
| `/api/faces/compare` | POST | Compare face with database |
| `/api/faces/logs` | GET | Get recognition logs |
| `/api/faces/:id` | DELETE | Delete a face |

## How Face Recognition Works

1. **Face Detection**: The system uses SSD MobileNet v1 to detect faces in images
2. **Face Landmarks**: 68 facial landmarks are detected to identify key facial features
3. **Face Descriptor**: A 128-dimensional vector (face descriptor) is extracted
4. **Comparison**: Euclidean distance is calculated between face descriptors
5. **Matching**: If the distance is below the threshold (0.6), faces are considered a match

## Security Notes

- Face descriptors are stored as arrays in the database
- Images are stored locally in the uploads folder
- No external API calls for face processing (everything is local)
- Face descriptors cannot be reverse-engineered to recreate the original face

## Troubleshooting

### Camera not working
- Ensure browser has camera permissions
- Check if another application is using the camera
- Try refreshing the page

### Models not loading
- Ensure models are in `client/public/models` folder
- Check browser console for specific errors
- Verify model files are complete

### Face not detected
- Ensure good lighting conditions
- Face the camera directly
- Remove obstructions (glasses, masks if possible)
- Stay within the camera frame

## License

MIT License

## Credits

- [face-api.js](https://github.com/justadudewhohacks/face-api.js) - Face detection and recognition library
- TensorFlow.js - Machine learning framework
