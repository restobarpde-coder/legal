import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scale, Users, FileText, Calendar, Clock, Shield, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">LegalStudio</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild variant="outline">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-balance mb-6">Professional Legal Practice Management</h2>
            <p className="text-xl text-muted-foreground text-pretty mb-8">
              Streamline your law firm operations with comprehensive client management, matter tracking, time billing,
              and calendar integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">Start Free Trial</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold mb-4">Everything You Need</h3>
              <p className="text-muted-foreground text-lg">
                Comprehensive tools designed specifically for legal professionals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Client Management</CardTitle>
                  <CardDescription>Organize client information, contacts, and communication history</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Matter Tracking</CardTitle>
                  <CardDescription>Track cases, deadlines, and matter progress with detailed workflows</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Calendar className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Calendar & Scheduling</CardTitle>
                  <CardDescription>Manage appointments, court dates, and important deadlines</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Clock className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Time Tracking</CardTitle>
                  <CardDescription>Log billable hours and generate accurate time reports</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Billing & Invoicing</CardTitle>
                  <CardDescription>Create professional invoices and track payment status</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Secure & Compliant</CardTitle>
                  <CardDescription>Bank-level security with legal industry compliance standards</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of legal professionals who trust LegalStudio to manage their practice efficiently.
            </p>
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Create Your Account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              <span className="font-semibold">LegalStudio</span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            © 2024 LegalStudio. Professional legal practice management.
          </p>
        </div>
      </footer>
    </div>
  )
}
