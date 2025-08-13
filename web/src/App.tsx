import { BrowserRouter, Routes, Route } from "react-router-dom";
import PollDetail from "@/components/pollDetail";
import Dashboard from "@/components/pollList";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/poll/:pollId" element={<PollDetail />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

function Login() {
  return <h1>Login</h1>;
}

export default App;
