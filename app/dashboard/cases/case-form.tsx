'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { caseSchema, type CaseFormState } from './validation'
import { useActionState } from 'react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

type Client = {
  id: string
  name: string
  company: string | null
}

type CaseFormProps = {
  case?: z.infer<typeof caseSchema> & { id: string }
  clients: Client[]
  formAction: (prevState: CaseFormState, formData: FormData) => Promise<CaseFormState>
}

export function CaseForm({ case: caseData, clients, formAction }: CaseFormProps) {
  const [state, dispatch] = useActionState(formAction, { message: '', errors: {} })

  const {
    register,
    setValue,
    watch,
    formState: { isSubmitting, errors: formErrors },
  } = useForm<z.infer<typeof caseSchema>>({
    resolver: zodResolver(caseSchema),
    defaultValues: caseData || {
      status: 'active',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0]
    },
  })

  const watchedClientId = watch('client_id')
  const watchedStatus = watch('status')
  const watchedPriority = watch('priority')

  useEffect(() => {
    if (state.message) {
      if (state.errors) {
        toast.warning('Error de validación', {
          description: state.message,
        })
      } else {
        toast.error('Error del servidor', {
          description: state.message,
        })
      }
    }
  }, [state])

  const serverErrors = state.errors

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>{caseData ? 'Editar Caso' : 'Crear Nuevo Caso'}</CardTitle>
          <CardDescription>
            {caseData ? 'Actualiza los detalles del caso.' : 'Rellena los datos para registrar un nuevo caso.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Título y Cliente */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Título del Caso*</Label>
              <Input id="title" {...register('title')} />
              {(formErrors.title || serverErrors?.title) && (
                <p className="text-sm text-red-500">
                  {formErrors.title?.message || serverErrors?.title?.[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente*</Label>
              <Select
                value={watchedClientId}
                onValueChange={(value) => setValue('client_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('client_id')} />
              {(formErrors.client_id || serverErrors?.client_id) && (
                <p className="text-sm text-red-500">
                  {formErrors.client_id?.message || serverErrors?.client_id?.[0]}
                </p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea 
              id="description" 
              {...register('description')} 
              placeholder="Describe los detalles del caso..."
              rows={3}
            />
            {(formErrors.description || serverErrors?.description) && (
              <p className="text-sm text-red-500">
                {formErrors.description?.message || serverErrors?.description?.[0]}
              </p>
            )}
          </div>

          {/* Estado y Prioridad */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={watchedStatus}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('status')} />
              {(formErrors.status || serverErrors?.status) && (
                <p className="text-sm text-red-500">
                  {formErrors.status?.message || serverErrors?.status?.[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={watchedPriority}
                onValueChange={(value) => setValue('priority', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('priority')} />
              {(formErrors.priority || serverErrors?.priority) && (
                <p className="text-sm text-red-500">
                  {formErrors.priority?.message || serverErrors?.priority?.[0]}
                </p>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio*</Label>
              <Input 
                id="start_date" 
                type="date" 
                {...register('start_date')} 
              />
              {(formErrors.start_date || serverErrors?.start_date) && (
                <p className="text-sm text-red-500">
                  {formErrors.start_date?.message || serverErrors?.start_date?.[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Finalización</Label>
              <Input 
                id="end_date" 
                type="date" 
                {...register('end_date')} 
              />
              {(formErrors.end_date || serverErrors?.end_date) && (
                <p className="text-sm text-red-500">
                  {formErrors.end_date?.message || serverErrors?.end_date?.[0]}
                </p>
              )}
            </div>
          </div>

          {/* Horas estimadas y Tarifa */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Horas Estimadas</Label>
              <Input 
                id="estimated_hours" 
                type="number" 
                min="1"
                placeholder="0"
                {...register('estimated_hours')} 
              />
              {(formErrors.estimated_hours || serverErrors?.estimated_hours) && (
                <p className="text-sm text-red-500">
                  {formErrors.estimated_hours?.message || serverErrors?.estimated_hours?.[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Tarifa por Hora (USD)</Label>
              <Input 
                id="hourly_rate" 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('hourly_rate')} 
              />
              {(formErrors.hourly_rate || serverErrors?.hourly_rate) && (
                <p className="text-sm text-red-500">
                  {formErrors.hourly_rate?.message || serverErrors?.hourly_rate?.[0]}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" asChild>
            <Link href="/dashboard/cases">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {caseData ? 'Guardar Cambios' : 'Crear Caso'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
