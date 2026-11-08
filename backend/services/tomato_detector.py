"""Publisher's detector and 160px ripeness classifier, loaded lazily once per process."""
from collections import Counter
from functools import lru_cache
from pathlib import Path
from threading import Lock

MODEL_DIR = Path(__file__).resolve().parents[2] / 'models' / 'weights'
MODEL_LOCK = Lock()

@lru_cache(maxsize=1)
def load_models():
    from ultralytics import YOLO
    import numpy as np
    det = YOLO(str(MODEL_DIR / 'detector_yolo26s_best.pt'))
    classifier = YOLO(str(MODEL_DIR / 'ripeness_yolo26s-cls_best.pt'))
    embedding = YOLO(str(MODEL_DIR / 'ripeness_yolo26s-cls_best.pt'))
    check = np.load(MODEL_DIR / 'rotten_check.npz', allow_pickle=False)
    return det, classifier, embedding, (check['coef'], float(check['intercept']))

def infer_image(image_bytes: bytes) -> dict:
    import cv2
    import numpy as np
    from PIL import Image, ImageOps
    from io import BytesIO
    # Normalize orientation so boxes correspond to the displayed image.
    with Image.open(BytesIO(image_bytes)) as source:
        oriented = ImageOps.exif_transpose(source).convert('RGB')
        if oriented.width * oriented.height > 25_000_000:
            raise ValueError('Image exceeds the 25 megapixel limit.')
        image = cv2.cvtColor(np.asarray(oriented), cv2.COLOR_RGB2BGR)
    height, width = image.shape[:2]
    if not all((MODEL_DIR / name).exists() for name in ('detector_yolo26s_best.pt','ripeness_yolo26s-cls_best.pt','rotten_check.npz')):
        return {'status': 'unavailable', 'message': 'Model weights are not installed.', 'width': width, 'height': height, 'detections': [], 'counts': {}}
    with MODEL_LOCK:
        detector, classifier, embedding, (coef, intercept) = load_models()
        result = detector.predict(image, imgsz=640, conf=0.25, device='cpu', verbose=False)[0]
        boxes = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        # Suppress overlapping boxes, keeping the most confident first.
        retained = []
        for i in sorted(range(len(boxes)), key=lambda j: -confidences[j]):
            x1, y1, x2, y2 = boxes[i]
            if any(_iou(boxes[i], boxes[j]) > 0.55 for j in retained):
                continue
            if x2 - x1 >= 4 and y2 - y1 >= 4:
                retained.append(i)
        crops, kept = [], []
        for i in retained[:100]:
            x1,y1,x2,y2 = boxes[i]; bw,bh=x2-x1,y2-y1
            xa,ya=int(max(0,x1-.1*bw)),int(max(0,y1-.1*bh))
            xb,yb=int(min(width,x2+.1*bw)),int(min(height,y2+.1*bh))
            crop=image[ya:yb,xa:xb]
            if crop.size:
                crops.append(cv2.resize(crop,(160,160),interpolation=cv2.INTER_AREA)); kept.append(i)
        results = classifier.predict(crops, imgsz=160, device='cpu', verbose=False) if crops else []
        detections=[]
        for i,crop,r in zip(kept,crops,results):
            probs=r.probs.data.cpu().numpy(); top=int(probs.argmax()); label=classifier.names[top]; confidence=float(probs[top]); check_prob=None; raw_label=label
            if label == 'rotten':
                vector=embedding.embed([crop],imgsz=160,device='cpu',verbose=False)[0].cpu().numpy()
                vector=vector/max(float(np.linalg.norm(vector)),1e-6)
                z=float(vector @ coef + intercept); check_prob=float(1/(1+np.exp(-np.clip(z,-50,50))))
                if check_prob < .5:
                    others=[j for j in range(len(probs)) if classifier.names[j] != 'rotten']
                    alt=max(others,key=lambda j: probs[j]); label=classifier.names[alt]; confidence=float(probs[alt]/max(1e-6,1-probs[top]))
            detections.append({'box': [round(float(v),2) for v in boxes[i]], 'detection_confidence':float(confidences[i]), 'label':label, 'confidence':confidence, 'raw_label':raw_label, 'rotten_check_probability':check_prob, 'uncertain':confidence < .55})
    return {'status':'ok', 'message':'Model probabilities are uncalibrated; field performance is not validated.', 'width':width, 'height':height, 'detections':detections, 'counts':dict(Counter(d['label'] for d in detections))}

def _iou(a,b):
    x1,y1=max(a[0],b[0]),max(a[1],b[1]); x2,y2=min(a[2],b[2]),min(a[3],b[3])
    intersection=max(0,x2-x1)*max(0,y2-y1)
    union=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-intersection
    return intersection/union if union else 0
