import { Request, Response, NextFunction } from 'express';
import { ImageUploadService } from '../../services/image-upload.service';
import { ok } from '../../utils/responses';

export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { imageData, imageUrl } = req.body;

    if (!imageData && !imageUrl) {
      res.status(400).json({
        error: {
          code: 'MISSING_IMAGE_DATA',
          message: 'Either imageData (base64) or imageUrl is required'
        }
      });
      return;
    }

    let uploadResult;

    if (imageData && imageData.startsWith('data:image/')) {
      // Upload base64 image
      uploadResult = await ImageUploadService.uploadBase64(imageData, 'conference-attendees');
    } else if (imageUrl) {
      // Upload from URL
      uploadResult = await ImageUploadService.uploadFromUrl(imageUrl, 'conference-attendees');
    } else {
      res.status(400).json({
        error: {
          code: 'INVALID_IMAGE_DATA',
          message: 'Invalid image data format'
        }
      });
      return;
    }

    if (uploadResult.success && uploadResult.url) {
      res.json(ok({
        url: uploadResult.url,
        publicId: ImageUploadService.extractPublicId(uploadResult.url)
      }));
    } else {
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: uploadResult.error || 'Failed to upload image'
        }
      });
    }
  } catch (error) {
    next(error);
  }
}
