import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";

export default function LogOutButton() {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = "/login";
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
