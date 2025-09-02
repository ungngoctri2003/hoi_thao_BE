import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class ImageUploadService {
  /**
   * Upload base64 image to Cloudinary
   */
  static async uploadBase64(base64Data: string, folder: string = 'conference-attendees'): Promise<UploadResult> {
    try {
      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${base64String}`,
        {
          folder: folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' }, // Resize if too large
            { quality: 'auto' }, // Auto optimize quality
            { format: 'auto' } // Auto format (webp if supported)
          ]
        }
      );

      return {
        success: true,
        url: result.secure_url
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload image from URL to Cloudinary
   */
  static async uploadFromUrl(imageUrl: string, folder: string = 'conference-attendees'): Promise<UploadResult> {
    try {
      const result = await cloudinary.uploader.upload(
        imageUrl,
        {
          folder: folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        }
      );

      return {
        success: true,
        url: result.secure_url
      };
    } catch (error) {
      console.error('Cloudinary upload from URL error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  static extractPublicId(url: string): string | null {
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/);
    return match?.[1] || null;
  }
}
