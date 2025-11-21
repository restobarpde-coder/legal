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
        // This debounced callback should ONLY handle the uncontrolled case of updating URL params.
        // The controlled case is handled by the direct onChange call on the Input.
        if (!onChange) { // Only execute this block if the component is NOT controlled
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
                    // If the component is controlled, update the parent state directly.
                    // The parent is responsible for deciding when to trigger a search.
                    if (onChange) {
                        onChange(e.target.value)
                    } else {
                        // If uncontrolled, let handleSearch manage the URL parameter.
                        handleSearch(e.target.value)
                    }
                }}
                value={value ?? searchParams.get("q")?.toString() ?? ""}
                className="pl-9 w-full"
            />
        </div>
    )
}
