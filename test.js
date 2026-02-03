const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const readline = require("readline");

// Create interface for console input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function readPdf() {
  try {
    const filePath = path.join(__dirname, "sample.pdf");
    const buffer = fs.readFileSync(filePath);

    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error("❌ Error reading PDF:", error);
    return null;
  }
}

function searchNumberInText(text, numberToFind) {
  // Create a regex pattern to match the number (allowing optional formatting)
  const pattern = new RegExp(`\\b${numberToFind}\\b`);
  return pattern.test(text);
}

async function main() {
  // Ask user for number to search
  rl.question("🔍 Enter the number to search in PDF: ", async (input) => {
    const numberToFind = input.trim();
    
    if (!numberToFind) {
      console.log("❌ Please enter a valid number.");
      rl.close();
      return;
    }

    console.log(`\nSearching for number: ${numberToFind}`);
    
    // Read and search PDF
    const pdfText = await readPdf();
    
    if (pdfText) {
      const exists = searchNumberInText(pdfText, numberToFind);
      
      if (exists) {
        console.log(`✅ Number ${numberToFind} FOUND in the PDF document.`);
      } else {
        console.log(`❌ Number ${numberToFind} NOT FOUND in the PDF document.`);
      }
    }
    
    rl.close();
  });
}

main();
