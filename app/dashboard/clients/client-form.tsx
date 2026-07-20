'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clientSchema, type ClientFormState } from './validation'
import { useActionState } from 'react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

type ClientFormProps = {
    client?: z.infer<typeof clientSchema> & { id: string }
    formAction: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>
    inline?: boolean
    onSuccess?: (client: any) => void
    onCancel?: () => void
}

export function ClientForm({ client, formAction, inline = false, onSuccess, onCancel }: ClientFormProps) {
    const [state, dispatch] = useActionState(formAction, { message: '', errors: {} })

    const {
        register,
        formState: { isSubmitting, errors: formErrors },
    } = useForm<z.infer<typeof clientSchema>>({
        resolver: zodResolver(clientSchema),
        defaultValues: client || {
            name: '',
            email: '',
            phone: '',
            company: '',
            address: '',
            rut: '',
            ci: '',
            departamento: '',
            pais: '',
            conyuge: '',
            notes: '',
        },
    })

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

    const formContent = (
        <>
            <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input id="name" {...register('name')} />
                        {(formErrors.name || serverErrors?.name) && <p className="text-sm text-red-500">{String(formErrors.name?.message || '') || serverErrors?.name?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="company">Empresa</Label>
                        <Input id="company" {...register('company')} />
                        {(formErrors.company || serverErrors?.company) && <p className="text-sm text-red-500">{String(formErrors.company?.message || '') || serverErrors?.company?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" {...register('email')} />
                        {(formErrors.email || serverErrors?.email) && <p className="text-sm text-red-500">{String(formErrors.email?.message || '') || serverErrors?.email?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" {...register('phone')} />
                        {(formErrors.phone || serverErrors?.phone) && <p className="text-sm text-red-500">{String(formErrors.phone?.message || '') || serverErrors?.phone?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rut">Número RUT</Label>
                        <Input id="rut" {...register('rut')} placeholder="Ej: 12.345.678-9" />
                        {(formErrors.rut || serverErrors?.rut) && <p className="text-sm text-red-500">{String(formErrors.rut?.message || '') || serverErrors?.rut?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ci">Número CI (Opcional)</Label>
                        <Input id="ci" {...register('ci')} placeholder="Cédula de Identidad" />
                        {(formErrors.ci || serverErrors?.ci) && <p className="text-sm text-red-500">{String(formErrors.ci?.message || '') || serverErrors?.ci?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="departamento">Departamento</Label>
                        <Input id="departamento" {...register('departamento')} placeholder="Ej: Montevideo" />
                        {(formErrors.departamento || serverErrors?.departamento) && <p className="text-sm text-red-500">{String(formErrors.departamento?.message || '') || serverErrors?.departamento?.[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pais">País</Label>
                        <Input id="pais" {...register('pais')} placeholder="Ej: Uruguay" />
                        {(formErrors.pais || serverErrors?.pais) && <p className="text-sm text-red-500">{String(formErrors.pais?.message || '') || serverErrors?.pais?.[0]}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" {...register('address')} />
                        {(formErrors.address || serverErrors?.address) && <p className="text-sm text-red-500">{String(formErrors.address?.message || '') || serverErrors?.address?.[0]}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="conyuge">Cónyuge</Label>
                        <Input id="conyuge" {...register('conyuge')} placeholder="Nombre del cónyuge" />
                        {(formErrors.conyuge || serverErrors?.conyuge) && <p className="text-sm text-red-500">{String(formErrors.conyuge?.message || '') || serverErrors?.conyuge?.[0]}</p>}
                    </div>
                    {!inline && (
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="notes">Notas Adicionales</Label>
                            <Textarea id="notes" {...register('notes')} />
                            {(formErrors.notes || serverErrors?.notes) && <p className="text-sm text-red-500">{String(formErrors.notes?.message || '') || serverErrors?.notes?.[0]}</p>}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    {inline && onCancel ? (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                    ) : (
                        <Button variant="ghost" asChild>
                            <Link href="/dashboard/clients">Cancelar</Link>
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {client ? 'Guardar Cambios' : 'Crear Cliente'}
                    </Button>
                </div>
            </>
    )

    if (inline) {
        return <form action={dispatch}>{formContent}</form>
    }

    return (
        <form action={dispatch}>
            <Card>
                <CardHeader>
                    <CardTitle>{client ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</CardTitle>
                    <CardDescription>
                        {client ? 'Actualiza los detalles del cliente.' : 'Rellena los datos para registrar un nuevo cliente.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {formContent}
                </CardContent>
            </Card>
        </form>
    )
}
