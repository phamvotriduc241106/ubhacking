"""Download the publisher's pinned classification dataset for held-out evaluation."""
from pathlib import Path
from huggingface_hub import hf_hub_download
root = Path(__file__).resolve().parents[1] / 'datasets'
path = hf_hub_download(repo_id='ParsaVictor/tomato-ripeness-detection', repo_type='dataset', revision='91481266b3674f4eec31e72310888321d0e102f2', filename='tomato_ripeness_crops.zip', local_dir=root)
print(path)
