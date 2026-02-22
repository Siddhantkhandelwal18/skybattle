"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Search,
    MoreHorizontal,
    ShieldAlert,
    Edit,
    UserX,
    History,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const players = [
    {
        id: "1",
        name: "KillerPro",
        email: "killer@test.com",
        elo: 2450,
        level: 42,
        status: "Active",
        joined: "2024-01-15",
    },
    {
        id: "2",
        name: "NoobMaster69",
        email: "noob@test.com",
        elo: 1120,
        level: 12,
        status: "Warned",
        joined: "2024-02-10",
    },
    {
        id: "3",
        name: "LegendaryGamer",
        email: "legend@test.com",
        elo: 3100,
        level: 65,
        status: "Permanently Banned",
        joined: "2023-11-20",
    },
    {
        id: "4",
        name: "SkyWalker",
        email: "sky@test.com",
        elo: 1800,
        level: 25,
        status: "Active",
        joined: "2024-03-01",
    },
]

export default function PlayersPage() {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredPlayers = players.filter(
        (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Player Management</h1>
                <p className="text-muted-foreground">
                    Manage, search, and moderate players across all game modes.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Global Players</CardTitle>
                            <CardDescription>
                                A list of all registered users in SKYBATTLE.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    className="pl-8 w-[300px]"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline">
                                Filters
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead>ELO / Stats</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPlayers.map((player) => (
                                <TableRow key={player.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{player.name}</span>
                                                <span className="text-xs text-muted-foreground">{player.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-primary">ELO: {player.elo}</span>
                                            <span className="text-xs text-muted-foreground">Level {player.level}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                player.status === "Active" ? "default" :
                                                    player.status === "Warned" ? "secondary" : "destructive"
                                            }
                                            className={player.status === "Active" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                                        >
                                            {player.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {player.joined}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" title="Match History">
                                                <History className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" title="Warn Player">
                                                <ShieldAlert className="h-4 w-4 text-yellow-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" title="Ban Player">
                                                <UserX className="h-4 w-4 text-destructive" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
