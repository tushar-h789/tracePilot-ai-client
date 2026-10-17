import type { Metadata } from "next"

import { RegisterForm } from "@/components/auth/register-form"
import { Brand } from "@/components/layout/brand"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Create account" }

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-3">
        <Brand />
        <CardTitle>
          <h1>Create account</h1>
        </CardTitle>
        <CardDescription>Passwords are hashed with Argon2id; we never store them.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  )
}
