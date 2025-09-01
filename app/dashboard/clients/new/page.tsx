import { ClientForm } from "../client-form"
import { createClient } from "../actions"

export default function NewClientPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <ClientForm formAction={createClient} />
    </div>
  )
}
