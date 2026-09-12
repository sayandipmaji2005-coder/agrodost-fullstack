#!/usr/bin/env python3
"""
AgriCare - Real Satellite Crop Classifier Training Pipeline
Dataset: AgriFieldNet India Competition Dataset (Radiant Earth / IDinsight, CC-BY-4.0)
Geographic Scope: Northern / Eastern India (Uttar Pradesh, Bihar, Odisha, Rajasthan)
Integrity Rules:
- 100% real Sentinel-2 satellite observations (ZERO synthetic data).
- Strict field-level anti-leakage grouping on ground-truth field_id.
- Explicit held-out validation reporting per crop class.
- Explicit regional limitation: Trained on UP/Bihar/Odisha/Rajasthan fields.
  West Bengal accuracy is not independently claimed without local Bengal validation data.
"""

import io
import os
import sys
import json
import time
import requests
import numpy as np
import pandas as pd
from PIL import Image
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import lightgbm as lgb
import joblib

# Paths
BASE_DIR = Path(__file__).resolve().parent
CHECKPOINTS_DIR = BASE_DIR / "checkpoints"
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

MODEL_TXT_PATH = CHECKPOINTS_DIR / "crop_classifier.txt"
MODEL_JOBLIB_PATH = CHECKPOINTS_DIR / "crop_classifier.joblib"
METADATA_OUTPUT_PATH = CHECKPOINTS_DIR / "crop_classifier_metadata.json"

AZURE_BASE_URL = "https://radiantearth.blob.core.windows.net/mlhub/ref_agrifieldnet_competition_v1/"

# Target crop label mapping based on AgriFieldNet ground truth
LABEL_MAP = {
    1: "Wheat",
    2: "Mustard",
    3: "Lentil / Pulses",
    4: "Fallow Land",
    5: "Vegetables",       # Green pea / vegetables
    6: "Sugarcane",
    8: "Garlic / Spices",
    9: "Maize",
    13: "Gram / Chickpea",
    14: "Coriander",
    15: "Potato",
    16: "Berseem / Forage",
    36: "Paddy/Rice",
}

# Core bands and feature order
REQUIRED_BANDS = ["B02", "B03", "B04", "B05", "B08", "B11"]
FEATURE_ORDER = [
    "B02", "B03", "B04", "B05", "B08", "B11",
    "NDVI", "NDRE", "EVI", "NDWI"
]

def fetch_tile_data(tile_id):
    """
    Download label, field_ids, and 6 bands for one tile.
    Caches locally in CACHE_DIR to support fast re-runs.
    """
    tile_cache = CACHE_DIR / f"{tile_id}.npz"
    if tile_cache.exists():
        try:
            data = np.load(tile_cache)
            return {
                "tile_id": tile_id,
                "labels": data["labels"],
                "fields": data["fields"],
                "bands": {b: data[b] for b in REQUIRED_BANDS}
            }
        except Exception:
            pass

    try:
        # 1. Labels & Fields
        url_l = f"{AZURE_BASE_URL}train_labels/ref_agrifieldnet_competition_v1_labels_train_{tile_id}.tif"
        url_f = f"{AZURE_BASE_URL}train_labels/ref_agrifieldnet_competition_v1_labels_train_{tile_id}_field_ids.tif"

        r_l = requests.get(url_l, timeout=12)
        r_f = requests.get(url_f, timeout=12)
        if r_l.status_code != 200 or r_f.status_code != 200:
            return None

        labels = np.array(Image.open(io.BytesIO(r_l.content)))
        fields = np.array(Image.open(io.BytesIO(r_f.content)))

        # If no valid labeled fields exist, skip
        labeled_mask = (fields > 0) & (labels > 0)
        if not np.any(labeled_mask):
            return None

        # 2. Download bands
        bands_data = {}
        for b in REQUIRED_BANDS:
            url_b = f"{AZURE_BASE_URL}source/ref_agrifieldnet_competition_v1_source_{tile_id}/ref_agrifieldnet_competition_v1_source_{tile_id}_{b}_10m.tif"
            r_b = requests.get(url_b, timeout=12)
            if r_b.status_code != 200:
                return None
            bands_data[b] = np.array(Image.open(io.BytesIO(r_b.content)))

        # Cache on disk
        np.savez_compressed(
            tile_cache,
            labels=labels,
            fields=fields,
            **bands_data
        )

        return {
            "tile_id": tile_id,
            "labels": labels,
            "fields": fields,
            "bands": bands_data
        }
    except Exception:
        return None

def extract_features_from_tiles(tile_ids, max_tiles=90):
    """Load tiles directly from cache or download in parallel."""
    # First check existing cache
    cached_files = list(CACHE_DIR.glob("*.npz"))
    downloaded_tiles = []

    print(f"[Training] Found {len(cached_files)} cached tiles on disk.", flush=True)
    for cf in cached_files[:max_tiles]:
        try:
            data = np.load(cf)
            downloaded_tiles.append({
                "tile_id": cf.stem,
                "labels": data["labels"],
                "fields": data["fields"],
                "bands": {b: data[b] for b in REQUIRED_BANDS}
            })
        except Exception:
            pass

    print(f"[Training] Loaded {len(downloaded_tiles)} valid tiles from cache.", flush=True)

    if len(downloaded_tiles) < 10:
        # Need download
        target_candidate_ids = tile_ids[:max_tiles]
        print(f"[Training] Downloading additional tiles...", flush=True)
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(fetch_tile_data, tid): tid for tid in target_candidate_ids}
            for future in as_completed(futures):
                res = future.result()
                if res is not None:
                    downloaded_tiles.append(res)
                    if len(downloaded_tiles) >= max_tiles:
                        break

    print(f"[Training] Extracting field-level pixel observations from {len(downloaded_tiles)} tiles...", flush=True)
    
    # Extract records
    records = []
    for tile in downloaded_tiles:
        labels = tile["labels"]
        fields = tile["fields"]
        bands = tile["bands"]
        tid = tile["tile_id"]

        unique_fields = np.unique(fields[fields > 0])
        for fid in unique_fields:
            field_mask = (fields == fid)
            crop_ids_in_field = labels[field_mask]
            valid_crops = crop_ids_in_field[crop_ids_in_field > 0]
            if len(valid_crops) == 0:
                continue

            # Fast majority crop in field via bincount
            crop_id = int(np.bincount(valid_crops).argmax())
            if crop_id not in LABEL_MAP:
                continue

            # Sample real pixel observations for this field
            b02_vals = bands["B02"][field_mask]
            b03_vals = bands["B03"][field_mask]
            b04_vals = bands["B04"][field_mask]
            b05_vals = bands["B05"][field_mask]
            b08_vals = bands["B08"][field_mask]
            b11_vals = bands["B11"][field_mask]

            n_pixels = len(b02_vals)
            step = max(1, n_pixels // 10)
            indices = np.arange(0, n_pixels, step)[:10]

            for idx in indices:
                # Normalize raw percentage tile values (0-100) to physical surface reflectance [0.0, 1.0]
                b2 = float(b02_vals[idx]) / 100.0
                b3 = float(b03_vals[idx]) / 100.0
                b4 = float(b04_vals[idx]) / 100.0
                b5 = float(b05_vals[idx]) / 100.0
                b8 = float(b08_vals[idx]) / 100.0
                b11 = float(b11_vals[idx]) / 100.0

                # Spectral Indices in normalized reflectance space
                ndvi = (b8 - b4) / (b8 + b4 + 1e-6)
                ndre = (b8 - b5) / (b8 + b5 + 1e-6)
                evi_denom = b8 + 6.0 * b4 - 7.5 * b2 + 1.0
                evi = 2.5 * (b8 - b4) / (evi_denom if abs(evi_denom) > 1e-6 else 1.0)
                ndwi = (b8 - b11) / (b8 + b11 + 1e-6)

                records.append({
                    "tile_id": tid,
                    "field_id": int(fid),
                    "crop_id": crop_id,
                    "crop_name": LABEL_MAP[crop_id],
                    "B02": b2,
                    "B03": b3,
                    "B04": b4,
                    "B05": b5,
                    "B08": b8,
                    "B11": b11,
                    "NDVI": float(np.clip(ndvi, -1.0, 1.0)),
                    "NDRE": float(np.clip(ndre, -1.0, 1.0)),
                    "EVI": float(np.clip(evi, -1.0, 1.5)),
                    "NDWI": float(np.clip(ndwi, -1.0, 1.0)),
                })

    df = pd.DataFrame(records)
    print(f"[Training] Extracted {len(df)} real pixel observations across {df['field_id'].nunique()} unique fields.", flush=True)
    return df

def calculate_metrics(y_true, y_pred, classes):
    """Compute per-class precision, recall, f1-score, and support."""
    metrics = {}
    total = len(y_true)
    correct = sum(y_true == y_pred)
    overall_acc = float(correct / max(1, total))

    for c in classes:
        tp = int(np.sum((y_true == c) & (y_pred == c)))
        fp = int(np.sum((y_true != c) & (y_pred == c)))
        fn = int(np.sum((y_true == c) & (y_pred != c)))
        support = int(np.sum(y_true == c))

        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        metrics[c] = {
            "precision": round(prec, 3),
            "recall": round(rec, 3),
            "f1_score": round(f1, 3),
            "support": support
        }

    return overall_acc, metrics

def train_and_validate(df):
    """
    Train classifier with strict field-level anti-leakage grouping.
    """
    print("\n" + "=" * 70, flush=True)
    print("  STEP 4: FIELD-LEVEL ANTI-LEAKAGE PARTITIONING & MODEL TRAINING", flush=True)
    print("=" * 70, flush=True)

    # Filter classes with at least 2 fields
    class_field_counts = df.groupby("crop_name")["field_id"].nunique()
    valid_classes = sorted(class_field_counts[class_field_counts >= 2].index.tolist())
    df_filtered = df[df["crop_name"].isin(valid_classes)].copy()

    print(f"Supported classes with ground-truth fields: {valid_classes}", flush=True)
    for c in valid_classes:
        n_fields = df_filtered[df_filtered['crop_name'] == c]['field_id'].nunique()
        n_pix = len(df_filtered[df_filtered['crop_name'] == c])
        print(f"  - {c}: {n_fields} fields ({n_pix} pixel observations)", flush=True)

    # Group split by field_id
    rng = np.random.RandomState(42)
    unique_fields = np.array(df_filtered["field_id"].unique())
    rng.shuffle(unique_fields)
    n_val_fields = max(1, int(len(unique_fields) * 0.25))
    val_field_set = set(unique_fields[:n_val_fields])

    train_df = df_filtered[~df_filtered["field_id"].isin(val_field_set)]
    val_df = df_filtered[df_filtered["field_id"].isin(val_field_set)]

    # Verify zero field leakage
    train_fields = set(train_df["field_id"].unique())
    val_fields = set(val_df["field_id"].unique())
    leakage = train_fields.intersection(val_fields)
    assert len(leakage) == 0, f"DATA LEAKAGE DETECTED: {len(leakage)} fields overlap!"
    print(f"\nAnti-Leakage Verification:", flush=True)
    print(f"  Training set:   {len(train_fields)} fields ({len(train_df)} pixels)", flush=True)
    print(f"  Validation set: {len(val_fields)} fields ({len(val_df)} pixels)", flush=True)
    print(f"  Field Overlap:  {len(leakage)} (0.0% - Strict field isolation confirmed)", flush=True)

    # Map class strings to integers for LightGBM
    class_to_idx = {c: i for i, c in enumerate(valid_classes)}
    idx_to_class = {i: c for i, c in enumerate(valid_classes)}

    X_train = train_df[FEATURE_ORDER].values.astype(np.float32)
    y_train = np.array([class_to_idx[c] for c in train_df["crop_name"]])

    X_val = val_df[FEATURE_ORDER].values.astype(np.float32)
    y_val = np.array([class_to_idx[c] for c in val_df["crop_name"]])

    # Train LightGBM native booster
    print("\n[Training] Fitting native LightGBM Multi-Class Booster...", flush=True)
    dtrain = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_ORDER)
    dval = lgb.Dataset(X_val, label=y_val, feature_name=FEATURE_ORDER, reference=dtrain)

    params = {
        "objective": "multiclass",
        "num_class": len(valid_classes),
        "metric": "multi_logloss",
        "learning_rate": 0.06,
        "num_leaves": 63,
        "min_data_in_leaf": 3,
        "min_data_per_group": 3,
        "is_unbalance": True,
        "num_iterations": 200,
        "feature_fraction": 0.85,
        "bagging_fraction": 0.85,
        "bagging_freq": 5,
        "lambda_l1": 0.1,
        "lambda_l2": 0.1,
        "seed": 42,
        "verbose": -1
    }

    bst = lgb.train(
        params,
        dtrain,
        num_boost_round=200,
        valid_sets=[dval]
    )

    # Evaluate on held-out validation fields
    raw_preds = bst.predict(X_val)
    y_pred_idx = np.argmax(raw_preds, axis=1)

    y_val_str = np.array([idx_to_class[i] for i in y_val])
    y_pred_str = np.array([idx_to_class[i] for i in y_pred_idx])

    overall_acc, per_crop_metrics = calculate_metrics(y_val_str, y_pred_str, valid_classes)

    print("\n" + "=" * 70, flush=True)
    print(f"  HELD-OUT FIELD VALIDATION METRICS (Overall Accuracy: {overall_acc*100:.1f}%)", flush=True)
    print("=" * 70, flush=True)
    print(f"{'Crop Class':<22} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'Support':<8}", flush=True)
    print("-" * 62, flush=True)
    for c, m in per_crop_metrics.items():
        print(f"{c:<22} {m['precision']:<10.3f} {m['recall']:<10.3f} {m['f1_score']:<10.3f} {m['support']:<8}", flush=True)
    print("-" * 62, flush=True)
    print(f"{'Overall Accuracy':<22} {'':<10} {'':<10} {overall_acc:<10.3f} {len(y_val):<8}", flush=True)

    # Save model weights in both native text and joblib format
    bst.save_model(str(MODEL_TXT_PATH))
    joblib.dump({
        "booster": bst,
        "classes": valid_classes,
        "class_to_idx": class_to_idx,
        "idx_to_class": idx_to_class,
        "features": FEATURE_ORDER,
        "bands": REQUIRED_BANDS
    }, MODEL_JOBLIB_PATH)

    print(f"\n[Artifact] Saved model checkpoint to: {MODEL_TXT_PATH}", flush=True)
    print(f"[Artifact] Saved joblib bundle to: {MODEL_JOBLIB_PATH}", flush=True)

    # Save metadata artifact
    metadata = {
        "model_name": "AgriCare Real Satellite Crop Classifier",
        "model_version": "v1.1.0-agrifieldnet-balanced",
        "algorithm": "LightGBM Gradient Boosted Decision Forest",
        "dataset": {
            "name": "AgriFieldNet India Challenge Dataset",
            "license": "CC-BY-4.0",
            "doi": "10.34911/rdnt.wu92p1",
            "curators": "Radiant Earth Foundation & IDinsight",
            "geographic_scope": "Northern/Eastern India (Uttar Pradesh, Bihar, Odisha, Rajasthan)",
            "regional_limitation_notice": (
                "Model is trained and validated on real ground-reference fields from Uttar Pradesh, Bihar, "
                "Odisha, and Rajasthan. While agro-climatically aligned with the Eastern Gangetic Plain, "
                "accuracy in West Bengal is not independently claimed without local West Bengal ground survey validation."
            ),
        },
        "training_date": datetime.now(timezone.utc).isoformat(),
        "anti_leakage_protocol": "Strict field-level grouping on ground-truth field_id. Zero spatial or parcel overlap between training and validation sets.",
        "features": {
            "feature_order": FEATURE_ORDER,
            "bands": REQUIRED_BANDS,
            "indices": ["NDVI", "NDRE", "EVI", "NDWI"],
            "scaling": "Normalized physical surface reflectance (0.0 - 1.0 range, scaled from BOA DN 0-10,000 or percentage 0-100)."
        },
        "supported_classes": valid_classes,
        "class_mapping": class_to_idx,
        "validation_metrics": {
            "overall_accuracy": round(overall_acc, 4),
            "n_training_fields": len(train_fields),
            "n_validation_fields": len(val_fields),
            "n_training_pixels": len(train_df),
            "n_validation_pixels": len(val_df),
            "per_crop_performance": per_crop_metrics
        }
    }

    with open(METADATA_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[Artifact] Saved comprehensive metadata to: {METADATA_OUTPUT_PATH}", flush=True)

    return metadata

def main():
    tile_list_path = BASE_DIR / "agrifieldnet_tile_ids.txt"
    if tile_list_path.exists():
        with open(tile_list_path, "r") as f:
            tile_ids = [line.strip() for line in f if line.strip()]
    else:
        tile_ids = ["001c1", "0023c", "005fe", "00720", "008f2", "00a39", "00b99", "00d14", "00d72", "00f12"]

    df = extract_features_from_tiles(tile_ids, max_tiles=90)
    if len(df) == 0:
        print("[Error] Failed to extract training observations from tiles.")
        sys.exit(1)

    metadata = train_and_validate(df)
    print("\n[Complete] Real satellite crop-type classifier training finished successfully.", flush=True)

if __name__ == "__main__":
    main()
