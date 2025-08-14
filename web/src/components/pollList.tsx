import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow, TableCaption } from '@/components/ui/table';
import { useNavigate } from "react-router-dom";
import type {Poll} from "../types/poll";
import dataJson from '../assets/data.json';
import LogoutButton from "@/components/logoutButton";


export default function ListOfPolls() {
    const navigate = useNavigate();
    const polls = dataJson as Poll[];

    if (!polls || polls.length === 0) {
        return <h2 className="text-center text-gray-500">No polls found.</h2>;
    }

    return (
        <div>
            <nav className="flex justify-end p-8">
                <LogoutButton />
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
                            <TableHead className="text-right">Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {polls.map((poll, index) => {
                            const date = new Date(poll.createdAt).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            });

                            return (
                                <TableRow
                                    key={index}
                                    className="cursor-pointer hover:bg-blue-50 transition"
                                    onClick={() => navigate(`/poll/${index}`)}
                                >
                                    <TableCell className="font-medium">{poll.question}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                poll.closed
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-green-100 text-green-700"
                                            }`}
                                        >
                                            {poll.closed ? "Closed" : "Open"}
                                        </span>
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

