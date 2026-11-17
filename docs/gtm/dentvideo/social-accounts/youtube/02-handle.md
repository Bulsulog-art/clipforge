# Handle

Checked 2026-11-17 with a plain, logged-out HTTP GET of `https://www.youtube.com/@<handle>`. A 404 means no
channel currently answers at that handle. It does **not** prove the handle can be claimed: YouTube also blocks
handles that are reserved, recently released, or too close to an existing one. The real test is the green tick in
the handle field while creating the channel.

| Handle | Result | Note |
|---|---|---|
| @dentvideo | **Taken** | Channel "Dent VideO" (channel id UCqP_mT5OVYwNy4MD8vI57Aw, roughly a hundred subscribers, no description). Not ours. |
| @dentvideoapp | 404, looks free | **First choice.** Matches the LinkedIn fallback `dentvideo-app` in PROFIL-KITI.md. DentVideo is a web app, so "app" is accurate (it never implies an App Store app). |
| @dentvideocom | 404, looks free | Second choice. Mirrors the domain exactly. |
| @dentvideohq | 404, looks free | Third choice. |
| @dentvideo.app | 404 | Dots read as a URL; avoid. |
| @dentvideo-app | 404 | Hyphen is easy to mistype when said out loud. |
| @dentvideotr / @dentvideo.tr / @dentvideo_tr | 404 | Too narrow: the channel will also carry EN and DE. |
| @dentvideoofficial | 404 | Long; "official" adds nothing. |
| @dentvideoclinic | 404 | Misleading: DentVideo is not a clinic. |
| @thisisdentvideo, @dent.video, @dentvideo.global, @dentvideoeu, @dentvideo.studio | 404 | Not recommended. |

**Use @dentvideoapp.** If YouTube refuses it, use @dentvideocom, then @dentvideohq. Keep the same handle on TikTok
and Instagram where possible, and report the final handle back so it can go into the site's `sameAs`.

Do not contact the owner of @dentvideo or file a trademark claim for it without the owner's decision.
