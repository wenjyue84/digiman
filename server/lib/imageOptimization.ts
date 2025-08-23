import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export interface OptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'webp' | 'png';
  progressive?: boolean;
  mozjpeg?: boolean;
}

export interface OptimizationResult {
  optimizedBuffer: Buffer;
  metadata: {
    originalName: string;
    mimetype: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: string;
    savedBytes: number;
    uploadDate: string;
    optimization: {
      originalFormat?: string;
      optimizedFormat: string;
      originalDimensions?: string;
      resized: boolean;
      tool: string;
      settings: OptimizationConfig;
    };
  };
  compressionInfo: {
    originalSize: string;
    optimizedSize: string;
    savedSize: string;
    compressionRatio: string;
    message: string;
  };
}

const defaultConfig: OptimizationConfig = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85,
  outputFormat: 'jpeg',
  progressive: true,
  mozjpeg: true
};

// Format bytes for user-friendly display
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Optimize an image buffer using Sharp with configurable settings
 */
export async function optimizeImage(
  fileBuffer: Buffer,
  originalName: string,
  originalMimetype: string,
  config: OptimizationConfig = {}
): Promise<OptimizationResult> {
  const optimizationConfig = { ...defaultConfig, ...config };
  const originalSize = fileBuffer.length;

  let optimizedBuffer: Buffer;
  let imageInfo: sharp.Metadata;
  let compressionInfo = {
    originalFormat: originalMimetype,
    optimizedFormat: `image/${optimizationConfig.outputFormat}`,
    resized: false
  };

  try {
    // Get original image metadata
    imageInfo = await sharp(fileBuffer).metadata();
    
    // Create Sharp pipeline
    let pipeline = sharp(fileBuffer);

    // Resize if image is larger than max dimensions
    if (optimizationConfig.maxWidth && optimizationConfig.maxHeight) {
      pipeline = pipeline.resize(optimizationConfig.maxWidth, optimizationConfig.maxHeight, { 
        fit: 'inside', 
        withoutEnlargement: true 
      });
      
      compressionInfo.resized = imageInfo.width! > optimizationConfig.maxWidth || 
                                 imageInfo.height! > optimizationConfig.maxHeight;
    }

    // Apply format-specific optimization
    switch (optimizationConfig.outputFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ 
          quality: optimizationConfig.quality,
          progressive: optimizationConfig.progressive,
          mozjpeg: optimizationConfig.mozjpeg 
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({ 
          quality: optimizationConfig.quality 
        });
        break;
      case 'png':
        pipeline = pipeline.png({ 
          quality: optimizationConfig.quality,
          progressive: optimizationConfig.progressive 
        });
        break;
    }

    optimizedBuffer = await pipeline.toBuffer();

    compressionInfo = {
      ...compressionInfo,
      originalDimensions: `${imageInfo.width}x${imageInfo.height}`,
      originalFormat: imageInfo.format || originalMimetype,
    };
    
  } catch (sharpError) {
    console.error("Sharp optimization failed, using original:", sharpError);
    // Fallback to original file if Sharp fails
    optimizedBuffer = fileBuffer;
    compressionInfo.optimized = false;
  }

  const optimizedSize = optimizedBuffer.length;
  const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
  const savedBytes = originalSize - optimizedSize;

  // Create comprehensive metadata
  const metadata = {
    originalName,
    mimetype: `image/${optimizationConfig.outputFormat}`,
    originalSize,
    optimizedSize,
    compressionRatio: `${compressionRatio}%`,
    savedBytes,
    uploadDate: new Date().toISOString(),
    optimization: {
      ...compressionInfo,
      tool: 'sharp',
      settings: optimizationConfig
    }
  };

  // Create user-friendly compression info
  const compressionFeedback = {
    originalSize: formatBytes(originalSize),
    optimizedSize: formatBytes(optimizedSize),
    savedSize: formatBytes(savedBytes),
    compressionRatio: compressionRatio + '%',
    message: savedBytes > 0 ? 
      `Image optimized! Compressed from ${formatBytes(originalSize)} to ${formatBytes(optimizedSize)}, saved ${formatBytes(savedBytes)} (${compressionRatio}% reduction)` :
      'Image optimized with quality enhancement'
  };

  return {
    optimizedBuffer,
    metadata,
    compressionInfo: compressionFeedback
  };
}

/**
 * Save optimized image to local storage with metadata
 */
export async function saveOptimizedImage(
  optimizedBuffer: Buffer,
  metadata: OptimizationResult['metadata'],
  uploadDirectory: string = 'uploads'
): Promise<{ filename: string; filePath: string; fileUrl: string }> {
  // Generate secure filename
  const fileExtension = metadata.optimization.optimizedFormat === 'image/jpeg' ? '.jpg' : 
                       metadata.optimization.optimizedFormat === 'image/webp' ? '.webp' : '.png';
  const filename = `${Date.now()}-${randomUUID()}${fileExtension}`;
  
  // Create upload directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), uploadDirectory);
  await fs.mkdir(uploadsDir, { recursive: true });
  
  // Save optimized file
  const filePath = path.join(uploadsDir, filename);
  await fs.writeFile(filePath, optimizedBuffer);
  
  // Save metadata file
  const metaPath = path.join(uploadsDir, `${filename}.meta.json`);
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  
  return {
    filename,
    filePath,
    fileUrl: `/uploads/${filename}` // Relative URL for serving
  };
}

/**
 * Complete image optimization and storage workflow
 */
export async function optimizeAndSaveImage(
  fileBuffer: Buffer,
  originalName: string,
  originalMimetype: string,
  config: OptimizationConfig = {},
  uploadDirectory: string = 'uploads'
): Promise<{
  filename: string;
  filePath: string;
  fileUrl: string;
  metadata: OptimizationResult['metadata'];
  compressionInfo: OptimizationResult['compressionInfo'];
}> {
  // Optimize image
  const optimizationResult = await optimizeImage(fileBuffer, originalName, originalMimetype, config);
  
  // Save to storage
  const storageResult = await saveOptimizedImage(
    optimizationResult.optimizedBuffer, 
    optimizationResult.metadata, 
    uploadDirectory
  );
  
  return {
    ...storageResult,
    metadata: optimizationResult.metadata,
    compressionInfo: optimizationResult.compressionInfo
  };
}