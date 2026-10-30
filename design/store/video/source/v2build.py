import subprocess, json
import os
S=os.path.dirname(os.path.abspath(__file__))+'/'
V=S+'v2/'; B=S+'build/'; os.makedirs(B,exist_ok=True); REC=S+'video2/demo.webm'
VO=S+'vo2/vo2.mp3'
L3=S+'vo2/line3.mp3'  # lines 3 and 6 re-recorded on their own
L6=S+'vo2/line6.mp3'
MUS=S+'vo2/music-taking-flight.mp3'
def run(args): subprocess.run(args, check=True)
SC=1000/824
# scenes: rec start, rec end, out start, out end, y (rec px) or ('pan',a,b)
# y: fixed rec px, or ('keys', [(rec t, rec px), ...]) so the camera follows each tap
BOOK=[(8.3,120),(8.9,120),(9.0,0),(11.3,0),(11.7,400),(13.7,400),(14.0,600),(14.7,600),(15.1,920),
      (18.00,920),(18.035,120),(18.75,120),(19.0,0),(19.8,0)]
# booking: the opening taps are slowed to land on "I tap Ava, then Monday, pick the holiday club",
# then it cuts from the Wed tick straight to picking Mum, and from Mum's times straight to the week
scenes=[(1.0,4.6,4.5,8.0,0),(5.8,8.3,8.0,11.2,120),
        (8.3,9.0,11.2,12.6,('keys',BOOK)),(9.0,10.5,12.6,14.6,('keys',BOOK)),(10.5,17.9,14.6,22.8,('keys',BOOK)),
        (21.2,23.5,22.8,25.1,200),
        (31.0,34.8,25.1,29.5,120),(35.0,38.4,29.5,37.4,920),(38.4,39.6,37.4,38.6,920),(41.0,43.8,38.6,42.6,0)]
T0=scenes[0][2]; TEND=scenes[-1][3]; TOTAL=47.5
L3_TEMPO=0.9  # line 3 is spoken a little slower
# 1) phone stream, each scene stretched to its slot
parts=[]; ys=[]; clock=0.0  # camera timed from each clip's real length, so a cut never lands a frame early
for i,(a,b,c,d,y) in enumerate(scenes):
    f=f'{B}seg{i}.mp4'; parts.append(f)
    k=(d-c)/(b-a)
    run(['ffmpeg','-loglevel','error','-y','-ss',str(a),'-to',str(b),'-i',REC,'-vf',f'setpts=PTS*{k:.4f},fps=30','-an','-c:v','libx264','-crf','14','-preset','fast',f])
    real=float(subprocess.run(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','csv=p=0',f],capture_output=True,text=True).stdout)/30
    lc, ld = clock, clock+real; clock=ld; k=real/(b-a)
    if isinstance(y,tuple):
        keys=y[1]
        def at(r): return next(y1+(y2-y1)*(r-r1)/(r2-r1) for (r1,y1),(r2,y2) in zip(keys,keys[1:]) if r1<=r<=r2)
        inside=[(a,at(a))]+[(r,yy) for r,yy in keys if a<r<b]+[(b,at(b))]
        pts=[(lc+(r-a)*k, yy*SC) for r,yy in inside]
        for (t1,y1),(t2,y2) in zip(pts,pts[1:]):
            ys.append(f'between(t,{t1:.3f},{t2:.3f}-0.001)*({y1:.1f}+({y2-y1:.1f})*(t-{t1:.3f})/{t2-t1:.3f})')
    else: ys.append(f'between(t,{lc:.3f},{ld:.3f}-0.001)*{y*SC:.1f}')
open(B+'list.txt','w').write(''.join(f"file '{p}'\n" for p in parts))
run(['ffmpeg','-loglevel','error','-y','-f','concat','-safe','0','-i',B+'list.txt','-c','copy',B+'phone.mp4'])
yexpr='min(1117,max(0,'+'+'.join(ys)+'))'
# 2) voice lines: (vo start, vo end, placement)
# each line is a list of clips; line 3 is split at its pauses so the words land on the taps
L=[[(0.0,6.89,0.6)],[(7.16,9.90,8.3)],[(0.0,2.45,11.1,'l3'),(2.55,3.70,14.0,'l3'),(3.80,4.65,17.0,'l3'),(4.95,5.95,18.3,'l3'),(6.10,8.20,20.4,'l3')],[(17.46,19.55,23.1)],
   [(19.82,22.95,25.4)],[(0.0,8.55,29.8,'l6')],[(27.99,31.47,38.9)],[(31.69,34.70,43.0)]]
CLIPS=[clip for line in L for clip in line]
inputs=['-loop','1','-framerate','30','-t',str(TOTAL),'-i',V+'bg.png',
        '-i',B+'phone.mp4',
        '-loop','1','-framerate','30','-t',str(TOTAL),'-i',V+'frame.png',
        '-loop','1','-framerate','30','-t',str(TOTAL),'-i',V+'intro.png',
        '-loop','1','-framerate','30','-t',str(TOTAL),'-i',V+'outro.png']
for i in range(8): inputs+=['-loop','1','-framerate','30','-t',str(TOTAL),'-i',V+f'line{i+1}.png']
inputs+=['-i',VO,'-i',MUS,'-i',L3,'-i',L6]
f=[]
f.append(f"[1:v]scale=1000:2165:flags=lanczos,pad=1032:2197:16:16:color=0x2B1B2E[ph]")
f.append(f"[ph][2:v]overlay=0:0:shortest=1[phf]")
f.append(f"[phf]crop=1032:1080:0:'{yexpr}',setpts=PTS+{T0}/TB[phc]")
f.append(f"[0:v][phc]overlay=808:0:eof_action=pass[b0]")
prev='b0'; last_en=0
for i,line in enumerate(L):
    if i in (0,7): continue  # first/last line sit on the title cards
    la,lb,lc,*src=line[-1]
    st=max(line[0][2]-0.15, last_en+0.3); en=lc+(lb-la)/(L3_TEMPO if src==['l3'] else 1)+0.4; last_en=en  # headlines never overlap
    f.append(f"[{5+i}:v]format=rgba,fade=in:st={st:.2f}:d=0.3:alpha=1,fade=out:st={en:.2f}:d=0.3:alpha=1[s{i}]")
    f.append(f"[{prev}][s{i}]overlay=0:0:shortest=1[o{i}]"); prev=f'o{i}'
# line 1 second half ("So I plan it all") shows over the home scene
f.append(f"[5:v]format=rgba,fade=in:st={T0-0.2:.2f}:d=0.3:alpha=1,fade=out:st={T0+3.0:.2f}:d=0.3:alpha=1[s0]")
f.append(f"[{prev}][s0]overlay=0:0:shortest=1[o0]"); prev='o0'
f.append(f"[3:v]format=rgba,fade=out:st={T0-0.3:.2f}:d=0.6:alpha=1[ia]")
f.append(f"[{prev}][ia]overlay=0:0:shortest=1[oi]")
f.append(f"[4:v]format=rgba,fade=in:st={TEND-0.3:.2f}:d=0.6:alpha=1[oa]")
f.append(f"[oi][oa]overlay=0:0:shortest=1,format=yuv420p[vout]")
# audio
vi=5+8; mi=vi+1
amix=[]
for i,(a,b,c,*src) in enumerate(CLIPS):
    tempo=f',atempo={L3_TEMPO}' if src==['l3'] else ''
    f.append(f"[{ {'l3':mi+1,'l6':mi+2}[src[0]] if src else vi}:a]atrim={a}:{b},asetpts=PTS-STARTPTS{tempo},adelay={int(c*1000)}|{int(c*1000)}[v{i}]"); amix.append(f'[v{i}]')
f.append(''.join(amix)+f"amix=inputs={len(CLIPS)}:normalize=0,apad,atrim=0:{TOTAL},asplit=2[voice][key]")
f.append(f"[{mi}:a]atrim=0:{TOTAL},asetpts=PTS-STARTPTS,volume=0.32,afade=in:st=0:d=1,afade=out:st={TOTAL-2.5}:d=2.5[mus]")
f.append("[mus][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck]")
f.append("[duck][voice]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]")
run(['ffmpeg','-loglevel','error','-y',*inputs,'-filter_complex',';'.join(f),'-map','[vout]','-map','[aout]','-t',str(TOTAL),'-r','30',
     '-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',S+'../kidrota-demo.mp4'])
print('done')
