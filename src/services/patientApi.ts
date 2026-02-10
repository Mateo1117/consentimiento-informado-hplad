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

      // Error de conexión con la Edge Function
      if (error) {
        console.error("Error en edge function:", error);
        return {
          data: null,
          error: "Error al conectar con el servidor. Intente nuevamente.",
          errorType: "network",
        };
      }

      // Analizar respuesta de la Edge Function
      // La Edge Function siempre devuelve 200 con el resultado en el body
      if (data?.error) {
        const errorType = (data.errorType as PatientErrorType) || "unknown";
        let errorMessage = data.error;
        
        // Personalizar mensaje según el tipo de error
        if (errorType === "not_found") {
          // Usar el mensaje del webhook si está disponible
          errorMessage = data.webhookMessage || data.error || 
            "No se encontraron datos del paciente. Por favor, valide la creación del mismo en el sistema para continuar.";
        }
        
        return {
          data: null,
          error: errorMessage,
          errorType: errorType,
        };
      }

      const mapped = this.mapPatientData(data?.data, doc);
      if (!mapped) {
        return {
          data: null,
          error: "No se encontraron datos del paciente. Por favor, valide la creación del mismo en el sistema para continuar.",
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

    // Log de todas las claves disponibles para depuración
    console.log("Claves disponibles en patientRecord:", Object.keys(patientRecord));

    // Manejar diferentes formatos de nombre - incluir nombrePaciente del webhook
    const nombrePaciente = 
      patientRecord.nombrePaciente || 
      patientRecord.nombre_paciente || 
      patientRecord.NOMBRE_PACIENTE || 
      patientRecord.nombre || 
      patientRecord.NOMBRE;
      
    if (!nombrePaciente || String(nombrePaciente).trim() === "") {
      console.log("No se encontró nombre de paciente en la respuesta. Campos disponibles:", Object.keys(patientRecord));
      return null;
    }

    const nombreCompleto = String(nombrePaciente).trim();
    const partesNombre = nombreCompleto.split(" ");
    const nombre = partesNombre.slice(0, 2).join(" ");
    const apellidos = partesNombre.slice(2).join(" ");

    // Obtener edad - incluir edadPaciente del webhook
    let edad = 0;
    if (patientRecord.edadPaciente !== undefined && patientRecord.edadPaciente !== null) {
      edad = parseInt(String(patientRecord.edadPaciente), 10) || 0;
      console.log("Edad obtenida de edadPaciente:", edad);
    } else if (patientRecord.EDAD_PACIENTE !== undefined && patientRecord.EDAD_PACIENTE !== null) {
      edad = parseInt(String(patientRecord.EDAD_PACIENTE), 10) || 0;
      console.log("Edad obtenida de EDAD_PACIENTE:", edad);
    } else if (patientRecord.edad !== undefined && patientRecord.edad !== null) {
      edad = parseInt(String(patientRecord.edad), 10) || 0;
    } else if (patientRecord.EDAD !== undefined && patientRecord.EDAD !== null) {
      edad = parseInt(String(patientRecord.EDAD), 10) || 0;
    }

    // Obtener fecha de nacimiento - incluir fechaNacimiento del webhook
    let fechaNacimiento = "";
    if (patientRecord.fechaNacimiento) {
      // Puede venir con hora, extraer solo la fecha
      const fechaRaw = String(patientRecord.fechaNacimiento).split(" ")[0];
      fechaNacimiento = fechaRaw;
      console.log("Fecha de nacimiento obtenida de fechaNacimiento:", fechaNacimiento);
      
      // Si no tenemos edad, calcularla desde la fecha
      if (!edad && fechaNacimiento) {
        edad = this.calculateAge(fechaNacimiento);
        console.log("Edad calculada desde fechaNacimiento:", edad);
      }
    } else if (patientRecord.FECHA_NACIMIENTO) {
      const fechaRaw = String(patientRecord.FECHA_NACIMIENTO).split(" ")[0];
      fechaNacimiento = fechaRaw;
      console.log("Fecha de nacimiento obtenida de FECHA_NACIMIENTO:", fechaNacimiento);
      
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

    // Obtener tipo de documento - incluir tipoDocumento del webhook
    const tipoDocumento = 
      patientRecord.tipoDocumento || 
      patientRecord.tipo_documento || 
      patientRecord.TIPO_DOCUMENTO || 
      "CC";

    // Obtener documento - incluir documentoPaciente del webhook
    const numeroDocumento = 
      patientRecord.documentoPaciente || 
      patientRecord.documento || 
      patientRecord.DOCUMENTO_PACIENTE || 
      patientRecord.DOCUMENTO || 
      documento;

    // Obtener teléfono - incluir telefonoPaciente y telefonoPrincipal del webhook
    let telefono = 
      patientRecord.telefonoPrincipal || 
      patientRecord.telefonoPaciente || 
      patientRecord.telefono_paciente || 
      patientRecord.TELEFONO_PRINCIPAL_PACIENTE || 
      patientRecord.TELEFONO_PACIENTE || 
      patientRecord.telefono || 
      patientRecord.TELEFONO || 
      "No disponible";
    // Limpiar caracteres especiales del teléfono
    telefono = String(telefono).trim().replace(/\r\n/g, '').replace(/\n/g, '');

    // Obtener email - incluir emailPaciente del webhook
    const email = 
      patientRecord.emailPaciente || 
      patientRecord.email_paciente || 
      patientRecord.EMAIL_PACIENTE || 
      patientRecord.email || 
      patientRecord.EMAIL || 
      "";

    // Obtener EPS - incluir eps del webhook
    const eps = 
      patientRecord.eps || 
      patientRecord.NOMBRE_EPS || 
      patientRecord.EPS || 
      patientRecord.NO_NOMB_EPS || 
      patientRecord.eps_paciente || 
      "Sin EPS";

    // Obtener sexo y normalizar a F/M
    const sexoRaw = 
      patientRecord.sexo || 
      patientRecord.SEXO_PACIENTE || 
      patientRecord.SEXO || 
      patientRecord.sexoPaciente ||
      "";
    // Normalizar: "FEMENINO" -> "F", "MASCULINO" -> "M", "F" -> "F", "M" -> "M"
    const sexoNormalized = String(sexoRaw).trim().toUpperCase();
    const sexo = sexoNormalized.startsWith('F') ? 'F' 
      : sexoNormalized.startsWith('M') ? 'M' 
      : sexoNormalized || "No especificado";

    // Obtener dirección
    const direccion = 
      patientRecord.direccion || 
      patientRecord.DIRECCION_PACIENTE || 
      patientRecord.direccion_paciente || 
      patientRecord.DIRECCION || 
      "No disponible";

    // Obtener oid del paciente (identificador interno)
    const oidGenpacien = patientRecord.oidGenpacien || patientRecord.OID_GENPACIEN || "";
    if (oidGenpacien) {
      console.log("OID del paciente:", oidGenpacien);
    }

    const mapped: PatientData = {
      id: numeroDocumento,
      nombre: nombre || nombreCompleto,
      apellidos: apellidos || "",
      tipoDocumento,
      numeroDocumento,
      fechaNacimiento,
      edad,
      sexo,
      eps,
      telefono,
      direccion,
      email,
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
