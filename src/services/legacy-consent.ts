import { ConsentForm, ConsentFormData } from "@/types/legacy-consent";

// Mock service for legacy consent functionality
class LegacyConsentService {
  async saveConsent(consentData: ConsentForm): Promise<ConsentForm | null> {
    console.log('Legacy consent service - saveConsent called:', consentData);
    // Return mock data to prevent errors
    return { ...consentData, id: Date.now() };
  }

  async getAllConsents(): Promise<ConsentForm[]> {
    console.log('Legacy consent service - getAllConsents called');
    return [];
  }

  async searchConsents(filters: any): Promise<ConsentForm[]> {
    console.log('Legacy consent service - searchConsents called:', filters);
    return [];
  }

  async getConsentById(id: number): Promise<ConsentForm | null> {
    console.log('Legacy consent service - getConsentById called:', id);
    return null;
  }
}

export const consentService = new LegacyConsentService();
export type { ConsentForm, ConsentFormData };

export const isSupabaseConfigured = (): boolean => {
  console.log('Legacy isSupabaseConfigured called');
  return false; // Return false to disable legacy functionality
};