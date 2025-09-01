export type User = {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'lawyer' | 'assistant';
    avatar_url?: string;
};

export type Client = {
    id: string;
    name: string;
    email?: string;
    company?: string;
};

export type CaseMember = {
    user_id: string;
    role: string;
    users: User;
};

export type Case = {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    start_date: string;
    end_date?: string;
    hourly_rate?: number;
    created_at: string;
    created_by: string;
    client_id: string;
    clients: Client | null;
    case_members: CaseMember[];
};
