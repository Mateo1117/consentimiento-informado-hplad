import { supabase } from "@/integrations/supabase/client";

interface PhotoUploadResult {
  url: string;
  fileName: string;
}

export class PhotoService {
  static async uploadPhoto(base64Image: string, prefix: string): Promise<PhotoUploadResult | null> {
    try {
      // Convert base64 to blob
      const response = await fetch(base64Image);
      const blob = await response.blob();
      
      // Generate unique filename
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(7);
      const fileName = `${prefix}_${timestamp}_${randomString}.jpg`;
      
      // Upload to Supabase storage
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

      // Get public URL
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