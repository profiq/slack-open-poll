import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  type DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import LogOutButton from "@/components/logOutButton";
import type { Poll } from "../types/poll";
import type { User } from "../types/user";
import { Timestamp } from "firebase/firestore";
import { ChevronDown, Users, Calendar, BarChart3, Filter, Search, X } from "lucide-react";

function mapPoll(doc: QueryDocumentSnapshot<DocumentData>): Poll {
  const data = doc.data();
  return {
    id: doc.id,
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
  };
}

interface Channel {
  id: string;
  name: string;
}

interface TimeFilter {
  label: string;
  value: string;
  getStartDate: () => Date;
}

const timeFilters: TimeFilter[] = [
  {
    label: "All Time",
    value: "all",
    getStartDate: () => new Date(0),
  },
  {
    label: "Today",
    value: "today",
    getStartDate: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    },
  },
  {
    label: "This Week",
    value: "week",
    getStartDate: () => {
      const date = new Date();
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday;
    },
  },
  {
    label: "This Month",
    value: "month",
    getStartDate: () => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1);
    },
  },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function ListOfPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [participantFilter, setParticipantFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [searchChannel, setSearchChannel] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchParticipant, setSearchParticipant] = useState("");
  const [sortChannelsBy, setSortChannelsBy] = useState<"name" | "count">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const debouncedSearchChannel = useDebounce(searchChannel, 300);
  const debouncedSearchUser = useDebounce(searchUser, 300);
  const debouncedSearchParticipant = useDebounce(searchParticipant, 300);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribePolls = onSnapshot(collection(db, "polls"), (querySnapshot) => {
      const data: Poll[] = querySnapshot.docs.map(mapPoll);
      setPolls(data);
    });

    const unsubscribeUsers = onSnapshot(collection(db, "users_list"), (querySnapshot) => {
      const data: User[] = querySnapshot.docs.map((doc) => {
        const raw = doc.data() as Partial<User>;
        const createdAtValue = raw.createdAt;

        return {
          ...raw,
          id: doc.id,
          createdAt: (() => {
            if (typeof createdAtValue === "string") return createdAtValue;
            const ts = createdAtValue as unknown as Timestamp;
            if (ts?.toDate instanceof Function) return ts.toDate().toISOString();
            return undefined;
          })(),
          name: raw.name ?? doc.id,
        } as User;
      });
      setUsers(data);
    });

    const unsubscribeChannels = onSnapshot(collection(db, "channels_list"), (querySnapshot) => {
      const data: Channel[] = querySnapshot.docs.map((doc) => {
        const raw = doc.data() as { name?: string };
        return {
          id: doc.id,
          name: raw.name ?? doc.id,
        };
      });
      setChannels(data);
    });

    return () => {
      unsubscribePolls();
      unsubscribeUsers();
      unsubscribeChannels();
    };
  }, []);

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id] = u.name;
    });
    return map;
  }, [users]);

  const channelMap = useMemo(() => {
    const map: Record<string, string> = {};
    channels.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [channels]);

  const currentTimeFilter = useMemo(() => {
    return timeFilters.find(f => f.value === timeFilter) || timeFilters[0];
  }, [timeFilter]);

  const timeFilteredPolls = useMemo(() => {
    if (timeFilter === "all") return polls;

    const startDate = currentTimeFilter.getStartDate();
    return polls.filter((poll) => {
      if (!poll.createdAt) return false;
      const pollDate = new Date(poll.createdAt);
      return pollDate >= startDate;
    });
  }, [polls, currentTimeFilter, timeFilter]);

  const pollCountsByChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    timeFilteredPolls.forEach((poll) => {
      if (!poll.channelId) return;
      counts[poll.channelId] = (counts[poll.channelId] || 0) + 1;
    });
    return counts;
  }, [timeFilteredPolls]);

  const filteredChannels = useMemo(() => {
    if (!debouncedSearchChannel) return channels;

    return channels.filter((channel) =>
      channel.name.toLowerCase().includes(debouncedSearchChannel.toLowerCase()) ||
      channel.id.toLowerCase().includes(debouncedSearchChannel.toLowerCase())
    );
  }, [channels, debouncedSearchChannel]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchUser) return users;

    return users.filter((user) =>
      user.name.toLowerCase().includes(debouncedSearchUser.toLowerCase()) ||
      user.id.toLowerCase().includes(debouncedSearchUser.toLowerCase())
    );
  }, [users, debouncedSearchUser]);

  const filteredParticipants = useMemo(() => {
    const uniqueParticipants = new Set<string>();
    timeFilteredPolls.forEach((poll) => {
      poll.votes?.forEach((vote) => {
        uniqueParticipants.add(vote.userId);
      });
    });

    const participantUsers = Array.from(uniqueParticipants)
      .map((id) => ({ id, name: userMap[id] || "Unknown" }));

    if (!debouncedSearchParticipant) return participantUsers;

    return participantUsers.filter((participant) =>
      participant.name.toLowerCase().includes(debouncedSearchParticipant.toLowerCase()) ||
      participant.id.toLowerCase().includes(debouncedSearchParticipant.toLowerCase())
    );
  }, [timeFilteredPolls, userMap, debouncedSearchParticipant]);

  const sortedChannels = useMemo(() => {
    const channelsWithCounts = filteredChannels.map((channel) => ({
      ...channel,
      pollCount: pollCountsByChannel[channel.id] || 0,
    }));

    return channelsWithCounts.sort((a, b) => {
      let comparison: number;

      if (sortChannelsBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.pollCount - b.pollCount;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [filteredChannels, pollCountsByChannel, sortChannelsBy, sortOrder]);

  const filteredPolls = useMemo(() => {
    return timeFilteredPolls.filter((poll) => {
      const channelMatches = channelFilter
        ? poll.channelId === channelFilter
        : !debouncedSearchChannel || (channelMap[poll.channelId] || "").toLowerCase().includes(debouncedSearchChannel.toLowerCase());

      const userMatches = userFilter
        ? poll.createdBy === userFilter
        : !debouncedSearchUser || (userMap[poll.createdBy] || "").toLowerCase().includes(debouncedSearchUser.toLowerCase());

      const participantMatches = participantFilter
        ? poll.votes?.some((v) => v.userId === participantFilter)
        : !debouncedSearchParticipant || poll.votes?.some(v => (userMap[v.userId] || "").toLowerCase().includes(debouncedSearchParticipant.toLowerCase()));

      const statusMatches =
        (statusFilter === "all") ||
        (statusFilter === "active" && !poll.closed) ||
        (statusFilter === "closed" && poll.closed);

      return channelMatches && userMatches && participantMatches && statusMatches;
    });
  }, [
    timeFilteredPolls, channelFilter, userFilter, participantFilter,
    statusFilter, debouncedSearchChannel, debouncedSearchUser, debouncedSearchParticipant, channelMap, userMap
  ]);


  const statusCounts = useMemo(() => {
    return {
      active: timeFilteredPolls.filter((p) => !p.closed).length,
      closed: timeFilteredPolls.filter((p) => p.closed).length,
    };
  }, [timeFilteredPolls]);

  const statusPercentages = useMemo(() => {
    const total = timeFilteredPolls.length;
    if (total === 0) return { active: 0, closed: 0 };

    return {
      active: Math.round((statusCounts.active / total) * 100),
      closed: Math.round((statusCounts.closed / total) * 100),
    };
  }, [statusCounts, timeFilteredPolls.length]);

  const uniqueParticipants = useMemo(() => {
    const participantSet = new Set<string>();
    timeFilteredPolls.forEach((poll) => {
      poll.votes?.forEach((vote) => {
        participantSet.add(vote.userId);
      });
    });
    return Array.from(participantSet);
  }, [timeFilteredPolls]);

  const getParticipantCount = (pollId: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll?.votes) return 0;
    return new Set(poll.votes.map(v => v.userId)).size;
  };

  const clearAllFilters = useCallback(() => {
    setChannelFilter(null);
    setUserFilter(null);
    setParticipantFilter(null);
    setStatusFilter("all");
    setTimeFilter("all");
    setSearchChannel("");
    setSearchUser("");
    setSearchParticipant("");
  }, []);

  const clearSearchChannel = useCallback(() => {
    setSearchChannel("");
  }, []);

  const clearSearchUser = useCallback(() => {
    setSearchUser("");
  }, []);

  const clearSearchParticipant = useCallback(() => {
    setSearchParticipant("");
  }, []);

  const hasActiveFilters = channelFilter || userFilter || participantFilter || statusFilter !== "all" || timeFilter !== "all";

  if (!polls || polls.length === 0) {
    return <h2 className="text-center text-gray-500">No polls found.</h2>;
  }

  return (
    <div>
      <nav className="flex justify-end p-8">
        <LogOutButton />
      </nav>

      <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Poll Analytics Dashboard</h1>
          <div className="flex items-center gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                {timeFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Calendar className="h-4 w-4 text-gray-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-gray-500">Total Polls</p>
              </div>
              <p className="text-2xl font-bold">{timeFilteredPolls.length}</p>
              <p className="text-xs text-gray-400">{currentTimeFilter.label.toLowerCase()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-gray-500">Active</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
              <p className="text-xs text-gray-400">{statusPercentages.active}% of total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-sm text-gray-500">Closed</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{statusCounts.closed}</p>
              <p className="text-xs text-gray-400">{statusPercentages.closed}% of total</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <p className="text-sm text-gray-500">Channels</p>
              </div>
              <p className="text-2xl font-bold">{Object.keys(pollCountsByChannel).length}</p>
              <p className="text-xs text-gray-400">with polls</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-gray-500">Participants</p>
              </div>
              <p className="text-2xl font-bold">{uniqueParticipants.length}</p>
              <p className="text-xs text-gray-400">unique voters</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Channel</label>
                <div className="relative">
                  <Input
                    placeholder="Search channels..."
                    value={searchChannel}
                    onChange={(e) => setSearchChannel(e.target.value)}
                    className="mb-2 pr-8"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  {searchChannel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={clearSearchChannel}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select
                  onValueChange={(val) => setChannelFilter(val === "all" ? null : val)}
                  value={channelFilter ?? "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 border-b">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>Sort by:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() =>
                            setSortChannelsBy(sortChannelsBy === "name" ? "count" : "name")
                          }
                        >
                          {sortChannelsBy === "name" ? "Name" : "Count"}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        >
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </Button>
                      </div>
                    </div>

                    <SelectItem value="all">
                      All Channels ({timeFilteredPolls.length})
                    </SelectItem>

                    {sortedChannels
                      .filter((ch) => pollCountsByChannel[ch.id] > 0)
                      .map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{ch.name}</span>
                            <Badge variant="secondary" className="ml-2">
                              {pollCountsByChannel[ch.id]}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}

                    {sortedChannels.filter((ch) => pollCountsByChannel[ch.id] > 0).length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        {debouncedSearchChannel ? "No matching channels found" : "No channels with polls"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Creator</label>
                <div className="relative">
                  <Input
                    placeholder="Search creators..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="mb-2 pr-8"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  {searchUser && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={clearSearchUser}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select
                  onValueChange={(val) => setUserFilter(val === "all" ? null : val)}
                  value={userFilter ?? "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Creators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Creators</SelectItem>
                    {filteredUsers
                      .filter((u) => timeFilteredPolls.some((p) => p.createdBy === u.id))
                      .map((u) => {
                        const pollCount = timeFilteredPolls.filter(
                          (p) => p.createdBy === u.id
                        ).length;
                        return (
                          <SelectItem key={u.id} value={u.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{u.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {pollCount}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}

                    {filteredUsers.filter((u) => timeFilteredPolls.some((p) => p.createdBy === u.id)).length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        {debouncedSearchUser ? "No matching creators found" : "No creators found"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Participant</label>
                <div className="relative">
                  <Input
                    placeholder="Search participants..."
                    value={searchParticipant}
                    onChange={(e) => setSearchParticipant(e.target.value)}
                    className="mb-2 pr-8"
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  {searchParticipant && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0"
                      onClick={clearSearchParticipant}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select
                  onValueChange={(val) => setParticipantFilter(val === "all" ? null : val)}
                  value={participantFilter ?? "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Participants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Participants</SelectItem>
                    {filteredParticipants.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}

                    {filteredParticipants.length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        {debouncedSearchParticipant ? "No matching participants found" : "No participants found"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Status</label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    onClick={() => setStatusFilter("all")}
                    size="sm"
                  >
                    All ({timeFilteredPolls.length})
                  </Button>
                  <Button
                    variant={statusFilter === "active" ? "default" : "outline"}
                    onClick={() => setStatusFilter("active")}
                    size="sm"
                  >
                    Active ({statusCounts.active})
                  </Button>
                  <Button
                    variant={statusFilter === "closed" ? "default" : "outline"}
                    onClick={() => setStatusFilter("closed")}
                    size="sm"
                  >
                    Closed ({statusCounts.closed})
                  </Button>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Active filters:</strong>{" "}
                  {channelFilter && `Channel: ${channelMap[channelFilter]} • `}
                  {userFilter && `Creator: ${userMap[userFilter]} • `}
                  {participantFilter && `Participant: ${userMap[participantFilter]} • `}
                  {statusFilter !== "all" && `Status: ${statusFilter} • `}
                  {timeFilter !== "all" && `Time: ${currentTimeFilter.label} • `}
                  Showing {filteredPolls.length} of {timeFilteredPolls.length} polls
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poll List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption className="text-gray-400">
                Showing {filteredPolls.length} of {timeFilteredPolls.length} polls
                {timeFilter !== "all" && ` (${currentTimeFilter.label.toLowerCase()})`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20em]">Question</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead className="text-right">Created by</TableHead>
                  <TableHead className="text-right">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolls.map((poll) => {
                  const date = poll.createdAt
                    ? new Date(poll.createdAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : "-";

                  const participantCount = getParticipantCount(poll.id);

                  return (
                    <TableRow
                      key={poll.id}
                      className="cursor-pointer hover:bg-blue-50 transition"
                      onClick={() => navigate(`/poll/${poll.id}`)}
                    >
                      <TableCell className="font-medium">{poll.question}</TableCell>
                      <TableCell>
                        <Badge
                          variant={poll.closed ? "destructive" : "default"}
                          className="flex w-fit items-center gap-1"
                        >
                          <div className={`w-2 h-2 rounded-full ${poll.closed ? 'bg-red-100' : 'bg-green-100'}`} />
                          {poll.closed ? "Closed" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{channelMap[poll.channelId] || poll.channelId || "-"}</span>
                          {pollCountsByChannel[poll.channelId] > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {pollCountsByChannel[poll.channelId]} polls
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{participantCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {userMap[poll.createdBy] || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">{date}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}