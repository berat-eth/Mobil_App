import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.ensemble import IsolationForest
from typing import List, Dict, Any, Optional, Tuple
import logging
import os
from config import config

logger = logging.getLogger(__name__)

class AnomalyDetectionModel:
    """Anomaly detection using Autoencoder and Isolation Forest"""
    
    def __init__(self, input_dim: int = 50):
        self.input_dim = input_dim
        self.autoencoder = None
        self.isolation_forest = None
        self.is_trained = False
        self.threshold = config.ANOMALY_THRESHOLD
    
    def build_autoencoder(self, encoding_dim: int = 16):
        """Build autoencoder for anomaly detection"""
        # Input
        input_layer = layers.Input(shape=(self.input_dim,), name='input')
        
        # Encoder
        encoded = layers.Dense(64, activation='relu')(input_layer)
        encoded = layers.Dropout(0.2)(encoded)
        encoded = layers.Dense(32, activation='relu')(encoded)
        encoded = layers.Dense(encoding_dim, activation='relu', name='encoded')(encoded)
        
        # Decoder
        decoded = layers.Dense(32, activation='relu')(encoded)
        decoded = layers.Dropout(0.2)(decoded)
        decoded = layers.Dense(64, activation='relu')(decoded)
        decoded = layers.Dense(self.input_dim, activation='sigmoid', name='decoded')(decoded)
        
        # Autoencoder
        self.autoencoder = keras.Model(input_layer, decoded, name='anomaly_autoencoder')
        
        # Compile
        self.autoencoder.compile(
            optimizer=keras.optimizers.Adam(learning_rate=config.LEARNING_RATE),
            loss='mse',
            metrics=['mae']
        )
        
        logger.info("Autoencoder built")
        return self.autoencoder
    
    def train_autoencoder(self,
                         data: np.ndarray,
                         validation_split: float = 0.2,
                         epochs: int = None,
                         batch_size: int = None):
        """Train autoencoder"""
        if self.autoencoder is None:
            self.build_autoencoder()
        
        epochs = epochs or config.EPOCHS
        batch_size = batch_size or config.BATCH_SIZE
        
        # Normalize data
        data_normalized = (data - np.min(data, axis=0)) / (np.max(data, axis=0) - np.min(data, axis=0) + 1e-8)
        
        # Callbacks
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            )
        ]
        
        # Train
        history = self.autoencoder.fit(
            data_normalized,
            data_normalized,  # Autoencoder reconstructs input
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        logger.info("Autoencoder trained")
        return history
    
    def train_isolation_forest(self, data: np.ndarray, contamination: float = 0.1):
        """Train Isolation Forest"""
        self.isolation_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.isolation_forest.fit(data)
        logger.info("Isolation Forest trained")
    
    def detect_anomaly_autoencoder(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Detect anomalies using autoencoder reconstruction error"""
        if self.autoencoder is None:
            raise Exception("Autoencoder not trained")
        
        # Normalize
        data_normalized = (data - np.min(data, axis=0)) / (np.max(data, axis=0) - np.min(data, axis=0) + 1e-8)
        
        # Reconstruct
        reconstructed = self.autoencoder.predict(data_normalized, verbose=0)
        
        # Calculate reconstruction error
        reconstruction_error = np.mean((data_normalized - reconstructed) ** 2, axis=1)
        
        # Anomaly score (normalized to 0-1)
        max_error = np.max(reconstruction_error) if len(reconstruction_error) > 0 else 1.0
        anomaly_scores = reconstruction_error / (max_error + 1e-8)
        anomaly_scores = np.clip(anomaly_scores, 0, 1)
        
        # Binary classification
        is_anomaly = (anomaly_scores > self.threshold).astype(int)
        
        return anomaly_scores, is_anomaly
    
    def detect_anomaly_isolation_forest(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Detect anomalies using Isolation Forest"""
        if self.isolation_forest is None:
            raise Exception("Isolation Forest not trained")
        
        # Predict
        predictions = self.isolation_forest.predict(data)
        scores = self.isolation_forest.score_samples(data)
        
        # Convert to anomaly scores (0-1, higher = more anomalous)
        # Isolation Forest returns -1 for anomalies, 1 for normal
        is_anomaly = (predictions == -1).astype(int)
        
        # Normalize scores to 0-1
        min_score = np.min(scores)
        max_score = np.max(scores)
        anomaly_scores = (scores - min_score) / (max_score - min_score + 1e-8)
        anomaly_scores = 1 - anomaly_scores  # Invert so higher = more anomalous
        
        return anomaly_scores, is_anomaly
    
    def detect_anomaly_hybrid(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Hybrid anomaly detection combining autoencoder and isolation forest"""
        # Autoencoder scores
        ae_scores, ae_anomalies = self.detect_anomaly_autoencoder(data)
        
        # Isolation Forest scores
        if_scores, if_anomalies = self.detect_anomaly_isolation_forest(data)
        
        # Combine scores (weighted average)
        alpha = 0.6  # Weight for autoencoder
        hybrid_scores = alpha * ae_scores + (1 - alpha) * if_scores
        
        # Binary classification
        hybrid_anomalies = (hybrid_scores > self.threshold).astype(int)
        
        # Anomaly types
        anomaly_types = []
        for i in range(len(hybrid_anomalies)):
            if hybrid_anomalies[i] == 1:
                if ae_scores[i] > if_scores[i]:
                    anomaly_types.append('unusual_behavior')
                else:
                    anomaly_types.append('bot')
            else:
                anomaly_types.append('normal')
        
        return hybrid_scores, hybrid_anomalies, np.array(anomaly_types)
    
    def classify_anomaly_type(self, event_data: Dict[str, Any], anomaly_score: float) -> str:
        """Classify type of anomaly"""
        if anomaly_score < 0.5:
            return 'normal'
        elif anomaly_score < 0.7:
            return 'unusual_behavior'
        elif anomaly_score < 0.9:
            # Check for bot-like behavior
            if event_data.get('eventCount', 0) > 100:
                return 'bot'
            elif event_data.get('errorRate', 0) > 0.5:
                return 'performance_issue'
            else:
                return 'unusual_behavior'
        else:
            # High anomaly score
            if event_data.get('eventCount', 0) > 200:
                return 'bot'
            elif event_data.get('suspiciousPattern', False):
                return 'fraud'
            else:
                return 'unusual_behavior'
    
    def save(self, filepath: str):
        """Save models to file"""
        if self.autoencoder is None:
            raise Exception("No model to save")
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Save autoencoder
        autoencoder_path = filepath.replace('.h5', '_autoencoder.h5')
        self.autoencoder.save(autoencoder_path)
        
        # Save isolation forest
        if self.isolation_forest:
            import joblib
            if_path = filepath.replace('.h5', '_isolation_forest.joblib')
            joblib.dump(self.isolation_forest, if_path)
        
        logger.info(f"Models saved to {filepath}")
    
    def load(self, filepath: str):
        """Load models from file"""
        # Load autoencoder
        autoencoder_path = filepath.replace('.h5', '_autoencoder.h5')
        if not os.path.exists(autoencoder_path):
            raise FileNotFoundError(f"Model file not found: {autoencoder_path}")
        
        self.autoencoder = keras.models.load_model(autoencoder_path)
        
        # Load isolation forest
        if_path = filepath.replace('.h5', '_isolation_forest.joblib')
        if os.path.exists(if_path):
            import joblib
            self.isolation_forest = joblib.load(if_path)
        
        self.is_trained = True
        logger.info(f"Models loaded from {filepath}")

