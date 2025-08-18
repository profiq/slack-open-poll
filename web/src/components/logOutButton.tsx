import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import {useNavigate} from "react-router-dom";

export default function LogOutButton() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {user && (
                <span className="text-sm text-gray-700">
                    {user.email}
                </span>
            )}
            <Button onClick={handleLogout}>Log out</Button>
        </div>
    );
}
