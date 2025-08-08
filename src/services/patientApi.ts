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
  private webhookUrl: string = 'https://flow.mcmasociados.tech/webhook/G92PxmaZY4H2Mhbw/webhook4/consulta-paciente';

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
          this.webhookUrl = patientEndpoint.url;
          console.log('URL de webhook cargada desde configuración:', this.webhookUrl);
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
      this.webhookUrl = patientEndpoint.url;
      console.log('URL de webhook actualizada:', this.webhookUrl);
    }
  }

  private get WEBHOOK_URL() {
    return this.webhookUrl;
  }

  async searchByDocument(documento: string): Promise<PatientData | null> {
    try {
      console.log(`Consultando paciente con documento: ${documento}`);
      
      // Intentar conexión directa primero
      try {
        const result = await this.tryDirectConnection(documento);
        if (result) {
          console.log('Paciente encontrado con conexión directa');
          return result;
        }
      } catch (directError) {
        console.log('Error en conexión directa, intentando con edge function:', directError.message);
      }
      
      // Si falla la conexión directa, usar edge function de Supabase
      try {
        console.log('Intentando con edge function de Supabase...');
        const edgeFunctionResult = await this.tryWithAllOrigins(documento);
        if (edgeFunctionResult) {
          console.log('Paciente encontrado con edge function');
          return edgeFunctionResult;
        }
      } catch (edgeError) {
        console.log('Edge function también falló:', edgeError.message);
      }
      
      // Si no se encuentra paciente en ninguna conexión
      console.log('No se encontró paciente en el webhook');
      return null;
      
    } catch (error) {
      console.error('Error general al consultar paciente:', error);
      // En lugar de lanzar error, retornar null para mejor manejo en el UI
      return null;
    }
  }

  private async tryDirectConnection(documento: string): Promise<PatientData | null> {
    console.log('Intentando conexión directa al webhook');
    
    const requestBody = {
      documento: documento,
      tipo_documento: "CC" // Agregar tipo de documento por defecto
    };
    
    console.log('Cuerpo de la petición directa:', JSON.stringify(requestBody));
    
    try {
      // Intentar primero como POST
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        mode: 'cors'
      });

      console.log('Respuesta directa - Status:', response.status);

      if (!response.ok) {
        throw new Error(`Error en conexión directa: ${response.status} ${response.statusText}`);
      }

      const data: WebhookResponse = await response.json();
      console.log('Respuesta del webhook directo:', data);
      
      return this.mapPatientData(data, documento);
      
    } catch (corsError) {
      console.log('Error CORS, intentando como GET con parámetros:', corsError);
      
      // Si falla por CORS, intentar como GET
      const getUrl = `${this.WEBHOOK_URL}?documento=${encodeURIComponent(documento)}`;
      const getResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!getResponse.ok) {
        throw new Error(`Error en GET directo: ${getResponse.status} ${getResponse.statusText}`);
      }

      const data: WebhookResponse = await getResponse.json();
      console.log('Respuesta del webhook GET directo:', data);
      
      return this.mapPatientData(data, documento);
    }
  }

  private async tryWithAllOrigins(documento: string): Promise<PatientData | null> {
    console.log('Intentando con edge function de Supabase');
    
    const requestData = {
      webhookUrl: this.WEBHOOK_URL,
      platform: 'custom',
      testData: {
        documento: documento,
        tipo_documento: "CC"
      }
    };
    
    console.log('Datos a enviar a edge function:', JSON.stringify(requestData));
    
    // Usar edge function de Supabase en lugar de proxy CORS
    const edgeFunctionUrl = 'https://drspravsvyxfhazpeygo.supabase.co/functions/v1/test-webhook';
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyc3ByYXZzdnl4ZmhhenBleWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTU4MjksImV4cCI6MjA2OTMzMTgyOX0.YhBkyIcpykfzhq44yL3wlyxpHauSogwvmWxclcNCDz8`
      },
      body: JSON.stringify(requestData)
    });

    console.log('Respuesta edge function - Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en edge function:', errorText);
      throw new Error(`Error en edge function: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Respuesta del edge function:', result);
    
    if (!result.success) {
      throw new Error(`Error en webhook: ${result.error || 'Unknown error'}`);
    }
    
    // Parsear la respuesta del webhook
    let webhookData;
    try {
      webhookData = typeof result.response === 'string' ? JSON.parse(result.response) : result.response;
    } catch (parseError) {
      console.error('Error parsing webhook response:', parseError);
      throw new Error('Error al parsear respuesta del webhook');
    }
    
    console.log('Datos parseados del webhook:', webhookData);
    
    return this.mapPatientData(webhookData, documento);
  }

  private mapPatientData(data: WebhookResponse, documento: string): PatientData | null {
    // Si no hay datos o paciente no encontrado
    if (!data || data.success === false || data.success === "false") {
      console.log('No se encontró paciente en el webhook:', data);
      return null;
    }

    // Verificar que hay un nombre de paciente
    if (!data.nombre_paciente || data.nombre_paciente.trim() === '') {
      console.log('No se encontró nombre de paciente en la respuesta del webhook');
      return null;
    }

    // Separar nombre completo en nombre y apellidos
    const nombreCompleto = data.nombre_paciente.trim();
    const partesNombre = nombreCompleto.split(' ');
    const nombre = partesNombre.slice(0, 2).join(' '); // Primeros dos nombres
    const apellidos = partesNombre.slice(2).join(' '); // Resto como apellidos

    // Calcular edad si viene fecha de nacimiento
    let edad = 0;
    if (data.fecha_nacimiento) {
      edad = this.calculateAge(data.fecha_nacimiento);
    }

    // Mapear la respuesta del webhook según el flujo de n8n
    const mappedData: PatientData = {
      id: data.documento || documento,
      nombre: nombre || nombreCompleto, // Si no se puede dividir, usar el nombre completo
      apellidos: apellidos || '', // Apellidos separados
      tipoDocumento: data.tipo_documento || 'CC',
      numeroDocumento: data.documento || documento,
      fechaNacimiento: data.fecha_nacimiento || '',
      edad: edad,
      eps: data.NO_NOMB_EPS || data.eps_paciente || data.eps || 'Sin EPS',
      telefono: data.telefono_paciente || 'No disponible',
      direccion: data.direccion_paciente || 'No disponible',
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