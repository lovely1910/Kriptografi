const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Fungsi XOR Cipher
function xorCipher(buffer, key) {
    const keyBuffer = Buffer.from(key);
    const resultBuffer = Buffer.alloc(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
        resultBuffer[i] = buffer[i] ^ keyBuffer[i % keyBuffer.length];
    }

    return resultBuffer;
}

// Fungsi untuk memproses file Office
function processOfficeFile(inputPath, outputPath, key) {
    const zip = new AdmZip(inputPath);
    const zipEntries = zip.getEntries();

    zipEntries.forEach((entry) => {
        if (!entry.isDirectory) {
            const content = entry.getData(); // Baca konten file
            const encryptedContent = xorCipher(content, key); // Enkripsi/dekripsi konten
            zip.updateFile(entry.entryName, encryptedContent); // Perbarui file dalam zip
        }
    });

    zip.writeZip(outputPath); // Simpan file zip yang sudah diproses
}

// Fungsi untuk memproses file teks biasa
function processTextFile(inputPath, outputPath, key) {
    const fileBuffer = fs.readFileSync(inputPath);
    const resultBuffer = xorCipher(fileBuffer, key);
    fs.writeFileSync(outputPath, resultBuffer);
}

// Endpoint utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint untuk enkripsi/dekripsi file
app.post('/process', upload.single('file'), (req, res) => {
    const key = req.body.key;
    const file = req.file;

    if (!key || !file) {
        return res.status(400).send('Key and file are required!');
    }

    const inputPath = file.path;
    const outputPath = path.join(__dirname, 'uploads', `${file.filename}_processed.${file.originalname.split('.').pop()}`);

    const ext = path.extname(file.originalname).toLowerCase();
    if (['.docx', '.xlsx', '.pptx'].includes(ext)) {
        // Proses file Office
        processOfficeFile(inputPath, outputPath, key);
    } else if (ext === '.txt') {
        // Proses file teks biasa
        processTextFile(inputPath, outputPath, key);
    } else {
        return res.status(400).send('Unsupported file format!');
    }

    res.json({
        encryptedFile: `/downloads/${path.basename(outputPath)}`,
    });
});

// Endpoint untuk mengunduh hasil
app.use('/downloads', express.static(path.join(__dirname, 'uploads')));

// Menjalankan server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
