from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import logging
import json
from datetime import datetime
from config import config
from utils.redis_connector import RedisConnector
from utils.db_connector import DBConnector
from realtime_processor import RealtimeProcessor
from api.model_management import router as model_router, set_trainer, set_db_connector
from trainer import ModelTrainer

# Logging setup
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
redis_connector = None
db_connector = None
realtime_processor = None

# FastAPI app
app = FastAPI(
    title="ML Analytics Service",
    description="Machine Learning service for user behavior analysis",
    version="1.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    global redis_connector, db_connector, realtime_processor
    
    logger.info("🚀 Starting ML Service...")
    
    # Initialize connectors
    try:
        redis_connector = RedisConnector(config.REDIS_URL)
        await redis_connector.connect()
        logger.info("✅ Redis connected")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        raise
    
    try:
        logger.info(f"🔌 Connecting to database: {config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME} as {config.DB_USER}")
        db_connector = DBConnector(
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME
        )
        await db_connector.connect()
        logger.info("✅ Database connected")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        logger.error(f"   Host: {config.DB_HOST}, Port: {config.DB_PORT}, User: {config.DB_USER}, Database: {config.DB_NAME}")
        raise
    
    # Initialize trainer
    trainer = None
    try:
        trainer = ModelTrainer(db_connector)
        set_trainer(trainer)
        set_db_connector(db_connector)
        logger.info("✅ Model trainer initialized")
    except Exception as e:
        logger.error(f"❌ Trainer initialization failed: {e}")
        raise
    
    # Initialize realtime processor
    try:
        realtime_processor = RealtimeProcessor(redis_connector, db_connector)
        asyncio.create_task(realtime_processor.start())
        logger.info("✅ Realtime processor started")
    except Exception as e:
        logger.error(f"❌ Realtime processor failed: {e}")
        raise
    
    logger.info("✅ ML Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    global redis_connector, db_connector, realtime_processor
    
    logger.info("🛑 Shutting down ML Service...")
    
    if realtime_processor:
        await realtime_processor.stop()
    
    if db_connector:
        await db_connector.close()
    
    if redis_connector:
        await redis_connector.close()
    
    logger.info("✅ ML Service shut down")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(model_router, prefix="/api/models", tags=["models"])

@app.get("/")
async def root():
    return {
        "service": "ML Analytics Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        redis_ok = redis_connector and await redis_connector.ping()
        db_ok = db_connector and await db_connector.ping()
        
        return {
            "status": "healthy" if (redis_ok and db_ok) else "degraded",
            "redis": "connected" if redis_ok else "disconnected",
            "database": "connected" if db_ok else "disconnected",
            "realtime_processor": "running" if realtime_processor and realtime_processor.running else "stopped"
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/api/stats")
async def get_stats():
    """Get service statistics"""
    if not realtime_processor:
        raise HTTPException(status_code=503, detail="Realtime processor not initialized")
    
    return {
        "events_processed": realtime_processor.events_processed,
        "predictions_made": realtime_processor.predictions_made,
        "recommendations_generated": realtime_processor.recommendations_generated,
        "anomalies_detected": realtime_processor.anomalies_detected,
        "segments_updated": realtime_processor.segments_updated,
        "running": realtime_processor.running,
        "buffer_size": len(realtime_processor.event_buffer)
    }

@app.post("/api/test-event")
async def test_event():
    """Test endpoint to send a test event to ML queue"""
    if not redis_connector:
        raise HTTPException(status_code=503, detail="Redis not connected")
    
    try:
        import time
        test_event = {
            "id": f"test_{int(time.time() * 1000)}",
            "userId": 1,
            "deviceId": "test_device",
            "eventType": "product_view",
            "screenName": "test",
            "eventData": {"productId": 1, "test": True},
            "sessionId": "test_session",
            "timestamp": datetime.now().isoformat()
        }
        
        await redis_connector.lpush(config.REDIS_QUEUE_NAME, json.dumps(test_event))
        logger.info(f"🧪 Test event sent: {test_event['eventType']}")
        
        return {
            "success": True,
            "message": "Test event sent to queue",
            "event": test_event
        }
    except Exception as e:
        logger.error(f"Error sending test event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    try:
        while True:
            # Send stats every 5 seconds
            if realtime_processor:
                stats = {
                    "events_processed": realtime_processor.events_processed,
                    "predictions_made": realtime_processor.predictions_made,
                    "recommendations_generated": realtime_processor.recommendations_generated,
                    "anomalies_detected": realtime_processor.anomalies_detected
                }
                await websocket.send_json(stats)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=config.ML_SERVICE_HOST,
        port=config.ML_SERVICE_PORT,
        reload=False,  # Disable reload to avoid file watch limit issues
        log_level=config.LOG_LEVEL.lower()
    )

