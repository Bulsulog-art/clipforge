#!/bin/bash
# Runs on Liman. stdin: the demo password (one line). Never echoes it.
set -euo pipefail
cd /root/dv-demo-tmp
IFS= read -r PW
EMAIL=appreview@dentvideo.com
psql() { docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
# 1. backup
mkdir -p /root/backups && chmod 700 /root/backups
F=/root/backups/dentvid-pre-review-demo-$(date -u +%Y%m%dT%H%M).sql.gz
T=$(psql -At -c "select string_agg(format(\$\$-t public.%I\$\$, tablename), \$\$ \$\$) from pg_tables where schemaname=\$\$public\$\$ and tablename like \$\$dentvid%\$\$")
docker exec supabase-db pg_dump -U postgres -d postgres $T | gzip > $F; chmod 600 $F; echo "backup: $F $(stat -c %s $F) bytes"
# 2. migration
psql -q < 0024_dentvid_review_demo.sql && echo "migration 0024 applied"
# 3. user
KEY=$(docker exec supabase-kong printenv SUPABASE_SERVICE_KEY)
BASE=https://liman.bulsulabs.com
BODY=$(python3 -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"password":sys.stdin.readline().rstrip("\n"),"email_confirm":True,"app_metadata":{"product":"dentvideo","internal":True,"review_demo":True},"user_metadata":{"product":"dentvideo"}}))' "$EMAIL" <<<"$PW")
RES=$(curl -sS -X POST "$BASE/auth/v1/admin/users" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" --data-binary @- <<<"$BODY")
unset BODY PW
UID_=$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("id",""))' <<<"$RES")
if [ -z "$UID_" ]; then echo "user create failed: $(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("msg") or d.get("error_code") or d.get("message"))' <<<"$RES")"; exit 1; fi
echo "user: $UID_"
# 4. clinic: Practice set by hand, no payment; review_demo keeps it out of the Monday batch
CLINIC=$(psql -At -c "insert into public.dentvid_clinics (owner_id, profile, plan, plan_tier, review_demo, email_opt_out_at) values ('$UID_', '{\"name\":\"DentVideo Review Clinic\",\"city\":\"Austin\",\"country\":\"US\",\"language\":\"en\",\"tone\":\"warm\",\"address\":\"informal\",\"handle\":\"dentvideoreview\",\"brandColor\":\"2563EB\",\"services\":[\"Cleaning\",\"Whitening\",\"Clear aligners\",\"Implants\"]}'::jsonb, 'active', 'practice', true, now()) returning id" | head -1)
echo "clinic: $CLINIC"
# 5. items + files
python3 - "$UID_" "$CLINIC" <<'PY' > items.sql
import json,sys,uuid
uid,clinic=sys.argv[1],sys.argv[2]
def q(v): return "'"+json.dumps(v,ensure_ascii=False).replace("'","''")+"'::jsonb"
def s(v): return "'"+v.replace("'","''")+"'"
rows=[]; m=open('map.txt','w')
for n,it in enumerate(json.load(open('items.json'))):
    iid=str(uuid.uuid4())
    m.write(f"{it['slug']} {uid}/{iid}\n")
    rows.append(f"insert into public.dentvid_items (id, clinic_id, owner_id, kind, week_of, status, approval, title, topic, plan, copy, spoken, checks, findings, shoot_card, qa, video_path, thumb_path, created_at) values ('{iid}','{clinic}','{uid}','generated', date_trunc('week', now() + interval '30 hours')::date, 'ready','pending',{s(it['title'])},{q(it['topic'])},{q(it['plan'])},{q(it['copy'])},{s(it['spoken'])},{q(it['checks'])},'[]'::jsonb,{q(it['shoot_card'])},'{{\"ok\":true}}'::jsonb,'{uid}/{iid}.mp4','{uid}/{iid}.jpg', now() - interval '{n} minutes');")
print("\n".join(rows))
PY
while read -r slug path; do
  for ext in mp4 jpg; do
    ct=$([ $ext = mp4 ] && echo video/mp4 || echo image/jpeg)
    code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/storage/v1/object/dentvid/$path.$ext" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: $ct" -H "x-upsert: true" --data-binary @"$slug.$ext")
    echo "upload $slug.$ext -> $code"; [ "$code" = 200 ] || exit 1
  done
done < map.txt
psql -q < items.sql && echo "items inserted"
psql -At -c "select c.plan, c.review_demo, c.email_opt_out_at is not null, (select count(*) from public.dentvid_items i where i.clinic_id=c.id), (select string_agg(distinct week_of::text, ',') from public.dentvid_items i where i.clinic_id=c.id) from public.dentvid_clinics c where c.id='$CLINIC'"
unset KEY
