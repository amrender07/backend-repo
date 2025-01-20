const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Create 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Set up multer storage to handle file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files to 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp for unique filenames
    }
});
const upload = multer({ storage: storage });

// Serve static files (e.g., HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'Public')));

// Upload route for text extraction
app.post('/extract-text', upload.single('file'), (req, res) => {
    const file = req.file;
    console.log('Received file:', file); // Log file details

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const extname = path.extname(file.originalname).toLowerCase();
    console.log('File extension:', extname); // Log file extension

    if (extname === '.pdf') {
        extractTextFromPDF(file.path, res);
    } else if (['.jpg', '.jpeg', '.png'].includes(extname)) {
        extractTextFromImage(file.path, res);
    } else {
        res.status(400).json({ error: 'Unsupported file type' });
    }
});

// Function to extract text from PDF
function extractTextFromPDF(filePath, res) {
    const dataBuffer = fs.readFileSync(filePath);
    pdfParse(dataBuffer).then(function(data) {
        fs.unlinkSync(filePath); // Clean up the uploaded file
        res.json({ text: data.text });
    }).catch((err) => {
        fs.unlinkSync(filePath);
        console.error('PDF processing error:', err); // Log error
        res.status(500).json({ error: 'Error processing PDF' });
    });
}

// Function to extract text from image using OCR
function extractTextFromImage(filePath, res) {
    Tesseract.recognize(filePath, 'eng', {
        logger: (m) => console.log(m)
    }).then(({ data: { text } }) => {
        fs.unlinkSync(filePath); // Clean up the uploaded file
        res.json({ text });
    }).catch((err) => {
        fs.unlinkSync(filePath);
        console.error('OCR error:', err); // Log error
        res.status(500).json({ error: 'Error processing image' });
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
