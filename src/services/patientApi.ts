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

interface WebhookResponse {
  // La respuesta del webhook puede tener diferentes estructuras
  // Ajustar según lo que devuelva tu webhook
  [key: string]: any;
}

class PatientApiService {
  private apiBaseUrl: string = 'https://webhook.mcmasociados.tech/webhook/consulta-paciente';

  constructor() {
    // Cargar configuración desde localStorage
    this.loadConfiguration();
    
    // Escuchar cambios de configuración
    window.addEventListener('api-config-updated', this.handleConfigUpdate.bind(this));
  }

  private loadConfiguration() {
    try {
      const saved = localStorage.getItem('mcm_api_config');
      if (saved) {
        const config = JSON.parse(saved);
        const patientEndpoint = config.find((ep: any) => ep.name === 'consulta-paciente');
        if (patientEndpoint && patientEndpoint.status === 'active') {
          this.apiBaseUrl = patientEndpoint.url;
          console.log('URL de API cargada desde configuración:', this.apiBaseUrl);
        }
      }
    } catch (error) {
      console.error('Error loading API configuration:', error);
    }
  }

  private handleConfigUpdate(event: CustomEvent) {
    const endpoints = event.detail.endpoints;
    const patientEndpoint = endpoints.find((ep: any) => ep.name === 'consulta-paciente');
    if (patientEndpoint && patientEndpoint.status === 'active') {
      this.apiBaseUrl = patientEndpoint.url;
      console.log('URL de API actualizada:', this.apiBaseUrl);
    }
  }

  private get API_BASE_URL() {
    return this.apiBaseUrl;
  }

  async searchByDocument(documento: string): Promise<{ data: PatientData | null; error?: string; errorType?: string }> {
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
      
      // Construir URL con parámetros GET
      const apiUrl = `${this.API_BASE_URL}?op=GetPaciente&documento_paciente=${encodeURIComponent(documento)}`;
      console.log('URL de consulta:', apiUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
      
      let response: Response;
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return { 
            data: null, 
            error: 'La consulta tardó demasiado tiempo. Verifique su conexión e intente nuevamente.',
            errorType: 'timeout'
          };
        }
        
        // Error de red (CORS, servidor no disponible, etc.)
        return { 
          data: null, 
          error: 'No se pudo conectar con el servidor. Verifique que la URL del webhook sea correcta y que el servidor esté disponible.',
          errorType: 'network'
        };
      }
      
      clearTimeout(timeoutId);
      console.log('Respuesta API - Status:', response.status);

      // Validar respuesta HTTP
      if (!response.ok) {
        const errorMessages: Record<number, string> = {
          400: 'Solicitud inválida. Verifique el número de documento.',
          401: 'No autorizado. Las credenciales del webhook son inválidas.',
          403: 'Acceso denegado. No tiene permisos para esta operación.',
          404: 'Endpoint no encontrado. Verifique la URL del webhook.',
          500: 'Error interno del servidor. Intente nuevamente más tarde.',
          502: 'El servidor no está respondiendo correctamente.',
          503: 'Servicio no disponible. Intente nuevamente más tarde.',
          504: 'Tiempo de espera agotado en el servidor.'
        };
        
        const errorMessage = errorMessages[response.status] || 
          `Error del servidor: ${response.status} ${response.statusText}`;
        
        return { 
          data: null, 
          error: errorMessage,
          errorType: 'http'
        };
      }

      // Validar contenido de la respuesta
      let data: WebhookResponse;
      try {
        const responseText = await response.text();
        
        if (!responseText || responseText.trim() === '') {
          return { 
            data: null, 
            error: 'El servidor respondió pero no envió datos. Verifique la configuración del webhook.',
            errorType: 'empty_response'
          };
        }
        
        data = JSON.parse(responseText);
      } catch (parseError) {
        return { 
          data: null, 
          error: 'La respuesta del servidor no es válida. El formato esperado es JSON.',
          errorType: 'parse_error'
        };
      }
      
      console.log('Respuesta de la API:', data);
      
      // Verificar si hay error en la respuesta
      if (data.error) {
        return { 
          data: null, 
          error: typeof data.error === 'string' ? data.error : 'Error en la consulta del paciente',
          errorType: 'api_error'
        };
      }

      if (data.success === false || data.success === 'false') {
        return { 
          data: null, 
          error: data.message || 'No se encontró el paciente con el documento proporcionado',
          errorType: 'not_found'
        };
      }
      
      const mappedData = this.mapPatientData(data, documento);
      
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

  private mapPatientData(data: WebhookResponse, documento: string): PatientData | null {
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

  private getDemoPatientData(documento: string): PatientData {
    console.log('Generando datos demo para documento:', documento);
    
    // Datos demo realistas para diferentes documentos
    const demoPatients: { [key: string]: Partial<PatientData> } = {
      '1015435249': {
        nombre: 'CARLOS ANDRES MARTINEZ RODRIGUEZ',
        telefono: '(+57) 314-567-8901',
        direccion: 'CALLE 45 #23-67, BARRIO LOS ROSALES',
        eps: 'NUEVA EPS'
      },
      '1234567890': {
        nombre: 'MARIA FERNANDA LOPEZ GARCIA',
        telefono: '(+57) 315-123-4567',
        direccion: 'CARRERA 12 #34-56, BARRIO CENTRO',
        eps: 'SURA'
      },
      '9876543210': {
        nombre: 'JOSE LUIS RAMIREZ CASTRO',
        telefono: '(+57) 318-987-6543',
        direccion: 'AVENIDA 80 #12-34, BARRIO LA PAZ',
        eps: 'SALUD TOTAL'
      }
    };

    const patientInfo = demoPatients[documento] || {
      nombre: 'PACIENTE DEMO',
      telefono: '(+57) 300-000-0000',
      direccion: 'DIRECCION DEMO',
      eps: 'EPS DEMO'
    };

    return {
      id: documento,
      nombre: patientInfo.nombre!,
      apellidos: '',
      tipoDocumento: 'CC',
      numeroDocumento: documento,
      fechaNacimiento: '1990-01-01',
      edad: 33,
      eps: patientInfo.eps!,
      telefono: patientInfo.telefono!,
      direccion: patientInfo.direccion!,
      centroSalud: 'HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA'
    };
  }
}

export const patientApiService = new PatientApiService();
export type { PatientData };