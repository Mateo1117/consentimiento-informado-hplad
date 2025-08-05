import { createClient } from '@supabase/supabase-js'

// Usar las credenciales directas de Supabase (las variables VITE_* no están soportadas en Lovable)
const supabaseUrl = 'https://drspravsvyxfhazpeygo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyc3ByYXZzdnl4ZmhhenBleWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3NTU4MjksImV4cCI6MjA2OTMzMTgyOX0.YhBkyIcpykfzhq44yL3wlyxpHauSogwvmWxclcNCDz8'

console.log('Supabase config:', { 
  hasUrl: !!supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined'
})

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => true

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

export class ConsentService {
  async saveConsent(consentData: ConsentForm): Promise<ConsentForm | null> {
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .insert([consentData])
        .select()
        .single()

      if (error) {
        console.error('Error saving consent:', error)
        throw new Error('Error al guardar el consentimiento')
      }

      return data
    } catch (error) {
      console.error('Error in saveConsent:', error)
      throw error
    }
  }

  async updateConsentPDFUrl(consentId: number, pdfUrl: string, pdfSize: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('consent_forms')
        .update({ 
          pdf_url: pdfUrl,
          pdf_size_kb: pdfSize 
        })
        .eq('id', consentId)

      if (error) {
        console.error('Error updating PDF URL:', error)
        throw new Error('Error al actualizar la URL del PDF')
      }

      console.log(`✅ PDF URL updated for consent ${consentId}`)
    } catch (error) {
      console.error('Error in updateConsentPDFUrl:', error)
      throw error
    }
  }

  async getAllConsents(): Promise<ConsentForm[]> {
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching consents:', error)
        throw new Error('Error al obtener los consentimientos')
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllConsents:', error)
      throw error
    }
  }

  async searchConsentsByDocumentType(documentType: string): Promise<ConsentForm[]> {
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('document_type', documentType)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching consents:', error)
        throw new Error('Error al buscar los consentimientos')
      }

      return data || []
    } catch (error) {
      console.error('Error in searchConsentsByDocumentType:', error)
      throw error
    }
  }

  async searchConsents(filters: {
    documentType?: string
    documentNumber?: string
    patientName?: string
    startDate?: string
    endDate?: string
  }): Promise<ConsentForm[]> {
    try {
      let query = supabase.from('consent_forms').select('*')

      if (filters.documentType) {
        query = query.eq('document_type', filters.documentType)
      }

      if (filters.documentNumber) {
        query = query.eq('document_number', filters.documentNumber)
      }

      if (filters.patientName) {
        query = query.or(`patient_name.ilike.%${filters.patientName}%,patient_surname.ilike.%${filters.patientName}%`)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching consents:', error)
        throw new Error('Error al buscar los consentimientos')
      }

      return data || []
    } catch (error) {
      console.error('Error in searchConsents:', error)
      throw error
    }
  }

  async getConsentById(id: number): Promise<ConsentForm | null> {
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching consent:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getConsentById:', error)
      return null
    }
  }
}

export const consentService = new ConsentService()