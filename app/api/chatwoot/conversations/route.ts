import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Por ahora, asumir que todos son admins (simplificar)
    const isAdmin = true;
    
    // Obtener conversaciones filtradas por usuario
    let query = supabase
      .from('chatwoot_conversations')
      .select(`
        *,
        chatwoot_messages(count)
      `);
    
    // Si no es admin, filtrar por conversaciones asignadas o WhatsApp (compartido)
    if (!isAdmin) {
      query = query.or(`
        auto_assigned_user_id.eq.${user.id},
        and(auto_assigned_user_id.is.null,inbox_channel_type.ilike.%WhatsApp%)
      `);
    }
    
    const { data: conversations, error } = await query
      .order('chatwoot_updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Error fetching conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || [],
      user_id: user.id,
      is_admin: isAdmin
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
