import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar,  AvatarImage } from '@/components/ui/avatar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { ChevronDown, ChevronUp, Search, Users } from 'lucide-react';
import { chartConfig } from '@/lib/chart-config';
import LogOutButton from '@/components/logOutButton.tsx';
import type { Poll, Vote as BaseVote } from '../types/poll';
import profile_placeholder from '../assets/Profile_avatar_placeholder_large.png';


interface VoterInfo {
  userId: string;
  name: string;
  timestamp?: Date;
  highlighted?: boolean;
}

export function PollDetail() {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [channels, setChannels] = useState<Record<string, string>>({});
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedVoters, setHighlightedVoters] = useState<Set<string>>(new Set());
  const [, setCurrentTime] = useState(new Date());
  const [sortOrder, setSortOrder] = useState<'timestamp' | 'alphabetical'>('timestamp');


  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pollId) return;

    const unsubscribe = onSnapshot(doc(db, 'polls', pollId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        const normalizedVotes = (data.votes ?? []).map((vote: BaseVote) => {
          const ts = (vote?.timestamp ?? vote?.timestamp) as string | undefined;
          return { ...vote, timestamp: ts };
        });

        setPoll({
          id: docSnap.id,
          question: data.question,
          options: data.options ?? [],
          createdAt: data.createdAt,
          createdBy:
            typeof data.createdBy === 'object' && data.createdBy !== null
              ? (data.createdBy as { id: string }).id
              : (data.createdBy as string),
          channelTimeStamp: data.channelTimeStamp,
          channelId:
            typeof data.channelId === 'object' && data.channelId !== null
              ? (data.channelId as { id: string }).id
              : (data.channelId as string),
          votes: normalizedVotes,
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
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users_list'), (querySnapshot) => {
      const map: Record<string, string> = {};
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data() as { name?: string };
        map[doc.id] = data.name ?? 'Unknown';
      });
      setUsers(map);
    });

    const unsubscribeChannels = onSnapshot(collection(db, 'channels_list'), (querySnapshot) => {
      const map: Record<string, string> = {};
      querySnapshot.docs.forEach((doc) => {
        const data = doc.data() as { name?: string };
        map[doc.id] = data.name ?? 'Unknown Channel';
      });
      setChannels(map);
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
      unsubscribeChannels();
    };
  }, [pollId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedVoters(new Set());
      return;
    }

    const matchingVoters = new Set<string>();
    const optionsWithMatches = new Set<string>();
    const query = searchQuery.toLowerCase();

    Object.entries(users).forEach(([userId, userName]) => {
      if (userName.toLowerCase().includes(query)) {
        matchingVoters.add(userId);

        poll?.votes?.forEach((vote) => {
          if (vote.userId === userId) {
            optionsWithMatches.add(vote.optionId);
          }
        });
      }
    });

    setHighlightedVoters(matchingVoters);

    if (optionsWithMatches.size > 0) {
      setExpandedOptions((prev) => {
        const newExpanded = new Set(prev);
        optionsWithMatches.forEach((optionId) => {
          newExpanded.add(optionId);
        });
        return newExpanded;
      });
    }
  }, [searchQuery, users, poll?.votes]);

  const toggleOptionExpansion = (optionId: string) => {
    setExpandedOptions((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(optionId)) {
        newExpanded.delete(optionId);
      } else {
        newExpanded.add(optionId);
      }
      return newExpanded;
    });
  };

  const getRelativeTime = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'Unknown time';

    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = timestamp.toDate();
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getVotersForOption = (optionId: string): VoterInfo[] => {
    if (!poll?.votes) return [];

    const voters = (poll.votes as (BaseVote & { timestamp: Date })[])
      .filter((vote) => vote.optionId === optionId)
      .map((vote) => ({
        userId: vote.userId,
        name: users[vote.userId] || 'Unknown User',
        timestamp: vote.timestamp,
        highlighted: highlightedVoters.has(vote.userId),
      }));

    voters.sort((a, b) => {
      if (a.highlighted && !b.highlighted) return -1;
      if (!a.highlighted && b.highlighted) return 1;

      if (sortOrder === 'timestamp') {
        return b.timestamp.getTime() - a.timestamp.getTime(); // nejnovější první
      } else {
        return a.name.localeCompare(b.name, 'cs', { sensitivity: 'base' }); // abecedně
      }
    });

    return voters;
  };


  const voteCounts = useMemo(() => {
    return (
      poll?.votes?.reduce(
        (acc, vote) => {
          acc[vote.optionId] = (acc[vote.optionId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {}
    );
  }, [poll?.votes]);

  const chartData = useMemo(() => {
    if (!poll?.options) return [{ optionId: 'No options', votes: 0 }];

    return poll.options.map((option) => ({
      optionId: option.label,
      votes: voteCounts[option.id] || 0,
    }));
  }, [poll?.options, voteCounts]);

  type FirestoreTimestampLike = { toDate: () => Date };

  function formatDateTime(
    ts: Date | string | number | FirestoreTimestampLike | null | undefined
  ): string {
    if (!ts) return "Unknown";

    let date: Date;

    if (typeof (ts as FirestoreTimestampLike)?.toDate === "function") {
      date = (ts as FirestoreTimestampLike).toDate();
    } else if (ts instanceof Date) {
      date = ts;
    } else if (typeof ts === "string" || typeof ts === "number") {
      date = new Date(ts);
    } else {
      return "Unknown";
    }

    return isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
  }


  const totalVotes = useMemo(() => {
    return Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
  }, [voteCounts]);

  if (loading) return <h2 className="text-center text-gray-500">Loading...</h2>;
  if (!poll) return <h2 className="text-center text-red-500">Poll not found</h2>;

  const hasVoters = totalVotes > 0;

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
            <p>
              <strong>Poll ID:</strong> {pollId}
            </p>
            <p>
              <strong>Created by:</strong> {users[poll.createdBy] ?? 'Unknown'}
            </p>
            <p>
              <strong>Channel:</strong> {channels[poll.channelId] ?? poll.channelId}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {formatDateTime(poll.createdAt)}
            </p>
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="outline">{poll.multiple ? 'Multiple choice' : 'Single choice'}</Badge>
              <Badge variant="outline">Max votes: {poll.maxVotes ?? '-'}</Badge>
              <Badge variant={poll.custom ? 'default' : 'secondary'}>
                {poll.custom ? 'Custom allowed' : 'Predefined only'}
              </Badge>
              <Badge variant={poll.anonymous ? 'secondary' : 'default'}>
                {poll.anonymous ? 'Anonymous' : 'Visible'}
              </Badge>
              <Badge variant={poll.closed ? 'destructive' : 'default'}>
                {poll.closed ? 'Closed' : 'Open'}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalVotes} total votes
              </Badge>
            </div>
          </CardContent>
        </Card>

        {hasVoters && !poll.anonymous && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Voters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by voter name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              {highlightedVoters.size > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Found {highlightedVoters.size} matching voter(s)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between">
              <CardTitle>Options & Voters</CardTitle>
              {!poll.anonymous && totalVotes > 0 && (
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <label htmlFor="sortOrder" className="text-sm text-muted-foreground">Sort by:</label>
                  <select
                    id="sortOrder"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'timestamp' | 'alphabetical')}
                    className="border rounded-md text-sm p-1"
                  >
                    <option value="timestamp">Most recent</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              {poll.options.map((option) => {
                const voteCount = voteCounts[option.id] ?? 0;
                const voters = getVotersForOption(option.id);
                const isExpanded = expandedOptions.has(option.id);
                const hasHighlightedVoters = voters.some((voter) => voter.highlighted);
                const highlightedCount = voters.filter((voter) => voter.highlighted).length;

                return (
                  <div key={option.id} className="border rounded-lg overflow-hidden">
                    <div
                      className={`p-4 transition-colors ${
                        hasHighlightedVoters && searchQuery
                          ? 'bg-yellow-50 border-yellow-200 shadow-sm'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{option.label}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {voteCount}
                            </Badge>
                            {hasHighlightedVoters && searchQuery && (
                              <Badge
                                variant="outline"
                                className="bg-yellow-200 text-yellow-800 border-yellow-300 animate-pulse"
                              >
                                {highlightedCount} match{highlightedCount !== 1 ? 'es' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {voteCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOptionExpansion(option.id)}
                            className="flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                Hide voters <ChevronUp className="h-4 w-4" />
                              </>
                            ) : (
                              <>
                                Show voters <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {!isExpanded && hasHighlightedVoters && searchQuery && (
                        <div className="mt-2 text-xs text-yellow-700">
                          Matching voters:{' '}
                          {voters
                            .filter((v) => v.highlighted)
                            .map((v) => v.name)
                            .slice(0, 3)
                            .join(', ')}
                          {highlightedCount > 3 ? ` and ${highlightedCount - 3} more...` : ''}
                        </div>
                      )}
                    </div>

                    {isExpanded && voteCount > 0 && (
                      <div className="p-4 border-t bg-white">
                        {poll.anonymous ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Anonymous votes</p>
                            <p className="text-sm">
                              {voteCount} anonymous vote{voteCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground mb-3">
                              Voters ({voters.length})
                              {highlightedCount > 0 && (
                                <span className="text-yellow-600 ml-1">
                                  • {highlightedCount} matching
                                </span>
                              )}
                            </h4>
                            {voters.map((voter, index) => (
                              <div
                                key={`${voter.userId}-${index}`}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                                  voter.highlighted
                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border border-yellow-300 shadow-md transform scale-105'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >



                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={profile_placeholder} alt="Default profile" />
                                </Avatar>


                                <div className="flex-1">
                                  <p
                                    className={`font-medium text-sm ${voter.highlighted ? 'text-yellow-800 font-semibold' : ''}`}
                                  >
                                    {voter.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {getRelativeTime(voter.timestamp)}
                                  </p>
                                </div>
                                {voter.highlighted && (
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-200 text-yellow-800 border-yellow-300 shadow-sm"
                                  >
                                    <Search className="h-3 w-3 mr-1" />
                                    Match
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vote Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {hasVoters ? (
              <ChartContainer config={chartConfig}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="optionId"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <XAxis dataKey="votes" type="number" />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Bar dataKey="votes" fill="var(--color-desktop)" radius={4}>
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No votes yet</p>
                <p className="text-sm">Be the first to vote on this poll!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}