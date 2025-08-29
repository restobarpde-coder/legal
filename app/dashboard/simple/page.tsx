import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function SimpleDashboard() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    console.error('Dashboard auth check failed:', error)
    redirect("/auth/login")
  }

  // Get user profile without complex queries
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🎉 Login Successful!</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded bg-green-50">
          <h2 className="font-semibold mb-2">✅ Authentication Working</h2>
          <p>You have successfully logged in to LegalStudio!</p>
        </div>
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">User Information:</h2>
          <ul className="space-y-1">
            <li><strong>Email:</strong> {data.user.email}</li>
            <li><strong>ID:</strong> {data.user.id}</li>
            <li><strong>Email confirmed:</strong> {data.user.email_confirmed_at ? 'Yes' : 'No'}</li>
          </ul>
        </div>
        
        {profile && (
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Profile Information:</h2>
            <ul className="space-y-1">
              <li><strong>Name:</strong> {profile.first_name} {profile.last_name}</li>
              <li><strong>Role:</strong> {profile.role}</li>
              <li><strong>Phone:</strong> {profile.phone || 'Not set'}</li>
            </ul>
          </div>
        )}
        
        {profileError && (
          <div className="p-4 border rounded bg-red-50">
            <h2 className="font-semibold mb-2">❌ Profile Error:</h2>
            <p>{profileError.message}</p>
          </div>
        )}
        
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Next Steps:</h2>
          <div className="space-x-4">
            <a href="/dashboard" className="text-blue-500 underline">Go to Full Dashboard</a>
            <a href="/auth/login" className="text-blue-500 underline">Back to Login</a>
            <a href="/auth/test" className="text-blue-500 underline">Auth Test Page</a>
          </div>
        </div>
      </div>
    </div>
  )
}
