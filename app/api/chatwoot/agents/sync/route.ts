import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com';
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo administradores pueden sincronizar agentes' },
        { status: 403 }
      );
    }

    // Obtener agentes desde Chatwoot
    const response = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/agents`,
      {
        headers: {
          'api_access_token': CHATWOOT_ACCESS_TOKEN!,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error fetching agents from Chatwoot');
    }

    const agents = await response.json();
    
    // Sincronizar con usuarios de la app
    const syncResults = {
      matched: 0,
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    for (const agent of agents) {
      try {
        // Buscar usuario por email
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', agent.email)
          .single();

        if (existingUser) {
          // Actualizar usuario existente
          const { error: updateError } = await supabase
            .from('users')
            .update({
              chatwoot_agent_id: agent.id,
              chatwoot_agent_email: agent.email,
              chatwoot_agent_name: agent.name,
              chatwoot_sync_enabled: true
            })
            .eq('id', existingUser.id);

          if (updateError) {
            syncResults.errors.push(`Error actualizando ${agent.email}: ${updateError.message}`);
          } else {
            syncResults.updated++;
            syncResults.matched++;
          }
        } else {
          // Usuario no existe en la app, reportar
          syncResults.errors.push(`Agente ${agent.email} no tiene cuenta en la app`);
        }
      } catch (err: any) {
        syncResults.errors.push(`Error procesando ${agent.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada',
      total_agents: agents.length,
      results: syncResults
    });

  } catch (error: any) {
    console.error('Error syncing agents:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET para ver el estado de sincronización
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener usuarios con info de Chatwoot
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, chatwoot_agent_id, chatwoot_agent_email, chatwoot_agent_name, chatwoot_sync_enabled')
      .order('full_name');

    if (error) {
      throw error;
    }

    const syncedUsers = users?.filter(u => u.chatwoot_agent_id) || [];
    const unsyncedUsers = users?.filter(u => !u.chatwoot_agent_id) || [];

    return NextResponse.json({
      success: true,
      total_users: users?.length || 0,
      synced_users: syncedUsers.length,
      unsynced_users: unsyncedUsers.length,
      users: users?.map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        is_synced: !!u.chatwoot_agent_id,
        chatwoot_agent_name: u.chatwoot_agent_name,
        sync_enabled: u.chatwoot_sync_enabled
      }))
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
