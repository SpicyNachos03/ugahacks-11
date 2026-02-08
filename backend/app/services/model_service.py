"""
Model Service - Orchestrates Model 1 and Model 2
"""

from app.models.model1 import PowerPredictionModel
from app.models.model2 import PolicyGeneratorModel


class ModelService:
    def __init__(self):
        """Initialize both models"""
        self.power_model = PowerPredictionModel()
        self.policy_model = PolicyGeneratorModel()
        
    def predict_power_to_offload(self, dc_data, availability):
        """
        Use Model 1 to predict power to offload.
        
        Args:
            dc_data (dict): Data center metrics
            availability (float): Availability estimate
            
        Returns:
            float: Power to offload in MW
        """
        # Validate input
        self.power_model.validate_input(dc_data, availability)
        
        # Get prediction
        power_to_offload = self.power_model.predict(dc_data, availability)
        
        return power_to_offload
    
    def generate_policy(self, power_to_offload, map_data, external_factors):
        """
        Use Model 2 to generate policy recommendations.
        
        Args:
            power_to_offload (float): Power to offload from Model 1 (MW)
            map_data (dict): MAP data (device counts, traffic, population, etc.)
            external_factors (dict): External factors (weather, temp, humidity, pollution)
            
        Returns:
            dict: Policy recommendations
        """
        # Validate input
        self.policy_model.validate_input(map_data, external_factors)
        
        # Generate policy with power input from Model 1
        policy = self.policy_model.generate_policy(
            power_to_offload=power_to_offload,
            map_data=map_data,
            external_factors=external_factors
        )
        
        return policy
    
    def load_models(self, power_model_path=None, policy_model_path=None):
        """
        Load pre-trained models from disk.
        
        Args:
            power_model_path (str): Path to Model 1 weights
            policy_model_path (str): Path to Model 2 weights
        """
        if power_model_path:
            self.power_model.load_model(power_model_path)
            
        if policy_model_path:
            self.policy_model.load_model(policy_model_path)