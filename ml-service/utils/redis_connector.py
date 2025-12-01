import redis.asyncio as redis
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class RedisConnector:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True
            )
            await self.client.ping()
            logger.info("✅ Redis connected")
        except Exception as e:
            logger.error(f"❌ Redis connection error: {e}")
            raise
    
    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
            logger.info("Redis connection closed")
    
    async def ping(self) -> bool:
        """Check Redis connection"""
        try:
            if self.client:
                await self.client.ping()
                return True
            return False
        except:
            return False
    
    async def lpush(self, queue_name: str, value: str):
        """Push to queue (left push)"""
        if not self.client:
            raise Exception("Redis not connected")
        await self.client.lpush(queue_name, value)
    
    async def rpop(self, queue_name: str) -> Optional[str]:
        """Pop from queue (right pop)"""
        if not self.client:
            raise Exception("Redis not connected")
        return await self.client.rpop(queue_name)
    
    async def brpop(self, queue_name: str, timeout: int = 5) -> Optional[tuple]:
        """Blocking pop from queue"""
        if not self.client:
            raise Exception("Redis not connected")
        return await self.client.brpop(queue_name, timeout=timeout)
    
    async def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        if not self.client:
            raise Exception("Redis not connected")
        return await self.client.get(key)
    
    async def set(self, key: str, value: str, ex: Optional[int] = None):
        """Set value with optional expiration"""
        if not self.client:
            raise Exception("Redis not connected")
        await self.client.set(key, value, ex=ex)

