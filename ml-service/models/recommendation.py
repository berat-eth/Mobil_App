import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from typing import List, Dict, Any, Optional, Tuple
import logging
import os
from config import config

logger = logging.getLogger(__name__)

class RecommendationModel:
    """Neural Collaborative Filtering recommendation model"""
    
    def __init__(self, num_users: int = 10000, num_products: int = 1000, embedding_dim: int = 64):
        self.num_users = num_users
        self.num_products = num_products
        self.embedding_dim = embedding_dim
        self.model = None
        self.is_trained = False
        self.user_encoder = None
        self.product_encoder = None
    
    def build_model(self):
        """Build Neural Collaborative Filtering model"""
        # User embedding
        user_input = layers.Input(shape=(1,), name='user_input')
        user_embedding = layers.Embedding(
            self.num_users + 1,
            self.embedding_dim,
            embeddings_initializer='he_normal',
            embeddings_regularizer=keras.regularizers.l2(1e-6)
        )(user_input)
        user_vec = layers.Flatten()(user_embedding)
        
        # Product embedding
        product_input = layers.Input(shape=(1,), name='product_input')
        product_embedding = layers.Embedding(
            self.num_products + 1,
            self.embedding_dim,
            embeddings_initializer='he_normal',
            embeddings_regularizer=keras.regularizers.l2(1e-6)
        )(product_input)
        product_vec = layers.Flatten()(product_embedding)
        
        # Concatenate embeddings
        concat = layers.concatenate([user_vec, product_vec])
        
        # MLP layers
        mlp1 = layers.Dense(128, activation='relu')(concat)
        mlp1_dropout = layers.Dropout(0.2)(mlp1)
        mlp2 = layers.Dense(64, activation='relu')(mlp1_dropout)
        mlp2_dropout = layers.Dropout(0.2)(mlp2)
        mlp3 = layers.Dense(32, activation='relu')(mlp2_dropout)
        
        # Output layer
        output = layers.Dense(1, activation='sigmoid', name='rating')(mlp3)
        
        # Create model
        self.model = keras.Model(
            inputs=[user_input, product_input],
            outputs=output,
            name='neural_collaborative_filtering'
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
        
        logger.info("Recommendation model built")
        return self.model
    
    def train(self,
              user_ids: np.ndarray,
              product_ids: np.ndarray,
              ratings: np.ndarray,
              validation_split: float = 0.2,
              epochs: int = None,
              batch_size: int = None):
        """Train the recommendation model"""
        if self.model is None:
            self.build_model()
        
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
            [user_ids, product_ids],
            ratings,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        self.is_trained = True
        logger.info("Recommendation model trained")
        return history
    
    def predict(self, user_id: int, product_ids: np.ndarray) -> np.ndarray:
        """Predict ratings for user-product pairs"""
        if self.model is None:
            raise Exception("Model not built or loaded")
        
        user_ids = np.full(len(product_ids), user_id)
        predictions = self.model.predict(
            [user_ids, product_ids],
            verbose=0
        )
        return predictions.flatten()
    
    def recommend(self, user_id: int, product_ids: np.ndarray, top_k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        """Get top-k recommendations for user"""
        predictions = self.predict(user_id, product_ids)
        
        # Get top-k indices
        top_indices = np.argsort(predictions)[::-1][:top_k]
        top_products = product_ids[top_indices]
        top_scores = predictions[top_indices]
        
        return top_products, top_scores
    
    def recommend_hybrid(self,
                        user_id: int,
                        product_ids: np.ndarray,
                        user_features: np.ndarray,
                        product_features: np.ndarray,
                        top_k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        """Hybrid recommendation using collaborative filtering + content-based"""
        # Collaborative filtering score
        cf_scores = self.predict(user_id, product_ids)
        
        # Content-based score (simple cosine similarity)
        # Normalize features
        user_feat_norm = user_features / (np.linalg.norm(user_features) + 1e-8)
        product_feat_norm = product_features / (np.linalg.norm(product_features, axis=1, keepdims=True) + 1e-8)
        
        # Cosine similarity
        cb_scores = np.dot(product_feat_norm, user_feat_norm)
        
        # Combine scores (weighted average)
        alpha = 0.7  # Weight for collaborative filtering
        hybrid_scores = alpha * cf_scores + (1 - alpha) * cb_scores
        
        # Get top-k
        top_indices = np.argsort(hybrid_scores)[::-1][:top_k]
        top_products = product_ids[top_indices]
        top_scores = hybrid_scores[top_indices]
        
        return top_products, top_scores
    
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

