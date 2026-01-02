"use client"

import { FieldOwnerSidebar } from "@/components/sidebar/field-owner-dashboard-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

interface FieldOwnerDashboardLayoutProps {
    children: React.ReactNode
}

export function FieldOwnerDashboardLayout({
    children
}: FieldOwnerDashboardLayoutProps) {
    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen w-full">
                <FieldOwnerSidebar />
                <SidebarInset className="flex flex-col">
                    {/* Header with trigger */}
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border bg-background px-4">
                        <SidebarTrigger className="-ml-1" />
                    </header>

                    {/* Main content */}
                    <main id="field-owner-dashboard-main" className="flex flex-1 flex-col overflow-auto bg-gray-50">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    )
}

