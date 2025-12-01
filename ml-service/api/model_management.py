from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()

# Global trainer instance (will be set from main.py)
trainer_instance = None
db_connector_instance = None

def set_trainer(trainer):
    """Set trainer instance from main.py"""
    global trainer_instance
    trainer_instance = trainer

def set_db_connector(db_connector):
    """Set db connector instance from main.py"""
    global db_connector_instance
    db_connector_instance = db_connector

class TrainRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_type: str
    epochs: Optional[int] = None
    batch_size: Optional[int] = None
    days: Optional[int] = 30

class DeployRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str
    version: str

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    days: Optional[int] = 30
    analysis_type: Optional[str] = "overview"

async def train_model_background(model_type: str, days: int = 30):
    """Background task for model training"""
    import sys
    import traceback
    
    # Force flush logs immediately
    print(f"\n{'='*60}", flush=True)
    print(f"🚀 MODEL EĞİTİMİ BAŞLATILIYOR: {model_type}", flush=True)
    print(f"{'='*60}\n", flush=True)
    
    logger.info(f"{'='*60}")
    logger.info(f"🚀 MODEL EĞİTİMİ BAŞLATILIYOR: {model_type}")
    logger.info(f"📅 Veri aralığı: Son {days} gün")
    logger.info(f"{'='*60}")
    
    try:
        if not trainer_instance:
            error_msg = "❌ Trainer instance not set"
            print(error_msg, flush=True)
            logger.error(error_msg)
            return
        
        logger.info(f"✅ Trainer instance bulundu, eğitim başlatılıyor...")
        print(f"✅ Trainer instance bulundu, eğitim başlatılıyor...", flush=True)
        
        if model_type == "purchase_prediction":
            print(f"📊 Purchase prediction modeli eğitiliyor...", flush=True)
            logger.info("📊 Purchase prediction modeli eğitiliyor...")
            await trainer_instance.train_purchase_model()
        elif model_type == "recommendation":
            print(f"📊 Recommendation modeli eğitiliyor...", flush=True)
            logger.info("📊 Recommendation modeli eğitiliyor...")
            await trainer_instance.train_recommendation_model()
        elif model_type == "anomaly_detection":
            print(f"📊 Anomaly detection modeli eğitiliyor...", flush=True)
            logger.info("📊 Anomaly detection modeli eğitiliyor...")
            await trainer_instance.train_anomaly_model()
        elif model_type == "segmentation":
            print(f"📊 Segmentation modeli eğitiliyor...", flush=True)
            logger.info("📊 Segmentation modeli eğitiliyor...")
            await trainer_instance.train_segmentation_model()
        elif model_type == "all":
            print(f"📊 Tüm modeller eğitiliyor...", flush=True)
            logger.info("📊 Tüm modeller eğitiliyor...")
            await trainer_instance.train_all_models()
        else:
            error_msg = f"❌ Unknown model type: {model_type}"
            print(error_msg, flush=True)
            logger.error(error_msg)
            return
            
        success_msg = f"✅ Model eğitimi tamamlandı: {model_type}"
        print(f"\n{'='*60}", flush=True)
        print(success_msg, flush=True)
        print(f"{'='*60}\n", flush=True)
        logger.info(f"{'='*60}")
        logger.info(success_msg)
        logger.info(f"{'='*60}")
        
    except Exception as e:
        error_msg = f"❌ Model eğitimi hatası: {str(e)}"
        print(f"\n{'='*60}", flush=True)
        print(error_msg, flush=True)
        print(f"Traceback:", flush=True)
        traceback.print_exc(file=sys.stdout)
        print(f"{'='*60}\n", flush=True)
        logger.error(f"{'='*60}")
        logger.error(error_msg, exc_info=True)
        logger.error(f"{'='*60}")

@router.post("/train")
async def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    """Trigger model training"""
    try:
        print(f"\n{'='*60}", flush=True)
        print(f"📥 Eğitim isteği alındı: {request.model_type}", flush=True)
        print(f"{'='*60}\n", flush=True)
        
        logger.info(f"{'='*60}")
        logger.info(f"📥 Eğitim isteği alındı: {request.model_type}")
        logger.info(f"{'='*60}")
        
        if not trainer_instance:
            error_msg = "Trainer not initialized"
            print(f"❌ {error_msg}", flush=True)
            logger.error(error_msg)
            raise HTTPException(status_code=503, detail=error_msg)
        
        # Start training in background
        background_tasks.add_task(
            train_model_background,
            request.model_type,
            request.days or 30
        )
        
        response_msg = f"✅ Eğitim başlatıldı: {request.model_type}"
        print(response_msg, flush=True)
        logger.info(response_msg)
        
        return {
            "success": True,
            "message": f"Training started for {request.model_type}",
            "model_type": request.model_type,
            "status": "training",
            "days": request.days or 30
        }
    except Exception as e:
        error_msg = f"Training error: {e}"
        print(f"❌ {error_msg}", flush=True)
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deploy")
async def deploy_model(request: DeployRequest):
    """Deploy a model version"""
    try:
        # TODO: Implement deployment
        return {
            "success": True,
            "message": f"Model {request.model_name} v{request.version} deployed"
        }
    except Exception as e:
        logger.error(f"Deployment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_models():
    """List all available models"""
    try:
        from utils.model_loader import ModelLoader
        loader = ModelLoader()
        models = loader.list_models()
        return {
            "success": True,
            "models": models
        }
    except Exception as e:
        logger.error(f"List models error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{model_name}")
async def get_model_status(model_name: str):
    """Get model status"""
    try:
        from utils.model_loader import ModelLoader
        loader = ModelLoader()
        
        # Check if model exists
        exists = loader.model_exists(model_name, "latest")
        metadata = loader.load_model_metadata(model_name, "latest") if exists else None
        
        return {
            "success": True,
            "model_name": model_name,
            "status": "active" if exists else "not_found",
            "version": metadata.get("version", "unknown") if metadata else "unknown",
            "trained_at": metadata.get("trained_at") if metadata else None,
            "exists": exists
        }
    except Exception as e:
        logger.error(f"Get status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_data(request: AnalyzeRequest):
    """Analyze training data"""
    try:
        if not db_connector_instance:
            raise HTTPException(status_code=503, detail="Database not connected")
        
        days = request.days or 30
        analysis_type = request.analysis_type or "overview"
        
        # Get event statistics
        event_stats_query = """
            SELECT 
                eventType,
                COUNT(*) as count,
                COUNT(DISTINCT userId) as unique_users,
                COUNT(DISTINCT deviceId) as unique_devices
            FROM user_behavior_events
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND userId IS NOT NULL
            GROUP BY eventType
            ORDER BY count DESC
        """
        event_stats = await db_connector_instance.execute(event_stats_query, (days,))
        
        # Get user statistics
        user_stats_query = """
            SELECT 
                COUNT(DISTINCT userId) as total_users,
                COUNT(*) as total_events,
                COUNT(DISTINCT deviceId) as total_devices,
                MIN(timestamp) as first_event,
                MAX(timestamp) as last_event
            FROM user_behavior_events
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND userId IS NOT NULL
        """
        user_stats = await db_connector_instance.execute(user_stats_query, (days,))
        
        # Get purchase statistics
        purchase_stats_query = """
            SELECT 
                COUNT(*) as total_purchases,
                COUNT(DISTINCT userId) as purchasing_users,
                SUM(totalAmount) as total_revenue
            FROM orders
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND status = 'completed'
        """
        purchase_stats = await db_connector_instance.execute(purchase_stats_query, (days,))
        
        # Get data quality metrics
        quality_query = """
            SELECT 
                COUNT(*) as total_events,
                COUNT(CASE WHEN userId IS NULL THEN 1 END) as null_user_events,
                COUNT(CASE WHEN eventData IS NULL OR eventData = '{}' THEN 1 END) as empty_data_events,
                COUNT(CASE WHEN sessionId IS NULL THEN 1 END) as null_session_events
            FROM user_behavior_events
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
        """
        quality_stats = await db_connector_instance.execute(quality_query, (days,))
        
        return {
            "success": True,
            "analysis_type": analysis_type,
            "days": days,
            "event_statistics": event_stats,
            "user_statistics": user_stats[0] if user_stats else {},
            "purchase_statistics": purchase_stats[0] if purchase_stats else {},
            "data_quality": quality_stats[0] if quality_stats else {},
            "recommendations": _generate_recommendations(event_stats, user_stats, purchase_stats, quality_stats)
        }
    except Exception as e:
        logger.error(f"Analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def _generate_recommendations(event_stats, user_stats, purchase_stats, quality_stats):
    """Generate recommendations based on data analysis"""
    recommendations = []
    
    if user_stats and user_stats[0]:
        total_events = user_stats[0].get('total_events', 0)
        total_users = user_stats[0].get('total_users', 0)
        
        if total_events < 100:
            recommendations.append({
                "type": "warning",
                "message": "Yetersiz veri: Eğitim için en az 100 event gerekli",
                "action": "Daha fazla veri toplanması bekleniyor"
            })
        
        if total_users < 10:
            recommendations.append({
                "type": "warning",
                "message": "Yetersiz kullanıcı: Eğitim için en az 10 kullanıcı gerekli",
                "action": "Daha fazla kullanıcı aktivitesi bekleniyor"
            })
    
    if purchase_stats and purchase_stats[0]:
        total_purchases = purchase_stats[0].get('total_purchases', 0)
        if total_purchases == 0:
            recommendations.append({
                "type": "info",
                "message": "Satın alma verisi yok: Purchase prediction modeli eğitilemez",
                "action": "Satın alma verileri toplanana kadar diğer modeller eğitilebilir"
            })
    
    if quality_stats and quality_stats[0]:
        null_user_ratio = quality_stats[0].get('null_user_events', 0) / max(quality_stats[0].get('total_events', 1), 1)
        if null_user_ratio > 0.5:
            recommendations.append({
                "type": "warning",
                "message": f"Yüksek oranda anonim event: %{null_user_ratio * 100:.1f}",
                "action": "Kullanıcı giriş oranlarını artırmayı düşünün"
            })
    
    if not recommendations:
        recommendations.append({
            "type": "success",
            "message": "Veri kalitesi yeterli, model eğitimi yapılabilir",
            "action": "Model eğitimini başlatabilirsiniz"
        })
    
    return recommendations

