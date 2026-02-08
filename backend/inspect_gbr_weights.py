"""
Inspect gbr_power_offload.pkl: hyperparameters, feature importances, and tree info.
Run from backend:  python inspect_gbr_weights.py
"""
import json
import os
from joblib import load

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "gbr_power_offload.pkl")


def main():
    model = load(MODEL_PATH)
    print("Model type:", type(model).__name__)

    # Hyperparameters (the "config" weights)
    print("\n--- get_params() ---")
    params = model.get_params()
    for k, v in sorted(params.items()):
        print(f"  {k}: {v}")

    # Feature names and importances (per-feature "weights")
    if hasattr(model, "feature_names_in_") and model.feature_names_in_ is not None:
        names = list(model.feature_names_in_)
        print("\n--- feature_names_in_ ---")
        print(" ", names)
    else:
        names = [f"feature_{i}" for i in range(model.n_features_in_)]
    if hasattr(model, "feature_importances_"):
        print("\n--- feature_importances_ ---")
        for name, imp in zip(names, model.feature_importances_):
            print(f"  {name}: {imp:.6f}")
        print("  (sum):", model.feature_importances_.sum())

    # Number of trees and shape
    if hasattr(model, "estimators_"):
        print("\n--- estimators_ (trees) ---")
        print("  shape:", model.estimators_.shape)
        print("  n_estimators:", model.n_estimators_)

    # Optional: export feature importances to JSON
    out = {
        "model_type": type(model).__name__,
        "params": params,
        "feature_names": names,
        "feature_importances": [float(x) for x in model.feature_importances_],
    }
    out_path = os.path.join(os.path.dirname(__file__), "models", "gbr_weights.json")
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nExported to {out_path}")


if __name__ == "__main__":
    main()
