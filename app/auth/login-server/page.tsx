import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Scale } from "lucide-react"
import { login } from "../actions"

export default function LoginServerPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">LegalStudio</h1>
          </div>
          <p className="text-muted-foreground text-center">Server Action Login</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign In (Server)</CardTitle>
            <CardDescription>Login using server actions for better reliability</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={async (formData) => {
              'use server'
              const email = formData.get('email') as string
              const password = formData.get('password') as string
              await login(email, password)
            }}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="lawyer@lawfirm.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                <Link href="/auth/login" className="underline underline-offset-4 text-primary hover:text-primary/80">
                  Back to client login
                </Link>
                {" | "}
                <Link href="/auth/login-simple" className="underline underline-offset-4 text-primary hover:text-primary/80">
                  Simple login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
