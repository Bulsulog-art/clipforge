#!/usr/bin/env python3
"""
One-time generation of the DentVideo background-photo library (by us, not by
customers). Reads prompts.v<N>.json, calls fal.ai flux/dev once per prompt and
saves the raw images plus a results file for the review step.

    python3 -I scripts/dentvideo-backgrounds/generate.py \
        --prompts scripts/dentvideo-backgrounds/prompts.v1.json --out <raw-dir> [--only whitening-03,...] [--reseed]

Resumable: an id whose raw image already exists is skipped. Seeds are derived
from the id (and a re-roll counter) so a run is reproducible.
Auth: FAL_KEY env, or "proxy" when a proxy injects the key.
"""
import argparse, concurrent.futures as cf, hashlib, json, os, ssl, sys, urllib.request

def seed_for(image_id: str, roll: int) -> int:
    return int(hashlib.sha256(f"{image_id}:{roll}".encode()).hexdigest()[:8], 16) % 2_000_000_000

def ctx():
    ca = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
    return ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()

def post(url, body, key):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": f"Key {key}", "content-type": "application/json"})
    with urllib.request.urlopen(req, context=ctx(), timeout=180) as r:
        return json.load(r)

def download(url, dest):
    with urllib.request.urlopen(url, context=ctx(), timeout=120) as r, open(dest, "wb") as f:
        f.write(r.read())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompts", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--roll", type=int, default=0, help="re-roll counter for --only ids (new seed)")
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    spec = json.load(open(a.prompts))
    os.makedirs(a.out, exist_ok=True)
    results_path = os.path.join(a.out, "results.json")
    results = json.load(open(results_path)) if os.path.exists(results_path) else {}
    only = set(filter(None, a.only.split(",")))
    key = os.environ.get("FAL_KEY", "proxy")

    jobs = []
    for cat, c in spec["categories"].items():
        for i, p in enumerate(c["prompts"], 1):
            image_id = f"{cat}-{i:02d}"
            if only and image_id not in only:
                continue
            roll = a.roll if only else 0
            dest = os.path.join(a.out, f"{image_id}.jpg")
            if os.path.exists(dest) and not only:
                continue
            prompt = f"{p['subject'][0].upper()}{p['subject'][1:]}. {spec['style']}"
            jobs.append((image_id, cat, p, prompt, seed_for(image_id, roll), dest))

    def run(j):
        image_id, cat, p, prompt, seed, dest = j
        body = {"prompt": prompt, "image_size": spec["size"], "num_images": 1, "seed": seed,
                "num_inference_steps": spec["steps"], "guidance_scale": spec["guidance"], "enable_safety_checker": True}
        res = post(f"https://fal.run/{spec['model']}", body, key)
        img = res["images"][0]
        download(img["url"], dest)
        with open(os.path.join(a.out, "calls.log"), "a") as log:  # every paid call, re-rolls included
            log.write(f"{image_id}\t{seed}\t{img['width'] * img['height'] / 1e6:.3f}\n")
        return image_id, {"category": cat, "subject": p["subject"], "tags": p.get("tags", []), "prompt": prompt,
                          "seed": seed, "width": img["width"], "height": img["height"],
                          "nsfw": res.get("has_nsfw_concepts", [False])[0], "megapixels": img["width"] * img["height"] / 1e6}

    done = 0
    with cf.ThreadPoolExecutor(a.workers) as ex:
        for fut in cf.as_completed([ex.submit(run, j) for j in jobs]):
            try:
                image_id, r = fut.result()
                results[image_id] = r
                done += 1
                if done % 10 == 0:
                    json.dump(results, open(results_path, "w"), indent=1)
                print(f"ok {image_id} seed={r['seed']}", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"FAIL {e}", file=sys.stderr, flush=True)
    json.dump(results, open(results_path, "w"), indent=1)
    print(f"generated {done}/{len(jobs)}; total megapixels so far {sum(r['megapixels'] for r in results.values()):.1f}")

if __name__ == "__main__":
    main()
