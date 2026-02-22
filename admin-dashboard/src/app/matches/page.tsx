"use client"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    FileText,
    Map as MapIcon,
    Clock,
    Swords,
    Trophy,
} from "lucide-react"

const matches = [
    {
        id: "M-12948",
        mode: "Deathmatch (FFA)",
        map: "Outpost",
        duration: "4m 12s",
        players: 8,
        winner: "KillerPro",
        time: "12:45 PM",
    },
    {
        id: "M-12947",
        mode: "Team Deathmatch",
        map: "Catacombs",
        duration: "5m 00s",
        players: 10,
        winner: "Red Team",
        time: "12:38 PM",
    },
    {
        id: "M-12946",
        mode: "Deathmatch (FFA)",
        map: "Outpost",
        duration: "3m 45s",
        players: 6,
        winner: "SkyWalker",
        time: "12:30 PM",
    },
]

export default function MatchesPage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Match History</h1>
                <p className="text-muted-foreground">
                    Review past match results, player performance, and server logs.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Matches Today</CardTitle>
                        <Swords className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">142</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Most Played Map</CardTitle>
                        <MapIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">Outpost</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">94%</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Matches</CardTitle>
                    <CardDescription>
                        Live-feed of completed matches across all regions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Match ID</TableHead>
                                <TableHead>Game Mode / Map</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Winner</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Logs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matches.map((match) => (
                                <TableRow key={match.id}>
                                    <TableCell className="font-mono text-xs font-semibold">
                                        {match.id}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{match.mode}</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <MapIcon className="h-3 w-3" /> {match.map}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            {match.duration}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-4 w-4 text-yellow-500" />
                                            <span className="font-medium">{match.winner}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {match.time}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="gap-2">
                                            <FileText className="h-4 w-4" />
                                            View Log
                                        </Button>
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
