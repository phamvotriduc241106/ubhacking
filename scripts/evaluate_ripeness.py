"""Evaluate pretrained crop classifier on the publisher's test split; no model training."""
from collections import Counter
from io import BytesIO
from pathlib import Path
import json
import zipfile
import numpy as np
from PIL import Image
from ultralytics import YOLO

root=Path(__file__).resolve().parents[1]
classes=['raw','half_ripe','ripe','rotten']
model=YOLO(str(root/'models/weights/ripeness_yolo26s-cls_best.pt'))
confusion={a:{b:0 for b in classes} for a in classes}
with zipfile.ZipFile(root/'datasets/tomato_ripeness_crops.zip') as archive:
    names=[n for n in archive.namelist() if n.startswith('cls_tomato/test/') and n.lower().endswith(('.jpg','.png','.jpeg'))]
    for i in range(0,len(names),32):
        batch=names[i:i+32]
        # Ultralytics accepts BGR arrays; images are model publisher's test crops.
        images=[np.asarray(Image.open(BytesIO(archive.read(n))).convert('RGB'))[:,:,::-1].copy() for n in batch]
        results=model.predict(images, imgsz=160, device='cpu', verbose=False)
        for name,r in zip(batch,results): confusion[name.split('/')[2]][model.names[int(r.probs.top1)]]+=1
        print(f'{min(i+32,len(names))}/{len(names)}',flush=True)
total=sum(sum(x.values()) for x in confusion.values()); correct=sum(confusion[c][c] for c in classes)
metrics={}
for c in classes:
    tp=confusion[c][c]; fp=sum(confusion[a][c] for a in classes if a!=c); fn=sum(confusion[c][b] for b in classes if b!=c)
    precision=tp/(tp+fp) if tp+fp else 0; recall=tp/(tp+fn) if tp+fn else 0
    metrics[c]={'support':sum(confusion[c].values()),'precision':precision,'recall':recall,'f1':2*precision*recall/(precision+recall) if precision+recall else 0}
result={'dataset':'publisher-held-out classification crops; not an independent field sample','images':total,'accuracy':correct/total,'confusion_matrix_rows_actual_columns_predicted':confusion,'classes':metrics}
out=root/'reports/ripeness-evaluation.json'; out.parent.mkdir(exist_ok=True); out.write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result,indent=2))
