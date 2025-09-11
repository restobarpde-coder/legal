import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('🔍 DEBUG WEBHOOK RECIBIDO:');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    console.log('📝 Body:', body);
    
    try {
      const payload = JSON.parse(body);
      console.log('✅ Payload parseado:', JSON.stringify(payload, null, 2));
    } catch (parseError) {
      console.log('❌ Error parseando JSON:', parseError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Debug webhook received',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error en debug webhook:', error);
    return NextResponse.json(
      { error: 'Error en debug webhook' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Debug webhook endpoint funcionando',
    timestamp: new Date().toISOString() 
  });
}
