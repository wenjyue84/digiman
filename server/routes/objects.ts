import { Router } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import { securityValidationMiddleware } from "../validation";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { optimizeAndSaveImage } from "../lib/imageOptimization";
import { sendError, sendSuccess } from "../lib/apiResponse";

const router = Router();

// Rate limit uploads: 20 per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many upload requests. Please try again later." },
});

// ⚠️  CRITICAL UPLOAD FUNCTIONALITY - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
//
// This file handles the core document upload and thumbnail generation system that is
// currently working perfectly. Any changes here can break:
// - Guest document uploads (IC/Passport photos)
// - Expense photo uploads  
// - Thumbnail generation and display
// - File serving for both localhost and Replit environments
//
// 🚫 FORBIDDEN CHANGES (unless absolutely necessary):
// - Multer configuration (lines 18-30)
// - Document upload endpoint (lines 76-131) 
// - Photo upload endpoint (lines 32-74)
// - File serving logic (lines 200-250)
// - Upload URL generation (lines 133-199)
//
// ✅ SAFE TO MODIFY:
// - Error messages and logging
// - Response format adjustments
// - Additional validation (if needed)
//
// 🔒 LAST WORKING VERSION: Document uploads and thumbnails working perfectly
//    - Guest Details shows thumbnails correctly
//    - Upload Document feature functioning properly
//    - Both localhost and Replit environments supported

// Configure multer for memory storage (we'll handle file saving ourselves)
// ⚠️  DO NOT CHANGE - This configuration is critical for upload functionality
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Photo upload endpoint for expenses with image optimization
// ⚠️  DO NOT MODIFY - This endpoint is working perfectly for expense photos
router.post("/api/upload-photo", uploadLimiter, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, "No photo provided");
    }

    const file = req.file;
    
    // Use the reusable image optimization service
    const result = await optimizeAndSaveImage(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        outputFormat: 'jpeg',
        progressive: true,
        mozjpeg: true
      }
    );
    
    // Return the URL where the file can be accessed with compression info
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}${result.fileUrl}`;
    
    res.json({
      success: true,
      url: fullUrl,
      absoluteUrl: fullUrl,
      filename: result.filename,
      originalName: file.originalname,
      size: result.metadata.optimizedSize,
      compression: result.compressionInfo
    });
    
  } catch (error: any) {
    console.error("Photo upload error:", error);
    sendError(res, 500, error.message || "Failed to upload photo");
  }
});

// Guest document upload endpoint with optimization (IC/Passport photos)
// ⚠️  CRITICAL ENDPOINT - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
// This endpoint handles guest document uploads and is currently working perfectly.
// It generates thumbnails that display correctly in Guest Details.
// Any changes here can break the entire guest photo system.
router.post("/api/upload-document", uploadLimiter, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, "No document photo provided");
    }

    const file = req.file;
    
    // Use optimized settings for document photos (slightly higher quality, smaller max size)
    const result = await optimizeAndSaveImage(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        maxWidth: 1000,  // Slightly smaller for documents
        maxHeight: 1000,
        quality: 90,     // Higher quality for document readability
        outputFormat: 'jpeg',
        progressive: true,
        mozjpeg: true
      },
      'uploads' // Store in same directory as other uploads
    );
    
    // Return the URL in the format expected by ObjectUploader
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}${result.fileUrl}`;
    
    console.log('=== Document Upload Response ===');
    console.log('File URL:', result.fileUrl);
    console.log('Full URL:', fullUrl);
    console.log('Filename:', result.filename);
    
    const response = {
      success: true,
      url: fullUrl,
      absoluteUrl: fullUrl,
      filename: result.filename,
      originalName: file.originalname,
      size: result.metadata.optimizedSize,
      compression: result.compressionInfo,
      // Additional info for guest documents
      documentType: 'identity',
      optimized: true
    };
    
    console.log('Response object:', JSON.stringify(response, null, 2));
    res.json(response);
    
  } catch (error: any) {
    console.error("Document upload error:", error);
    sendError(res, 500, error.message || "Failed to upload document photo");
  }
});

// Get upload URL for file uploads
// Environment-aware upload URL generation for both localhost and Replit
// ⚠️  DO NOT MODIFY - This handles environment detection and URL generation
router.post("/api/objects/upload", uploadLimiter, async (req, res) => {
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
        sendError(res, 500, "Failed to get Replit upload URL: " + replitError.message);
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
    sendError(res, 500, error.message || "Failed to get upload URL");
  }
});

// Get object by path
// ⚠️  CRITICAL FILE SERVING - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
// This endpoint serves uploaded files and thumbnails. It's working perfectly
// for both localhost and Replit environments. Changes here can break
// all file access including guest photo thumbnails.
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
      return sendError(res, 404, "Object not found");
    }
    console.error("Get object error:", error);
    sendError(res, 500, "Failed to retrieve object");
  }
});

// Development upload with CORS
// ⚠️  DO NOT MODIFY - CORS configuration critical for upload functionality
router.options("/api/objects/dev-upload/:id", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// Handle actual file upload to the generated URL
// Environment-aware file upload handling for both localhost and Replit
// ⚠️  CRITICAL UPLOAD HANDLING - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
// This endpoint processes actual file uploads and is working perfectly.
// Changes here can break the entire upload system.
router.put("/api/objects/dev-upload/:id", async (req, res) => {
  try {
    // CORS headers required for cross-origin uploads from browser
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const { id } = req.params;
    
    if (!req.body) {
      return sendError(res, 400, "No data provided");
    }

    console.log(`Processing upload for ID: ${id} (${Buffer.isBuffer(req.body) ? req.body.length : typeof req.body} bytes)`);

    // Environment check - use appropriate storage method
    const isReplitEnvironment = process.env.PRIVATE_OBJECT_DIR;
    
    if (isReplitEnvironment) {
      // For Replit, this endpoint shouldn't be hit as uploads go directly to Google Cloud Storage
      // But if it is hit, we should provide a helpful error
      console.error("Dev upload endpoint hit in Replit environment - this suggests upload URL generation issue");
      return sendError(res, 400, "Invalid upload endpoint for Replit environment", {
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
    sendError(res, 500, error.message || "Upload failed");
  }
});

// Get upload by ID
// ⚠️  CRITICAL FILE SERVING - DO NOT MODIFY WITHOUT STRONG REASON ⚠️
// This endpoint serves uploaded files by ID and is working perfectly.
// It's used by the thumbnail system in Guest Details.
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
      return sendError(res, 404, "Upload not found");
    }
  } catch (error: any) {
    console.error("Get upload error:", error);
    sendError(res, 500, "Failed to retrieve upload");
  }
});

export default router;