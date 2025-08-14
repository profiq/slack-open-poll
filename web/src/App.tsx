import { BrowserRouter, Routes, Route } from "react-router-dom";
import PollDetail from "@/components/pollDetail";
import Dashboard from "@/components/pollList";
import { LoginForm } from "@/components/login";
import { AuthProvider } from "@/components/authContext.tsx";
import ProtectedRoute from "@/components/protectedRouted";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/poll/:pollId"
                        element={
                            <ProtectedRoute>
                                <PollDetail />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<LoginForm />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
