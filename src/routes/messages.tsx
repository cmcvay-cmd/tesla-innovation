import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, X, Download } from "lucide-react";
import { Avatar, Guard, Note, primaryBtn } from "@/components/bits";
import { prepareChatImage } from "@/lib/chat-image";
import { useStudio } from "@/components/shell";
import { useLoad } from "@/components/use-load";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { whenLabel } from "@/lib/money";
import { adminAct, adminBoard, getTyping, markSeen, myMessages, sendMessage, setTyping, studioFace } from "@/lib/studio";
import { notify } from "@/lib/notify";

type Search = { about: string };

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    about: typeof search.about === "string" ? search.about.slice(0, 80) : "",
  }),
  component: () => (
    <Guard>
      <MessagesPage />
    </Guard>
  ),
});

function MessagesPage() {
  const { about } = Route.useSearch();
  const { user } = useCurrentUserState();
  const { profile, profileReady } = useStudio();
  const thread = useLoad(myMessages, "thread", 4000);
  const face = useLoad(studioFace, "face");
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typing = useLoad(() => getTyping({ data: user?.id ?? "" }), "typing", 2000);

  useEffect(() => {
    if (seeded || !about) return;
    if (thread.data && thread.data.length > 0) {
      setSeeded(true);
      return;
    }
    setBody(`I am looking at the ${about}.`);
    setSeeded(true);
  }, [about, seeded, thread.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.data?.length]);

  const prevCount = useRef(0);
  useEffect(() => {
    const count = thread.data?.length ?? 0;
    if (prevCount.current > 0 && count > prevCount.current) {
      const last = thread.data?.[thread.data.length - 1];
      if (last && last.senderId !== user?.id) {
        notify("New message", last.body?.slice(0, 80) || "Photo received");
      }
    }
    prevCount.current = count;
  }, [thread.data, user?.id]);

  useEffect(() => {
    if (!user || !thread.data) return;
    void markSeen({ data: { threadUserId: user.id } });
  }, [thread.data, user]);

  function onType(text: string) {
    setBody(text);
    if (!user) return;
    void setTyping({ data: { threadUserId: user.id, typing: true } });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void setTyping({ data: { threadUserId: user.id, typing: false } });
    }, 1500);
  }

  async function saveImage(src: string) {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      const prepared = await prepareChatImage(file);
      setImage(prepared);
      setPreview(prepared);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not read the photo");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const text = body.trim();
    if (!text && !image.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      await sendMessage({ data: { body: text || "(image)", image: image || null } });
      setBody("");
      setImage("");
      setPreview("");
      thread.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (!profileReady) return <div className="h-40 animate-pulse rounded-2xl bg-surface" />;

  if (profile?.role === "admin") return <AdminInbox />;

  return (
    <div className="space-y-4">
      <div>
        <p className="kicker text-xs text-muted">PRIVATE LINE</p>
        <div className="mt-2 flex items-center gap-3">
          <Avatar src={face.data?.avatar} name={face.data?.name || "Elon Musk"} />
          <div>
            <h1 className="text-4xl font-medium tracking-tight">Elon Musk</h1>
            <p className="text-sm text-muted">.</p>
          </div>
        </div>
      </div>
      <ul className="space-y-3 pb-8">
        {thread.data && thread.data.length === 0 ? (
          <li className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            The line is open. Write when you are ready.
          </li>
        ) : null}
        {thread.data?.map((message) => {
          const mine = message.senderId === user?.id;
          return (
            <li key={message.id} className={mine ? "flex justify-end" : "flex items-end gap-2"}>
              {mine ? null : <Avatar src={message.senderAvatar || face.data?.avatar} name="Elon Musk" className="size-8" />}
              <div
                className={
                  mine
                    ? "max-w-[85%] rounded-2xl bg-accent px-4 py-3 text-accent-fg"
                    : "max-w-[85%] rounded-2xl border border-line bg-surface px-4 py-3"
                }
              >
                <p className="text-xs opacity-70">{mine ? "You" : "Elon Musk"}</p>
                {message.image ? (
                  <button type="button" onClick={() => setViewer(message.image)} className="mt-2 block">
                    <img
                      src={message.image}
                      alt=""
                      className="max-h-64 max-w-full rounded-lg object-contain"
                    />
                  </button>
                ) : null}
                {message.body && message.body !== "(image)" ? (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                ) : null}
                <p className="mt-2 text-xs opacity-70">
                  {whenLabel(message.createdAt)}
                  {mine && message.seenAt ? " · Seen" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {typing.data?.typing ? <p className="text-sm text-muted">Typing…</p> : null}
      <div ref={endRef} />
      {note ? <Note>{note}</Note> : null}
      {thread.error ? <Note>{thread.error}</Note> : null}
      {viewer ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setViewer(null)}>
          <div className="flex items-center justify-between p-4">
            <button type="button" className="text-white" onClick={() => setViewer(null)}>Close</button>
            <button type="button" className="flex items-center gap-2 text-white" onClick={(e) => { e.stopPropagation(); void saveImage(viewer); }}>
              <Download className="size-4" /> Save
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={viewer} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      ) : null}
      <form
        className="composer fixed inset-x-0 z-30 border-t border-line bg-bg px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {preview ? (
            <div className="relative w-fit">
              <img src={preview} alt="" className="h-20 rounded-lg object-cover" />
              <button
                type="button"
                className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-bg text-fg"
                onClick={() => {
                  setImage("");
                  setPreview("");
                }}
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <label className="tap flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2">
              <ImagePlus className="size-5" />
              <span className="sr-only">Add photo</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  void onPhoto(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <label className="sr-only" htmlFor="note">
              Message admin
            </label>
            <textarea
              id="note"
              value={body}
              rows={2}
              maxLength={2000}
              onChange={(event) => onType(event.target.value)}
              placeholder="Message the studio"
              className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-base"
            />
            <button
              type="submit"
              className={primaryBtn}
              disabled={busy || (body.trim().length === 0 && !image)}
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function AdminInbox() {
  const { user } = useCurrentUserState();
  const board = useLoad(adminBoard, "inbox-desk", 4000);
  const [openId, setOpenId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const threads = useMemo(() => {
    const map = new Map<
      string,
      { userId: string; name: string; email: string; avatar: string; last: string; lastAt: string; waiting: boolean }
    >();
    const data = board.data;
    if (!data) return [];
    for (const message of data.messages) {
      const person = data.people.find((item) => item.userId === message.userId);
      map.set(message.userId, {
        userId: message.userId,
        name: person?.name ?? "Member",
        email: person?.email ?? "",
        avatar: person?.avatar ?? "",
        last: message.body,
        lastAt: message.createdAt,
        waiting: message.senderId === message.userId,
      });
    }
    return [...map.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }, [board.data]);

  const open = threads.find((thread) => thread.userId === openId) ?? null;
  const messages = board.data?.messages.filter((message) => message.userId === openId) ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, openId]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setNote(null);
    try {
      const prepared = await prepareChatImage(file);
      setImage(prepared);
      setPreview(prepared);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not read the photo");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!open) return;
    const text = body.trim();
    if (!text && !image.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      await adminAct({
        data: { type: "reply", userId: open.userId, body: text || "(image)", image: image.trim() || null },
      });
      setBody("");
      setImage("");
      setPreview("");
      board.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (board.pending && !board.data) return <div className="h-40 animate-pulse rounded-2xl bg-surface" />;

  if (!open) {
    return (
      <div className="space-y-4">
        <div>
          <p className="kicker text-xs text-muted">INBOX</p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight">Member threads</h1>
          <p className="mt-2 text-sm text-muted">Private chats from members. Tap one to reply.</p>
        </div>
        {board.error ? <Note>{board.error}</Note> : null}
        {threads.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
            No messages yet. A member’s shop or invest note shows up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {threads.map((thread) => (
              <li key={thread.userId}>
                <button
                  type="button"
                  onClick={() => setOpenId(thread.userId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left"
                >
                  <Avatar src={thread.avatar} name={thread.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{thread.name}</span>
                      {thread.waiting ? <span className="size-2 shrink-0 rounded-full bg-accent" /> : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted">{thread.last}</span>
                    <span className="mt-2 block text-xs text-muted">{whenLabel(thread.lastAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setOpenId(null)}>
        All threads
      </button>
      <div className="flex items-center gap-3">
        <Avatar src={open.avatar} name={open.name} />
        <div>
          <h1 className="text-2xl font-medium">{open.name}</h1>
          <p className="break-all text-sm text-muted">{open.email}</p>
        </div>
      </div>
      <ul className="space-y-3 pb-8">
        {messages.map((message) => {
          const mine = message.senderId === user?.id;
          return (
            <li key={message.id} className={mine ? "flex justify-end" : "flex items-end gap-2"}>
              {mine ? null : <Avatar src={message.senderAvatar || open.avatar} name={open.name} className="size-8" />}
              <div
                className={
                  mine
                    ? "max-w-[85%] rounded-2xl bg-accent px-4 py-3 text-accent-fg"
                    : "max-w-[85%] rounded-2xl border border-line bg-surface px-4 py-3"
                }
              >
                <p className="text-xs opacity-70">{mine ? "You" : open.name}</p>
                {message.image ? (
                  <img
                    src={message.image}
                    alt=""
                    className="mt-2 max-h-64 max-w-full rounded-lg object-contain"
                  />
                ) : null}
                {message.body && message.body !== "(image)" ? (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">{message.body}</p>
                ) : null}
                <p className="mt-2 text-xs opacity-70">{whenLabel(message.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={endRef} />
      {note ? <Note>{note}</Note> : null}
      <form
        className="composer fixed inset-x-0 z-30 border-t border-line bg-bg px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {preview ? (
            <div className="relative w-fit">
              <img src={preview} alt="" className="h-20 rounded-lg object-cover" />
              <button
                type="button"
                className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-bg text-fg"
                onClick={() => {
                  setImage("");
                  setPreview("");
                }}
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <label className="tap flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2">
              <ImagePlus className="size-5" />
              <span className="sr-only">Add photo</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  void onPhoto(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <label className="sr-only" htmlFor="reply">
              Reply
            </label>
            <textarea
              id="reply"
              value={body}
              rows={2}
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder={`Reply to ${open.name}`}
              className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2 text-base"
            />
            <button
              type="submit"
              className={primaryBtn}
              disabled={busy || (body.trim().length === 0 && !image)}
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
