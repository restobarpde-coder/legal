'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'
import Link from 'next/link'

async function fetchSearchResults(query: string | null) {
  if (!query) return null
  const response = await fetch(`/api/search?q=${query}`)
  if (!response.ok) {
    throw new Error('Failed to fetch search results')
  }
  return response.json()
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', query],
    queryFn: () => fetchSearchResults(query),
    enabled: !!query,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Resultados de la búsqueda de "{query}"</h1>

      {isLoading && <p>Cargando...</p>}
      {error && <p className="text-red-500">Error al cargar los resultados</p>}

      {data && (
        <div className="space-y-8">
          {/* Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Casos ({data.cases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.cases.length > 0 ? (
                <ul className="space-y-2">
                  {data.cases.map((item: any) => (
                    <li key={item.id}>
                      <Link href={`/dashboard/cases/${item.id}`} className="font-medium hover:underline">
                        {item.title}
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No se encontraron casos.</p>
              )}
            </CardContent>
          </Card>

          {/* Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes ({data.clients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.clients.length > 0 ? (
                <ul className="space-y-2">
                  {data.clients.map((item: any) => (
                    <li key={item.id}>
                      <Link href={`/dashboard/clients/${item.id}`} className="font-medium hover:underline">
                        {item.name} {item.company && `(${item.company})`}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.email}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No se encontraron clientes.</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documentos ({data.documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.documents.length > 0 ? (
                <ul className="space-y-2">
                  {data.documents.map((item: any) => (
                    <li key={item.id}>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No se encontraron documentos.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
