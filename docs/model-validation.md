# Model validation and data sources

## What was evaluated

`scripts/evaluate_ripeness.py` evaluated the publisher's pretrained YOLO26s classifier, without further training, on all **768** publisher-designated test crops in `tomato_ripeness_crops.zip` (dataset revision `91481266b3674f4eec31e72310888321d0e102f2`). Results and the actual confusion matrix are in [ripeness-evaluation.json](../reports/ripeness-evaluation.json). This evaluates the classifier on cropped images, **not** the detector-plus-classifier pipeline, rotten second opinion, Gemini, or the whole app. The dataset publisher reports a leakage-controlled split; we did not independently verify near-duplicates, grouping, or all source-image overlap. The data is not an independent field trial, and some images are multiple crops from one image. Scores are not calibrated probabilities.

| Class | Test crops | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| Raw | 186 | 85.9% | 81.7% | 83.7% |
| Half ripe | 339 | 80.5% | 81.4% | 80.9% |
| Ripe | 196 | 77.0% | 78.6% | 77.8% |
| Rotten | 47 | 81.3% | 83.0% | 82.1% |

Accuracy: **621 / 768 = 80.86%**. The small rotten subset and correlated crops limit confidence. This does not establish real-world harvest or food-safety performance. Independently collected farm images, source-level grouping, near-duplicate checks, and full-pipeline evaluation are still needed.

The actual pretrained detector, crop classifier, and rotten check were also smoke-tested on two publisher test crops. Those two checks are not an accuracy study.

## Reproduce

```bash
pip install -r backend/requirements.txt
python scripts/download_models.py
python scripts/download_dataset.py  # about 427 MB
python scripts/evaluate_ripeness.py
FOLLAND_RUN_MODEL_TESTS=1 python -m pytest -q tests/test_real_model.py
```

Weights and dataset are downloaded into ignored `models/` and `datasets/`. Loading PyTorch weights can execute serialized code; use only the pinned publisher files and review their provenance. Results depend on library and hardware versions.

## Source and license status

- [Hugging Face model](https://huggingface.co/ParsaVictor/tomato-ripeness-yolo26): AGPL-3.0, as stated on the model card. It uses Ultralytics; review model, library, network-distribution and commercial licensing with counsel before commercial deployment. An Ultralytics commercial license alone does not automatically change the license of third-party model weights.
- [Hugging Face tomato dataset](https://huggingface.co/datasets/ParsaVictor/tomato-ripeness-detection): CC BY 4.0; credit the dataset and its listed original sources. Model documentation reports a 10% padded crop, 160-pixel classifier, duplicate suppression and a second rotten check; FolLand implements these for still images.
- [Mendeley maturity and quality](https://data.mendeley.com/datasets/s42kpg8h37/1): CC BY 4.0. The publisher describes 2,986 originals and augmented images. Separate maturity/quality models have **not** been trained, and leakage between augmented relatives has not been assessed. The two source archives total about 5.45 GB; they were not downloaded.
- [Mendeley greenhouse measurements](https://data.mendeley.com/datasets/tkbkzdt5nr/1): CC BY 4.0. Historical greenhouse data is **not integrated or analyzed**; no plant-quality prediction from air readings is claimed.
- [NASA MOD13Q4N](https://data.nasa.gov/dataset/modis-terra-vegetation-indices-daily-rolling-8-day-l3-global-250m-sin-grid-nrt-81bcb): **not implemented**; regional satellite data must not be interpreted as individual-plant health.

Gemini calls are optional; without an operator-provided key the app returns an explicitly labeled deterministic report. The full real Gemini workflow has not been tested against a live key. Generated text can still be inaccurate; use the deterministic cards and evidence as the authoritative app outputs and review before acting. No field, physical sensor, or independent agronomic validation has been performed.
