import json,glob,sys
seen=set(); out=[]
for f in sorted(glob.glob('puzzles-*.jsonl')):
    for l in open(f):
        p=json.loads(l)
        key=p['fen'].split(' ')[0]
        if key in seen: continue
        seen.add(key); out.append(p)
out.sort(key=lambda p:p['mate'])
res=[]; cnt={}
for p in out:
    cnt[p['mate']]=cnt.get(p['mate'],0)+1
    res.append({'id':f"m{p['mate']}-{cnt[p['mate']]}", 'fen':p['fen'], 'moves':p['moves'], 'mate':p['mate']})
json.dump(res, open(sys.argv[1],'w'), separators=(',',':'))
print(len(res), cnt)
