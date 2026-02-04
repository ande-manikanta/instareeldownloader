const express = require('express');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Express app created');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve HTML file at root
app.get('/', (req, res) => {
  console.log('GET / route hit');
  const filePath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(500).send('Error');
    } else {
      console.log('File served successfully');
    }
  });
});

console.log('Root route registered');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Video download API is running'
  });
});

// Progress tracking endpoint (using Server-Sent Events)
app.get('/api/download/progress/:id', (req, res) => {
  const { id } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  // Send initial event
  res.write('data: {"type":"connected","message":"Progress tracking connected"}\n\n');

  // Store response object for sending progress updates
  if (!global.downloadProgress) {
    global.downloadProgress = {};
  }
  global.downloadProgress[id] = res;

  // Cleanup on client disconnect
  req.on('close', () => {
    delete global.downloadProgress[id];
  });
});

// Video download endpoint
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid video URL'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid URL starting with http:// or https://'
      });
    }

    console.log(`Downloading video from: ${url}`);

    // Generate temporary file path
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputPath = path.join(tempDir, 'temp-video.%(ext)s');

    // Download video with progress tracking
    const downloadPromise = new Promise((resolve, reject) => {
        const ytdlpProcess = ytdlp.exec(url, {
            output: outputPath,
            format: 'best',
            mergeOutputFormat: 'mp4'
        }, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Track progress
        ytdlpProcess.stdout.on('data', (data) => {
            const output = data.toString();
            // Look for progress information like: [download]  50.0% of 10.00MiB at  2.00MiB/s ETA 00:05
            const progressMatch = output.match(/\[download\]\s*(\d+\.\d+)%\s*of\s*([\d.]+)([KMG]iB)?\s*at\s*([\d.]+)([KMG]iB\/s)?\s*ETA\s*(\d+:\d+)/);
            if (progressMatch) {
                const progress = {
                    percentage: parseFloat(progressMatch[1]),
                    totalSize: `${progressMatch[2]}${progressMatch[3]}`,
                    speed: `${progressMatch[4]}${progressMatch[5]}`,
                    eta: progressMatch[6]
                };
                console.log('Progress:', progress.percentage + '%');
            }
        });

        ytdlpProcess.stderr.on('data', (data) => {
            console.error('ytdlp error:', data.toString());
        });

        ytdlpProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`ytdlp exited with code ${code}`));
            }
        });

        ytdlpProcess.on('error', reject);
    });

    await downloadPromise;

    // Find the downloaded file
    const files = fs.readdirSync(tempDir);
    const downloadedFile = files.find(file => file.startsWith('temp-video'));
    
    if (!downloadedFile) {
      throw new Error('Video file not found after download');
    }

    const fullPath = path.join(tempDir, downloadedFile);
    
    // Send file to client
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="video-${Date.now()}.mp4"`);
    
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

    // Delete file after download completes
    fileStream.on('close', () => {
      fs.unlinkSync(fullPath);
      console.log(`Download complete and file deleted: ${fullPath}`);
    });

  } catch (error) {
    console.error('Download error:', error);
    
    // Clean up temporary directory
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      fs.rmdirSync(tempDir);
    }

    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 handler called for:', req.path);
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Not found',
      message: 'Route not found'
    });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Video download API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Download endpoint: POST http://localhost:${PORT}/api/download`);
  console.log('Public directory:', path.join(__dirname, 'public'));
  console.log('index.html exists:', fs.existsSync(path.join(__dirname, 'public', 'index.html')));
});
