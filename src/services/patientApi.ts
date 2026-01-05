import { supabase } from "@/integrations/supabase/client";

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

type CacheEntry = {
  data: PatientData;
  expiresAt: number;
};

const CACHE_KEY = "mcm_patient_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 horas
const CACHE_MAX_ITEMS = 50;

class PatientApiService {
  private cache = new Map<string, CacheEntry>();

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const now = Date.now();

      for (const [doc, entry] of Object.entries(parsed)) {
        if (entry?.data && entry?.expiresAt && entry.expiresAt > now) {
          this.cache.set(doc, entry);
        }
      }
    } catch (e) {
      console.warn("No se pudo cargar el caché de pacientes", e);
    }
  }

  private persistCache() {
    try {
      // limitar tamaño
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].expiresAt - a[1].expiresAt)
        .slice(0, CACHE_MAX_ITEMS);

      const obj: Record<string, CacheEntry> = {};
      for (const [doc, entry] of entries) obj[doc] = entry;

      localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("No se pudo guardar el caché de pacientes", e);
    }
  }

  private getFromCache(documento: string): PatientData | null {
    const entry = this.cache.get(documento);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(documento);
      this.persistCache();
      return null;
    }

    return entry.data;
  }

  private setCache(documento: string, data: PatientData) {
    this.cache.set(documento, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    this.persistCache();
  }

  async searchByDocument(documento: string): Promise<PatientSearchResult> {
    try {
      const doc = String(documento || "").trim();
      console.log(`Consultando paciente con documento: ${doc}`);

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

      // Cache hit
      const cached = this.getFromCache(doc);
      if (cached) {
        console.log("Cache hit paciente:", doc);
        return { data: cached, fromCache: true };
      }

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

      this.setCache(doc, mapped);
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
    if (!data || data.error) {
      console.log("No se encontró paciente:", data);
      return null;
    }

    const nombrePaciente = data.nombre_paciente || data.nombre || data.NOMBRE;
    if (!nombrePaciente || String(nombrePaciente).trim() === "") {
      console.log("No se encontró nombre de paciente en la respuesta");
      return null;
    }

    const nombreCompleto = String(nombrePaciente).trim();
    const partesNombre = nombreCompleto.split(" ");
    const nombre = partesNombre.slice(0, 2).join(" ");
    const apellidos = partesNombre.slice(2).join(" ");

    let edad = 0;
    if (data.edad !== undefined && data.edad !== null) {
      edad = parseInt(String(data.edad), 10) || 0;
    } else if (data.EDAD !== undefined && data.EDAD !== null) {
      edad = parseInt(String(data.EDAD), 10) || 0;
    } else if (data.fecha_nacimiento || data.FECHA_NACIMIENTO) {
      edad = this.calculateAge(data.fecha_nacimiento || data.FECHA_NACIMIENTO);
    }

    const mapped: PatientData = {
      id: data.documento || data.DOCUMENTO || documento,
      nombre: nombre || nombreCompleto,
      apellidos: apellidos || "",
      tipoDocumento: data.tipo_documento || data.TIPO_DOCUMENTO || "CC",
      numeroDocumento: data.documento || data.DOCUMENTO || documento,
      fechaNacimiento: data.fecha_nacimiento || data.FECHA_NACIMIENTO || "",
      edad,
      eps: data.eps || data.EPS || data.NO_NOMB_EPS || data.eps_paciente || "Sin EPS",
      telefono: data.telefono || data.TELEFONO || data.telefono_paciente || "No disponible",
      direccion: data.direccion || data.DIRECCION || data.direccion_paciente || "No disponible",
      centroSalud: "HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA",
    };

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
