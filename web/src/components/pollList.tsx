import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, type DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow, TableCaption } from "@/components/ui/table";
import LogOutButton from "@/components/logOutButton.tsx";
import { db } from "@/lib/firebase.ts";
import type { Poll, User } from "../types/poll";
import { Timestamp } from "firebase/firestore";

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

export default function ListOfPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribePolls = onSnapshot(collection(db, "polls"), (querySnapshot) => {
      const data: Poll[] = querySnapshot.docs.map(mapPoll);
      console.log("Polls:", data);
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
      console.log("Users:", data);
      setUsers(data);
    });

    return () => {
      unsubscribePolls();
      unsubscribeUsers();
    };
  }, []);


  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => {
      map[u.id] = u.name;
    });
    return map;
  }, [users]);

  if (!polls || polls.length === 0) {
    return <h2 className="text-center text-gray-500">No polls found.</h2>;
  }

  return (
    <div>
      <nav className="flex justify-end p-8">
        <LogOutButton />
      </nav>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-2">Poll List</h1>

        <Table>
          <TableCaption className="text-gray-400">
            Total: {polls.length} polls
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20em]">Question</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created by</TableHead>
              <TableHead className="text-right">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {polls.map((poll) => {
              const date = poll.createdAt
                ? new Date(poll.createdAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "-";

              return (
                <TableRow
                  key={poll.id}
                  className="cursor-pointer hover:bg-blue-50 transition"
                  onClick={() => navigate(`/poll/${poll.id}`)}
                >
                  <TableCell className="font-medium">{poll.question}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        poll.closed ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {poll.closed ? "Closed" : "Open"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {userMap[poll.createdBy] }
                  </TableCell>
                  <TableCell className="text-right">{date}</TableCell>
                </TableRow>

              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
