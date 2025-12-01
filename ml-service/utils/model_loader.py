import os
import json
import logging
from typing import Optional, Dict, Any, List
from config import config

logger = logging.getLogger(__name__)

class ModelLoader:
    """Load and manage ML models"""
    
    def __init__(self, model_storage_path: str = None):
        self.model_storage_path = model_storage_path or config.MODEL_STORAGE_PATH
        self.loaded_models = {}
        
        # Create model storage directory if it doesn't exist
        os.makedirs(self.model_storage_path, exist_ok=True)
    
    def get_model_path(self, model_name: str, version: str = "latest") -> str:
        """Get path to model file"""
        if version == "latest":
            # Find latest version
            versions = []
            for file in os.listdir(self.model_storage_path):
                if file.startswith(f"{model_name}_v") and file.endswith(".h5"):
                    try:
                        v = file.replace(f"{model_name}_v", "").replace(".h5", "")
                        versions.append((int(v.split(".")[0]), file))
                    except:
                        pass
            
            if versions:
                versions.sort(reverse=True)
                return os.path.join(self.model_storage_path, versions[0][1])
            else:
                return os.path.join(self.model_storage_path, f"{model_name}_v1.h5")
        else:
            return os.path.join(self.model_storage_path, f"{model_name}_v{version}.h5")
    
    def model_exists(self, model_name: str, version: str = "latest") -> bool:
        """Check if model file exists"""
        model_path = self.get_model_path(model_name, version)
        return os.path.exists(model_path)
    
    def load_model_metadata(self, model_name: str, version: str = "latest") -> Optional[Dict[str, Any]]:
        """Load model metadata"""
        metadata_path = self.get_model_path(model_name, version).replace(".h5", "_metadata.json")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading model metadata: {e}")
                return None
        return None
    
    def save_model_metadata(self, model_name: str, version: str, metadata: Dict[str, Any]):
        """Save model metadata"""
        metadata_path = self.get_model_path(model_name, version).replace(".h5", "_metadata.json")
        try:
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving model metadata: {e}")
    
    def list_models(self) -> List[Dict[str, Any]]:
        """List all available models"""
        models = []
        for file in os.listdir(self.model_storage_path):
            if file.endswith(".h5"):
                try:
                    parts = file.replace(".h5", "").split("_v")
                    if len(parts) == 2:
                        model_name = parts[0]
                        version = parts[1]
                        metadata = self.load_model_metadata(model_name, version)
                        models.append({
                            "name": model_name,
                            "version": version,
                            "path": os.path.join(self.model_storage_path, file),
                            "metadata": metadata
                        })
                except:
                    pass
        return models

