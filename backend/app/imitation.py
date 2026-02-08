"""
Imitation model: predict device preference scores and run water-fill allocation.
Matches FedLearningAIModel notebook (INPUT_COLS, TARGET_COLS, run_inference).
"""
import os
import numpy as np
import pandas as pd
from joblib import load as joblib_load

# Training-script distributions for sampling (uniform low, high)
AVG_W_RANGES = {
    "phone": (0.5, 3),
    "laptop": (30, 200),
    "desktop": (100, 500),
    "traffic_light": (5, 30),
    "appliance": (5, 10),
}
AVAIL_RANGES = {
    "phone": (0.2, 0.3),
    "laptop": (0.2, 0.5),
    "desktop": (0.3, 0.6),
    "traffic_light": (0.8, 1.0),
    "appliance": (0.5, 0.9),
}
# Display order for summary (Desktop, Laptop, Traffic Light, Appliance, Phone)
DISPLAY_ORDER = ["desktop", "laptop", "traffic_light", "appliance", "phone"]
DISPLAY_LABELS = {
    "desktop": "Desktop",
    "laptop": "Laptop",
    "traffic_light": "Traffic Light",
    "appliance": "Appliance",
    "phone": "Phone",
}

# Must match notebook INPUT_COLS order (model.feature_names_in_)
INPUT_COLS = [
    "P_offload_kw",
    "phone_count", "phone_avg_w", "phone_avail",
    "laptop_count", "laptop_avg_w", "laptop_avail",
    "desktop_count", "desktop_avg_w", "desktop_avail",
    "traffic_light_count", "traffic_light_avg_w", "traffic_light_avail",
    "appliance_count", "appliance_avg_w", "appliance_avail",
]
DEVICE_NAMES = ["phone", "laptop", "desktop", "traffic_light", "appliance"]

_MODEL = None
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "imitation_model.pkl")


def get_model():
    global _MODEL
    if _MODEL is None:
        _MODEL = joblib_load(_MODEL_PATH)
    return _MODEL


def extract_capacities_kw(row: dict) -> np.ndarray:
    """Capacity (kW) per device: count * avg_w / 1000."""
    return np.array([
        row["phone_count"] * row["phone_avg_w"] / 1000.0,
        row["laptop_count"] * row["laptop_avg_w"] / 1000.0,
        row["desktop_count"] * row["desktop_avg_w"] / 1000.0,
        row["traffic_light_count"] * row["traffic_light_avg_w"] / 1000.0,
        row["appliance_count"] * row["appliance_avg_w"] / 1000.0,
    ], dtype=float)


def allocate_kw_waterfill(scores: np.ndarray, capacities_kw: np.ndarray, P_offload_kw: float, eps: float = 1e-9) -> np.ndarray:
    """
    Iterative water-filling: allocate P_offload_kw across devices by score,
    respecting capacity. Returns allocation in kW per device.
    """
    scores = np.maximum(np.asarray(scores, dtype=float), 0.0)
    remaining = float(P_offload_kw)
    alloc = np.zeros_like(capacities_kw, dtype=float)
    active = np.array(capacities_kw > 0, dtype=bool)

    while remaining > eps and np.any(active):
        weights = scores[active]
        caps = capacities_kw[active] - alloc[active]

        if np.sum(weights) <= eps:
            break

        delta = weights / np.sum(weights) * remaining
        delta = np.minimum(delta, caps)

        alloc[active] += delta
        remaining -= float(np.sum(delta))

        active_indices = np.where(active)[0]
        saturated = (caps - delta) <= eps
        active[active_indices[saturated]] = False

    return alloc


def run_inference(row: dict) -> dict:
    """
    Run imitation model + water-fill. `row` must contain all INPUT_COLS keys.
    Returns dict with scores, capacities_kw, alloc_kw per device, alloc_total_kw, unmet_kw.
    """
    model = get_model()
    X = pd.DataFrame([row], columns=INPUT_COLS)
    scores = model.predict(X)[0]
    scores = np.maximum(scores, 0.0)

    capacities_kw = extract_capacities_kw(row)
    P_offload_kw = float(row["P_offload_kw"])

    if P_offload_kw <= 0 or np.sum(capacities_kw) <= 0:
        alloc = np.zeros_like(capacities_kw)
    else:
        alloc = allocate_kw_waterfill(scores, capacities_kw, P_offload_kw)

    alloc_total_kw = float(np.sum(alloc))
    unmet_kw = max(0.0, P_offload_kw - alloc_total_kw)

    return {
        "scores": {name: float(s) for name, s in zip(DEVICE_NAMES, scores)},
        "capacities_kw": {name: float(c) for name, c in zip(DEVICE_NAMES, capacities_kw)},
        "alloc_kw": {name: float(a) for name, a in zip(DEVICE_NAMES, alloc)},
        "alloc_total_kw": round(alloc_total_kw, 4),
        "unmet_kw": round(unmet_kw, 4),
    }


def build_row_from_population(
    population: float,
    traffic_light_count: float,
    P_offload_kw: float,
    rng: np.random.Generator | None = None,
) -> dict:
    """
    Build model input row from population P and traffic_light count.
    Counts: phone=P/100, appliance=P/400, laptop=P*0.68/100, desktop=P*0.37/100, traffic_light=given.
    avg_w and avail are sampled from training-script uniform distributions.
    """
    if rng is None:
        rng = np.random.default_rng()
    P = max(0.0, float(population))
    tlc = max(0, int(round(float(traffic_light_count))))

    phone_count = max(0, int(round(P / 100)))
    appliance_count = max(0, int(round(P / 4 / 100)))  # P/400
    laptop_count = max(0, int(round(P * 0.68 / 100)))
    desktop_count = max(0, int(round(P * 0.37 / 100)))

    row = {
        "P_offload_kw": float(P_offload_kw),
        "phone_count": phone_count,
        "laptop_count": laptop_count,
        "desktop_count": desktop_count,
        "traffic_light_count": tlc,
        "appliance_count": appliance_count,
    }
    for dev in DEVICE_NAMES:
        low_w, high_w = AVG_W_RANGES[dev]
        low_a, high_a = AVAIL_RANGES[dev]
        row[f"{dev}_avg_w"] = float(rng.uniform(low_w, high_w))
        row[f"{dev}_avail"] = float(rng.uniform(low_a, high_a))
    return row


def format_allocation_summary(result: dict) -> tuple[list[str], str]:
    """
    Returns (list of per-device lines, total_line) for frontend display.
    Order: Desktop, Laptop, Traffic Light, Appliance, Phone; then Total.
    """
    lines = []
    alloc = result["alloc_kw"]
    caps = result["capacities_kw"]
    for name in DISPLAY_ORDER:
        a = alloc[name]
        c = caps[name]
        pct = (a / c * 100) if c > 0 else 0.0
        label = DISPLAY_LABELS[name]
        lines.append(f"{label}: {a:.1f} kW ({min(100, pct):.1f}% of capacity used)")
    total = result["alloc_total_kw"]
    unmet = result["unmet_kw"]
    if unmet <= 1e-6:
        total_line = f"Total: {total:.1f} kW ✓"
    else:
        total_line = f"Total: {total:.1f} kW (unmet: {unmet:.1f} kW)"
    return lines, total_line


def run_inference_from_population(
    population: float,
    traffic_light_count: float,
    P_offload_kw: float,
    rng: np.random.Generator | None = None,
) -> dict:
    """
    Build row from population + traffic_light, sample avg_w/avail, run inference,
    and add summary_lines, total_line, counts, percent_offload, raw_total_kw_offloaded.
    """
    row = build_row_from_population(population, traffic_light_count, P_offload_kw, rng=rng)
    result = run_inference(row)
    # Counts in display order for frontend
    #result["counts"] = [
    #    {"device": DISPLAY_LABELS[name], "count": row[f"{name}_count"]}
    #    for name in DISPLAY_ORDER
    #]
    # percent_offload = total that can be offloaded / total needed to be offloaded
    total_needed = float(P_offload_kw)
    total_offloaded = result["alloc_total_kw"]
    result["percent_offload"] = (
        round(total_offloaded / total_needed, 4) if total_needed > 0 else 1.0
    )
    result["raw_total_kw_offloaded"] = round(total_offloaded, 4)
    result["input_counts"] = {
        "phone": row["phone_count"],
        "laptop": row["laptop_count"],
        "desktop": row["desktop_count"],
        "traffic_light": row["traffic_light_count"],
        "appliance": row["appliance_count"],
    }
    #summary_lines, total_line = format_allocation_summary(result)
    #result["summary_lines"] = summary_lines
    #result["total_line"] = total_line
    return result
