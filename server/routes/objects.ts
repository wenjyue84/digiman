import { Router } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import { securityValidationMiddleware } from "../validation";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

// Get upload URL for file uploads
// FIXED: Upload failure issue - This endpoint was missing proper implementation
// Client calls this to get a signed/pre-authorized upload URL before uploading files
router.post("/api/objects/upload", async (req, res) => {
  try {
    console.log('Upload request body:', req.body);
    
    // Generate a unique ID for this upload
    // Format: timestamp-randomString (ensures uniqueness across requests)
    const objectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // CRITICAL FIX: Return full URL as required by Uppy AWS S3 plugin
    // Uppy expects full URLs with protocol and host, not relative paths
    // This was the root cause of "Failed to construct 'URL': Invalid URL" errors
    const protocol = req.protocol;
    const host = req.get('host');
    const uploadURL = `${protocol}://${host}/api/objects/dev-upload/${objectId}`;
    
    console.log('Generated upload URL:', uploadURL);

    // Return format matches DEVELOPMENT_REFERENCE.md specification
    res.json({
      uploadURL: uploadURL,
      objectId: objectId
    });
  } catch (error: any) {
    console.error("Upload parameter error:", error);
    res.status(500).json({ message: error.message || "Failed to get upload URL" });
  }
});

// Get object by path
router.get("/objects/:objectPath(*)", async (req, res) => {
  try {
    const objectStorage = new ObjectStorageService();
    const { objectPath } = req.params;
    
    const result = await objectStorage.get(objectPath);
    
    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType);
    }
    
    res.send(result.data);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ message: "Object not found" });
    }
    console.error("Get object error:", error);
    res.status(500).json({ message: "Failed to retrieve object" });
  }
});

// Development upload with CORS
router.options("/api/objects/dev-upload/:id", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// Handle actual file upload to the generated URL
// FIXED: Replaced broken ObjectStorageService with simple local file storage
// This endpoint receives the actual file data from Uppy after it gets the URL from /api/objects/upload
router.put("/api/objects/dev-upload/:id", async (req, res) => {
  try {
    // CORS headers required for cross-origin uploads from browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { id } = req.params;
    
    if (!req.body) {
      return res.status(400).json({ message: "No data provided" });
    }

    // Simple local file storage for development environment
    // Production would use cloud storage (Google Cloud, AWS S3, etc.)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, id);
    
    // Handle different types of request body data from Uppy
    let fileData: Buffer;
    if (Buffer.isBuffer(req.body)) {
      fileData = req.body;
    } else if (typeof req.body === 'string') {
      fileData = Buffer.from(req.body, 'binary');
    } else {
      // Fallback for other data types
      fileData = Buffer.from(JSON.stringify(req.body));
    }
    
    // Write the actual file to disk
    await fs.writeFile(filePath, fileData);
    
    // Store metadata alongside the file for proper content-type serving
    const metaPath = path.join(uploadsDir, `${id}.meta.json`);
    const metadata = {
      contentType: req.headers['content-type'] || 'application/octet-stream',
      filename: id,
      uploadDate: new Date().toISOString(),
      size: fileData.length
    };
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
    
    console.log(`File uploaded successfully: ${filePath} (${fileData.length} bytes)`);

    res.json({ 
      message: "Upload successful", 
      id: id,
      uploadURL: `/api/objects/dev-upload/${id}`,
      size: fileData.length
    });
  } catch (error: any) {
    console.error("Dev upload error:", error);
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

// Get upload by ID
router.get("/objects/uploads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Simple local file storage for development
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, id);
    const metaPath = path.join(uploadsDir, `${id}.meta.json`);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Read metadata if available
      let contentType = 'application/octet-stream';
      try {
        const metaData = await fs.readFile(metaPath, 'utf8');
        const metadata = JSON.parse(metaData);
        contentType = metadata.contentType || contentType;
      } catch (metaError) {
        // Metadata file doesn't exist, use default content type
        console.log(`No metadata found for ${id}, using default content type`);
      }
      
      // Read and serve the file
      const fileData = await fs.readFile(filePath);
      res.setHeader('Content-Type', contentType);
      res.send(fileData);
    } catch (fileError) {
      return res.status(404).json({ message: "Upload not found" });
    }
  } catch (error: any) {
    console.error("Get upload error:", error);
    res.status(500).json({ message: "Failed to retrieve upload" });
  }
});

export default router;