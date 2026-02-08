import os
from flask import Blueprint, jsonify, request

from .imitation import (
    DISPLAY_LABELS,
    DISPLAY_ORDER,
    INPUT_COLS,
    run_inference,
    run_inference_from_population,
)

api = Blueprint("api", __name__)

# Physics constants from FedLearningAIModel notebook (must match training data)
P_IDLE = 250          # watts per machine at idle
P_PEAK = 900           # watts per machine at full GPU utilization
P_CPU_PEAK = 400       # watts per machine at full CPU utilization
SAFE_GPU_UTIL = 0.7    # cooling-safe operating point
SAFE_CPU_UTIL = 0.7    # cooling-safe operating point
CLUSTER_SCALE_FACTOR = 100


def _power_to_offload_w(avg_cpu_util: float, active_machines: float, avg_gpu_util: float) -> float:
    """Power to offload (watts) using the same physics formula as the notebook."""
    cluster_it_power_w = (
        active_machines * CLUSTER_SCALE_FACTOR * (
            P_IDLE
            + avg_gpu_util * (P_PEAK - P_IDLE)
            + avg_cpu_util * P_CPU_PEAK
        )
    )
    safe_cluster_power_w = (
        active_machines * CLUSTER_SCALE_FACTOR * (
            P_IDLE
            + SAFE_GPU_UTIL * (P_PEAK - P_IDLE)
            + SAFE_CPU_UTIL * P_CPU_PEAK
        )
    )
    return max(0.0, cluster_it_power_w - safe_cluster_power_w)


@api.get("/health")
def health():
    return jsonify({"status": "ok"})


@api.post("/wattage")
def predict_wattage():
    """
    Expects JSON: avg_cpu_util, active_machines, avg_gpu_util (each 0–1 for util).
    Returns { "Wattage": number } (watts to offload) using the physics formula.
    """
    data = request.get_json(silent=True) or {}
    required = ("avg_cpu_util", "active_machines", "avg_gpu_util")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing keys: {list(missing)}"}), 400

    try:
        avg_cpu_util = float(data["avg_cpu_util"])
        active_machines = float(data["active_machines"])
        avg_gpu_util = float(data["avg_gpu_util"])
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid numeric values: {e}"}), 400

    wattage = _power_to_offload_w(avg_cpu_util, active_machines, avg_gpu_util)
    return jsonify({"Wattage": round(wattage, 2)})


@api.post("/allocate")
def predict_allocate():
    """
    Imitation model: allocate P_offload_kw across device classes.
    Expects JSON with all 16 inputs (P_offload_kw, then for each of phone, laptop, desktop, traffic_light, appliance:
    {name}_count, {name}_avg_w, {name}_avail).
    Returns scores, capacities_kw, alloc_kw per device, alloc_total_kw, unmet_kw.
    """
    data = request.get_json(silent=True) or {}
    missing = [k for k in INPUT_COLS if k not in data]
    if missing:
        return jsonify({"error": f"Missing keys: {missing}"}), 400

    try:
        row = {k: float(data[k]) for k in INPUT_COLS}
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid numeric values: {e}"}), 400

    result = run_inference(row)
    return jsonify(result)


@api.post("/allocate_from_population")
def allocate_from_population():
    """
    Frontend sends: population (P), traffic_light_count, and P_offload_kw (kW to allocate)
    or wattage (watts; converted to kW automatically).
    Device counts: phone=P/100, appliance=P/400, laptop=P*0.68/100, desktop=P*0.37/100,
    traffic_light=given. avg_w and avail are sampled from training-script distributions.
    Returns scores, allocation, and formatted summary_lines + total_line for display.
    """
    data = request.get_json(silent=True) or {}
    required = ("population", "traffic_light_count")
    missing = [k for k in required if k not in data]
    if missing:
        return jsonify({"error": f"Missing keys: {list(missing)}"}), 400

    try:
        population = float(data["population"])
        traffic_light_count = float(data["traffic_light_count"])
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid numeric values: {e}"}), 400

    if "P_offload_kw" in data:
        P_offload_kw = float(data["P_offload_kw"])
    elif "wattage" in data:
        P_offload_kw = float(data["wattage"]) / 1000.0
    else:
        return jsonify({"error": "Provide either P_offload_kw (kW) or wattage (W)"}), 400

    if P_offload_kw < 0:
        return jsonify({"error": "P_offload_kw / wattage must be non-negative"}), 400

    result = run_inference_from_population(population, traffic_light_count, P_offload_kw)
    alloc = result["alloc_kw"]
    capacities = result["capacities_kw"]
    counts = {
        DISPLAY_LABELS[name]: result["input_counts"][name]
        for name in DISPLAY_ORDER
    }
    offload_per_device = {
        DISPLAY_LABELS[name]: round(alloc[name], 2)
        for name in DISPLAY_ORDER
    }
    max_offload_capacity_kw = round(sum(capacities.values()), 2)
    return jsonify({
        "counts": counts,
        "raw_kw_offload": result["raw_total_kw_offloaded"],
        "percent_offload": result["percent_offload"],
        "offload_per_device": offload_per_device,
        "max_offload_capacity_kw": max_offload_capacity_kw,
        "offload_needed_kw": round(P_offload_kw, 2),
    })
