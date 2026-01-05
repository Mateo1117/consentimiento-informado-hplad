import { supabase } from '@/integrations/supabase/client';

export interface PhotoUploadResult {
  url: string;
  fileName: string;
}

export class PhotoService {
  private static generateFileName(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  private static base64ToBlob(base64: string): { blob: Blob; mime: string; extension: string } {
    const match = base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mime = match?.[1] ?? 'image/jpeg';
    const extension = mime === 'image/png' ? 'png' : 'jpg';

    const base64Data = base64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return { blob: new Blob([byteArray], { type: mime }), mime, extension };
  }

  static async uploadPhoto(base64Image: string, prefix: string): Promise<PhotoUploadResult | null> {
    try {
      const { blob, mime, extension } = this.base64ToBlob(base64Image);
      const fileName = this.generateFileName(prefix, extension);

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: mime,
          upsert: false
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error in uploadPhoto:', error);
      return null;
    }
  }

  static async deletePhoto(fileName: string): Promise<boolean> {
    try {

      const { error } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting photo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePhoto:', error);
      return false;
    }
  }
}