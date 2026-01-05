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
const CACHE_CLEANUP_INTERVAL_MS = 1000 * 60 * 30; // Limpieza cada 30 minutos

class PatientApiService {
  private cache = new Map<string, CacheEntry>();
  private cleanupIntervalId: number | null = null;

  constructor() {
    this.loadCache();
    this.cleanExpiredEntries(); // Limpieza automática al iniciar
    this.startAutoCleanup(); // Iniciar limpieza periódica
  }

  // Limpieza automática periódica
  private startAutoCleanup() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    this.cleanupIntervalId = window.setInterval(() => {
      console.log("Ejecutando limpieza automática de caché de pacientes...");
      this.cleanExpiredEntries();
    }, CACHE_CLEANUP_INTERVAL_MS);
  }

  // Limpiar entradas expiradas
  private cleanExpiredEntries(): number {
    const now = Date.now();
    let removed = 0;

    for (const [doc, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(doc);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Caché: ${removed} entradas expiradas eliminadas`);
      this.persistCache();
    }

    return removed;
  }

  // Limpiar toda la caché manualmente
  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
    console.log("Caché de pacientes limpiada completamente");
  }

  // Limpiar un documento específico del caché
  public clearCacheForDocument(documento: string): void {
    const doc = String(documento).trim();
    if (this.cache.has(doc)) {
      this.cache.delete(doc);
      this.persistCache();
      console.log(`Caché eliminada para documento: ${doc}`);
    }
  }

  // Obtener estadísticas del caché
  public getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.keys()),
    };
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
      
      console.log(`Caché de pacientes cargada: ${this.cache.size} entradas válidas`);
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

  async searchByDocument(documento: string, forceRefresh: boolean = false): Promise<PatientSearchResult> {
    try {
      const doc = String(documento || "").trim();
      console.log(`Consultando paciente con documento: ${doc}${forceRefresh ? " (forzando actualización)" : ""}`);

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

      // Cache hit (si no se fuerza actualización)
      if (!forceRefresh) {
        const cached = this.getFromCache(doc);
        if (cached) {
          console.log("Cache hit paciente:", doc);
          return { data: cached, fromCache: true };
        }
      } else {
        // Si se fuerza, eliminar del caché primero
        this.clearCacheForDocument(doc);
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

    // Manejar diferentes formatos de nombre
    const nombrePaciente = data.NOMBRE_PACIENTE || data.nombre_paciente || data.nombre || data.NOMBRE;
    if (!nombrePaciente || String(nombrePaciente).trim() === "") {
      console.log("No se encontró nombre de paciente en la respuesta");
      return null;
    }

    const nombreCompleto = String(nombrePaciente).trim();
    const partesNombre = nombreCompleto.split(" ");
    const nombre = partesNombre.slice(0, 2).join(" ");
    const apellidos = partesNombre.slice(2).join(" ");

    // Obtener edad - priorizar EDAD_PACIENTE
    let edad = 0;
    if (data.EDAD_PACIENTE !== undefined && data.EDAD_PACIENTE !== null) {
      edad = parseInt(String(data.EDAD_PACIENTE), 10) || 0;
      console.log("Edad obtenida de EDAD_PACIENTE:", edad);
    } else if (data.edad !== undefined && data.edad !== null) {
      edad = parseInt(String(data.edad), 10) || 0;
    } else if (data.EDAD !== undefined && data.EDAD !== null) {
      edad = parseInt(String(data.EDAD), 10) || 0;
    }

    // Obtener fecha de nacimiento - priorizar FECHA_NACIMIENTO
    let fechaNacimiento = "";
    if (data.FECHA_NACIMIENTO) {
      // Puede venir con hora, extraer solo la fecha
      const fechaRaw = String(data.FECHA_NACIMIENTO).split(" ")[0];
      fechaNacimiento = fechaRaw;
      console.log("Fecha de nacimiento obtenida de FECHA_NACIMIENTO:", fechaNacimiento);
      
      // Si no tenemos edad, calcularla desde la fecha
      if (!edad && fechaNacimiento) {
        edad = this.calculateAge(fechaNacimiento);
        console.log("Edad calculada desde FECHA_NACIMIENTO:", edad);
      }
    } else if (data.fecha_nacimiento || data.FECHA_NACIMIENTO) {
      fechaNacimiento = data.fecha_nacimiento || data.FECHA_NACIMIENTO;
      if (!edad) {
        edad = this.calculateAge(fechaNacimiento);
      }
    }

    const mapped: PatientData = {
      id: data.DOCUMENTO_PACIENTE || data.documento || data.DOCUMENTO || documento,
      nombre: nombre || nombreCompleto,
      apellidos: apellidos || "",
      tipoDocumento: data.TIPO_DOCUMENTO || data.tipo_documento || "CC",
      numeroDocumento: data.DOCUMENTO_PACIENTE || data.documento || data.DOCUMENTO || documento,
      fechaNacimiento,
      edad,
      eps: data.EPS || data.eps || data.NO_NOMB_EPS || data.eps_paciente || "Sin EPS",
      telefono: data.TELEFONO_PACIENTE || data.telefono || data.TELEFONO || data.telefono_paciente || "No disponible",
      direccion: data.direccion || data.DIRECCION || data.direccion_paciente || "No disponible",
      centroSalud: "HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA",
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
