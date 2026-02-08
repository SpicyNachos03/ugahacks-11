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

    # Idle cluster (0% CPU and 0% GPU): no power to offload. Model wasn't trained there and extrapolates wrong.
    cpu_util = data.get("avg_cpu_util")
    gpu_util = data.get("avg_gpu_util")
    if cpu_util is not None and gpu_util is not None:
        try:
            c, g = float(cpu_util), float(gpu_util)
            if c <= 0 and g <= 0:
                return jsonify({"Wattage": 0.0})
        except (TypeError, ValueError):
            pass

    X = pd.DataFrame([row], columns=feature_names)
    # Model outputs kW; convert to watts for Wattage
    power_kw = float(model.predict(X)[0])
    wattage = round(max(0.0, power_kw * 1000), 2)

    return jsonify({"Wattage": wattage})
