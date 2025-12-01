/**
 * API Route for Business Data Scraping
 * POST /api/google-maps-scrape
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeGoogleMaps } from '@/lib/scraper';
import { ScrapeRequest, ScrapeResponse } from '@/lib/googleMapsTypes';
import { checkRateLimit, getClientIdentifier } from '@/lib/googleMapsRateLimit';

// Force Node.js runtime for Puppeteer
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes (maximum allowed)
export const dynamic = 'force-dynamic'; // Prevent static optimization

/**
 * CORS headers configuration
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Sanitize search term input
 * @param input Raw search term
 * @returns Sanitized search term
 */
function sanitizeSearchTerm(input: string): string {
  // Remove potentially dangerous characters and scripts
  return input
    .trim()
    .replace(/[<>\"'`]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .substring(0, 200); // Limit length
}

/**
 * Validate scrape request
 * @param body Request body
 * @returns Validation result with error message if invalid
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!body.searchTerm || typeof body.searchTerm !== 'string') {
    return { valid: false, error: 'Search term is required and must be a string' };
  }

  if (body.searchTerm.trim().length === 0) {
    return { valid: false, error: 'Search term cannot be empty' };
  }

  if (body.maxResults !== undefined) {
    if (typeof body.maxResults !== 'number' || body.maxResults < 1 || body.maxResults > 10000) {
      return { valid: false, error: 'Max results must be a number between 1 and 10000' };
    }
  }

  return { valid: true };
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

/**
 * POST handler for scraping endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(clientId);

    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime);
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: `Rate limit exceeded. Please try again after ${resetDate.toLocaleTimeString()}`,
          count: 0,
        } as ScrapeResponse,
        { 
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Parse request body
    const body: ScrapeRequest = await request.json();

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: validation.error,
          count: 0,
        } as ScrapeResponse,
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }

    // Sanitize input
    const sanitizedSearchTerm = sanitizeSearchTerm(body.searchTerm);
    const maxResults = body.maxResults || 10000;
    const excludeSector = body.excludeSector ? sanitizeSearchTerm(body.excludeSector) : undefined;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let resultCount = 0;
        let totalFound = 0;
        const results: any[] = [];

        // Helper function to send data
        const send = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (error) {
            console.error('Error sending stream data:', error);
          }
        };

        try {
          // Send initial status
          send({ type: 'status', message: 'Arama başlatılıyor...', current: 0, total: maxResults, totalFound: 0 });

          let finalTotalFound = 0;

          // Execute scraping with callback for live updates
          const { results: finalResults, totalFound: finalTotalFoundValue } = await scrapeGoogleMaps(
            sanitizedSearchTerm,
            maxResults,
            (business) => {
              // Callback called when each result is found
              resultCount++;
              results.push(business);
              
              // Send each result immediately
              send({
                type: 'result',
                data: business,
                current: resultCount,
                total: maxResults,
                totalFound: finalTotalFound || 0,
              });
            },
            (message, current, total) => {
              // Status update callback
              send({
                type: 'status',
                message: message,
                current: current,
                total: total,
                totalFound: finalTotalFound || 0,
              });
            },
            excludeSector
          );

          totalFound = finalTotalFoundValue;
          finalTotalFound = finalTotalFoundValue;

          // Send completion message
          send({
            type: 'complete',
            success: true,
            count: resultCount,
            totalFound: totalFound,
          });

          // Close stream
          controller.close();
        } catch (error) {
          console.error('Scraping error in stream:', error);
          
          let errorMessage = 'İşlem sırasında bir hata oluştu';
          if (error instanceof Error) {
            errorMessage = error.message;
          }

          send({
            type: 'error',
            error: errorMessage,
          });

          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
    });

  } catch (error) {
    console.error('Scraping API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    // Handle specific error types
    let errorMessage = 'İşlem sırasında bir hata oluştu';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
        statusCode = 408;
      } else if (error.message.includes('Browser initialization failed') || error.message.includes('Failed to launch')) {
        errorMessage = 'Tarayıcı başlatılamadı. Lütfen daha sonra tekrar deneyin.';
        statusCode = 503;
      } else if (error.message.includes('Failed to search')) {
        errorMessage = 'Arama işlemi başarısız oldu. Lütfen tekrar deneyin.';
        statusCode = 502;
      } else if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        errorMessage = 'Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.';
        statusCode = 429;
      } else {
        // More user-friendly error message
        errorMessage = `Bir hata oluştu: ${error.message}`;
      }
    } else {
      errorMessage = 'Bilinmeyen bir hata oluştu';
    }

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: errorMessage,
        count: 0,
      } as ScrapeResponse,
      { 
        status: statusCode,
        headers: CORS_HEADERS
      }
    );
  }
}

