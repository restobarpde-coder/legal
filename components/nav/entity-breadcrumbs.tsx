import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type Crumb = {
  label: string
  /** Sin href el tramo se dibuja como página actual. */
  href?: string
}

/**
 * Migas del flujo cliente → caso → recurso. Todas las vistas de detalle las
 * usan para que siempre se vea de qué cliente cuelga lo que estás mirando.
 */
export function EntityBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.flatMap((item, index) => {
          const isLast = index === items.length - 1
          const elements = [
            <BreadcrumbItem key={`item-${index}`}>
              {item.href && !isLast ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate max-w-[16rem]">{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ]

          if (!isLast) {
            elements.push(
              <BreadcrumbSeparator key={`separator-${index}`} />
            )
          }

          return elements
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
