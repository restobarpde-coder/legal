import { z } from 'zod'

// Validation functions (separate to avoid Server Action confusion)
const isValidDate = (date: string) => !isNaN(Date.parse(date))
const isValidOptionalDate = (date: string) => !date || !isNaN(Date.parse(date))
const isValidOptionalHours = (hours: string) => !hours || (!isNaN(parseInt(hours)) && parseInt(hours) > 0)
const isValidOptionalRate = (rate: string) => !rate || (!isNaN(parseFloat(rate)) && parseFloat(rate) >= 0)

export const caseSchema = z.object({
  title: z.string().min(2, { message: 'El título debe tener al menos 2 caracteres.' }),
  description: z.string().optional(),
  client_id: z.string().uuid({ message: 'Debe seleccionar un cliente válido.' }),
  status: z.enum(['active', 'pending', 'closed', 'archived']).default('active'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  start_date: z.string().optional().refine((date) => {
    if (!date || date.trim() === '') return true; // Allow empty strings
    return isValidDate(date);
  }, {
    message: 'Fecha de inicio inválida.'
  }),
  end_date: z.string().optional().refine((date) => {
    if (!date || date.trim() === '') return true; // Allow empty strings
    return isValidDate(date);
  }, { 
    message: 'Fecha de finalización inválida.' 
  }),
  estimated_hours: z.string().optional().refine(isValidOptionalHours, { 
    message: 'Las horas estimadas deben ser un número positivo.' 
  }),
  hourly_rate: z.string().optional().refine(isValidOptionalRate, { 
    message: 'La tarifa debe ser un número válido.' 
  }),
})

export type CaseFormState = {
  message: string
  errors?: z.ZodError<z.infer<typeof caseSchema>>['formErrors']['fieldErrors']
}
