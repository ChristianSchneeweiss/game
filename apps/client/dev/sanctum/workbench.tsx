import { useState } from "react";
import { Package, Shield } from "lucide-react";
import {
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
  RpgMeter,
  RpgEmptyState,
} from "@/components/rpg-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SpellAction } from "@/components/spell-action";
import { CollectionEntry } from "@/components/collection-ui";
import { SkillIcon } from "@/components/skill-icon";
import { Select } from "@/components/ui/select";
import { Status, Feedback } from "@/components/ui/status";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Loader from "@/components/loader";
import "@/index.css";

export function Workbench() {
  const [selected, setSelected] = useState(false);
  const [replayStep, setReplayStep] = useState(3);
  return (
    <RpgPage>
      <header>
        <p className="rpg-title">Development · production components</p>
        <h1 className="rpg-heading text-4xl">Obsidian Sanctum</h1>
        <p className="rpg-copy mt-3">
          Shared controls and their interaction states. Route fixtures use the
          same components.
        </p>
        <a className="rpg-link" href="/dev/sanctum.html#/">
          Open game routes →
        </a>
      </header>
      <RpgPanel className="p-6">
        <RpgSectionHeading icon={<Shield />} title="Actions" />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="outline">Outline action</Button>
          <Button variant="ghost">Quiet action</Button>
          <Button variant="destructive">Destructive action</Button>
          <Button disabled>Unavailable</Button>
          <Button pending>Saving…</Button>
          <Button
            variant="outline"
            aria-pressed={selected}
            onClick={() => setSelected(!selected)}
          >
            {selected ? "Selected" : "Select character"}
          </Button>
        </div>
      </RpgPanel>
      <RpgPanel className="space-y-5 p-6">
        <h2 className="rpg-heading text-2xl">Fields and feedback</h2>
        <label className="block">
          Character name
          <Input
            className="mt-2"
            defaultValue="Seraphina of the Forgotten Northern Watchtower"
          />
        </label>
        <label className="block">
          Invalid name
          <Input
            className="mt-2"
            aria-invalid
            aria-describedby="name-error"
            defaultValue=""
          />
        </label>
        <p id="name-error" className="text-(--rpg-danger)" role="alert">
          Enter a character name.
        </p>
        <label className="block">
          Sort order
          <Select className="mt-2">
            <option>Name</option>
            <option>Might</option>
          </Select>
        </label>
        <div className="flex flex-wrap gap-3">
          <Status>Offline</Status>
          <Status tone="success">Ready</Status>
          <Status tone="warning">Waiting</Status>
          <Status tone="danger">Unavailable</Status>
        </div>
        <Feedback>Waiting for your company.</Feedback>
        <Feedback error>Could not save the change. Try again.</Feedback>
      </RpgPanel>
      <RpgPanel className="space-y-5 p-6">
        <h2 className="rpg-heading text-2xl">Resources and recovery</h2>
        <RpgMeter
          label="Health"
          value={320}
          max={420}
          tone="health"
          delta={-24}
        />
        <RpgMeter label="Mana" value={70} max={140} tone="mana" />
        <RpgMeter label="Experience" value={0} max={100} tone="xp" />
        <label>
          Replay step {replayStep} / 10
          <Slider
            aria-label="Replay step"
            min={0}
            max={10}
            value={replayStep}
            onChange={(event) => setReplayStep(Number(event.target.value))}
          />
        </label>
        <Slider aria-label="Unavailable replay" value={0} disabled />
        <Loader />
        <RpgEmptyState
          icon={<Package />}
          title="No equipment yet"
          copy="Equipment you earn appears here."
        />
      </RpgPanel>
      <RpgPanel className="p-6">
        <h2 className="rpg-heading mb-5 text-2xl">
          Spell and collection entries
        </h2>
        <div className="grid gap-3">
          <SpellAction
            name="Verdant Invocation of the Ancient Northern Watchtower"
            type="rootgrasp"
            selected={selected}
            disabled={false}
            onSelect={() => setSelected(!selected)}
            metadata={<span>Mana 35 · select to prepare</span>}
            inspection={<span className="rpg-badge">Ready</span>}
          />
          <SpellAction
            name="Fireball"
            type="fireball"
            selected={false}
            disabled
            onSelect={() => {}}
            metadata={<span>Mana 20 · insufficient mana</span>}
            inspection={<span className="rpg-badge">Unavailable</span>}
          />
          <CollectionEntry
            title="A long inscription from the Northern Watchtower"
            icon={<SkillIcon type="rootgrasp" size={48} />}
            description="Long names and descriptions remain readable in a dense collection. This example renders the same component as owned spells and equipment."
            facts={[
              { label: "Mana", value: 0 },
              { label: "Cooldown", value: 3 },
            ]}
          />
        </div>
      </RpgPanel>
      <RpgPanel className="p-6">
        <h2 className="rpg-heading text-2xl">Overlays and keyboard focus</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Rename character</DialogTitle>
              <DialogDescription>
                Use a name you can recognize in your company.
              </DialogDescription>
              <label>
                Character name
                <Input autoFocus defaultValue="Mira" />
              </label>
              <Button>Save name</Button>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Open confirmation</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Leave the company?</AlertDialogTitle>
              <AlertDialogDescription>
                Your selection will be removed from this preparation.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction>Leave company</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Inspect character</DropdownMenuItem>
              <DropdownMenuItem disabled>Unavailable action</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </RpgPanel>
    </RpgPage>
  );
}
