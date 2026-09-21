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
  implications?: { heading: string; items: string[] }[];
  unavoidableEffects?: string[];
  refusalConsequences?: string[];
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
  },
  radiografia: {
    name: "Toma de Radiografía",
    description: "La toma de radiografía convencional es un estudio no invasivo de diagnóstico por imágenes que utiliza dosis controladas de radiación ionizante (rayos X) para la evaluación de estructuras anatómicas internas, principalmente el sistema osteoarticular, el tórax y el abdomen. La persona se ubicará de pie, sentada o en decúbito (acostada) sobre la mesa de exploraciones según el segmento corporal a evaluar. El haz de radiación atraviesa el cuerpo y es absorbido en diferentes proporciones según la densidad de los tejidos (el hueso absorbe más radiación que los tejidos blandos), plasmando una imagen bidimensional en un detector digital o chasis radiográfico.",
    purpose: "Identificar, caracterizar y dar seguimiento a fracturas, luxaciones, procesos infecciosos, lesiones tumorales, patologías pulmonares o alteraciones abdominales estructurales.",
    procedures: [
      { name: "Toma De Radiografía", description: "La toma de radiografía convencional es un estudio no invasivo de diagnóstico por imágenes que utiliza dosis controladas de radiación ionizante (rayos X) para la evaluación de estructuras anatómicas internas, principalmente el sistema osteoarticular, el tórax y el abdomen." }
    ],
    benefits: [
      "1. Obtención inmediata de imágenes diagnósticas para la toma de decisiones clínicas oportunas en urgencias y consulta externa.",
      "2. Método de elección para la evaluación de la densidad, integridad y alineación del sistema esquelético.",
      "3. Procedimiento indoloro que no requiere recuperación posterior.",
    ],
    risks: [
      "Son Riesgos:",
      "1. Exposición a una dosis baja de rayos X. Aunque la dosis de una radiografía simple es mínima, existe un riesgo estocástico teórico proporcional a la exposición acumulada a lo largo de la vida.",
      "2. Limitación diagnóstica por superposición de estructuras.",
      "3. Alteración en la interpretación radiológica por movimiento involuntario del paciente o presencia de elementos radiopacos (botones, cierres, joyas, material quirúrgico).",
      "Son Complicaciones:",
      "1. Incremento del dolor o riesgo de desplazamiento en fracturas inestables al movilizar o posicionar la extremidad o zona afectada.",
      "2. Diaforesis o hipotensión transitoria desencadenada por dolor agudo o bipedestación prolongada en pacientes debilitados.",
      "3. Escoriación superficial o molestia por fricción directa con los bordes del chasis o la mesa en pacientes con extrema fragilidad capilar o atrofia cutánea.",
    ],
    alternatives: [
      "- Ecografía (Ultrasonido). Evaluador de elección para tejidos blandos, tendones y colecciones líquidas; no utiliza radiación ionizante.",
      "- Tomografía Computarizada (TAC). Indicada cuando se requiere reconstrucción tridimensional o mayor detalle anatómico en fracturas complejas o patología visceral.",
      "- Resonancia Magnética (RM). Excelente caracterización de ligamentos, cartílagos, médula ósea y tejido blando sin uso de radiación ionizante (no disponible).",
    ],
    implications: [
      {
        heading: "Requisitos previos (Pre-examen):",
        items: [
          "Retirar obligatoriamente objetos metálicos, joyas, piercings, cierres, botones o prendas con adornos en la zona anatómica a evaluar para evitar artefactos en la imagen.",
          "Informar obligatoriamente al personal de salud sobre la posibilidad o confirmación de embarazo para aplicar medidas de protección radiológica especial (blindaje plomado) o reevaluar la necesidad del examen.",
        ],
      },
      {
        heading: "Compromisos durante el examen (Trans-examen):",
        items: [
          "Mantener la posición corporal indicada y permanecer completamente inmóvil durante la emisión de la radiación.",
          "Seguir las instrucciones verbales de contener la respiración (apnea) cuando se le solicite (en estudios de tórax o abdomen).",
        ],
      },
      {
        heading: "Aspectos posteriores (Post-examen):",
        items: [
          "No requiere reposo ni periodo de observación; el paciente puede reincorporarse de inmediato a sus actividades cotidianas.",
          "Reclamar y presentar el resultado radiológico al médico tratante para la correlación clínica correspondiente.",
        ],
      },
    ],
    unavoidableEffects: ["Molestia o rigidez postural.", "Sensación de frío."],
    refusalConsequences: [
      "Imposibilidad de confirmar o descartar fracturas, consolidaciones viciosas, neumonías u otras patologías relevantes.",
      "Riesgo de inmovilizar o intervenir quirúrgicamente de forma errónea por falta de correlación anatómica objetiva.",
      "Retraso en el inicio del tratamiento que puede derivar en secuelas funcionales, deformidad o complicaciones sistémicas.",
    ],
  },
  rx_gestante: {
    name: "RX para Gestante",
    description: "La toma de radiografía en la paciente gestante es un estudio de diagnóstico por imágenes que utiliza dosis extremadamente bajas de radiación ionizante (rayos X) para la evaluación de estructuras óseas, articulares, pulmonares o abdominales en la madre. Durante el examen, la paciente se posicionará de pie, sentada o en decúbito sobre la mesa de exploraciones según la región anatómica a evaluar. Antes de la exposición, se implementan de forma obligatoria las medidas de radioprotección pertinentes, incluyendo el colimado estricto del haz de rayos X únicamente hacia la zona de interés y la colocación de un blindaje plomado (delantal o protector pélvico/abdominal) para minimizar la exposición del feto.",
    purpose: "Obtener información diagnóstica prioritaria ante sospecha de patología materna aguda (traumatismos, infecciones pulmonares, abdomen agudo) que no pueda ser resuelta mediante métodos inocuos (ultrasonido o resonancia) y cuyo retraso ponga en riesgo la vida o la salud de la madre o del feto.",
    procedures: [
      { name: "Toma De Radiografía Para Gestante", description: "La toma de radiografía en la paciente gestante es un estudio de diagnóstico por imágenes que utiliza dosis extremadamente bajas de radiación ionizante (rayos X) para la evaluación de estructuras óseas, articulares, pulmonares o abdominales en la madre." }
    ],
    benefits: [
      "Diagnóstico materno oportuno",
      "Permite descartar o confirmar cuadros patológicos graves o de urgencia en la gestante para iniciar un manejo terapéutico inmediato",
      "Relación beneficio-riesgo favorable: Aporta información clínica decisiva para la vida materna utilizando dosis de radiación muy inferiores al umbral de riesgo teratogénico fetal demostrado",
    ],
    risks: [
      "Riesgo teórico de exposición fetal a radiación dispersa",
      "Posibilidad de que una fracción mínima de radiación secundaria alcance al feto",
      "Las dosis diagnósticas convencionales (menores a 50 mGy) no superan los umbrales asociados a malformaciones estructurales o muerte fetal",
      "Riesgo teórico y acumulativo extremadamente bajo de inducción de neoplasias o leucemia en la infancia tardía del recién nacido",
      "Posible disminución de la nitidez diagnóstica por el uso de blindajes, la dificultad en el posicionamiento materno o el intento de reducir la dosis al mínimo (principio ALARA)",
      "Son Complicaciones :",
      "Mareo, diaforesis o hipotensión materna secundaria a la compresión de la vena cava inferior por el útero grávido al adoptar la posición de decúbito durante el estudio",
      "Incremento del dolor o desplazamiento de fracturas por maniobras inadecuadas al movilizar a una paciente traumatizada para lograr la proyección deseada",
      "Contusión o excoriación en la piel de la gestante por fricción con los chasis, el Bucky o la mesa rígida",
    ],
    alternatives: [
      "Ultrasonido (Ecografía)",
      "Método de primera elección, totalmente libre de radiación ionizante - Resonancia Magnética (sin contraste)",
      "Opción diagnóstica de alta resolución para tejidos blandos y caracterización compleja que no utiliza radiación ionizante (no disponible)",
    ]
  },
  mamografia: {
    name: "Mamografía",
    description: "La mamografía es un estudio radiológico especializado para la evaluación del tejido mamario. La paciente se ubicará de pie frente al mamógrafo. La mama se posiciona sobre una plataforma plana y se comprime gradualmente mediante una paleta plástica durante unos segundos para homogenizar el grosor del tejido, reducir la dosis de radiación y optimizar la nitidez de la imagen. Se toman habitualmente dos proyecciones estándar por cada mama (craneocaudal y mediolateral oblicua).",
    purpose: "Detección temprana de lesiones no palpables y caracterización de hallazgos clínicos o radiológicos en la glándula mamaria.",
    procedures: [
      { name: "Toma De Mamografía", description: "La mamografía es un estudio radiológico especializado para la evaluación del tejido mamario." }
    ],
    benefits: [
      "Detección temprana de lesiones no palpables, microcalcificaciones sospechosas y tumores en etapas subclínicas tempranas",
      "Incrementa las probabilidades de curación o control de la enfermedad mediante el diagnóstico oportuno del cáncer de mama",
      "Permite detectar alteraciones en estadios iniciales, disminuye la necesidad de intervenciones quirúrgicas agresivas o esquemas de tratamiento complejos",
      "Facilitar el seguimiento comparativo anual de cambios tisulares evolutivos",
    ],
    risks: [
      "Riesgo de omitir lesiones no visibles (por alta densidad mamaria) o de requerir estudios adicionales y biopsias",
      "Exposición a una dosis bajas de rayos X",
      "Aunque la dosis es mínima y controlada",
      "Riesgo de requerir repetición de la toma por movimiento involuntario, baja tolerancia a la compresión o presencia de implantes/cuerpos extraños que oculten tejido",
      "Mareo, hipotensión o desmayo transitorio desencadenado por dolor agudo o estrés durante la compresión del tejido",
      "Extravasación de sangre y morados por rotura de pequeños vasos capilares debido a la presión ejercida sobre la mama",
      "Lesión o irritación de la piel por fricción o compresión directa, especialmente en pacientes con piel frágil, atrófica o con intertrigo submamario",
    ],
    alternatives: [
      "Ecografía mamaria (Ultrasonido)",
      "Limitación: No detecta microcalcificaciones con la misma sensibilidad que la mamografía; no es un método sustitutivo de tamizaje primario en población general",
      "Resonancia Magnética Mamaria (RMM)",
      "Limitación: Alta tasa de falsos positivos, requiere administración de medio de contraste (gadolinio) y no sustituye la evaluación inicial de microcalcificaciones",
      "Tomosíntesis (Mamografía 3D)",
      "Limitación: Utiliza radiación ionizante (variación avanzada del mismo principio físico de la mamografía estándar)",
      "Mamografía por contraste (CEM)",
      "Limitación: Uso de contraste yodado (riesgo de refracción alérgica o nefrotoxicidad) y mayor exposición a radiación que el estudio convencional",
    ]
  },
  ultrasonido: {
    name: "Ultrasonido",
    description: "El ultrasonido (o ecografía) convencional es un método de diagnóstico por imágenes no invasivo que emplea ondas sonoras de alta frecuencia (ultrasonido) para obtener representaciones en tiempo real de los órganos, tejidos blandos y estructuras vasculares del cuerpo. Durante el examen, se aplica un gel conductor transparente sobre la piel de la zona a evaluar para eliminar las bolsas de aire y facilitar la transmisión del sonido. El profesional desliza un transductor sobre la superficie corporal, emitiendo ecoimágenes que son procesadas por un computador. El examen se realiza habitualmente con el paciente en decúbito (acostado) sobre una camilla de exploración. .",
    purpose: "Evaluación morfológica, estructural y hemodinámica (mediante Doppler) de órganos sólidos, vasos sanguíneos, cavidades con contenido líquido, tejidos blandos y desarrollo fetal, sin recurrir a radiación ionizante.",
    procedures: [
      { name: "Ultrasonido", description: "El ultrasonido (o ecografía) convencional es un método de diagnóstico por imágenes no invasivo que emplea ondas sonoras de alta frecuencia (ultrasonido) para obtener representaciones en tiempo real de los órganos, tejidos blandos y estructuras vasculares del cuerpo." }
    ],
    benefits: [
      "Ausencia total de radiación ionizante, lo que permite su uso seguro y repetido en gestantes, población pediátrica y controles evolutivos",
      "Evaluación dinámica y en tiempo real",
      "Capacidad de valorar movimiento de estructuras, flujo sanguíneo y respuesta a la compresión durante la misma maniobra",
      "Procedimiento indoloro, rápido y de alta accesibilidad",
    ],
    risks: [
      "Limitación por ventana acústica deficiente",
      "Atenuación o bloqueo del haz de ultrasonido por interposición de gas intestinal, tejido adiposo abundante o estructuras óseas",
      "Probabilidad de sobreestimar o pasar por alto lesiones dependiendo de la resolución del equipo, las características anatómicas del paciente o la dependencia de la pericia del operador",
      "Reacción de hipersensibilidad al gel (manifestación cutánea leve o a los componentes del gel",
      "",
      "Incremento temporal del dolor preexistente al presionar el transductor directamente sobre zonas inflamadas, traumatizadas o con procesos agudos (p. ej., apendicitis, colecistitis)",
      "Reacción neurogénica: Mareo o hipotensión transitoria desencadenada por dolor agudo en zonas inflamadas o por compresión prolongada de la vena cava en pacientes gestantes en decúbito supino",
      "Escoriación o eritema secundario al roce del transductor en pacientes con fragilidad capilar extrema, dermatitis activa o piel atrófica",
    ],
    alternatives: [
      "Tomografía Axial Computarizada (TAC)",
      "Se indica cuando se requiere evaluar estructuras óseas, retroperitoneo o cuando el gas intestinal invalida el ultrasonido",
      "Utiliza radiación ionizante",
      "Resonancia Magnética (RM): Alternativa para una caracterización tisular de mayor definición en tejidos blandos y articulaciones, sin uso de radiación ionizante pero de menor disponibilidad inmediata",
      "Radiografía convencional",
    ]
  },
  eco_tv: {
    name: "Ultrasonido Transvaginal",
    description: "La ecografía o ultrasonido transvaginal es un estudio de diagnóstico por imágenes de alta resolución que utiliza ondas sonoras de alta frecuencia (ultrasonido) para la evaluación morfológica y hemodinámica de los órganos pélvicos femeninos (útero, ovarios, trompas de Falopio y miometrio). Se introduce a través del canal vaginal un transductor endocavitario estéril, protegido con una cubierta de látex (o material hipoalergénico) y lubricado con gel hidrosoluble. La proximidad del transductor a las estructuras pélvicas permite obtener imágenes de mayor definición que las obtenidas por vía pélvica abdominal. El procedimiento se realiza en posición de litotomía (ginecológica) y requiere vejiga evacuada.",
    purpose: "Evaluación diagnóstica de sangrado uterino anormal, masas pélvicas, dolor pélvico agudo o crónico, seguimiento folicular en reproducción asistida, caracterización de patología anexial o miomatosa, y valoración obstétrica temprana (primer trimestre). .",
    procedures: [
      { name: "Ultrasonido Transvaginal", description: "La ecografía o ultrasonido transvaginal es un estudio de diagnóstico por imágenes de alta resolución que utiliza ondas sonoras de alta frecuencia (ultrasonido) para la evaluación morfológica y hemodinámica de los órganos pélvicos femeninos (útero, ovarios, trompas de Falopio y miometrio)." }
    ],
    benefits: [
      "Definición anatómica superior de la mucosa endometrial, reserva folicular y vascularización pélvica mediante Doppler",
      "Examen completamente inocuo para la paciente y, en caso de embarazo temprano, para el embrión",
      "Diagnóstico inmediato sin requerir preparación con vejiga llena",
    ],
    risks: [
      "Limitación técnica por presencia de gas o masa exofítica",
      "Reacción de hipersensibilidad al látex o gel",
      "Alergia local (eritema, prurito, ardor) al material de la cubierta del transductor o a los componentes del gel lubricante",
      "Riesgo de sobrediagnóstico o falta de detección de patología infiltrativa compleja (como endometriosis profunda), requiriendo estudios complementarios como la Resonancia Magnética",
      "",
      "Respuesta neurogénica transitoria (mareo, diaforesis, hipotensión) secundaria al dolor o la ansiedad durante el posicionamiento del transductor",
      "Excoriación superficial o sangrado escaso en pacientes con atrofia vaginal severa, estenosis vaginal o estadios post-radioterapia pélvica",
      "Incremento temporal del dolor en procesos inflamatorios/infecciosos pélvicos agudos",
    ],
    alternatives: [
      "Ecografía pélvica transabdominal",
      "Evaluación con transductor convexo a través de la pared abdominal",
      "Requiere vejiga distendida y ofrece menor resolución de detalles profundos",
      "Resonancia Magnética Pélvica: Indicada en casos de caracterización compleja de masas anexiales, mapeo de endometriosis profunda o contraindicación absoluta para el abordaje transvaginal",
    ]
  },
  tac: {
    name: "TAC con o sin Contraste",
    description: "La Tomografía Axial Computarizada (TAC) es un método de diagnóstico por imágenes que utiliza radiación ionizante (rayos X) y procesamiento informático avanzado para obtener cortes transversales detallados de la anatomía interna. Durante la exploración, el paciente debe permanecer en decúbito sobre la mesa del tomógrafo, la cual se desplazará gradualmente a través del gantry (gantry del escáner). Es imprescindible mantener la inmovilidad estricta y seguir las instrucciones verbales de apnea (suspensión momentánea de la respiración) para evitar artefactos por movimiento. La duración del procedimiento oscila entre 10 y 30 minutos. Administración de medios de contraste: Según la indicación clínica, puede requerirse la administración intravenosa de un medio de contraste iodado para la opacificación y delimitación de estructuras vasculares y parenquimatosas. En estudios abdominopélvicos, puede indicarse adicionalmente la administración oral de contraste hidrosoluble o sulfato de bario diluido para la opacificación y distensión del tracto digestivo",
    purpose: "Visualización multiplanar de alta resolución para la evaluación, caracterización y seguimiento de hallazgos patológicos estructurales, vasculares o traumáticos.",
    procedures: [
      { name: "Tomografia Axial Computarizada Con O Sin Contraste (Tac)", description: "La Tomografía Axial Computarizada (TAC) es un método de diagnóstico por imágenes que utiliza radiación ionizante (rayos X) y procesamiento informático avanzado para obtener cortes transversales detallados de la anatomía interna." }
    ],
    benefits: [
      "1.Obtención de imágenes anatómicas tridimensionales de alta precisión en corto tiempo. 2.Capacidad de diferenciar densidades tisulares finas (hueso, partes blandas, fluidos, vascularización). 3.Guía fundamental para la toma de decisiones quirúrgicas o terapéuticas oportunas",
    ],
    risks: [
      "Nefrotoxicidad inducida por contraste, si aplica: Deterioro de la función renal secundario a la excreción del medio de contraste iodado, especialmente en pacientes con insuficiencia renal previa, diabetes o deshidratación",
      "Reacciones adversas al medio de contraste",
      "Reacciones de tipo idiosincrásico o alérgico que varían desde leves (eritema, urticaria, náuseas) hasta graves (broncoespasmo, edema laríngeo, choque anafiláctico)",
      "Exposición a radiación ionizante acumulativa: Exposición a dosis de radiación superior a la de la radiografía convencional Son Complicaciones:",
      "Extravasación de medio de contraste: Fuga del líquido al tejido subcutáneo adyacente al sitio de punción venosa, pudiendo ocasionar edema, dolor localizado, necrosis tisular o síndrome compartimental en casos severos",
      "Incapacidad de completar el estudio por claustrofobia o agitación",
      "Aspiración bronquial o emesis",
      "Emesis (vómito) inducida por la infusión rápida del contraste iodado o la ingesta del contraste oral, con riesgo de broncoaspiración en pacientes debilitados o sin el ayuno requerido",
    ],
    alternatives: [
      "Resonancia Magnética (RM): Excelente resolución de tejidos blandos sin uso de radiación ionizante",
      "Ecografía / Ultrasonido, método no invasivo e inocuo (sin radiación), limitado en evaluación ósea o por interposición de gas intestinal",
    ]
  },
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
    alternatives: info.alternatives,
    implications: info.implications,
    unavoidableEffects: info.unavoidableEffects,
    refusalConsequences: info.refusalConsequences
  };
};
