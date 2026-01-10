import { supabase } from "@/integrations/supabase/client";

interface PatientData {
  id: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  edad: number;
  sexo: string;
  eps: string;
  telefono: string;
  direccion: string;
  email: string;
  centroSalud: string;
  sedeAtencion: string;
}

type PatientErrorType =
  | "validation"
  | "timeout"
  | "network"
  | "http"
  | "empty_response"
  | "parse_error"
  | "api_error"
  | "not_found"
  | "unknown";

interface PatientSearchResult {
  data: PatientData | null;
  error?: string;
  errorType?: PatientErrorType;
  fromCache?: boolean;
}

const CACHE_KEY = "mcm_patient_cache_v1";

class PatientApiService {
  constructor() {
    // Limpiar cualquier caché existente al iniciar
    this.clearCache();
  }

  // Limpiar toda la caché
  public clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
    console.log("Caché de pacientes limpiada");
  }

  async searchByDocument(documento: string): Promise<PatientSearchResult> {
    try {
      const doc = String(documento || "").trim();
      console.log(`Consultando paciente con documento: ${doc} (siempre datos frescos)`);

      if (!doc) {
        return {
          data: null,
          error: "El número de documento es requerido",
          errorType: "validation",
        };
      }

      if (doc.length < 5) {
        return {
          data: null,
          error: "El número de documento debe tener al menos 5 dígitos",
          errorType: "validation",
        };
      }

      // Siempre consultar datos frescos de la API
      const { data, error } = await supabase.functions.invoke("consulta-paciente", {
        body: { documento: doc },
      });

      if (error) {
        console.error("Error en edge function:", error);
        return {
          data: null,
          error: "Error al conectar con el servidor. Intente nuevamente.",
          errorType: "network",
        };
      }

      if (data?.error) {
        return {
          data: null,
          error: data.error,
          errorType: (data.errorType as PatientErrorType) || "unknown",
        };
      }

      const mapped = this.mapPatientData(data?.data, doc);
      if (!mapped) {
        return {
          data: null,
          error: "Paciente no encontrado. Verifique que el número de documento sea correcto.",
          errorType: "not_found",
        };
      }

      return { data: mapped };
    } catch (error: any) {
      console.error("Error al consultar paciente:", error);
      return {
        data: null,
        error: `Error inesperado: ${error.message || "Ocurrió un error al consultar el paciente"}`,
        errorType: "unknown",
      };
    }
  }

  private mapPatientData(data: any, documento: string): PatientData | null {
    console.log("Datos crudos recibidos para mapear:", JSON.stringify(data, null, 2));
    
    if (!data || data.error) {
      console.log("No se encontró paciente:", data);
      return null;
    }

    // El webhook puede devolver los datos en diferentes estructuras
    // Intentar extraer del primer elemento si es un array
    let patientRecord = data;
    if (Array.isArray(data) && data.length > 0) {
      patientRecord = data[0];
      console.log("Datos extraídos de array:", patientRecord);
    } else if (data.data && typeof data.data === 'object') {
      // Si los datos vienen anidados en .data
      patientRecord = Array.isArray(data.data) ? data.data[0] : data.data;
      console.log("Datos extraídos de .data:", patientRecord);
    }

    // Manejar diferentes formatos de nombre
    const nombrePaciente = patientRecord.NOMBRE_PACIENTE || patientRecord.nombre_paciente || patientRecord.nombre || patientRecord.NOMBRE;
    if (!nombrePaciente || String(nombrePaciente).trim() === "") {
      console.log("No se encontró nombre de paciente en la respuesta. Campos disponibles:", Object.keys(patientRecord));
      return null;
    }

    const nombreCompleto = String(nombrePaciente).trim();
    const partesNombre = nombreCompleto.split(" ");
    const nombre = partesNombre.slice(0, 2).join(" ");
    const apellidos = partesNombre.slice(2).join(" ");

    // Obtener edad - priorizar EDAD_PACIENTE
    let edad = 0;
    if (patientRecord.EDAD_PACIENTE !== undefined && patientRecord.EDAD_PACIENTE !== null) {
      edad = parseInt(String(patientRecord.EDAD_PACIENTE), 10) || 0;
      console.log("Edad obtenida de EDAD_PACIENTE:", edad);
    } else if (patientRecord.edad !== undefined && patientRecord.edad !== null) {
      edad = parseInt(String(patientRecord.edad), 10) || 0;
    } else if (patientRecord.EDAD !== undefined && patientRecord.EDAD !== null) {
      edad = parseInt(String(patientRecord.EDAD), 10) || 0;
    }

    // Obtener fecha de nacimiento - priorizar FECHA_NACIMIENTO
    let fechaNacimiento = "";
    if (patientRecord.FECHA_NACIMIENTO) {
      // Puede venir con hora, extraer solo la fecha
      const fechaRaw = String(patientRecord.FECHA_NACIMIENTO).split(" ")[0];
      fechaNacimiento = fechaRaw;
      console.log("Fecha de nacimiento obtenida de FECHA_NACIMIENTO:", fechaNacimiento);
      
      // Si no tenemos edad, calcularla desde la fecha
      if (!edad && fechaNacimiento) {
        edad = this.calculateAge(fechaNacimiento);
        console.log("Edad calculada desde FECHA_NACIMIENTO:", edad);
      }
    } else if (patientRecord.fecha_nacimiento) {
      fechaNacimiento = patientRecord.fecha_nacimiento;
      if (!edad) {
        edad = this.calculateAge(fechaNacimiento);
      }
    }

    const mapped: PatientData = {
      id: patientRecord.DOCUMENTO_PACIENTE || patientRecord.documento || patientRecord.DOCUMENTO || documento,
      nombre: nombre || nombreCompleto,
      apellidos: apellidos || "",
      tipoDocumento: patientRecord.TIPO_DOCUMENTO || patientRecord.tipo_documento || "CC",
      numeroDocumento: patientRecord.DOCUMENTO_PACIENTE || patientRecord.documento || patientRecord.DOCUMENTO || documento,
      fechaNacimiento,
      edad,
      sexo: patientRecord.SEXO_PACIENTE || patientRecord.sexo || patientRecord.SEXO || "No especificado",
      eps: patientRecord.NOMBRE_EPS || patientRecord.EPS || patientRecord.eps || patientRecord.NO_NOMB_EPS || patientRecord.eps_paciente || "Sin EPS",
      telefono: patientRecord.TELEFONO_PACIENTE || patientRecord.telefono_paciente || patientRecord.telefono || patientRecord.TELEFONO || "No disponible",
      direccion: patientRecord.DIRECCION_PACIENTE || patientRecord.direccion_paciente || patientRecord.direccion || patientRecord.DIRECCION || "No disponible",
      email: patientRecord.EMAIL_PACIENTE || patientRecord.email_paciente || patientRecord.email || patientRecord.EMAIL || "",
      centroSalud: "HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA",
      sedeAtencion: patientRecord.SEDE_ATENCION || patientRecord.sede || patientRecord.SEDE || "",
    };

    console.log("Datos mapeados del paciente:", mapped);
    return mapped;
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
