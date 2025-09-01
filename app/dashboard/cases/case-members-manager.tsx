'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAddCaseMember, useRemoveCaseMember } from '@/hooks/use-cases'
import { User, Case } from '@/lib/types' // Assuming you have a types file
import { Loader2, Plus, Trash2, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'

type CaseMembersManagerProps = {
    caseData: Case & { case_members: { users: User }[] };
    assignableUsers: User[];
    canManage: boolean;
};

export function CaseMembersManager({ caseData, assignableUsers, canManage }: CaseMembersManagerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState('')
    
    const addMemberMutation = useAddCaseMember()
    const removeMemberMutation = useRemoveCaseMember()

    const handleAddMember = () => {
        if (!selectedUser) {
            toast.error('Por favor, selecciona un usuario.')
            return
        }

        addMemberMutation.mutate(
            { caseId: caseData.id, userId: selectedUser, role: 'assistant' },
            {
                onSuccess: () => {
                    toast.success('Miembro agregado correctamente.')
                    setSelectedUser('')
                    setIsOpen(false)
                },
                onError: (error) => {
                    toast.error(error.message || 'Error al agregar miembro')
                },
            }
        )
    }

    const handleRemoveMember = (userId: string) => {
        removeMemberMutation.mutate(
            { caseId: caseData.id, userId },
            {
                onSuccess: () => {
                    toast.success('Miembro removido correctamente.')
                },
                onError: (error) => {
                    toast.error(error.message || 'Error al remover miembro')
                },
            }
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button disabled={!canManage}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Gestionar Equipo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Gestionar Equipo del Caso: {caseData.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">Miembros Actuales</h4>
                        <ul className="space-y-2">
                            {caseData.case_members.map(member => (
                                <li key={member.users.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                    <div>
                                        <p className="font-medium">{member.users.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{member.users.email}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveMember(member.users.id)}
                                        disabled={removeMemberMutation.isPending || member.users.id === caseData.created_by}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Agregar Nuevo Miembro</h4>
                        <div className="flex gap-2">
                            <select
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                className="flex-grow p-2 border rounded-md bg-transparent"
                                disabled={addMemberMutation.isPending}
                            >
                                <option value="">Selecciona un usuario...</option>
                                {assignableUsers.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.full_name} ({user.email}) - {user.role}
                                    </option>
                                ))}
                            </select>
                            <Button onClick={handleAddMember} disabled={addMemberMutation.isPending || !selectedUser}>
                                {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
