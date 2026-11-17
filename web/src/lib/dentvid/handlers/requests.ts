import { NextResponse } from "next/server";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dentvidQueue } from "@/lib/queue";
import { CHANGE_JOB_OPTS } from "@/lib/dentvid/job-options";
import { noteEnqueueFailure } from "@/lib/dentvid/ops-server";
import { adminClient, createChange, createTopic, listTopics, supabaseRequestStore, withdrawTopic, type DvActor, type RequestStore } from "@/lib/dentvid/clinic-requests";
import { subtitleResponse } from "@/lib/dentvid/subtitles";

/**
 * Topic suggestions, change requests and subtitle files, as the web routes
 * (cookie session) and the iPhone app's routes (bearer session) both serve
 * them: rate limits first, then the shared rules (lib/dentvid/clinic-requests.ts).
 */

async function storeFor(actor: DvActor): Promise<RequestStore> {
  const admin = await adminClient();
  return supabaseRequestStore(actor.db, () => admin);
}

export async function topicsGet(actor: DvActor): Promise<NextResponse> {
  return listTopics(actor, await storeFor(actor));
}

export async function topicsPost(actor: DvActor, req: Request): Promise<NextResponse> {
  const err = await dvErrors();
  const limited = await rateLimited(
    [
      { key: `rl:topicreq:user:${actor.user.id}`, rule: LIMITS.topicRequestUser },
      { key: `rl:topicreq:userday:${actor.user.id}`, rule: LIMITS.topicRequestUserDay },
    ],
    () => err.tooMany,
  );
  if (limited) return limited;
  return createTopic(actor, await storeFor(actor), await req.json().catch(() => null));
}

export async function topicDelete(actor: DvActor, id: string): Promise<NextResponse> {
  const err = await dvErrors();
  const limited = await rateLimited([{ key: `rl:topicreq:user:${actor.user.id}`, rule: LIMITS.topicRequestUser }], () => err.tooMany);
  if (limited) return limited;
  return withdrawTopic(actor, await storeFor(actor), id);
}

export async function changePost(actor: DvActor, itemId: string, req: Request): Promise<NextResponse> {
  const err = await dvErrors();
  const limited = await rateLimited(
    [
      { key: `rl:change:user:${actor.user.id}`, rule: LIMITS.changeRequestUser },
      { key: `rl:change:userday:${actor.user.id}`, rule: LIMITS.changeRequestUserDay },
    ],
    () => err.tooMany,
  );
  if (limited) return limited;
  const store = await storeFor(actor);
  const res = await createChange(actor, store, dentvidQueue, itemId, await req.json().catch(() => null), { jobOpts: CHANGE_JOB_OPTS });
  if (res.status === 503) {
    const body = (await res.clone().json().catch(() => ({}))) as { code?: string };
    if (body.code === "not_queued") await noteEnqueueFailure("change", "change", new Error("queue unavailable"), null).catch(() => {});
  }
  return res;
}

export async function subtitlesGet(actor: DvActor, itemId: string, req: Request): Promise<Response> {
  const err = await dvErrors();
  const limited = await rateLimited([{ key: `rl:subtitles:user:${actor.user.id}`, rule: LIMITS.subtitlesUser }], () => err.tooMany);
  if (limited) return limited;
  const format = new URL(req.url).searchParams.get("format") === "vtt" ? "vtt" : "srt";
  return subtitleResponse(actor.db, actor.user.id, itemId, format);
}
