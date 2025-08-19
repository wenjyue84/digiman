import { Router } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import { securityValidationMiddleware } from "../validation";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const router = Router();

// Get upload URL for file uploads
// Environment-aware upload URL generation for both localhost and Replit
router.post("/api/objects/upload", async (req, res) => {
  try {
    console.log('Upload request body:', req.body);
    console.log('Environment check - PRIVATE_OBJECT_DIR:', process.env.PRIVATE_OBJECT_DIR);
    
    // Check if we're in Replit environment
    const isReplitEnvironment = process.env.PRIVATE_OBJECT_DIR;
    
    if (isReplitEnvironment) {
      // Use Google Cloud Storage signed URL for Replit
      try {
        const objectStorage = new ObjectStorageService();
        const uploadURL = await objectStorage.getObjectEntityUploadURL();
        
        console.log('Replit - Generated signed upload URL:', uploadURL);
        
        // Extract object ID from the signed URL for consistency
        const urlParts = uploadURL.split('/');
        const objectId = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
        
        res.json({
          uploadURL: uploadURL,
          objectId: objectId
        });
      } catch (replitError: any) {
        console.error("Replit upload URL error:", replitError);
        res.status(500).json({ message: "Failed to get Replit upload URL: " + replitError.message });
      }
    } else {
      // Use local development upload endpoint
      const objectId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const protocol = req.protocol;
      const host = req.get('host');
      const uploadURL = `${protocol}://${host}/api/objects/dev-upload/${objectId}`;
      
      console.log('Localhost - Generated dev upload URL:', uploadURL);
      
      res.json({
        uploadURL: uploadURL,
        objectId: objectId
      });
    }
  } catch (error: any) {
    console.error("Upload parameter error:", error);
    res.status(500).json({ message: error.message || "Failed to get upload URL" });
  }
});

// Get object by path
router.get("/objects/:objectPath(*)", async (req, res) => {
  try {
    const { objectPath } = req.params;
    
    // Check if we're in Replit environment (has PRIVATE_OBJECT_DIR)
    const isReplitEnvironment = process.env.PRIVATE_OBJECT_DIR;
    
    if (isReplitEnvironment) {
      // Use Google Cloud Storage for Replit
      const objectStorage = new ObjectStorageService();
      const objectFile = await objectStorage.getObjectEntityFile(`/objects/${objectPath}`);
      await objectStorage.downloadObject(objectFile, res);
    } else {
      // Use local file storage for development
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, objectPath);
      const metaPath = path.join(uploadsDir, `${objectPath}.meta.json`);
      
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
        }
        
        // Read and serve the file
        const fileData = await fs.readFile(filePath);
        res.setHeader('Content-Type', contentType);
        res.send(fileData);
      } catch (fileError) {
        throw new ObjectNotFoundError();
      }
    }
    
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
// Environment-aware file upload handling for both localhost and Replit
router.put("/api/objects/dev-upload/:id", async (req, res) => {
  try {
    // CORS headers required for cross-origin uploads from browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { id } = req.params;
    
    if (!req.body) {
      return res.status(400).json({ message: "No data provided" });
    }

    console.log(`Processing upload for ID: ${id} (${Buffer.isBuffer(req.body) ? req.body.length : typeof req.body} bytes)`);

    // Environment check - use appropriate storage method
    const isReplitEnvironment = process.env.PRIVATE_OBJECT_DIR;
    
    if (isReplitEnvironment) {
      // For Replit, this endpoint shouldn't be hit as uploads go directly to Google Cloud Storage
      // But if it is hit, we should provide a helpful error
      console.error("Dev upload endpoint hit in Replit environment - this suggests upload URL generation issue");
      return res.status(400).json({ 
        message: "Invalid upload endpoint for Replit environment",
        suggestion: "This indicates a configuration issue - uploads should go directly to Google Cloud Storage"
      });
    } else {
      // Local development file storage
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
    }
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