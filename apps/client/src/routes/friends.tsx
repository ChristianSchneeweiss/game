import { RpgHero, RpgInset, RpgPage, RpgPanel } from "@/components/rpg-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshSocial } from "@/features/social/social-queries";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/friends")({ component: FriendsPage });

function FriendsPage() {
  const { data } = useSuspenseQuery(
    trpc.social.getFriends.queryOptions(undefined, { refetchInterval: 10_000 }),
  );
  const respond = useMutation(
    trpc.social.respondRequest.mutationOptions({ onSuccess: refreshSocial }),
  );
  const remove = useMutation(
    trpc.social.removeFriend.mutationOptions({ onSuccess: refreshSocial }),
  );
  const block = useMutation(
    trpc.social.block.mutationOptions({ onSuccess: refreshSocial }),
  );
  const unblock = useMutation(
    trpc.social.unblock.mutationOptions({ onSuccess: refreshSocial }),
  );
  const pending =
    respond.isPending ||
    remove.isPending ||
    block.isPending ||
    unblock.isPending;
  const error = respond.error ?? remove.error ?? block.error ?? unblock.error;
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.code);
      toast.success("Friend code copied");
    } catch {
      toast.error("Copy the friend code from the field below.");
    }
  }
  return (
    <RpgPage>
      <div className="space-y-7">
        <RpgHero
          eyebrow="The company you keep"
          title="Friends"
          description="Find your companions, exchange an invitation, and take on the next expedition together."
          aside={
            <RpgInset className="space-y-3 p-5">
              <label className="rpg-title text-xs" htmlFor="own-friend-code">
                Your friend code
              </label>
              <Input
                id="own-friend-code"
                readOnly
                value={data.code}
                className="font-mono tracking-widest"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button variant="outline" onClick={() => void copyCode()}>
                <Copy size={16} /> Copy code
              </Button>
            </RpgInset>
          }
        />
        <div className="grid items-start gap-7 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-7">
            <RpgPanel contentClassName="space-y-5 p-6">
              <h2 className="rpg-heading flex items-center gap-3 text-3xl">
                <Users size={23} /> Your companions{" "}
                <span className="text-lg text-[#b8aa89]">
                  {data.friends.length}
                </span>
              </h2>
              {data.friends.length === 0 ? (
                <p className="rpg-copy">
                  Your company begins with a friend code. Add a player, then
                  invite them from dungeon preparation.
                </p>
              ) : (
                data.friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-[#8a7753]/25 pt-4"
                  >
                    <strong>{friend.username}</strong>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/dungeons">Prepare a dungeon</Link>
                      </Button>
                      <Button
                        variant="ghostRelic"
                        size="sm"
                        disabled={pending}
                        onClick={() => remove.mutate({ userId: friend.id })}
                      >
                        Remove
                      </Button>
                      <Button
                        variant="ghostRelic"
                        size="sm"
                        disabled={pending}
                        onClick={() => block.mutate({ userId: friend.id })}
                      >
                        Block
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <p className="rpg-copy text-sm">
                Removing or blocking a friend closes pending invitations and
                separates waiting preparations. Started runs and earned rewards
                stay available.
              </p>
            </RpgPanel>
            <RpgPanel contentClassName="space-y-4 p-6">
              <h2 className="rpg-heading text-3xl">Incoming requests</h2>
              {data.incoming.length === 0 ? (
                <p className="rpg-copy">No requests waiting.</p>
              ) : (
                data.incoming.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-[#8a7753]/25 pt-4"
                  >
                    <strong>{request.sender.username}</strong>
                    <div className="flex gap-2">
                      <Button
                        variant="relic"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          respond.mutate({
                            requestId: request.id,
                            accept: true,
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          respond.mutate({
                            requestId: request.id,
                            accept: false,
                          })
                        }
                      >
                        Decline
                      </Button>
                      <Button
                        variant="ghostRelic"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          block.mutate({ userId: request.sender.id })
                        }
                      >
                        Block
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </RpgPanel>
          </div>
          <div className="space-y-7">
            <FindFriend />
            {data.outgoing.length > 0 ? (
              <RpgPanel contentClassName="space-y-3 p-6">
                <h2 className="rpg-heading text-2xl">Requests sent</h2>
                {data.outgoing.map((request) => (
                  <p key={request.id} className="rpg-copy">
                    {request.recipient.username} · Awaiting reply
                  </p>
                ))}
              </RpgPanel>
            ) : null}
            {data.blocked.length > 0 ? (
              <RpgPanel contentClassName="space-y-3 p-6">
                <h2 className="rpg-heading text-2xl">Blocked players</h2>
                {data.blocked.map((player) => (
                  <div
                    className="flex items-center justify-between gap-3"
                    key={player.id}
                  >
                    <span>{player.username}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => unblock.mutate({ userId: player.id })}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </RpgPanel>
            ) : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="expedition-error">
            {error.message}
          </p>
        ) : null}
      </div>
    </RpgPage>
  );
}

function FindFriend() {
  const [code, setCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const lookup = useQuery(
    trpc.social.lookupCode.queryOptions(
      { code: searchedCode },
      { enabled: !!searchedCode, retry: false },
    ),
  );
  const send = useMutation(
    trpc.social.sendRequest.mutationOptions({
      onSuccess: async () => {
        await refreshSocial();
        toast.success("Friend request sent");
      },
    }),
  );
  return (
    <RpgPanel contentClassName="space-y-4 p-6">
      <h2 className="rpg-heading flex items-center gap-3 text-3xl">
        <UserPlus size={23} /> Find a friend
      </h2>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          send.reset();
          setSearchedCode(code.trim());
        }}
      >
        <label className="rpg-copy" htmlFor="friend-code">
          Enter their friend code
        </label>
        <Input
          id="friend-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          maxLength={64}
          placeholder="Friend code"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!code.trim() || lookup.isFetching}
        >
          {lookup.isFetching ? "Finding player…" : "Find player"}
        </Button>
      </form>
      {lookup.data ? (
        <RpgInset className="space-y-3 p-4">
          <p className="rpg-copy">
            This code belongs to{" "}
            <strong className="text-(--rpg-text-main)">
              {lookup.data.username}
            </strong>
            .
          </p>
          <Button
            variant="relic"
            disabled={send.isPending || send.isSuccess}
            onClick={() => send.mutate({ userId: lookup.data.id })}
          >
            {send.isSuccess ? "Request sent" : "Send friend request"}
          </Button>
        </RpgInset>
      ) : null}
      {lookup.error || send.error ? (
        <p role="alert" className="expedition-error">
          {(lookup.error ?? send.error)?.message}
        </p>
      ) : null}
    </RpgPanel>
  );
}
