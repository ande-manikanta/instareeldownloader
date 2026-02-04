const ytdlp = require('yt-dlp-exec');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const url = 'https://www.instagram.com/reel/DUN0LOpDAAN/?igsh=dXhyYXNhaTdienE0';
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const outputPath = path.join(tempDir, 'temp-video.%(ext)s');
    
    console.log('Testing ytdlp with execa');
    
    // Try different approaches
    console.log('1. Direct call with promise:');
    const result1 = await ytdlp(url, {
      output: outputPath,
      format: 'best',
      mergeOutputFormat: 'mp4'
    });
    console.log('Result:', result1);
    
    console.log('2. Using exec method:');
    const child = ytdlp.exec(url, {
      output: outputPath,
      format: 'best',
      mergeOutputFormat: 'mp4'
    }, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log('Child process:', child);
    console.log('Has stdout:', !!child.stdout);
    console.log('Has stderr:', !!child.stderr);
    
    child.stdout.on('data', (data) => {
      console.log('Stdout:', data.toString());
    });
    
    child.stderr.on('data', (data) => {
      console.error('Stderr:', data.toString());
    });
    
    const result2 = await child;
    console.log('Exec result:', result2);
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

test();