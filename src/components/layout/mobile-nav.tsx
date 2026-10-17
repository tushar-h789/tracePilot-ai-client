"use client"

import { MenuIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { BRAND } from "./nav-items"
import { SidebarNav } from "./sidebar-nav"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" />
        }
      >
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-4">
        <SheetHeader className="p-0">
          <SheetTitle>{BRAND.name}</SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
