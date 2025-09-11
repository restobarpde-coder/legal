import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todos los usuarios y sus perfiles
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        role,
        created_at,
        users!inner(email)
      `)
      .order('created_at');

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Error fetching users' }, { status: 500 });
    }

    // Formatear para fácil copia al código
    const userMapping = profiles?.reduce((acc: any, profile: any) => {
      const email = profile.users?.email;
      if (email) {
        acc[email] = profile.id;
      }
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      users: profiles,
      mapping_for_code: userMapping,
      instructions: [
        "1. Copia el 'mapping_for_code' objeto",
        "2. Reemplaza el emailToUserMapping en webhook/route.ts",
        "3. Actualiza los emails con los reales de tu estudio"
      ]
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
