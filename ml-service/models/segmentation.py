import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.cluster import KMeans, DBSCAN
from typing import List, Dict, Any, Optional, Tuple
import logging
import os
from config import config

logger = logging.getLogger(__name__)

class SegmentationModel:
    """User segmentation using clustering algorithms"""
    
    def __init__(self, num_segments: int = 5, embedding_dim: int = 32):
        self.num_segments = num_segments
        self.embedding_dim = embedding_dim
        self.kmeans = None
        self.dbscan = None
        self.autoencoder = None
        self.is_trained = False
        self.base_segment_names = [
            'VIP Müşteriler',
            'Aktif Alıcılar',
            'Potansiyel Müşteriler',
            'Az Aktif',
            'Yeni Müşteriler'
        ]
        self.segment_names = self.base_segment_names[:num_segments]
    
    def build_autoencoder(self, input_dim: int = 50):
        """Build autoencoder for feature extraction"""
        # Input
        input_layer = layers.Input(shape=(input_dim,), name='input')
        
        # Encoder
        encoded = layers.Dense(64, activation='relu')(input_layer)
        encoded = layers.Dropout(0.2)(encoded)
        encoded = layers.Dense(self.embedding_dim, activation='relu', name='encoded')(encoded)
        
        # Decoder
        decoded = layers.Dense(64, activation='relu')(encoded)
        decoded = layers.Dropout(0.2)(decoded)
        decoded = layers.Dense(input_dim, activation='sigmoid', name='decoded')(decoded)
        
        # Autoencoder
        self.autoencoder = keras.Model(input_layer, decoded, name='segmentation_autoencoder')
        
        # Compile
        self.autoencoder.compile(
            optimizer=keras.optimizers.Adam(learning_rate=config.LEARNING_RATE),
            loss='mse'
        )
        
        logger.info("Segmentation autoencoder built")
        return self.autoencoder
    
    def train_autoencoder(self,
                         data: np.ndarray,
                         epochs: int = None,
                         batch_size: int = None):
        """Train autoencoder for feature extraction"""
        if self.autoencoder is None:
            self.build_autoencoder(data.shape[1])
        
        epochs = epochs or 30
        batch_size = batch_size or config.BATCH_SIZE
        
        # Normalize
        data_normalized = (data - np.min(data, axis=0)) / (np.max(data, axis=0) - np.min(data, axis=0) + 1e-8)
        
        # Train
        self.autoencoder.fit(
            data_normalized,
            data_normalized,
            epochs=epochs,
            batch_size=batch_size,
            verbose=0
        )
        
        logger.info("Autoencoder trained")
    
    def extract_features(self, data: np.ndarray) -> np.ndarray:
        """Extract features using autoencoder encoder"""
        if self.autoencoder is None:
            return data  # Return original if autoencoder not trained
        
        # Normalize
        data_normalized = (data - np.min(data, axis=0)) / (np.max(data, axis=0) - np.min(data, axis=0) + 1e-8)
        
        # Get encoder
        encoder = keras.Model(
            self.autoencoder.input,
            self.autoencoder.get_layer('encoded').output
        )
        
        # Extract features
        features = encoder.predict(data_normalized, verbose=0)
        return features
    
    def train_kmeans(self, data: np.ndarray, use_autoencoder: bool = True):
        """Train K-means clustering"""
        # Extract features if using autoencoder
        if use_autoencoder and self.autoencoder is not None:
            features = self.extract_features(data)
        else:
            features = data
        
        # Ensure n_clusters doesn't exceed number of samples
        # Otomatik cluster sayısı: en az 2, en fazla 5
        n_samples = features.shape[0]
        n_clusters = min(5, max(2, n_samples))  # en az 2, en fazla 5
        
        if n_samples < 2:
            logger.warning(f"Insufficient data for K-means: {n_samples} samples, need at least 2")
            return
        
        if n_clusters < self.num_segments:
            logger.warning(f"Reducing clusters from {self.num_segments} to {n_clusters} (only {n_samples} samples available)")
        
        # Train K-means
        self.kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=42,
            n_init=10,
            max_iter=300
        )
        self.kmeans.fit(features)
        
        # Update num_segments to match actual clusters
        self.num_segments = n_clusters
        
        # Update segment names to match number of clusters
        if n_clusters <= len(self.base_segment_names):
            self.segment_names = self.base_segment_names[:n_clusters]
        else:
            # If more clusters than names, extend with generic names
            self.segment_names = self.base_segment_names + [f'Segment {i}' for i in range(len(self.base_segment_names), n_clusters)]
        
        logger.info(f"K-means clustering trained with {n_clusters} clusters on {n_samples} samples")
    
    def train_dbscan(self, data: np.ndarray, eps: float = 0.5, min_samples: int = 5, use_autoencoder: bool = True):
        """Train DBSCAN clustering"""
        # Extract features if using autoencoder
        if use_autoencoder and self.autoencoder is not None:
            features = self.extract_features(data)
        else:
            features = data
        
        # Train DBSCAN
        self.dbscan = DBSCAN(eps=eps, min_samples=min_samples)
        self.dbscan.fit(features)
        
        logger.info("DBSCAN clustering trained")
    
    def predict_kmeans(self, data: np.ndarray, use_autoencoder: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """Predict segments using K-means"""
        if self.kmeans is None:
            raise Exception("K-means not trained")
        
        # Extract features
        if use_autoencoder and self.autoencoder is not None:
            features = self.extract_features(data)
        else:
            features = data
        
        # Predict
        segments = self.kmeans.predict(features)
        
        # Calculate distances to centroids (confidence)
        distances = self.kmeans.transform(features)
        min_distances = np.min(distances, axis=1)
        max_distance = np.max(min_distances) if len(min_distances) > 0 else 1.0
        confidence = 1 - (min_distances / (max_distance + 1e-8))
        confidence = np.clip(confidence, 0, 1)
        
        return segments, confidence
    
    def predict_dbscan(self, data: np.ndarray, use_autoencoder: bool = True) -> Tuple[np.ndarray, np.ndarray]:
        """Predict segments using DBSCAN"""
        if self.dbscan is None:
            raise Exception("DBSCAN not trained")
        
        # Extract features
        if use_autoencoder and self.autoencoder is not None:
            features = self.extract_features(data)
        else:
            features = data
        
        # Predict
        segments = self.dbscan.fit_predict(features)
        
        # DBSCAN returns -1 for noise, map to positive segments
        unique_segments = np.unique(segments)
        segment_map = {seg: i for i, seg in enumerate(unique_segments) if seg != -1}
        segment_map[-1] = self.num_segments - 1  # Map noise to last segment
        
        mapped_segments = np.array([segment_map.get(seg, 0) for seg in segments])
        
        # Confidence (distance to nearest core point)
        # For simplicity, use uniform confidence
        confidence = np.ones(len(segments)) * 0.8
        confidence[segments == -1] = 0.3  # Lower confidence for noise
        
        return mapped_segments, confidence
    
    def get_segment_name(self, segment_id: int) -> str:
        """Get segment name by ID"""
        if 0 <= segment_id < len(self.segment_names):
            return self.segment_names[segment_id]
        return f'Segment {segment_id}'
    
    def rfm_segmentation(self, 
                        recency: np.ndarray,
                        frequency: np.ndarray,
                        monetary: np.ndarray) -> np.ndarray:
        """RFM-based segmentation"""
        # Normalize RFM values
        r_norm = (recency - np.min(recency)) / (np.max(recency) - np.min(recency) + 1e-8)
        f_norm = (frequency - np.min(frequency)) / (np.max(frequency) - np.min(frequency) + 1e-8)
        m_norm = (monetary - np.min(monetary)) / (np.max(monetary) - np.min(monetary) + 1e-8)
        
        # Combine RFM
        rfm_score = (r_norm + f_norm + m_norm) / 3
        
        # Segment based on RFM score
        segments = np.digitize(rfm_score, bins=np.linspace(0, 1, self.num_segments + 1)) - 1
        segments = np.clip(segments, 0, self.num_segments - 1)
        
        return segments
    
    def save(self, filepath: str):
        """Save models to file"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Save autoencoder
        if self.autoencoder:
            ae_path = filepath.replace('.h5', '_autoencoder.h5')
            self.autoencoder.save(ae_path)
        
        # Save K-means
        if self.kmeans:
            import joblib
            km_path = filepath.replace('.h5', '_kmeans.joblib')
            joblib.dump(self.kmeans, km_path)
        
        # Save DBSCAN
        if self.dbscan:
            import joblib
            db_path = filepath.replace('.h5', '_dbscan.joblib')
            joblib.dump(self.dbscan, db_path)
        
        logger.info(f"Models saved to {filepath}")
    
    def load(self, filepath: str):
        """Load models from file"""
        import joblib
        
        # Load autoencoder
        ae_path = filepath.replace('.h5', '_autoencoder.h5')
        if os.path.exists(ae_path):
            self.autoencoder = keras.models.load_model(ae_path)
        
        # Load K-means
        km_path = filepath.replace('.h5', '_kmeans.joblib')
        if os.path.exists(km_path):
            self.kmeans = joblib.load(km_path)
        
        # Load DBSCAN
        db_path = filepath.replace('.h5', '_dbscan.joblib')
        if os.path.exists(db_path):
            self.dbscan = joblib.load(db_path)
        
        self.is_trained = True
        logger.info(f"Models loaded from {filepath}")

