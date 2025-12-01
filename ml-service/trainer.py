import numpy as np
import pandas as pd
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
from config import config
from utils.db_connector import DBConnector
from data_processor import DataProcessor
from models.purchase_prediction import PurchasePredictionModel
from models.recommendation import RecommendationModel
from models.anomaly_detection import AnomalyDetectionModel
from models.segmentation import SegmentationModel
from utils.model_loader import ModelLoader

logger = logging.getLogger(__name__)

class ModelTrainer:
    """Model training pipeline"""
    
    def __init__(self, db_connector: DBConnector):
        self.db = db_connector
        self.data_processor = DataProcessor(
            sequence_length=config.SEQUENCE_LENGTH,
            embedding_dim=config.EMBEDDING_DIM
        )
        self.model_loader = ModelLoader()
    
    async def prepare_training_data_purchase(self, days: int = 30) -> tuple:
        """Prepare training data for purchase prediction"""
        try:
            print(f"🔍 Veritabanından event verileri çekiliyor (son {days} gün)...", flush=True)
            logger.info(f"🔍 Veritabanından event verileri çekiliyor (son {days} gün)...")
            
            # Get events from database
            query = """
                SELECT 
                    ube.userId,
                    ube.eventType,
                    ube.eventData,
                    ube.timestamp,
                    ube.sessionId
                FROM user_behavior_events ube
                WHERE ube.timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
                    AND ube.userId IS NOT NULL
                ORDER BY ube.userId, ube.timestamp
            """
            events = await self.db.execute(query, (days,))
            
            print(f"📥 {len(events)} event veritabanından çekildi", flush=True)
            logger.info(f"📥 {len(events)} event veritabanından çekildi")
            
            # Get purchase labels
            print("🔍 Satın alma verileri çekiliyor...", flush=True)
            logger.info("🔍 Satın alma verileri çekiliyor...")
            
            purchase_query = """
                SELECT 
                    userId,
                    createdAt as purchaseDate
                FROM orders
                WHERE createdAt >= DATE_SUB(NOW(), INTERVAL %s DAY)
                    AND status = 'completed'
            """
            purchases = await self.db.execute(purchase_query, (days,))
            
            print(f"📥 {len(purchases)} satın alma kaydı bulundu", flush=True)
            logger.info(f"📥 {len(purchases)} satın alma kaydı bulundu")
            
            # Group events by user
            print("📊 Event'ler kullanıcılara göre gruplandırılıyor...", flush=True)
            logger.info("📊 Event'ler kullanıcılara göre gruplandırılıyor...")
            
            user_events = {}
            for event in events:
                user_id = event['userId']
                if user_id not in user_events:
                    user_events[user_id] = []
                user_events[user_id].append(event)
            
            print(f"👥 {len(user_events)} benzersiz kullanıcı bulundu", flush=True)
            logger.info(f"👥 {len(user_events)} benzersiz kullanıcı bulundu")
            
            # Create sequences and labels
            print("🔧 Sequence ve feature'lar oluşturuluyor...", flush=True)
            logger.info("🔧 Sequence ve feature'lar oluşturuluyor...")
            
            sequences = []
            features = []
            labels = []
            
            purchase_count = 0
            for user_id, events_list in user_events.items():
                # Check if user made purchase
                user_purchases = [p for p in purchases if p['userId'] == user_id]
                has_purchase = len(user_purchases) > 0
                if has_purchase:
                    purchase_count += 1
                
                # Create sequence
                sequence = self.data_processor.create_user_sequence(events_list)
                feature = self.data_processor.create_user_features(events_list)
                
                sequences.append(sequence)
                features.append(feature)
                labels.append(1 if has_purchase else 0)
            
            print(f"✅ Veri hazırlandı: {len(sequences)} örnek, {purchase_count} satın alma etiketi", flush=True)
            logger.info(f"✅ Veri hazırlandı: {len(sequences)} örnek, {purchase_count} satın alma etiketi")
            
            return np.array(sequences), np.array(features), np.array(labels)
            
        except Exception as e:
            import traceback
            logger.error(f"Error preparing purchase training data: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def prepare_training_data_recommendation(self, days: int = 30) -> tuple:
        """Prepare training data for recommendation"""
        try:
            # Get user-product interactions
            query = """
                SELECT DISTINCT
                    ube.userId,
                    JSON_EXTRACT(ube.eventData, '$.productId') as productId,
                    CASE 
                        WHEN ube.eventType = 'purchase' THEN 1
                        WHEN ube.eventType = 'add_to_cart' THEN 0.7
                        WHEN ube.eventType = 'product_view' THEN 0.3
                        ELSE 0.1
                    END as rating
                FROM user_behavior_events ube
                WHERE ube.timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
                    AND ube.userId IS NOT NULL
                    AND JSON_EXTRACT(ube.eventData, '$.productId') IS NOT NULL
            """
            interactions = await self.db.execute(query, (days,))
            
            if not interactions:
                logger.warning("No recommendation training data available")
                return None, None, None, 0, 0
            
            # Create mappings
            user_ids = sorted(list(set([int(i['userId']) for i in interactions if i['userId']])))
            product_ids = sorted(list(set([int(i['productId']) for i in interactions if i['productId']])))
            
            if not user_ids or not product_ids:
                logger.warning("Insufficient recommendation training data (no users or products)")
                return None, None, None, 0, 0
            
            user_map = {uid: idx for idx, uid in enumerate(user_ids)}
            product_map = {pid: idx for idx, pid in enumerate(product_ids)}
            
            # Create arrays
            user_array = np.array([user_map[int(i['userId'])] for i in interactions if i['userId'] and i['productId']])
            product_array = np.array([product_map[int(i['productId'])] for i in interactions if i['userId'] and i['productId']])
            ratings = np.array([float(i['rating']) for i in interactions if i['userId'] and i['productId']])
            
            num_users = len(user_ids)
            num_products = len(product_ids)
            
            logger.info(f"Recommendation data prepared: {len(user_array)} interactions, {num_users} users, {num_products} products")
            
            return user_array, product_array, ratings, num_users, num_products
            
        except Exception as e:
            import traceback
            logger.error(f"Error preparing recommendation training data: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def prepare_training_data_anomaly(self, days: int = 30) -> np.ndarray:
        """Prepare training data for anomaly detection"""
        try:
            # Get normal events (non-anomalous)
            query = """
                SELECT 
                    ube.eventData,
                    ube.eventType
                FROM user_behavior_events ube
                WHERE ube.timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
                    AND ube.userId IS NOT NULL
                LIMIT 10000
            """
            events = await self.db.execute(query, (days,))
            
            # Create features
            features = []
            for event in events:
                feature = self.data_processor.create_user_features([event])
                features.append(feature)
            
            return np.array(features)
            
        except Exception as e:
            import traceback
            logger.error(f"Error preparing anomaly training data: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def prepare_training_data_segmentation(self, days: int = 30) -> np.ndarray:
        """Prepare training data for segmentation"""
        try:
            # Get user features
            query = """
                SELECT 
                    ube.userId,
                    ube.eventType,
                    ube.eventData,
                    ube.timestamp
                FROM user_behavior_events ube
                WHERE ube.timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
                    AND ube.userId IS NOT NULL
                ORDER BY ube.userId, ube.timestamp
            """
            events = await self.db.execute(query, (days,))
            
            # Group by user
            user_events = {}
            for event in events:
                user_id = event['userId']
                if user_id not in user_events:
                    user_events[user_id] = []
                user_events[user_id].append(event)
            
            # Create features
            features = []
            for user_id, events_list in user_events.items():
                feature = self.data_processor.create_user_features(events_list)
                features.append(feature)
            
            return np.array(features)
            
        except Exception as e:
            import traceback
            logger.error(f"Error preparing segmentation training data: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def train_purchase_model(self, version: str = None):
        """Train purchase prediction model"""
        try:
            print("🔍 Veri hazırlanıyor...", flush=True)
            logger.info("🔍 Veri hazırlanıyor...")
            
            # Prepare data
            sequences, features, labels = await self.prepare_training_data_purchase()
            
            print(f"📊 Veri hazırlandı: {len(sequences)} örnek bulundu", flush=True)
            logger.info(f"📊 Veri hazırlandı: {len(sequences)} örnek bulundu")
            
            if len(sequences) == 0:
                warning_msg = "⚠️ Eğitim verisi bulunamadı!"
                print(warning_msg, flush=True)
                logger.warning(warning_msg)
                return
            
            # Check minimum data requirements
            purchase_count = int(np.sum(labels))
            unique_users_approx = len(sequences)  # Approximate
            
            if len(sequences) < 20:
                warning_msg = f"⚠️ Çok az eğitim örneği ({len(sequences)}). Model overfit olabilir. Önerilen: en az 200 örnek."
                print(warning_msg, flush=True)
                logger.warning(warning_msg)
            if purchase_count < 5:
                warning_msg = f"⚠️ Çok az satın alma etiketi ({purchase_count}). Model etkili öğrenemeyebilir. Önerilen: en az 20-50 satın alma."
                print(warning_msg, flush=True)
                logger.warning(warning_msg)
            
            print(f"📈 Veri boyutları - Sequences: {sequences.shape}, Features: {features.shape}, Labels: {labels.shape}", flush=True)
            logger.info(f"📈 Veri boyutları - Sequences: {sequences.shape}, Features: {features.shape}, Labels: {labels.shape}")
            print(f"📊 İstatistikler - Toplam örnek: {len(sequences)}, Satın alma etiketi: {purchase_count}", flush=True)
            logger.info(f"📊 İstatistikler - Toplam örnek: {len(sequences)}, Satın alma etiketi: {purchase_count}")
            
            print("🏗️ Model oluşturuluyor...", flush=True)
            logger.info("🏗️ Model oluşturuluyor...")
            
            # Create model
            model = PurchasePredictionModel(
                sequence_length=config.SEQUENCE_LENGTH,
                embedding_dim=config.EMBEDDING_DIM
            )
            
            num_event_types = sequences.shape[2] if len(sequences.shape) > 2 else 10
            feature_dim = features.shape[1] if len(features.shape) > 1 else 50
            model.build_model(num_event_types, feature_dim)
            
            print(f"✅ Model oluşturuldu - Event types: {num_event_types}, Feature dim: {feature_dim}", flush=True)
            logger.info(f"✅ Model oluşturuldu - Event types: {num_event_types}, Feature dim: {feature_dim}")
            
            print("🎓 Model eğitimi başlatılıyor...", flush=True)
            logger.info("🎓 Model eğitimi başlatılıyor...")
            
            # Train
            history = model.train(sequences, features, labels)
            
            final_accuracy = float(history.history.get('accuracy', [0])[-1])
            final_loss = float(history.history.get('loss', [0])[-1])
            print(f"📊 Eğitim tamamlandı - Accuracy: {final_accuracy:.4f}, Loss: {final_loss:.4f}", flush=True)
            logger.info(f"📊 Eğitim tamamlandı - Accuracy: {final_accuracy:.4f}, Loss: {final_loss:.4f}")
            
            # Save model
            version = version or f"v{int(datetime.now().timestamp())}"
            model_path = self.model_loader.get_model_path('purchase_model', version)
            
            print(f"💾 Model kaydediliyor: {model_path}", flush=True)
            logger.info(f"💾 Model kaydediliyor: {model_path}")
            
            model.save(model_path)
            
            # Save metadata
            metadata = {
                "model_type": "purchase_prediction",
                "version": version,
                "trained_at": datetime.now().isoformat(),
                "training_samples": len(sequences),
                "accuracy": float(history.history.get('accuracy', [0])[-1]),
                "loss": float(history.history.get('loss', [0])[-1])
            }
            self.model_loader.save_model_metadata('purchase_model', version, metadata)
            
            success_msg = f"✅ Purchase prediction modeli başarıyla eğitildi ve kaydedildi (v{version})"
            print(success_msg, flush=True)
            logger.info(success_msg)
            
        except Exception as e:
            import traceback
            logger.error(f"Error training purchase model: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def train_recommendation_model(self, version: str = None):
        """Train recommendation model"""
        try:
            logger.info("Starting recommendation model training...")
            
            # Prepare data
            result = await self.prepare_training_data_recommendation()
            
            # Eğer result None ise veya yetersiz veri varsa
            if result is None:
                logger.warning("No training data available for recommendation model")
                return
            
            # Result'un uzunluğunu kontrol et (3 veya 5 değer olabilir)
            if len(result) < 3:
                logger.warning("Recommendation model: yetersiz veri")
                return
            
            # Eğer 3 değer döndürülmüşse (eski format), otomatik hesapla
            if len(result) == 3:
                user_ids, product_ids, ratings = result
                if user_ids is None or product_ids is None or ratings is None:
                    logger.warning("Recommendation model: yetersiz veri")
                    return
                # Otomatik değer ataması
                num_users = len(set(user_ids)) if len(user_ids) > 0 else 0
                num_products = len(set(product_ids)) if len(product_ids) > 0 else 0
            else:
                # 5 değer döndürülmüşse (yeni format)
                user_ids, product_ids, ratings, num_users, num_products = result
            
            # Veri kontrolü
            if result[0] is None or num_users == 0 or num_products == 0:
                logger.warning("No training data available for recommendation model")
                return
            
            if len(user_ids) == 0 or len(product_ids) == 0:
                logger.warning("Insufficient training data for recommendation model")
                return
            
            # Create model
            model = RecommendationModel(
                num_users=num_users,
                num_products=num_products,
                embedding_dim=config.EMBEDDING_DIM
            )
            model.build_model()
            
            # Train
            history = model.train(user_ids, product_ids, ratings)
            
            # Save model
            version = version or f"v{int(datetime.now().timestamp())}"
            model_path = self.model_loader.get_model_path('recommendation_model', version)
            model.save(model_path)
            
            # Save metadata
            metadata = {
                "model_type": "recommendation",
                "version": version,
                "trained_at": datetime.now().isoformat(),
                "training_samples": len(user_ids),
                "num_users": num_users,
                "num_products": num_products,
                "accuracy": float(history.history.get('accuracy', [0])[-1])
            }
            self.model_loader.save_model_metadata('recommendation_model', version, metadata)
            
            logger.info("Recommendation model trained successfully")
            
        except Exception as e:
            import traceback
            logger.error(f"Error training recommendation model: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def train_anomaly_model(self, version: str = None):
        """Train anomaly detection model"""
        try:
            logger.info("Starting anomaly detection model training...")
            
            # Prepare data
            data = await self.prepare_training_data_anomaly()
            
            if len(data) == 0:
                logger.warning("No training data available")
                return
            
            # Create model
            model = AnomalyDetectionModel(input_dim=data.shape[1])
            model.build_autoencoder()
            
            # Train autoencoder
            model.train_autoencoder(data)
            
            # Train isolation forest
            model.train_isolation_forest(data)
            
            # Save model
            version = version or f"v{int(datetime.now().timestamp())}"
            model_path = self.model_loader.get_model_path('anomaly_model', version)
            model.save(model_path)
            
            # Save metadata
            metadata = {
                "model_type": "anomaly_detection",
                "version": version,
                "trained_at": datetime.now().isoformat(),
                "training_samples": len(data)
            }
            self.model_loader.save_model_metadata('anomaly_model', version, metadata)
            
            logger.info("Anomaly detection model trained successfully")
            
        except Exception as e:
            import traceback
            logger.error(f"Error training anomaly model: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def train_segmentation_model(self, version: str = None):
        """Train segmentation model"""
        try:
            logger.info("Starting segmentation model training...")
            
            # Prepare data
            data = await self.prepare_training_data_segmentation()
            
            if len(data) == 0:
                logger.warning("No training data available")
                return
            
            # Create model
            model = SegmentationModel(num_segments=config.NUM_SEGMENTS)
            
            # Train autoencoder
            model.train_autoencoder(data)
            
            # Train K-means
            model.train_kmeans(data, use_autoencoder=True)
            
            # Save model
            version = version or f"v{int(datetime.now().timestamp())}"
            model_path = self.model_loader.get_model_path('segmentation_model', version)
            model.save(model_path)
            
            # Save metadata
            metadata = {
                "model_type": "segmentation",
                "version": version,
                "trained_at": datetime.now().isoformat(),
                "training_samples": len(data),
                "num_segments": config.NUM_SEGMENTS
            }
            self.model_loader.save_model_metadata('segmentation_model', version, metadata)
            
            logger.info("Segmentation model trained successfully")
            
        except Exception as e:
            import traceback
            logger.error(f"Error training segmentation model: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def train_all_models(self):
        """Train all models"""
        try:
            logger.info("Starting training for all models...")
            
            await asyncio.gather(
                self.train_purchase_model(),
                self.train_recommendation_model(),
                self.train_anomaly_model(),
                self.train_segmentation_model(),
                return_exceptions=True
            )
            
            logger.info("All models trained")
            
        except Exception as e:
            logger.error(f"Error training all models: {e}")
            raise

