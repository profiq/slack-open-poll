"use client";

import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
    const { logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = "/login";
        } catch (error) {
            console.error("Login error:", error);
        }
    };

    return <Button onClick={handleLogout}>Log out</Button>;
}
