import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """Data processing and feature engineering for ML models"""
    
    def __init__(self, sequence_length: int = 20, embedding_dim: int = 64):
        self.sequence_length = sequence_length
        self.embedding_dim = embedding_dim
        
        # Event type weights
        self.event_weights = {
            'screen_view': 1,
            'click': 2,
            'product_view': 3,
            'add_to_cart': 5,
            'purchase': 10,
            'favorite': 4,
            'search': 1,
            'filter_used': 1,
            'sort_used': 1,
            'compare_used': 2
        }
    
    def process_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single event into features"""
        features = {}
        
        # Basic features
        features['eventType'] = event.get('eventType', 'unknown')
        features['eventTypeWeight'] = self.event_weights.get(features['eventType'], 0)
        features['hasUserId'] = 1 if event.get('userId') else 0
        features['hasSessionId'] = 1 if event.get('sessionId') else 0
        
        # Time-based features
        timestamp = event.get('timestamp')
        if timestamp:
            if isinstance(timestamp, str):
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                dt = timestamp
            
            features['hour'] = dt.hour
            features['dayOfWeek'] = dt.weekday()
            features['isWeekend'] = 1 if dt.weekday() >= 5 else 0
            features['isBusinessHours'] = 1 if 9 <= dt.hour <= 17 else 0
            features['month'] = dt.month
            features['dayOfMonth'] = dt.day
        
        # Event data features
        event_data = event.get('eventData', {})
        if event_data is None:
            event_data = {}
        elif isinstance(event_data, str):
            try:
                event_data = json.loads(event_data)
            except:
                event_data = {}
        
        features['hasProductId'] = 1 if event_data.get('productId') else 0
        features['hasScreenName'] = 1 if event.get('screenName') else 0
        features['hasScrollDepth'] = 1 if event_data.get('scrollDepth') else 0
        features['hasTimeOnScreen'] = 1 if event_data.get('timeOnScreen') else 0
        
        # Performance features
        if 'pageLoadTime' in event_data:
            features['pageLoadTime'] = float(event_data['pageLoadTime'])
        else:
            features['pageLoadTime'] = 0.0
        
        if 'apiResponseTime' in event_data:
            features['apiResponseTime'] = float(event_data['apiResponseTime'])
        else:
            features['apiResponseTime'] = 0.0
        
        # Scroll depth
        if 'scrollDepth' in event_data:
            features['scrollDepth'] = float(event_data['scrollDepth'])
        else:
            features['scrollDepth'] = 0.0
        
        # Time on screen
        if 'timeOnScreen' in event_data:
            features['timeOnScreen'] = float(event_data['timeOnScreen'])
        else:
            features['timeOnScreen'] = 0.0
        
        return features
    
    def create_user_sequence(self, events: List[Dict[str, Any]]) -> np.ndarray:
        """Create sequence of events for sequence models"""
        if not events:
            return np.zeros((self.sequence_length, len(self.event_weights)))
        
        # Process events
        processed = [self.process_event(e) for e in events[-self.sequence_length:]]
        
        # Create sequence matrix
        sequence = np.zeros((self.sequence_length, len(self.event_weights)))
        
        for i, event in enumerate(processed):
            event_type = event.get('eventType', 'unknown')
            if event_type in self.event_weights:
                weight = self.event_weights[event_type]
                idx = list(self.event_weights.keys()).index(event_type)
                sequence[i, idx] = weight
        
        return sequence
    
    def create_user_features(self, events: List[Dict[str, Any]], user_data: Optional[Dict[str, Any]] = None) -> np.ndarray:
        """Create feature vector for user"""
        if not events:
            return np.zeros(50)  # Default feature size
        
        # Aggregate features from events
        features = []
        
        # Event counts
        event_counts = {}
        for event in events:
            event_type = event.get('eventType', 'unknown')
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        # Add event type counts
        for event_type in self.event_weights.keys():
            features.append(event_counts.get(event_type, 0))
        
        # Time-based aggregations
        timestamps = [e.get('timestamp') for e in events if e.get('timestamp')]
        if timestamps:
            hours = [self._extract_hour(t) for t in timestamps]
            features.append(np.mean(hours) if hours else 0)
            features.append(np.std(hours) if len(hours) > 1 else 0)
        else:
            features.extend([0, 0])
        
        # Performance aggregations
        page_load_times = []
        api_response_times = []
        scroll_depths = []
        time_on_screens = []
        
        for event in events:
            event_data = event.get('eventData', {})
            if event_data is None:
                event_data = {}
            elif isinstance(event_data, str):
                try:
                    event_data = json.loads(event_data)
                except:
                    event_data = {}
            
            if 'pageLoadTime' in event_data:
                page_load_times.append(float(event_data['pageLoadTime']))
            if 'apiResponseTime' in event_data:
                api_response_times.append(float(event_data['apiResponseTime']))
            if 'scrollDepth' in event_data:
                scroll_depths.append(float(event_data['scrollDepth']))
            if 'timeOnScreen' in event_data:
                time_on_screens.append(float(event_data['timeOnScreen']))
        
        features.append(np.mean(page_load_times) if page_load_times else 0)
        features.append(np.std(page_load_times) if len(page_load_times) > 1 else 0)
        features.append(np.mean(api_response_times) if api_response_times else 0)
        features.append(np.std(api_response_times) if len(api_response_times) > 1 else 0)
        features.append(np.mean(scroll_depths) if scroll_depths else 0)
        features.append(np.max(scroll_depths) if scroll_depths else 0)
        features.append(np.mean(time_on_screens) if time_on_screens else 0)
        
        # User data features
        if user_data:
            features.append(1 if user_data.get('hasOrders') else 0)
            features.append(user_data.get('orderCount', 0))
            features.append(user_data.get('totalSpent', 0))
            features.append(user_data.get('avgOrderValue', 0))
            features.append(user_data.get('daysSinceLastOrder', 0))
        else:
            features.extend([0, 0, 0, 0, 0])
        
        # Pad or truncate to fixed size
        target_size = 50
        if len(features) < target_size:
            features.extend([0] * (target_size - len(features)))
        elif len(features) > target_size:
            features = features[:target_size]
        
        return np.array(features, dtype=np.float32)
    
    def create_product_features(self, product_data: Dict[str, Any]) -> np.ndarray:
        """Create feature vector for product"""
        features = []
        
        # Basic product features
        features.append(float(product_data.get('price', 0)))
        features.append(float(product_data.get('stock', 0)))
        features.append(1 if product_data.get('isActive', False) else 0)
        
        # Category encoding (simple one-hot would be better, but using numeric for now)
        category_id = product_data.get('categoryId', 0)
        features.append(float(category_id))
        
        # View count
        features.append(float(product_data.get('viewCount', 0)))
        
        # Order count
        features.append(float(product_data.get('orderCount', 0)))
        
        # Rating
        features.append(float(product_data.get('avgRating', 0)))
        
        # Pad to fixed size
        target_size = 20
        if len(features) < target_size:
            features.extend([0] * (target_size - len(features)))
        
        return np.array(features, dtype=np.float32)
    
    def create_interaction_features(self, user_features: np.ndarray, product_features: np.ndarray) -> np.ndarray:
        """Create interaction features between user and product"""
        # Concatenate user and product features
        interaction = np.concatenate([user_features, product_features])
        
        # Add element-wise product (captures interactions)
        interaction_product = user_features[:len(product_features)] * product_features
        
        # Combine
        result = np.concatenate([interaction, interaction_product])
        
        return result
    
    def _extract_hour(self, timestamp: Any) -> int:
        """Extract hour from timestamp"""
        if isinstance(timestamp, str):
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                return dt.hour
            except:
                return 0
        elif isinstance(timestamp, datetime):
            return timestamp.hour
        else:
            return 0
    
    def normalize_features(self, features: np.ndarray, mean: Optional[np.ndarray] = None, std: Optional[np.ndarray] = None) -> tuple:
        """Normalize features using z-score"""
        if mean is None:
            mean = np.mean(features, axis=0)
        if std is None:
            std = np.std(features, axis=0)
            std = np.where(std == 0, 1, std)  # Avoid division by zero
        
        normalized = (features - mean) / std
        return normalized, mean, std
    
    def prepare_batch(self, events_list: List[List[Dict[str, Any]]]) -> tuple:
        """Prepare batch of sequences and features"""
        sequences = []
        features = []
        
        for events in events_list:
            seq = self.create_user_sequence(events)
            feat = self.create_user_features(events)
            sequences.append(seq)
            features.append(feat)
        
        sequences = np.array(sequences)
        features = np.array(features)
        
        return sequences, features

