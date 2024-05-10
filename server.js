const express = require('express');
const { MongoClient } = require('mongodb');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Connection URI
const uri = 'mongodb+srv://MQTT:MQTT1234@mqtt.ejtfdea.mongodb.net/MQTT?retryWrites=true&w=majority';

// Database Name
const dbName = 'MQTT';

// Create a new MongoClient
const client = new MongoClient(uri, { useUnifiedTopology: true });

const app = express();

app.get('/download', async (req, res) => {
  try {
    // Connect the client to the server
    await client.connect();

    // Connect to the specific database
    const database = client.db(dbName);

    // Get the collection
    const collection = database.collection('sensordatas');

    // Query the collection
    const query = { /* Your query object */ };
    const cursor = collection.find(query);

    // Create a new PDF document
    const doc = new PDFDocument();
    doc.fontSize(12);

    // Iterate over the cursor and add the documents to the PDF
    await cursor.forEach(document => {
      doc.text(JSON.stringify(document));
      doc.moveDown();
    });

    // Set the response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="output.pdf"');

    // Pipe the PDF document to the response
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error('Error:', err);
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
