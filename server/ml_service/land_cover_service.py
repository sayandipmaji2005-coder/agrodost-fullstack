#!/usr/bin/env python3
"""
AgriCare ML Service - Real Land Cover & Multi-Spectral Crop Classification Engine
Loads genuine trained model weights (LightGBM multi-class booster trained on AgriFieldNet India).
Executes real inference on multi-spectral Sentinel-2 observations with strict feature ordering.
"""

import sys
import json
import os
from pathlib import Path
import numpy as np

# LightGBM native runtime
try:
    import lightgbm as lgb
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

BASE_DIR = Path(__file__).resolve().parent
CHECKPOINTS_DIR = BASE_DIR / "checkpoints"
MODEL_TXT_PATH = CHECKPOINTS_DIR / "crop_classifier.txt"
MODEL_JOBLIB_PATH = CHECKPOINTS_DIR / "crop_classifier.joblib"
METADATA_PATH = CHECKPOINTS_DIR / "crop_classifier_metadata.json"

# Cached model instance
_LOADED_MODEL = None
_LOADED_METADATA = None

def load_crop_model():
    """Load the trained crop classifier and metadata."""
    global _LOADED_MODEL, _LOADED_METADATA

    if _LOADED_MODEL is not None:
        return _LOADED_MODEL, _LOADED_METADATA

    if not MODEL_TXT_PATH.exists() or not METADATA_PATH.exists():
        return None, None

    try:
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        # Load LightGBM booster
        bst = lgb.Booster(model_file=str(MODEL_TXT_PATH))
        _LOADED_MODEL = bst
        _LOADED_METADATA = metadata
        return _LOADED_MODEL, _LOADED_METADATA
    except Exception as err:
        sys.stderr.write(f"[LandCoverService] Error loading crop model: {err}\n")
        return None, None

def check_model_status():
    """Check status of trained models and dataset metadata."""
    model, metadata = load_crop_model()

    if model is None:
        return {
            "is_connected": False,
            "crop_model_loaded": False,
            "status": "not_loaded",
            "message": "Crop classifier checkpoint not found. Training on AgriFieldNet India dataset required."
        }

    return {
        "is_connected": True,
        "crop_model_loaded": True,
        "status": "ready",
        "model_name": metadata.get("model_name"),
        "model_version": metadata.get("model_version"),
        "algorithm": metadata.get("algorithm"),
        "dataset": metadata.get("dataset"),
        "feature_order": metadata.get("features", {}).get("feature_order", []),
        "supported_classes": metadata.get("supported_classes", []),
        "validation_metrics": metadata.get("validation_metrics", {}),
        "message": f"Real crop classifier loaded ({metadata.get('model_version')}) with {len(metadata.get('supported_classes', []))} supported classes."
    }

def run_crop_inference(input_payload):
    """
    Execute real model inference on Sentinel-2 multi-spectral observations.
    Input format:
    {
      "bands": {
        "B02": float, "B03": float, "B04": float,
        "B05": float, "B08": float, "B11": float
      },
      "optional_indices": { "NDVI": float, "NDRE": float, "EVI": float, "NDWI": float },
      "dominant_land_cover": "crop" | "tree" | "bare_soil" | "water" | "built_up"
    }
    """
    dominant_lc = input_payload.get("dominant_land_cover", "crop")

    # Reject non-crop classifications explicitly (requirement 7)
    if dominant_lc != "crop":
        return {
            "status": "not_applicable_non_crop",
            "predicted_crop": None,
            "confidence": 0.0,
            "confidence_breakdown": {},
            "message": f"Land cover is '{dominant_lc}' — crop-type inference is only applicable to active cropland.",
        }

    model, metadata = load_crop_model()
    if model is None:
        return {
            "status": "model_not_loaded",
            "predicted_crop": None,
            "confidence": 0.0,
            "confidence_breakdown": {},
            "message": "Crop classification model weights are not loaded.",
        }

    bands = input_payload.get("bands", {})
    required_bands = ["B02", "B03", "B04", "B05", "B08", "B11"]

    # Check if required bands exist
    missing_bands = [b for b in required_bands if b not in bands or bands[b] is None]
    if missing_bands:
        return {
            "status": "insufficient_data",
            "predicted_crop": None,
            "confidence": 0.0,
            "confidence_breakdown": {},
            "message": f"Insufficient spectral data: missing bands {missing_bands}.",
        }

    # Extract band values (expecting BOA surface reflectance scaled 0-10000)
    b2 = float(bands["B02"])
    b3 = float(bands["B03"])
    b4 = float(bands["B04"])
    b5 = float(bands["B05"])
    b8 = float(bands["B08"])
    b11 = float(bands["B11"])

    # Normalize inputs to 0.0 - 1.0 physical surface reflectance range
    max_b = max(b2, b3, b4, b5, b8, b11)
    if max_b > 100.0:
        # Raw Sentinel-2 L2A BOA DN (0 - 10,000)
        scale = 10000.0
    elif max_b > 1.5:
        # Scaled percentage reflectance (0 - 100)
        scale = 100.0
    else:
        scale = 1.0

    b2_norm = b2 / scale
    b3_norm = b3 / scale
    b4_norm = b4 / scale
    b5_norm = b5 / scale
    b8_norm = b8 / scale
    b11_norm = b11 / scale

    # Compute physical spectral indices in normalized reflectance space
    ndvi = (b8_norm - b4_norm) / (b8_norm + b4_norm + 1e-6)
    ndre = (b8_norm - b5_norm) / (b8_norm + b5_norm + 1e-6)
    evi_denom = b8_norm + 6.0 * b4_norm - 7.5 * b2_norm + 1.0
    evi = 2.5 * (b8_norm - b4_norm) / (evi_denom if abs(evi_denom) > 1e-6 else 1.0)
    ndwi = (b8_norm - b11_norm) / (b8_norm + b11_norm + 1e-6)

    feature_dict = {
        "B02": b2_norm, "B03": b3_norm, "B04": b4_norm, "B05": b5_norm, "B08": b8_norm, "B11": b11_norm,
        "NDVI": float(np.clip(ndvi, -1.0, 1.0)),
        "NDRE": float(np.clip(ndre, -1.0, 1.0)),
        "EVI": float(np.clip(evi, -1.0, 1.5)),
        "NDWI": float(np.clip(ndwi, -1.0, 1.0)),
    }

    feature_order = metadata.get("features", {}).get("feature_order", [
        "B02", "B03", "B04", "B05", "B08", "B11", "NDVI", "NDRE", "EVI", "NDWI"
    ])
    feature_vector = np.array([[feature_dict[f] for f in feature_order]], dtype=np.float32)

    # Run actual LightGBM prediction
    raw_probs = model.predict(feature_vector)[0]  # Shape: [num_classes]

    supported_classes = metadata.get("supported_classes", [])
    confidence_breakdown = {}
    for idx, cname in enumerate(supported_classes):
        prob = float(raw_probs[idx]) if idx < len(raw_probs) else 0.0
        confidence_breakdown[cname] = round(prob * 100.0, 1)

    top_idx = int(np.argmax(raw_probs))
    predicted_crop = supported_classes[top_idx]
    top_confidence = float(raw_probs[top_idx])

    # Check uncertainty threshold
    is_uncertain = top_confidence < 0.40

    return {
        "status": "model_predicted",
        "predicted_crop": predicted_crop if not is_uncertain else "Uncertain / Verification Needed",
        "raw_top_crop": predicted_crop,
        "confidence": round(top_confidence, 3),
        "is_uncertain": is_uncertain,
        "confidence_breakdown": confidence_breakdown,
        "model_version": metadata.get("model_version"),
        "algorithm": metadata.get("algorithm"),
        "features_used": {
            "NDVI": round(feature_dict["NDVI"], 3),
            "NDRE": round(feature_dict["NDRE"], 3),
            "EVI": round(feature_dict["EVI"], 3),
            "NDWI": round(feature_dict["NDWI"], 3),
            "B04_Red": round(b4, 1),
            "B08_NIR": round(b8, 1)
        },
        "regional_limitation": metadata.get("dataset", {}).get("regional_limitation_notice")
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        print(json.dumps(check_model_status(), indent=2))
        sys.exit(0)

    # Read payload from stdin
    try:
        raw_in = sys.stdin.read()
        payload = json.loads(raw_in) if raw_in.strip() else {}
    except Exception as err:
        sys.stderr.write(f"Error reading input JSON: {err}\n")
        payload = {}

    if sys.argv[-1] == "--crop-infer" or payload.get("mode") == "crop_inference" or "bands" in payload:
        res = run_crop_inference(payload)
        print(json.dumps(res, indent=2))
        sys.exit(0)

    # Default land cover status check
    status = check_model_status()
    print(json.dumps(status, indent=2))

if __name__ == "__main__":
    main()
