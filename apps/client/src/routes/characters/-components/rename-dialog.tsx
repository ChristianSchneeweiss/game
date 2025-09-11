import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2Icon, Edit3, Edit3Icon, EditIcon, Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  character: Character;
};

export const RenameDialog = ({ character }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(character.name);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { mutateAsync: renameCharacter, isPending } = useMutation(
    trpc.character.renameCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
        setIsOpen(false);
        setError(null);
      },
      onError: (error) => {
        setError(error.message || "Failed to rename character");
      },
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim()) {
      setError("Character name cannot be empty");
      return;
    }

    if (newName.trim() === character.name) {
      setIsOpen(false);
      return;
    }

    setError(null);
    await renameCharacter({
      characterId: character.id,
      name: newName.trim(),
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) {
      setNewName(character.name);
      setError(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger>
        <Edit2Icon className="size-4 text-gray-400" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit3 className="h-5 w-5 text-blue-400" />
            Rename Character
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="character-name"
              className="text-sm font-medium text-gray-300"
            >
              Character Name
            </label>
            <Input
              id="character-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter character name..."
              className="border-slate-600 bg-slate-800/50 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20"
              disabled={isPending}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                !newName.trim() ||
                newName.trim() === character.name
              }
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
