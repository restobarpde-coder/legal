'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { caseSchema, type CaseFormState } from './validation'
import { useActionState } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClientInline } from '../clients/actions'
import { ClientForm } from '../clients/client-form'
import type { ClientFormState } from '../clients/validation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Client = {
  id: string
  name: string
  company: string | null
}

type CaseFormProps = {
  case?: z.infer<typeof caseSchema> & { id: string }
  clients: Client[]
  formAction: (prevState: CaseFormState, formData: FormData) => Promise<CaseFormState>
  preselectedClientId?: string
}

export function CaseForm({ case: caseData, clients: initialClients, formAction, preselectedClientId }: CaseFormProps) {
  const [state, dispatch] = useActionState(formAction, { message: '', errors: {} })
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [openClientSelect, setOpenClientSelect] = useState(false)
  const [openNewClientDialog, setOpenNewClientDialog] = useState(false)

  const {
    register,
    setValue,
    watch,
    formState: { isSubmitting, errors: formErrors },
  } = useForm<z.infer<typeof caseSchema>>({
    resolver: zodResolver(caseSchema),
    defaultValues: caseData ? {
      ...caseData,
      start_date: caseData.start_date ? new Date(caseData.start_date).toISOString().split('T')[0] : undefined,
      end_date: caseData.end_date ? new Date(caseData.end_date).toISOString().split('T')[0] : undefined,
    } : {
      client_id: preselectedClientId || '',
      status: 'active',
      priority: 'medium',
      start_date: new Date().toISOString().split('T')[0]
    },
  })

  const watchedClientId = watch('client_id')
  const watchedStatus = watch('status')
  const watchedPriority = watch('priority')
  const watchedNumeroArchivo = watch('numero_archivo')
  const watchedNumeroCarpeta = watch('numero_carpeta')

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

  const handleCreateClientInline = async (prevState: ClientFormState, formData: FormData): Promise<ClientFormState> => {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const company = formData.get('company') as string

    const result = await createClientInline(name, email, company)

    if (result.success && result.client) {
      setClients([...clients, result.client])
      setValue('client_id', result.client.id)
      setOpenNewClientDialog(false)
      toast.success('Cliente creado exitosamente')
      return { message: '' }
    } else {
      return { message: result.message || 'Error al crear el cliente' }
    }
  }

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
                  {String(formErrors.title?.message || '') || serverErrors?.title?.[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente*</Label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openClientSelect}
                        className="w-full justify-between"
                      >
                        {watchedClientId
                          ? clients.find((client) => client.id === watchedClientId)?.name +
                            (clients.find((client) => client.id === watchedClientId)?.company
                              ? ` (${clients.find((client) => client.id === watchedClientId)?.company})`
                              : '')
                          : "Seleccionar cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.company || ''}`}
                                onSelect={() => {
                                  setValue('client_id', client.id)
                                  setOpenClientSelect(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watchedClientId === client.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {client.name} {client.company && `(${client.company})`}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Dialog open={openNewClientDialog} onOpenChange={setOpenNewClientDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                      <DialogDescription>
                        Crea un nuevo cliente para asignarlo a este caso.
                      </DialogDescription>
                    </DialogHeader>
                    <ClientForm
                      formAction={handleCreateClientInline}
                      inline={true}
                      onCancel={() => setOpenNewClientDialog(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <input type="hidden" {...register('client_id')} />
              {(formErrors.client_id || serverErrors?.client_id) && (
                <p className="text-sm text-red-500">
                  {String(formErrors.client_id?.message || '') || serverErrors?.client_id?.[0]}
                </p>
              )}
            </div>
          </div>

          {/* Contraparte */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="counterparty_name">Nombre de la Contraparte</Label>
              <Input 
                id="counterparty_name" 
                {...register('counterparty_name')} 
                placeholder="Ej: Juan Pérez"
              />
              {(formErrors.counterparty_name || serverErrors?.counterparty_name) && (
                <p className="text-sm text-red-500">
                  {String(formErrors.counterparty_name?.message || '') || serverErrors?.counterparty_name?.[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="counterparty_lawyer">Abogado de la Contraparte</Label>
              <Input 
                id="counterparty_lawyer" 
                {...register('counterparty_lawyer')} 
                placeholder="Ej: Estudio Jurídico & Asociados"
              />
              {(formErrors.counterparty_lawyer || serverErrors?.counterparty_lawyer) && (
                <p className="text-sm text-red-500">
                  {String(formErrors.counterparty_lawyer?.message || '') || serverErrors?.counterparty_lawyer?.[0]}
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
                {String(formErrors.description?.message || '') || serverErrors?.description?.[0]}
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
                  {String(formErrors.status?.message || '') || serverErrors?.status?.[0]}
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
                  {String(formErrors.priority?.message || '') || serverErrors?.priority?.[0]}
                </p>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input 
                id="start_date" 
                type="date" 
                {...register('start_date')} 
              />
              {(formErrors.start_date || serverErrors?.start_date) && (
                <p className="text-sm text-red-500">
                  {String(formErrors.start_date?.message || '') || serverErrors?.start_date?.[0]}
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
                  {String(formErrors.end_date?.message || '') || serverErrors?.end_date?.[0]}
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
                  {String(formErrors.estimated_hours?.message || '') || serverErrors?.estimated_hours?.[0]}
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
                  {String(formErrors.hourly_rate?.message || '') || serverErrors?.hourly_rate?.[0]}
                </p>
              )}
            </div>
          </div>

          {/* Número de Carpeta - Siempre visible */}
          <div className="space-y-2">
            <Label htmlFor="numero_carpeta">Número de Carpeta</Label>
            <Input 
              id="numero_carpeta" 
              {...register('numero_carpeta')} 
              placeholder="Ej: EST-A-15"
            />
            {(formErrors.numero_carpeta || serverErrors?.numero_carpeta) && (
              <p className="text-sm text-red-500">
                {String(formErrors.numero_carpeta?.message || '') || serverErrors?.numero_carpeta?.[0]}
              </p>
            )}
          </div>

          {/* Número de Archivo - Solo si el estado es 'archived' */}
          {watchedStatus === 'archived' && (
            <div className="border-t pt-6 mt-2">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                Información de Archivo
              </h3>
              <div className="space-y-2">
                <Label htmlFor="numero_archivo">Número de Archivo</Label>
                <Input 
                  id="numero_archivo" 
                  {...register('numero_archivo')} 
                  placeholder="Ej: ARC-2024-001"
                />
                {(formErrors.numero_archivo || serverErrors?.numero_archivo) && (
                  <p className="text-sm text-red-500">
                    {String(formErrors.numero_archivo?.message || '') || serverErrors?.numero_archivo?.[0]}
                  </p>
                )}
              </div>
            </div>
          )}
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
