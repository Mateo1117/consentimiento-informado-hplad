// Información detallada de cada tipo de procedimiento para mostrar al paciente
// cuando abre el enlace de firma remota

export interface ProcedureInfo {
  name: string;
  description: string;
  purpose: string;
  procedures: { name: string; description?: string }[];
  benefits: string[];
  risks: string[];
  alternatives: string[];
}

export const procedureInfoByType: Record<string, ProcedureInfo> = {
  venopuncion: {
    name: "Venopunción",
    description: "La venopunción es un procedimiento médico que consiste en la introducción de una aguja en una vena para extraer sangre que será analizada en el laboratorio. Se realiza con material estéril y desechable.",
    purpose: "Obtener muestras sanguíneas para análisis clínicos que permitan diagnóstico, seguimiento o control de enfermedades.",
    procedures: [
      { name: "Toma de Muestras por Venopunción", description: "Extracción de muestras sanguíneas mediante punción venosa para análisis de laboratorio." }
    ],
    benefits: [
      "Permite obtener información diagnóstica precisa y confiable para el manejo médico adecuado del paciente.",
      "Procedimiento rápido y mínimamente invasivo.",
      "Resultados de laboratorio confiables para diagnóstico y seguimiento."
    ],
    risks: [
      "Dolor temporal en el sitio de punción",
      "Sangrado mínimo",
      "Hematoma (moretón)",
      "Mareo o desmayo en personas sensibles",
      "Infección local (muy raro con técnica estéril)"
    ],
    alternatives: [
      "En casos específicos, punción arterial o muestras de orina/saliva según el tipo de análisis requerido."
    ]
  },

  carga_glucosa: {
    name: "Curva de Tolerancia a la Glucosa",
    description: "La curva de tolerancia a la glucosa es una prueba diagnóstica que evalúa cómo el cuerpo procesa el azúcar. Consiste en tomar una solución de glucosa y realizar múltiples extracciones de sangre a intervalos específicos.",
    purpose: "Diagnosticar diabetes gestacional, prediabetes o diabetes mellitus tipo 2, evaluando la respuesta del organismo a una carga de glucosa.",
    procedures: [
      { name: "Toma de muestra basal en ayunas", description: "Primera extracción de sangre antes de consumir la solución de glucosa." },
      { name: "Ingesta de solución glucosada (75g o 100g)", description: "El paciente debe tomar la solución de glucosa en un tiempo máximo de 5 minutos." },
      { name: "Tomas de sangre a los 60, 120 y/o 180 minutos", description: "Extracciones adicionales según el protocolo indicado." }
    ],
    benefits: [
      "Detección temprana de alteraciones en el metabolismo de la glucosa",
      "Diagnóstico preciso de diabetes gestacional",
      "Permite iniciar tratamiento oportuno si se detectan alteraciones",
      "Prevención de complicaciones asociadas a la diabetes no diagnosticada"
    ],
    risks: [
      "Náuseas o vómitos por la solución glucosada",
      "Dolor temporal en los sitios de punción",
      "Hematomas en los lugares de extracción",
      "Mareo o malestar durante la prueba",
      "Hipoglucemia reactiva (poco frecuente)"
    ],
    alternatives: [
      "Hemoglobina glicosilada (HbA1c) - no apta para diagnóstico de diabetes gestacional",
      "Glucemia en ayunas y postprandial - menos sensible",
      "Monitoreo continuo de glucosa en casos especiales"
    ]
  },

  hiv: {
    name: "Prueba de VIH",
    description: "La prueba de VIH es un análisis de sangre que detecta la presencia de anticuerpos contra el Virus de Inmunodeficiencia Humana o antígenos del virus. Es confidencial y voluntaria.",
    purpose: "Determinar si existe infección por VIH para iniciar tratamiento oportuno y prevenir la transmisión a otras personas.",
    procedures: [
      { name: "Extracción de muestra sanguínea", description: "Toma de sangre venosa para análisis serológico." },
      { name: "Asesoría pre-test", description: "Información sobre la prueba, ventana inmunológica y significado de resultados." },
      { name: "Asesoría post-test", description: "Entrega de resultados con orientación profesional." }
    ],
    benefits: [
      "Conocer el estado serológico permite acceder a tratamiento antirretroviral oportuno",
      "El tratamiento temprano mejora significativamente la calidad y expectativa de vida",
      "Permite tomar decisiones informadas para proteger la salud propia y de parejas",
      "Acceso a programas de apoyo y seguimiento médico"
    ],
    risks: [
      "Dolor temporal en el sitio de punción",
      "Posible hematoma",
      "Ansiedad durante el período de espera de resultados",
      "Impacto emocional ante un resultado positivo (con apoyo profesional disponible)"
    ],
    alternatives: [
      "Prueba rápida con punción capilar (menor sensibilidad)",
      "Pruebas de autodiagnóstico (requieren confirmación)",
      "Test de saliva (menos sensible que sangre venosa)"
    ]
  },

  frotis_vaginal: {
    name: "Frotis Vaginal",
    description: "El frotis vaginal es un procedimiento diagnóstico que consiste en la toma de muestras de secreción vaginal y/o cervical para análisis microbiológico y citológico.",
    purpose: "Detectar infecciones vaginales, enfermedades de transmisión sexual, alteraciones de la flora vaginal y cambios celulares anormales.",
    procedures: [
      { name: "Toma de muestra vaginal", description: "Recolección de secreción vaginal con hisopo estéril." },
      { name: "Toma de muestra cervical (si aplica)", description: "Recolección de células del cuello uterino." },
      { name: "Preparación de láminas para laboratorio", description: "Fijación de muestras para análisis microscópico." }
    ],
    benefits: [
      "Diagnóstico preciso de infecciones vaginales",
      "Detección temprana de enfermedades de transmisión sexual",
      "Evaluación del estado de la flora vaginal",
      "Identificación de cambios celulares que requieran seguimiento"
    ],
    risks: [
      "Molestia o incomodidad leve durante el procedimiento",
      "Posible sangrado mínimo",
      "Ligera irritación temporal"
    ],
    alternatives: [
      "Pruebas de orina para algunas ITS",
      "Pruebas moleculares específicas (PCR)",
      "Cultivos dirigidos según sospecha clínica"
    ]
  },

  hemocomponentes: {
    name: "Transfusión de Hemocomponentes",
    description: "La transfusión de hemocomponentes es un procedimiento médico que consiste en la administración intravenosa de sangre o sus derivados (glóbulos rojos, plaquetas, plasma) provenientes de donantes.",
    purpose: "Restablecer los componentes sanguíneos deficitarios para tratar anemias, trastornos de coagulación, hemorragias o como soporte en cirugías y tratamientos oncológicos.",
    procedures: [
      { name: "Verificación de compatibilidad sanguínea", description: "Pruebas cruzadas para asegurar compatibilidad ABO y Rh." },
      { name: "Canalización de vía venosa", description: "Inserción de catéter intravenoso para la transfusión." },
      { name: "Administración del hemocomponente", description: "Infusión controlada del componente sanguíneo indicado." },
      { name: "Monitoreo durante y después del procedimiento", description: "Vigilancia de signos vitales y reacciones adversas." }
    ],
    benefits: [
      "Corrección de anemia severa y sus síntomas",
      "Reposición de factores de coagulación",
      "Tratamiento de hemorragias agudas",
      "Soporte vital en procedimientos quirúrgicos mayores"
    ],
    risks: [
      "Reacciones febriles no hemolíticas",
      "Reacciones alérgicas (urticaria, prurito)",
      "Reacción hemolítica (muy rara, potencialmente grave)",
      "Sobrecarga circulatoria",
      "Transmisión de infecciones (riesgo muy bajo con protocolos actuales)",
      "Lesión pulmonar aguda asociada a transfusión (TRALI)"
    ],
    alternatives: [
      "Eritropoyetina en anemias crónicas",
      "Suplementos de hierro intravenoso",
      "Medicamentos hemostáticos",
      "En algunos casos, transfusión autóloga (sangre del propio paciente)"
    ]
  }
};

/**
 * Obtiene la información del procedimiento basada en el tipo de consentimiento
 * @param consentType - Código del tipo de consentimiento (ej: "venopuncion", "carga_glucosa")
 * @returns Información del procedimiento o undefined si no existe
 */
export const getProcedureInfo = (consentType: string): ProcedureInfo | undefined => {
  // Normalizar el tipo: convertir a minúsculas y reemplazar espacios/guiones
  const normalizedType = consentType.toLowerCase().replace(/[\s-]/g, '_');
  
  return procedureInfoByType[normalizedType];
};

/**
 * Formatea la información del procedimiento para incluir en el payload del consentimiento
 */
export const formatProcedureInfoForPayload = (consentType: string) => {
  const info = getProcedureInfo(consentType);
  
  if (!info) {
    return {
      procedures: [{ name: consentType }],
      benefits: [],
      risks: [],
      alternatives: []
    };
  }

  return {
    procedureName: info.name,
    procedureDescription: info.description,
    procedurePurpose: info.purpose,
    procedures: info.procedures,
    benefits: info.benefits,
    risks: info.risks,
    alternatives: info.alternatives
  };
};
