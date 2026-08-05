UPDATE public.consents
SET
  professional_signature_data = COALESCE(
    NULLIF(professional_signature_data, ''),
    NULLIF(payload #>> '{professionalData,signatureData}', '')
  ),
  patient_signature_data = COALESCE(
    NULLIF(patient_signature_data, ''),
    NULLIF(payload ->> 'patientSignature', '')
  ),
  patient_photo_url = COALESCE(
    NULLIF(patient_photo_url, ''),
    NULLIF(payload ->> 'patientPhotoUrl', '')
  ),
  payload = CASE
    WHEN jsonb_typeof(payload -> 'professionalData') = 'object' THEN
      (payload - 'patientSignature' - 'patientPhotoUrl')
      || jsonb_build_object(
        'professionalData',
        (payload -> 'professionalData') - 'signatureData'
      )
    ELSE payload - 'patientSignature' - 'patientPhotoUrl'
  END
WHERE
  payload ? 'patientSignature'
  OR payload ? 'patientPhotoUrl'
  OR (
    jsonb_typeof(payload -> 'professionalData') = 'object'
    AND (payload -> 'professionalData') ? 'signatureData'
  );