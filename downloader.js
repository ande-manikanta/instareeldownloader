const ytdlp = require("yt-dlp-exec");
const fs = require("fs");

async function downloadIG() {
  try {
    const url = "https://www.instagram.com/reel/DUN0LOpDAAN/?igsh=dXhyYXNhaTdienE0";
    console.log(`Downloading from: ${url}`);
    console.log("This may take a moment...");

    // Download best quality video with merged audio using simpler format
    await ytdlp(url, {
      output: "instagram-reel.%(ext)s",
      format: "best",
      mergeOutputFormat: "mp4"
    });

    console.log("\n✅ Download completed! Saved as instagram-reel.mp4");
  } catch (error) {
    console.error("\n❌ Error downloading video:", error);
  }
}

downloadIG();