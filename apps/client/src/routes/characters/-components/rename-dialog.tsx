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
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/5 text-stone-300 transition-all duration-300 hover:border-amber-300/20 hover:bg-white/10 hover:text-white"
        >
          <Edit2Icon className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] text-stone-100 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:max-w-md">
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
              className="h-12 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-stone-500 focus:border-amber-300/20 focus:ring-amber-300/15"
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
              className="h-11 flex-1 rounded-full border-white/10 bg-white/5 text-stone-200 hover:bg-white/10 hover:text-white"
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
              className="h-11 flex-1 rounded-full border border-amber-300/20 bg-amber-300 text-slate-950 hover:bg-amber-200 disabled:opacity-50"
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
