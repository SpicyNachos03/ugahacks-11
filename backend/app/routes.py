from flask import Blueprint, request, jsonify
from app.services.gemini_service import GeminiInsightsService
from app.services.model_service import ModelService

api = Blueprint('api', __name__)

# Initialize services
gemini_service = GeminiInsightsService()
model_service = ModelService()


@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "DC Optimizer API is running"
    }), 200


@api.route('/optimize', methods=['POST'])
def optimize():
    """
    Main optimization endpoint
    
    Expected JSON body:
    {
        "dc_data": {
            "avg_cpu_util": float,
            "avg_gpu_util": float,
            "num_creative_machines": int,
            "avg_machine_load": float
        },
        "map_data": {
            "device_counts": int,
            "traffic_info": dict,
            "population": int,
            "mock_data_ha": dict,
            "mock_data_d": dict,
            "households_mock": dict
        },
        "external_factors": {
            "weather": dict,
            "temp": float,
            "humidity": float,
            "pollution_emission_level": float
        },
        "availability": float,
        "avg_voltage": float
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract input data
        dc_data = data.get('dc_data', {})
        map_data = data.get('map_data', {})
        external_factors = data.get('external_factors', {})
        availability = data.get('availability', 0.7)
        avg_voltage = data.get('avg_voltage')
        
        # Step 1: Run Model 1 - Power to Offload (MW)
        power_to_offload = model_service.predict_power_to_offload(
            dc_data=dc_data,
            availability=availability
        )
        
        # Step 2: Run Model 2 - Imitation Learning Policy
        # Model 2 receives output from Model 1 as input
        policy_recommendations = model_service.generate_policy(
            power_to_offload=power_to_offload,  # Output from Model 1
            map_data=map_data,
            external_factors=external_factors
        )
        
        # Step 3: Use Gemini to generate insights and analysis
        gemini_analysis = gemini_service.generate_insights(
            power_to_offload=power_to_offload,
            policy_recommendations=policy_recommendations,
            map_data=map_data,
            external_factors=external_factors,
            availability=availability
        )
        
        # Prepare response
        response = {
            "success": True,
            "model1_output": {
                "power_to_offload_mw": power_to_offload
            },
            "model2_output": policy_recommendations,
            "gemini_analysis": gemini_analysis,
            "analysis": {
                "impacts": {
                    "carbon_output": gemini_analysis.get('carbon_output_kg', 0),
                    "carbon_reduction": gemini_analysis.get('carbon_reduction_kg', 0),
                    "water_usage": gemini_analysis.get('water_usage_liters', 0),
                    "water_savings": gemini_analysis.get('water_savings_liters', 0),
                    "cost_saving": gemini_analysis.get('cost_savings_usd', 0)
                },
                "recommendations": gemini_analysis.get('recommendations', []),
                "risk_factors": gemini_analysis.get('risk_factors', []),
                "summary": gemini_analysis.get('summary', '')
            }
        }
        
        return jsonify(response), 200
        
    except ValueError as e:
        return jsonify({"error": f"Validation error: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500


@api.route('/predict/power', methods=['POST'])
def predict_power():
    """
    Endpoint for Model 1 only - predicts power to offload
    """
    try:
        data = request.get_json()
        dc_data = data.get('dc_data', {})
        availability = data.get('availability', 0.7)
        
        power_to_offload = model_service.predict_power_to_offload(
            dc_data=dc_data,
            availability=availability
        )
        
        return jsonify({
            "success": True,
            "power_to_offload_mw": power_to_offload
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/predict/policy', methods=['POST'])
def predict_policy():
    """
    Endpoint for Model 2 only - generates policy recommendations
    
    Note: Model 2 can optionally receive power_to_offload from Model 1
    """
    try:
        data = request.get_json()
        power_to_offload = data.get('power_to_offload')  # Optional: from Model 1
        map_data = data.get('map_data', {})
        external_factors = data.get('external_factors', {})
        
        policy = model_service.generate_policy(
            power_to_offload=power_to_offload,
            map_data=map_data,
            external_factors=external_factors
        )
        
        return jsonify({
            "success": True,
            "policy": policy
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route('/config', methods=['GET'])
def get_config():
    """
    Get system configuration and constraints
    """
    return jsonify({
        "availability_range": [0.0, 1.0],
        "efficiency_multiplier": 0.3,
        "default_availability": 0.7,
        "supported_external_factors": [
            "weather",
            "temperature",
            "humidity", 
            "pollution_emission_level"
        ]
    }), 200