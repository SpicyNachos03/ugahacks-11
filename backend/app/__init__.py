from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)

    # Allow React dev server origin (adjust if you use CRA or different port)
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000"]}})

    # Register routes
    from .routes import api
    app.register_blueprint(api, url_prefix="/api")

    return app