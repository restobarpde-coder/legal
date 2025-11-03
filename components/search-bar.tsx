"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useDebouncedCallback } from "use-debounce"
import { Search } from "lucide-react"

interface SearchBarProps {
    placeholder: string;
    value?: string;
    onChange?: (value: string) => void;
}

export function SearchBar({ placeholder, value, onChange }: SearchBarProps) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()

    // If controlled, use the provided onChange
    const handleSearch = useDebouncedCallback((term: string) => {
        if (onChange) {
            onChange(term)
        } else {
            // Fallback to URL params if not controlled
            const params = new URLSearchParams(searchParams)
            if (term) {
                params.set("q", term)
            } else {
                params.delete("q")
            }
            replace(`${pathname}?${params.toString()}`)
        }
    }, 300)

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                onChange={(e) => {
                    if (onChange) {
                        onChange(e.target.value)
                    }
                    handleSearch(e.target.value)
                }}
                value={value ?? searchParams.get("q")?.toString() ?? ""}
                className="pl-9 w-full"
            />
        </div>
    )
}
