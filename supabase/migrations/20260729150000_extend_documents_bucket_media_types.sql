-- Amplía el bucket 'documents' para aceptar audio y video.
--
-- Hasta ahora 'documents' (definido en sql/04-storage-and-validation-FIXED.sql)
-- solo permitía PDF/Word/Excel/texto/imagen/zip hasta 50MB. La función
-- "Guardar como documento del caso" de la bandeja de mensajes copia adjuntos
-- de WhatsApp (que incluyen notas de voz y video) al bucket 'documents', y
-- fallaba en storage por `allowed_mime_types` para esos dos tipos.
UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100MB: cubre el máximo de documento que acepta WhatsApp Cloud API
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed',
    'audio/aac',
    'audio/mp4',
    'audio/mpeg',
    'audio/amr',
    'audio/ogg',
    'audio/opus',
    'audio/webm',
    'video/mp4',
    'video/3gpp',
    'video/quicktime'
  ]
WHERE id = 'documents';
