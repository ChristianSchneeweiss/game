import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/utils/supabase";
import { userStore } from "@/utils/user-store";
import { UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import { queryClient } from "@/utils/trpc";

export default function UserMenu() {
  const { user } = userStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <UserIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        {user ? (
          <>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{user?.email}</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  supabase.auth.signOut();
                }}
              >
                Sign Out
              </Button>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem>
            <Button>Sign In</Button>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
