import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { chartConfig } from "@/lib/chart-config";
import LogOutButton from "@/components/logOutButton.tsx";
import type { Poll } from "../types/poll";

export default function PollDetail() {
    const { pollId } = useParams<{ pollId: string }>();
    const [poll, setPoll] = useState<Poll | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        if (!pollId) return;

        const unsubscribe = onSnapshot(
            doc(db, "polls", pollId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPoll({
                        id: docSnap.id,
                        question: data.question,
                        options: data.options ?? [],
                        createdAt:
                            typeof data.createdAt === "string"
                                ? data.createdAt
                                : data.createdAt?.toDate().toISOString(),
                        createdBy: data.createdBy,
                        channelTimeStamp: data.channelTimeStamp,
                        channelId: data.channelId,
                        votes: data.votes ?? [],
                        multiple: data.multiple ?? false,
                        maxVotes: data.maxVotes ?? 1,
                        custom: data.custom ?? false,
                        closed: data.closed ?? false,
                        anonymous: data.anonymous ?? false,
                    });
                } else {
                    setPoll(null);
                }

                setLoading(false);
            },
            (error) => {
                console.error("Realtime error:", error);
                setPoll(null);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [pollId]);


    if (loading) return <h2 className="text-center text-gray-500">Loading...</h2>;
    if (!poll) return <h2 className="text-center text-red-500">Poll not found</h2>;

    // Count votes
    let voteCounts: Record<string, number> = {};
    if (poll.votes) {
        voteCounts = poll.votes.reduce((acc, vote) => {
            acc[vote.optionId] = (acc[vote.optionId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    const chartData = poll.options.map(option => ({
        optionId: option.label,
        votes: voteCounts[option.id] || 0,
    }));

    if (chartData.length === 0) {
        chartData.push({ optionId: "No options", votes: 0 });
    }

    return (
        <div>
            <nav className="flex justify-end p-8">
                <LogOutButton />
            </nav>
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">📊 {poll.question}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p><strong>Poll ID:</strong> {pollId}</p>
                        <p><strong>Created by:</strong> {poll.createdBy || "Unknown"}</p>
                        <p><strong>Channel:</strong> {poll.channelId} @ {poll.channelTimeStamp}</p>
                        <p><strong>Created:</strong> {poll.createdAt ? new Date(poll.createdAt).toLocaleString() : "Unknown"}</p>
                        <div className="flex gap-2 flex-wrap mt-2">
                            <Badge variant="outline">{poll.multiple ? "Multiple choice" : "Single choice"}</Badge>
                            <Badge variant="outline">Max votes: {poll.maxVotes ?? "-"}</Badge>
                            <Badge variant={poll.custom ? "default" : "secondary"}>{poll.custom ? "Custom allowed" : "Predefined only"}</Badge>
                            <Badge variant={poll.anonymous ? "secondary" : "default"}>{poll.anonymous ? "Anonymous" : "Visible"}</Badge>
                            <Badge variant={poll.closed ? "destructive" : "default"}>{poll.closed ? "Closed" : "Open"}</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Options</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {poll.options.map((opt) => (
                                <li key={opt.id} className="flex justify-between border p-2 rounded">
                                    <span>{opt.label}</span>
                                    <Badge variant="secondary">{voteCounts[opt.id] ?? 0} votes</Badge>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {poll.votes && poll.votes.length > 0 ? (
                            <Card>
                                <CardContent>
                                    <ChartContainer config={chartConfig}>
                                        <BarChart
                                            data={chartData}
                                            layout="vertical"
                                            margin={{ left: 120, right: 16 }}
                                        >
                                            <CartesianGrid horizontal={false} />
                                            <YAxis
                                                dataKey="optionId"
                                                type="category"
                                                tickLine={false}
                                                tickMargin={10}
                                                axisLine={false}
                                            />
                                            <XAxis dataKey="votes" type="number" />
                                            <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent indicator="line" />}
                                            />
                                            <Bar
                                                dataKey="votes"
                                                fill="var(--color-desktop)"
                                                radius={4}
                                            >
                                                <LabelList
                                                    dataKey="optionId"
                                                    position="insideLeft"
                                                    offset={8}
                                                    className="fill-(--color-label)"
                                                    fontSize={12}
                                                />
                                                <LabelList
                                                    dataKey="votes"
                                                    position="right"
                                                    offset={8}
                                                    className="fill-foreground"
                                                    fontSize={12}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        ) : (
                            <p className="text-muted-foreground">No votes yet</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
