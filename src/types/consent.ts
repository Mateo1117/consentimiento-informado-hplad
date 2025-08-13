export interface ConsentForm {
  id?: number
  patient_name: string
  patient_surname: string
  document_type: string
  document_number: string
  birth_date: string
  age: number
  eps: string
  phone: string
  address: string
  healthcare_center: string
  selected_procedures: string[]
  consent_decision: 'aprobar' | 'disentir'
  professional_name: string
  professional_document: string
  guardian_name?: string
  guardian_document?: string
  guardian_relationship?: string
  additional_info?: string
  differential_approach: {
    gender: boolean
    ethnicity: boolean
    vital_cycle: boolean
    not_applicable: boolean
    social_position: boolean
    disability: boolean
    life_condition: boolean
  }
  created_at?: string
  pdf_filename?: string
  pdf_url?: string
  pdf_size_kb?: number
  patient_photo_url?: string
  professional_photo_url?: string
  patient_signature_data?: string
  professional_signature_data?: string
}