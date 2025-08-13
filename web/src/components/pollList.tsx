import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow, TableCaption } from '@/components/ui/table';
import { useNavigate } from "react-router-dom";
import type {Poll} from "../types/poll";
import dataJson from '../assets/data.json';


export default function ListOfPolls() {
    const navigate = useNavigate();
    const polls = dataJson as Poll[];

    if (!polls) return <h2>Polls not found</h2>;

    return (
        <div className="max-w-5xl mx-auto p-6 bg-white rounded-2xl shadow">
            <Table>
                <TableCaption></TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[20em]">Question</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {polls.map((poll, index) => (
                        <TableRow
                            key={index}
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => navigate('/poll/' + index)}
                        >
                            <TableCell className="font-medium">{poll.question}</TableCell>
                            <TableCell>{poll.closed ? "Closed" : "Open"}</TableCell>
                            <TableCell className="text-right">{poll.createdAt}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
