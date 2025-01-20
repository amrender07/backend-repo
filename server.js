const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 🔹 Allow CORS for frontend requests
app.use(cors());

// 🔹 Serve static files (e.g., index.html, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 🔹 Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 🔹 Upload and Extract Text Route
app.post('/extract-text', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const extname = path.extname(req.file.originalname).toLowerCase();

    if (extname === '.pdf') {
        extractTextFromPDF(filePath, res);
    } else if (['.jpg', '.jpeg', '.png'].includes(extname)) {
        extractTextFromImage(filePath, res);
    } else {
        fs.unlinkSync(filePath); // Cleanup
        return res.status(400).json({ error: 'Unsupported file type' });
    }
});

// 🔹 Function to extract text from PDF
function extractTextFromPDF(filePath, res) {
    fs.readFile(filePath, (err, dataBuffer) => {
        if (err) {
            console.error("PDF Read Error:", err);
            res.status(500).json({ error: 'Error reading PDF' });
            return;
        }

        pdfParse(dataBuffer)
            .then((data) => {
                console.log("Extracted Text:", data.text);  // Log extracted text
                fs.unlinkSync(filePath); // Cleanup
                res.json({ text: data.text });
            })
            .catch((err) => {
                console.error("PDF Parsing Error:", err);
                fs.unlinkSync(filePath);
                res.status(500).json({ error: 'Error processing PDF' });
            });
    });
}

// 🔹 Function to extract text from images using OCR
function extractTextFromImage(filePath, res) {
    Tesseract.recognize(filePath, 'eng', {
        logger: (m) => console.log(m)  // Logs progress
    })
    .then(({ data: { text } }) => {
        console.log("Extracted Text:", text);
        fs.unlinkSync(filePath); // Cleanup
        res.json({ text });
    })
    .catch((err) => {
        console.error("OCR Error:", err);
        fs.unlinkSync(filePath);
        res.status(500).json({ error: 'Error processing image' });
    });
}

// 🔹 Start the server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
