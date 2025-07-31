import { BrowserRouter, Routes, Route} from "react-router-dom";

function App() {
    return (
        <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/poll/:pollId" element={<PollDetailPlaceholder />} />
                    <Route path="/login" element={<Login />} />
                </Routes>
        </BrowserRouter>
    );
}

function Dashboard() {
    return <h1>Dashboard</h1>;
}

function PollDetailPlaceholder() {
    return <h1>Poll Detail Placeholder</h1>;
}

function Login() {
    return <h1>Login</h1>;
}

export default App