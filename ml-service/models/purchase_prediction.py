import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from typing import List, Dict, Any, Optional
import logging
import os
from config import config

logger = logging.getLogger(__name__)

class PurchasePredictionModel:
    """Purchase prediction model using LSTM/GRU"""
    
    def __init__(self, sequence_length: int = 20, embedding_dim: int = 64):
        self.sequence_length = sequence_length
        self.embedding_dim = embedding_dim
        self.model = None
        self.is_trained = False
    
    def build_model(self, num_event_types: int = 10, feature_dim: int = 50):
        """Build LSTM-based purchase prediction model"""
        # Input for event sequence
        sequence_input = layers.Input(shape=(self.sequence_length, num_event_types), name='sequence_input')
        
        # LSTM layers
        lstm1 = layers.LSTM(128, return_sequences=True, dropout=0.2)(sequence_input)
        lstm2 = layers.LSTM(64, return_sequences=False, dropout=0.2)(lstm1)
        
        # Input for user features
        feature_input = layers.Input(shape=(feature_dim,), name='feature_input')
        feature_dense = layers.Dense(64, activation='relu')(feature_input)
        feature_dropout = layers.Dropout(0.3)(feature_dense)
        
        # Concatenate
        concatenated = layers.concatenate([lstm2, feature_dropout])
        
        # Dense layers
        dense1 = layers.Dense(128, activation='relu')(concatenated)
        dropout1 = layers.Dropout(0.3)(dense1)
        dense2 = layers.Dense(64, activation='relu')(dropout1)
        dropout2 = layers.Dropout(0.2)(dense2)
        
        # Output layer (purchase probability)
        output = layers.Dense(1, activation='sigmoid', name='purchase_probability')(dropout2)
        
        # Create model
        self.model = keras.Model(
            inputs=[sequence_input, feature_input],
            outputs=output,
            name='purchase_prediction_model'
        )
        
        # Compile model
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=config.LEARNING_RATE),
            loss='binary_crossentropy',
            metrics=[
                'accuracy',
                keras.metrics.Precision(name='precision'),
                keras.metrics.Recall(name='recall')
            ]
        )
        
        logger.info("Purchase prediction model built")
        return self.model
    
    def train(self, 
              sequences: np.ndarray, 
              features: np.ndarray, 
              labels: np.ndarray,
              validation_split: float = 0.2,
              epochs: int = None,
              batch_size: int = None):
        """Train the model"""
        if self.model is None:
            num_event_types = sequences.shape[2] if len(sequences.shape) > 2 else 10
            feature_dim = features.shape[1] if len(features.shape) > 1 else 50
            self.build_model(num_event_types, feature_dim)
        
        epochs = epochs or config.EPOCHS
        batch_size = batch_size or config.BATCH_SIZE
        
        # Callbacks
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7
            )
        ]
        
        # Train
        history = self.model.fit(
            [sequences, features],
            labels,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        self.is_trained = True
        logger.info("Purchase prediction model trained")
        return history
    
    def predict(self, sequences: np.ndarray, features: np.ndarray) -> np.ndarray:
        """Predict purchase probability"""
        if self.model is None:
            raise Exception("Model not built or loaded")
        
        # Ensure correct shape
        if len(sequences.shape) == 2:
            sequences = np.expand_dims(sequences, axis=0)
        if len(features.shape) == 1:
            features = np.expand_dims(features, axis=0)
        
        predictions = self.model.predict([sequences, features], verbose=0)
        return predictions.flatten()
    
    def predict_churn_risk(self, sequences: np.ndarray, features: np.ndarray) -> np.ndarray:
        """Predict churn risk (inverse of engagement)"""
        # Use same model but interpret differently
        engagement_score = self.predict(sequences, features)
        churn_risk = 1.0 - engagement_score
        return churn_risk
    
    def predict_session_duration(self, sequences: np.ndarray, features: np.ndarray) -> np.ndarray:
        """Predict session duration (in seconds)"""
        # This would need a separate regression model, but for now use purchase model as proxy
        engagement = self.predict(sequences, features)
        # Map to duration (0-3600 seconds)
        duration = engagement * 3600
        return duration
    
    def save(self, filepath: str):
        """Save model to file"""
        if self.model is None:
            raise Exception("No model to save")
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        self.model.save(filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """Load model from file"""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        self.model = keras.models.load_model(filepath)
        self.is_trained = True
        logger.info(f"Model loaded from {filepath}")

