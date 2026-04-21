import { useState } from 'react';
import { appConsentService, type AppConsentData, type SavedConsentResult } from '@/services/appConsentService';
import { toast } from 'sonner';

export const useAppConsent = () => {
  const [isSaving, setIsSaving] = useState(false);

  const saveConsent = async (consentData: AppConsentData): Promise<SavedConsentResult> => {
    setIsSaving(true);
    try {
      const result = await appConsentService.saveAppConsent(consentData);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Error al guardar el consentimiento');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error && error.message
        ? error.message
        : 'Error al guardar el consentimiento';
      toast.error(errorMessage);
      return {
        id: '',
        success: false,
        message: errorMessage
      };
    } finally {
      setIsSaving(false);
    }
  };

  const deleteConsent = async (consentId: string): Promise<boolean> => {
    try {
      const success = await appConsentService.deleteConsent(consentId);
      
      if (success) {
        toast.success('Consentimiento eliminado exitosamente');
      } else {
        toast.error('Error al eliminar el consentimiento');
      }
      
      return success;
    } catch (error) {
      toast.error('Error al eliminar el consentimiento');
      return false;
    }
  };

  const getConsentPDF = async (consentId: string): Promise<string | null> => {
    try {
      const pdfUrl = await appConsentService.getConsentPDFUrl(consentId);
      
      if (!pdfUrl) {
        toast.error('PDF no disponible para este consentimiento');
      }
      
      return pdfUrl;
    } catch (error) {
      toast.error('Error al obtener el PDF');
      return null;
    }
  };

  return {
    saveConsent,
    deleteConsent,
    getConsentPDF,
    isSaving
  };
};

export default useAppConsent;