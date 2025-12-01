import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from collections import deque
import json

logger = logging.getLogger(__name__)

class Monitoring:
    """Monitoring and logging for ML service"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        
        # Metrics storage
        self.inference_latencies = deque(maxlen=max_history)
        self.prediction_accuracies = deque(maxlen=max_history)
        self.errors = deque(maxlen=max_history)
        self.model_performances = {}
        
        # Counters
        self.total_predictions = 0
        self.total_errors = 0
        self.total_inference_time = 0.0
    
    def log_inference(self, model_name: str, latency_ms: float, success: bool = True):
        """Log model inference"""
        self.inference_latencies.append({
            'model': model_name,
            'latency_ms': latency_ms,
            'timestamp': datetime.now().isoformat(),
            'success': success
        })
        
        self.total_predictions += 1
        self.total_inference_time += latency_ms
        
        if not success:
            self.total_errors += 1
    
    def log_prediction_accuracy(self, model_name: str, actual: Any, predicted: Any, accuracy: float):
        """Log prediction accuracy"""
        self.prediction_accuracies.append({
            'model': model_name,
            'actual': str(actual),
            'predicted': str(predicted),
            'accuracy': accuracy,
            'timestamp': datetime.now().isoformat()
        })
    
    def log_error(self, model_name: str, error: Exception, context: Optional[Dict[str, Any]] = None):
        """Log error"""
        error_entry = {
            'model': model_name,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'timestamp': datetime.now().isoformat(),
            'context': context or {}
        }
        
        self.errors.append(error_entry)
        self.total_errors += 1
        
        logger.error(f"ML Error [{model_name}]: {error}")
    
    def update_model_performance(self, model_name: str, metrics: Dict[str, float]):
        """Update model performance metrics"""
        if model_name not in self.model_performances:
            self.model_performances[model_name] = {
                'accuracy': 0.0,
                'precision': 0.0,
                'recall': 0.0,
                'f1_score': 0.0,
                'last_updated': None
            }
        
        self.model_performances[model_name].update(metrics)
        self.model_performances[model_name]['last_updated'] = datetime.now().isoformat()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get monitoring statistics"""
        avg_latency = 0.0
        if self.inference_latencies:
            latencies = [l['latency_ms'] for l in self.inference_latencies]
            avg_latency = sum(latencies) / len(latencies)
        
        avg_accuracy = 0.0
        if self.prediction_accuracies:
            accuracies = [a['accuracy'] for a in self.prediction_accuracies]
            avg_accuracy = sum(accuracies) / len(accuracies)
        
        error_rate = 0.0
        if self.total_predictions > 0:
            error_rate = (self.total_errors / self.total_predictions) * 100
        
        return {
            'total_predictions': self.total_predictions,
            'total_errors': self.total_errors,
            'error_rate_percent': error_rate,
            'avg_inference_latency_ms': avg_latency,
            'avg_prediction_accuracy': avg_accuracy,
            'model_performances': self.model_performances,
            'recent_errors': list(self.errors)[-10:] if self.errors else []
        }
    
    def get_model_stats(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get statistics for specific model"""
        model_latencies = [
            l for l in self.inference_latencies 
            if l['model'] == model_name
        ]
        
        model_accuracies = [
            a for a in self.prediction_accuracies 
            if a['model'] == model_name
        ]
        
        model_errors = [
            e for e in self.errors 
            if e['model'] == model_name
        ]
        
        avg_latency = 0.0
        if model_latencies:
            latencies = [l['latency_ms'] for l in model_latencies]
            avg_latency = sum(latencies) / len(latencies)
        
        avg_accuracy = 0.0
        if model_accuracies:
            accuracies = [a['accuracy'] for a in model_accuracies]
            avg_accuracy = sum(accuracies) / len(accuracies)
        
        return {
            'model_name': model_name,
            'total_predictions': len(model_latencies),
            'total_errors': len(model_errors),
            'avg_latency_ms': avg_latency,
            'avg_accuracy': avg_accuracy,
            'performance': self.model_performances.get(model_name, {}),
            'recent_errors': model_errors[-5:] if model_errors else []
        }

# Global monitoring instance
monitoring = Monitoring()

