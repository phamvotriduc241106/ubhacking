"""Fetch the pinned, publisher-provided pretrained model files (AGPL-3.0)."""
from pathlib import Path
from huggingface_hub import hf_hub_download

REPO = "ParsaVictor/tomato-ripeness-yolo26"
REVISION = "c9e792bf6e7908d305355b364a831ad1d622d8bb"
ROOT = Path(__file__).resolve().parents[1] / "models"
for name in ("detector_yolo26s_best.pt", "ripeness_yolo26s-cls_best.pt", "rotten_check.npz", "thresholds.json"):
    path = hf_hub_download(repo_id=REPO, filename=f"weights/{name}", revision=REVISION, local_dir=ROOT)
    print(f"Downloaded {name}: {path}")
