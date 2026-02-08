import os
from flask import Blueprint, jsonify, request
from joblib import load as joblib_load

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
    Expects JSON: avg_cpu_util, active_machines, machine_load_1_mean, avg_gpu_util.
    Returns { "Wattage": number }.
    """
    data = request.get_json(silent=True) or {}
    required = ("avg_cpu_util", "active_machines", "machine_load_1_mean", "avg_gpu_util")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing keys: {missing}"}), 400

    try:
        avg_cpu_util = float(data["avg_cpu_util"])
        active_machines = float(data["active_machines"])
        machine_load_1_mean = float(data["machine_load_1_mean"])
        avg_gpu_util = float(data["avg_gpu_util"])
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid numeric values: {e}"}), 400

    # Feature order must match training: avg_cpu_util, active_machines, machine_load_1_mean, avg_gpu_util
    X = [[avg_cpu_util, active_machines, machine_load_1_mean, avg_gpu_util]]
    model = _get_model()
    wattage = float(model.predict(X)[0])

    return jsonify({"Wattage": wattage})
