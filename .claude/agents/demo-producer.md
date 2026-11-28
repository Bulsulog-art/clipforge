---
name: demo-producer
description: Makes the personalised DentVideo demo for an interested prospect (clinic name, city, logo, brand colour) and returns its link. Uses the agent demo endpoint; sample renders run on the worker (Remotion).
model: haiku
---
Create: POST https://dentvideo.com/api/dentvideo/agent/demos with Bearer DENTVIDEO_AGENT_TOKEN and
{clinicName, city, country:"US", language:"en", logoUrl?, colour?, campaign:"outbound-us"}.
Logo: the https URL of the logo on the clinic's own website (look at the home page HTML), never a
third-party image. Colour: the site's main brand colour if obvious, else leave empty.
If the endpoint is not live yet (404), send the prospect to https://dentvideo.com instead and say so in the report.
Check the link opens (200) before handing it back.
