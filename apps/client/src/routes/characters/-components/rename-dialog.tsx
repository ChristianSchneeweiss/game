import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2Icon, Edit3, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Props = {
  character: Character;
};

export const RenameDialog = ({ character }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState(character.name);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setNewName(character.name);
      setError(null);
    }
  }, [character.name, isOpen]);

  const { mutateAsync: renameCharacter, isPending } = useMutation(
    trpc.character.renameCharacter.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
        await queryClient.invalidateQueries(
          trpc.character.getCharacters.queryOptions(),
        );
        setIsOpen(false);
        setError(null);
      },
      onError: (error) => {
        setError(error.message || "Failed to rename character");
      },
    }),
  );

  const handleSubmit = async (e: FormEvent) => {
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
    try {
      await renameCharacter({
        characterId: character.id,
        name: newName.trim(),
      });
    } catch {
      // The mutation's onError displays the server's validation message.
    }
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
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Rename ${character.name}`}
          type="button"
        >
          <Edit2Icon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-stone-50">
            <Edit3 className="h-5 w-5 text-amber-200" />
            Rename Character
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-stone-400">
            Update the dossier name shown across your roster and character
            detail screens.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="character-name"
              className="text-sm font-medium text-stone-300"
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
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "rename-error" : undefined}
              disabled={isPending}
            />
            {error && (
              <p
                id="rename-error"
                role="alert"
                className="text-sm text-(--rpg-danger)"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="flex-1"
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
              className="flex-1"
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
