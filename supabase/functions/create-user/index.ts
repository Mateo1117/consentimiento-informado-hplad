import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { email, password, full_name, document_type, document_number, phone, department, job_title, role, signature_data } = body

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Email, contraseña y nombre son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create user with admin API (bypasses rate limits and email confirmation)
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newUserId = newUserData.user.id

    // Create profile
    await supabaseAdmin.from('profiles').upsert({
      user_id: newUserId,
      full_name,
      document_type: document_type || null,
      document_number: document_number || null,
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
        professional_document: document_number || '',
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
