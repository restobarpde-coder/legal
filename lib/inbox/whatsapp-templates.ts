/** Names and language must match the templates created in Meta exactly. */
export const WHATSAPP_TEMPLATES = [
  {
    id: 'builtin:consulta_pendiente',
    name: 'consulta_pendiente',
    language_code: 'es',
    category: 'UTILITY',
    title: 'Consulta pendiente',
    body: '¡Hola! Te escribimos del Centro de Asesoramiento Paysandú por la consulta que nos enviaste. Disculpá la demora en responder. ¿Querés que continuemos por acá?',
  },
  {
    id: 'builtin:retomar_conversacion',
    name: 'retomar_conversacion',
    language_code: 'es',
    category: 'UTILITY',
    title: 'Retomar conversación',
    body: '¡Hola! Te escribimos del Centro de Asesoramiento Paysandú. Nos quedó pendiente continuar con tu consulta. ¿Seguís necesitando ayuda?',
  },
  {
    id: 'builtin:documentacion_pendiente',
    name: 'documentacion_pendiente',
    language_code: 'es_AR',
    category: 'MARKETING',
    title: 'Documentación pendiente',
    body: '¡Hola! Te escribimos del Centro de Asesoramiento Paysandú por tu consulta. Nos quedó pendiente recibir documentación para poder continuar. Respondé este mensaje y te indicamos qué necesitamos.',
  },
  {
    id: 'builtin:novedades_consulta',
    name: 'novedades_consulta',
    language_code: 'es_AR',
    category: 'MARKETING',
    title: 'Novedades sobre una consulta',
    body: '¡Hola! Te escribimos del Centro de Asesoramiento Paysandú. Tenemos una actualización sobre la consulta que realizaste. Respondé este mensaje para que podamos comentártela.',
  },
] as const
