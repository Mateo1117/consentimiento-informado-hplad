import { supabase } from '@/integrations/supabase/client';

interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
  eps: string;
  telefono: string;
  direccion: string;
  centroSalud: string;
}

interface PatientSearchResult {
  data: PatientData | null;
  error?: string;
  errorType?: 'validation' | 'timeout' | 'network' | 'http' | 'empty_response' | 'parse_error' | 'api_error' | 'not_found' | 'unknown';
}

class PatientApiService {
  async searchByDocument(documento: string): Promise<PatientSearchResult> {
    try {
      console.log(`Consultando paciente con documento: ${documento}`);
      
      // Validar documento antes de consultar
      if (!documento || documento.trim() === '') {
        return { 
          data: null, 
          error: 'El número de documento es requerido',
          errorType: 'validation'
        };
      }

      if (documento.length < 5) {
        return { 
          data: null, 
          error: 'El número de documento debe tener al menos 5 dígitos',
          errorType: 'validation'
        };
      }

      // Llamar a la edge function para evitar CORS
      const { data, error } = await supabase.functions.invoke('consulta-paciente', {
        body: { documento }
      });

      if (error) {
        console.error('Error en edge function:', error);
        return {
          data: null,
          error: 'Error al conectar con el servidor. Intente nuevamente.',
          errorType: 'network'
        };
      }

      // Si hay error en la respuesta
      if (data.error) {
        return {
          data: null,
          error: data.error,
          errorType: data.errorType || 'unknown'
        };
      }

      // Mapear los datos del paciente
      const mappedData = this.mapPatientData(data.data, documento);
      
      if (!mappedData) {
        return { 
          data: null, 
          error: 'Paciente no encontrado. Verifique que el número de documento sea correcto.',
          errorType: 'not_found'
        };
      }
      
      return { data: mappedData };
      
    } catch (error: any) {
      console.error('Error al consultar paciente:', error);
      return { 
        data: null, 
        error: `Error inesperado: ${error.message || 'Ocurrió un error al consultar el paciente'}`,
        errorType: 'unknown'
      };
    }
  }

  private mapPatientData(data: any, documento: string): PatientData | null {
    // Si no hay datos o error
    if (!data || data.error) {
      console.log('No se encontró paciente:', data);
      return null;
    }

    // Verificar que hay un nombre de paciente
    const nombrePaciente = data.nombre_paciente || data.nombre || data.NOMBRE;
    if (!nombrePaciente || nombrePaciente.trim() === '') {
      console.log('No se encontró nombre de paciente en la respuesta');
      return null;
    }

    // Separar nombre completo en nombre y apellidos
    const nombreCompleto = nombrePaciente.trim();
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre.slice(0, 2).join(' '); // Primeros dos nombres
    const apellidos = partesNombre.slice(2).join(' '); // Resto como apellidos

    // Obtener edad directamente de la API o calcularla
    let edad = 0;
    if (data.edad !== undefined && data.edad !== null) {
      edad = parseInt(String(data.edad), 10) || 0;
      console.log('Edad obtenida de la API:', edad);
    } else if (data.EDAD !== undefined && data.EDAD !== null) {
      edad = parseInt(String(data.EDAD), 10) || 0;
      console.log('Edad obtenida de la API (EDAD):', edad);
    } else if (data.fecha_nacimiento || data.FECHA_NACIMIENTO) {
      edad = this.calculateAge(data.fecha_nacimiento || data.FECHA_NACIMIENTO);
      console.log('Edad calculada desde fecha de nacimiento:', edad);
    }

    // Mapear la respuesta de la API
    const mappedData: PatientData = {
      id: data.documento || data.DOCUMENTO || documento,
      nombre: nombre || nombreCompleto,
      apellidos: apellidos || '',
      tipoDocumento: data.tipo_documento || data.TIPO_DOCUMENTO || 'CC',
      numeroDocumento: data.documento || data.DOCUMENTO || documento,
      fechaNacimiento: data.fecha_nacimiento || data.FECHA_NACIMIENTO || '',
      edad: edad,
      eps: data.eps || data.EPS || data.NO_NOMB_EPS || data.eps_paciente || 'Sin EPS',
      telefono: data.telefono || data.TELEFONO || data.telefono_paciente || 'No disponible',
      direccion: data.direccion || data.DIRECCION || data.direccion_paciente || 'No disponible',
      centroSalud: 'HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA'
    };

    console.log('Datos mapeados del paciente:', mappedData);
    return mappedData;
  }

  private calculateAge(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}

export const patientApiService = new PatientApiService();
export type { PatientData, PatientSearchResult };