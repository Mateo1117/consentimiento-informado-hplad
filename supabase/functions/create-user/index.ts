import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { documentToLoginEmail, isValidDocument, normalizeDocument } from '../_shared/documentLogin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser } } = await supabaseAdmin.auth.getUser(token)
    
    if (!callerUser) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden crear usuarios' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { password, full_name, document_type, phone, department, job_title, role, signature_data } = body

    // El usuario inicia sesión con su número de documento: ya no se pide correo.
    // Auth exige un email, así que se deriva uno interno del documento
    // (ver _shared/documentLogin.ts).
    const document_number = normalizeDocument(body.document_number)

    if (!document_number || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Número de documento, contraseña y nombre son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!isValidDocument(document_number)) {
      return new Response(JSON.stringify({ error: 'El número de documento debe tener entre 4 y 20 letras o números' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Una persona, un usuario. Los perfiles antiguos guardan el documento con
    // puntos o espacios, así que se compara normalizado.
    const { data: perfiles } = await supabaseAdmin
      .from('profiles')
      .select('full_name, document_number')
      .not('document_number', 'is', null)
    const repetido = (perfiles || []).find((p) => normalizeDocument(p.document_number) === document_number)
    if (repetido) {
      return new Response(JSON.stringify({ error: `Ya existe un usuario con el documento ${document_number} (${repetido.full_name || 'sin nombre'})` }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user with admin API (bypasses rate limits and email confirmation)
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: documentToLoginEmail(document_number),
      password,
      email_confirm: true,
      user_metadata: { full_name, document_number, login: 'documento' }
    })

    if (createError) {
      const yaExiste = /already (been )?registered|already exists/i.test(createError.message)
      return new Response(JSON.stringify({
        error: yaExiste ? `Ya existe un usuario con el documento ${document_number}` : createError.message
      }), {
        status: yaExiste ? 409 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newUserId = newUserData.user.id

    // Create profile
    await supabaseAdmin.from('profiles').upsert({
      user_id: newUserId,
      full_name,
      document_type: document_type || null,
      document_number,
      phone: phone || null,
      department: department || null,
      job_title: job_title || null,
      is_active: true
    })

    // Assign role
    if (role) {
      await supabaseAdmin.from('user_roles').insert({
        user_id: newUserId,
        role,
        created_by: callerUser.id
      })
    }

    // Save signature if provided
    if (signature_data) {
      await supabaseAdmin.from('professional_signatures').insert({
        professional_name: full_name,
        professional_document: document_number,
        signature_data,
        created_by: newUserId
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUserId,
      message: 'Usuario creado exitosamente'
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
