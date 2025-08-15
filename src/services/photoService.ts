import { supabase } from '@/integrations/supabase/client';

export interface PhotoUploadResult {
  url: string;
  fileName: string;
}

export class PhotoService {
  private static generateFileName(prefix: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.jpg`;
  }

  private static base64ToBlob(base64: string): Blob {
    const base64Data = base64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/jpeg' });
  }

  static async uploadPhoto(base64Image: string, prefix: string): Promise<PhotoUploadResult | null> {
    try {

      const fileName = this.generateFileName(prefix);
      const blob = this.base64ToBlob(base64Image);

      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
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