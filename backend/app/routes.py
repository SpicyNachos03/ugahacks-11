import os
from flask import Blueprint, jsonify, request
from joblib import load as joblib_load
import pandas as pd

api = Blueprint("api", __name__)

# Load model once at module load (lazy load on first predict if you prefer)
_MODEL = None
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "gbr_power_offload.pkl")


def _get_model():
    global _MODEL
    if _MODEL is None:
        # Use joblib (sklearn's serializer) to avoid pickle protocol issues with Python 3.13+
        _MODEL = joblib_load(_MODEL_PATH)
    return _MODEL


@api.get("/health")
def health():
    return jsonify({"status": "ok"})


@api.post("/wattage")
def predict_wattage():
    """
    Expects JSON with features the model was trained on (e.g. avg_cpu_util, active_machines, avg_gpu_util).
    Optional: machine_load_1_mean. Uses model.feature_names_in_ so columns always match fit.
    Returns { "Wattage": number }.
    """
    data = request.get_json(silent=True) or {}
    model = _get_model()
    # Use the model's actual feature names from training (order matters)
    _names = getattr(model, "feature_names_in_", None)
    if _names is None or len(_names) == 0:
        feature_names = ("avg_cpu_util", "active_machines", "avg_gpu_util")
    else:
        feature_names = list(_names)
    missing = [k for k in feature_names if k not in data]
    if missing:
        return jsonify({"error": f"Missing keys: {list(missing)}"}), 400

    try:
        row = [float(data[name]) for name in feature_names]
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid numeric values: {e}"}), 400

    X = pd.DataFrame([row], columns=feature_names)
    wattage = float(model.predict(X)[0])

    return jsonify({"Wattage": wattage})
