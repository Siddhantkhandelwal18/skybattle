"use client"

import * as React from "react"
import {
    LayoutDashboard,
    Users,
    Swords,
    ShoppingBag,
    ShieldCheck,
    Settings,
    LogOut,
    ChevronRight,
    MonitorPlay,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const data = {
    user: {
        name: "Admin",
        email: "admin@skybattle.game",
        avatar: "/avatars/admin.png",
    },
    navMain: [
        {
            title: "Overview",
            url: "/",
            icon: LayoutDashboard,
            isActive: true,
        },
        {
            title: "Player Management",
            url: "/players",
            icon: Users,
        },
        {
            title: "Game Monitoring",
            url: "#",
            icon: MonitorPlay,
            items: [
                {
                    title: "Match History",
                    url: "/matches",
                },
                {
                    title: "Live Servers",
                    url: "/servers",
                },
            ],
        },
        {
            title: "Store & Economy",
            url: "/store",
            icon: ShoppingBag,
        },
        {
            title: "Moderation",
            url: "/moderation",
            icon: ShieldCheck,
        },
    ],
}

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="h-14 flex items-center px-4 border-b">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                        <Swords className="h-5 w-5" />
                    </div>
                    <span className="group-data-[collapsible=icon]:hidden">SKYBATTLE</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="px-2 mt-4">
                    {data.navMain.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            {item.items ? (
                                <Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
                                    <div className="flex flex-col">
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={item.title}>
                                                {item.icon && <item.icon className="h-4 w-4" />}
                                                <span>{item.title}</span>
                                                <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild>
                                                            <a href={subItem.url}>
                                                                <span>{subItem.title}</span>
                                                            </a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>
                            ) : (
                                <SidebarMenuButton asChild tooltip={item.title}>
                                    <a href={item.url}>
                                        {item.icon && <item.icon className="h-4 w-4" />}
                                        <span>{item.title}</span>
                                    </a>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={data.user.avatar} alt={data.user.name} />
                                <AvatarFallback className="rounded-lg">AD</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate font-semibold">{data.user.name}</span>
                                <span className="truncate text-xs">{data.user.email}</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
