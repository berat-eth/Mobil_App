import asyncio
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from config import config
from utils.redis_connector import RedisConnector
from utils.db_connector import DBConnector
from data_processor import DataProcessor
from models.purchase_prediction import PurchasePredictionModel
from models.recommendation import RecommendationModel
from models.anomaly_detection import AnomalyDetectionModel
from models.segmentation import SegmentationModel
from utils.model_loader import ModelLoader

logger = logging.getLogger(__name__)

class RealtimeProcessor:
    """Real-time event processor for ML predictions"""
    
    def __init__(self, redis_connector: RedisConnector, db_connector: DBConnector):
        self.redis = redis_connector
        self.db = db_connector
        self.data_processor = DataProcessor(
            sequence_length=config.SEQUENCE_LENGTH,
            embedding_dim=config.EMBEDDING_DIM
        )
        self.model_loader = ModelLoader()
        
        # Models
        self.purchase_model = None
        self.recommendation_model = None
        self.anomaly_model = None
        self.segmentation_model = None
        
        # Statistics
        self.events_processed = 0
        self.predictions_made = 0
        self.recommendations_generated = 0
        self.anomalies_detected = 0
        self.segments_updated = 0
        
        # State
        self.running = False
        self.event_buffer = []
        self.user_sequences = {}  # Store user event sequences
        self.user_features_cache = {}  # Cache user features
        
    async def load_models(self):
        """Load ML models"""
        try:
            # Load purchase prediction model
            purchase_path = self.model_loader.get_model_path('purchase_model', 'latest')
            if self.model_loader.model_exists('purchase_model', 'latest'):
                self.purchase_model = PurchasePredictionModel()
                self.purchase_model.load(purchase_path)
                logger.info("Purchase prediction model loaded")
            
            # Load recommendation model
            rec_path = self.model_loader.get_model_path('recommendation_model', 'latest')
            if self.model_loader.model_exists('recommendation_model', 'latest'):
                self.recommendation_model = RecommendationModel()
                self.recommendation_model.load(rec_path)
                logger.info("Recommendation model loaded")
            
            # Load anomaly detection model
            anomaly_path = self.model_loader.get_model_path('anomaly_model', 'latest')
            if self.model_loader.model_exists('anomaly_model', 'latest'):
                self.anomaly_model = AnomalyDetectionModel()
                self.anomaly_model.load(anomaly_path)
                logger.info("Anomaly detection model loaded")
            
            # Load segmentation model
            seg_path = self.model_loader.get_model_path('segmentation_model', 'latest')
            if self.model_loader.model_exists('segmentation_model', 'latest'):
                self.segmentation_model = SegmentationModel()
                self.segmentation_model.load(seg_path)
                logger.info("Segmentation model loaded")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    async def start(self):
        """Start real-time processing"""
        self.running = True
        
        # Load models
        await self.load_models()
        
        # Start processing loop
        asyncio.create_task(self._process_events_loop())
        logger.info("Real-time processor started")
    
    async def stop(self):
        """Stop real-time processing"""
        self.running = False
        # Process remaining events
        if self.event_buffer:
            await self._process_batch(self.event_buffer)
        logger.info("Real-time processor stopped")
    
    async def _process_events_loop(self):
        """Main event processing loop"""
        logger.info(f"🔄 Event processing loop started, listening on queue: {config.REDIS_QUEUE_NAME}")
        logger.info(f"   Models status - Purchase: {self.purchase_model is not None and self.purchase_model.is_trained if self.purchase_model else False}")
        logger.info(f"   Models status - Anomaly: {self.anomaly_model is not None and self.anomaly_model.is_trained if self.anomaly_model else False}")
        logger.info(f"   Models status - Recommendation: {self.recommendation_model is not None and self.recommendation_model.is_trained if self.recommendation_model else False}")
        logger.info(f"   Models status - Segmentation: {self.segmentation_model is not None and self.segmentation_model.is_trained if self.segmentation_model else False}")
        
        while self.running:
            try:
                # Get event from Redis queue
                result = await self.redis.brpop(config.REDIS_QUEUE_NAME, timeout=config.PROCESSING_INTERVAL)
                
                if result:
                    queue_name, event_json = result
                    try:
                        event = json.loads(event_json)
                        logger.info(f"📥 Received event: {event.get('eventType')} from user {event.get('userId')}")
                        
                        # Add to buffer
                        self.event_buffer.append(event)
                        
                        # Process immediately if buffer reaches threshold, or process single event for real-time
                        if len(self.event_buffer) >= config.EVENT_BATCH_SIZE:
                            logger.info(f"📦 Processing batch of {len(self.event_buffer)} events")
                            await self._process_batch(self.event_buffer)
                            self.event_buffer = []
                        # For real-time processing, also process single events after a short delay
                        elif len(self.event_buffer) == 1:
                            # Process single event immediately for real-time response
                            await asyncio.sleep(0.1)  # Small delay to allow more events to accumulate
                            if len(self.event_buffer) > 0:
                                await self._process_batch(self.event_buffer)
                                self.event_buffer = []
                    except json.JSONDecodeError as e:
                        logger.error(f"❌ Invalid JSON in event: {e}, raw: {event_json[:100]}")
                
                # Process buffer periodically even if not full
                elif self.event_buffer:
                    logger.info(f"⏰ Processing buffer with {len(self.event_buffer)} events (periodic)")
                    await self._process_batch(self.event_buffer)
                    self.event_buffer = []
                    
            except Exception as e:
                logger.error(f"❌ Error in event processing loop: {e}", exc_info=True)
                await asyncio.sleep(1)
    
    async def _process_batch(self, events: List[Dict[str, Any]]):
        """Process a batch of events"""
        if not events:
            return
        
        try:
            # Group events by user
            user_events = {}
            for event in events:
                user_id = event.get('userId')
                if user_id:
                    if user_id not in user_events:
                        user_events[user_id] = []
                    user_events[user_id].append(event)
            
            # Process each user's events
            predictions = []
            recommendations = []
            anomalies = []
            segments = []
            
            for user_id, user_event_list in user_events.items():
                # Update user sequence
                if user_id not in self.user_sequences:
                    self.user_sequences[user_id] = []
                
                self.user_sequences[user_id].extend(user_event_list)
                # Keep only last N events
                self.user_sequences[user_id] = self.user_sequences[user_id][-config.SEQUENCE_LENGTH * 2:]
                
                # Get user sequence and features
                sequence = self.data_processor.create_user_sequence(self.user_sequences[user_id])
                features = self.data_processor.create_user_features(self.user_sequences[user_id])
                
                # Purchase prediction
                if self.purchase_model and self.purchase_model.is_trained:
                    try:
                        purchase_prob = self.purchase_model.predict(
                            np.expand_dims(sequence, axis=0),
                            np.expand_dims(features, axis=0)
                        )[0]
                        
                        predictions.append({
                            'userId': user_id,
                            'tenantId': 1,  # TODO: Get from event
                            'predictionType': 'purchase',
                            'probability': float(purchase_prob),
                            'metadata': json.dumps({'eventCount': len(user_event_list)})
                        })
                        self.predictions_made += 1
                    except Exception as e:
                        logger.error(f"Purchase prediction error: {e}")
                
                # Anomaly detection
                if self.anomaly_model and self.anomaly_model.is_trained:
                    try:
                        anomaly_scores, is_anomaly, anomaly_types = self.anomaly_model.detect_anomaly_hybrid(
                            np.expand_dims(features, axis=0)
                        )
                        
                        # Process each event in the batch
                        for i, event in enumerate(user_event_list):
                            # Use the first anomaly result for the user's feature vector
                            if i == 0 and is_anomaly[0] == 1:
                                # If classify_anomaly_type is needed for more detail, use it
                                # Otherwise use the type from detect_anomaly_hybrid
                                anomaly_type = anomaly_types[0] if len(anomaly_types) > 0 else 'unusual_behavior'
                                
                                # For more detailed classification, use the method
                                if anomaly_type == 'normal':
                                    anomaly_type = self.anomaly_model.classify_anomaly_type(
                                        event.get('eventData', {}),
                                        float(anomaly_scores[0])
                                    )
                                
                                anomalies.append({
                                    'eventId': event.get('id'),
                                    'userId': user_id,
                                    'tenantId': 1,
                                    'anomalyScore': float(anomaly_scores[0]),
                                    'anomalyType': anomaly_type,
                                    'metadata': json.dumps(event.get('eventData', {}))
                                })
                                self.anomalies_detected += 1
                    except Exception as e:
                        logger.error(f"Anomaly detection error: {e}")
                
                # Segmentation (periodic, not for every event)
                if len(self.user_sequences[user_id]) % 10 == 0:  # Every 10 events
                    if self.segmentation_model and self.segmentation_model.is_trained:
                        try:
                            segment_ids, confidence = self.segmentation_model.predict_kmeans(
                                np.expand_dims(features, axis=0)
                            )
                            
                            segments.append({
                                'userId': user_id,
                                'tenantId': 1,
                                'segmentId': int(segment_ids[0]),
                                'segmentName': self.segmentation_model.get_segment_name(int(segment_ids[0])),
                                'confidence': float(confidence[0]),
                                'metadata': json.dumps({})
                            })
                            self.segments_updated += 1
                        except Exception as e:
                            logger.error(f"Segmentation error: {e}")
            
            # Save to database
            try:
                if predictions:
                    await self.db.insert_predictions(predictions)
                    logger.info(f"💾 Saved {len(predictions)} predictions to database")
            except Exception as e:
                logger.error(f"❌ Error saving predictions: {e}", exc_info=True)
            
            try:
                if anomalies:
                    await self.db.insert_anomalies(anomalies)
                    logger.info(f"💾 Saved {len(anomalies)} anomalies to database")
            except Exception as e:
                logger.error(f"❌ Error saving anomalies: {e}", exc_info=True)
            
            try:
                if segments:
                    await self.db.insert_segments(segments)
                    logger.info(f"💾 Saved {len(segments)} segments to database")
            except Exception as e:
                logger.error(f"❌ Error saving segments: {e}", exc_info=True)
            
            # Generate recommendations (less frequent)
            if self.recommendation_model and self.recommendation_model.is_trained:
                # Get active users
                active_users = list(user_events.keys())[:10]  # Limit to 10 users per batch
                
                for user_id in active_users:
                    try:
                        # Get product IDs (would come from database in real scenario)
                        # For now, use placeholder
                        product_ids = np.array([1, 2, 3, 4, 5])  # TODO: Get from database
                        
                        # Map user_id to model's expected range (0 to num_users)
                        # Note: This is a simplified approach. In production, you should
                        # save and load the user_id mapping from training time
                        mapped_user_id = int(user_id) % (self.recommendation_model.num_users + 1)
                        
                        # Ensure product_ids are within model's expected range
                        mapped_product_ids = (product_ids % (self.recommendation_model.num_products + 1)).astype(int)
                        
                        top_products, top_scores = self.recommendation_model.recommend(
                            mapped_user_id,
                            mapped_product_ids,
                            top_k=5
                        )
                        
                        recommendations.append({
                            'userId': user_id,  # Store original user_id
                            'tenantId': 1,
                            'productIds': top_products.tolist(),
                            'scores': top_scores.tolist(),
                            'metadata': json.dumps({})
                        })
                        self.recommendations_generated += 1
                    except Exception as e:
                        logger.error(f"Recommendation error for user {user_id}: {e}")
                
                try:
                    if recommendations:
                        await self.db.insert_recommendations(recommendations)
                        logger.info(f"💾 Saved {len(recommendations)} recommendations to database")
                except Exception as e:
                    logger.error(f"❌ Error saving recommendations: {e}", exc_info=True)
            
            self.events_processed += len(events)
            logger.info(f"✅ Processed {len(events)} events | Total: {self.events_processed} | Predictions: {self.predictions_made} | Anomalies: {self.anomalies_detected} | Recommendations: {self.recommendations_generated}")
            
        except Exception as e:
            logger.error(f"Error processing batch: {e}", exc_info=True)

