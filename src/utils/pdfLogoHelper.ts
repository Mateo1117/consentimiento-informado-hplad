import logoHospital from '@/assets/logo_hospital.png';

let cachedLogoBase64: string | null = null;

export const getLogoBase64 = async (): Promise<string> => {
  if (cachedLogoBase64) {
    return cachedLogoBase64;
  }

  try {
    const response = await fetch(logoHospital);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading hospital logo:', error);
    throw error;
  }
};

export const addLogoToHeader = (
  pdf: any,
  logoBase64: string,
  margin: number,
  headerHeight: number = 25
): void => {
  try {
    // Add logo to the left section of the header
    const logoSize = headerHeight - 4; // Leave some padding
    const logoX = margin + 2;
    const logoY = margin + 2;
    
    pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
};
