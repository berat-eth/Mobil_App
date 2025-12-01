/**
 * Business Data Scraper using Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { BusinessData } from './googleMapsTypes';

/**
 * Delay helper function
 * @param ms Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize and launch Puppeteer browser in headless mode
 * @returns Browser instance
 */
async function initBrowser(): Promise<Browser> {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
            ],
            timeout: 30000,
        });
        return browser;
    } catch (error) {
        console.error('Failed to launch browser:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Browser initialization failed: ${errorMessage}`);
    }
}

/**
 * Cleanup browser instance
 * @param browser Browser instance to close
 */
async function closeBrowser(browser: Browser): Promise<void> {
    try {
        await browser.close();
    } catch (error) {
        console.error('Error closing browser:', error);
    }
}

/**
 * Navigate to search page and perform search
 * @param page Puppeteer page instance
 * @param searchTerm Search term to query
 */
async function searchGoogleMaps(page: Page, searchTerm: string): Promise<void> {
    try {
        // Navigate to search page
        await page.goto('https://www.google.com/maps', {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        // Wait for search input to be available
        await page.waitForSelector('#searchboxinput', { timeout: 10000 });

        // Type search term into input
        await page.type('#searchboxinput', searchTerm);

        // Click search button
        await page.click('#searchbox-searchbutton');

        // Wait for search results to load
        await page.waitForSelector('[role="feed"]', { timeout: 30000 });

        // Additional wait for results to fully render
        await delay(3000);
    } catch (error) {
        console.error('Error during search:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to perform search: ${errorMessage}`);
    }
}

/**
 * Check if business matches the excluded sector
 * @param page Puppeteer page instance
 * @param excludeSector Sector/category to exclude (optional)
 * @returns True if business matches the excluded sector
 */
async function isMatchingSector(page: Page, excludeSector?: string): Promise<boolean> {
    try {
        // If no sector to exclude, return false (don't skip)
        if (!excludeSector || excludeSector.trim().length === 0) {
            return false;
        }

        // Wait a bit for categories to load
        await delay(1000);
        
        // Look for category buttons - try multiple selectors
        // Primary: button.DkEaL with jsaction containing "category"
        // Secondary: any button with jsaction containing "category"
        // Tertiary: role="button" with jsaction containing "category"
        let categoryButtons: any[] = await page.$$('button.DkEaL[jsaction*="category"], button[jsaction*="category"]');
        
        if (categoryButtons.length === 0) {
            // Try alternative selector
            categoryButtons = await page.$$('[role="button"][jsaction*="category"]');
        }
        
        if (categoryButtons.length === 0) {
            // Try even more general selector - any button or element with category-related classes
            categoryButtons = await page.$$('button.DkEaL, [class*="category"]');
        }
        
        if (categoryButtons.length === 0) {
            return false;
        }
        
        // Normalize the exclude sector for comparison (lowercase, trim)
        const normalizedExcludeSector = excludeSector.toLowerCase().trim();
        const excludeKeywords = normalizedExcludeSector.split(/\s+/).filter(k => k.length > 2); // Split into keywords
        
        // Check all category buttons for matching sector
        for (const button of categoryButtons) {
            try {
                const buttonText = await page.evaluate(el => el.textContent || '', button);
                const lowerText = buttonText.toLowerCase().trim();
                
                // Check if the button text contains any of the exclude keywords
                // Also check for exact or partial match with the full exclude sector
                const matchesFullSector = lowerText.includes(normalizedExcludeSector);
                const matchesKeywords = excludeKeywords.some(keyword => lowerText.includes(keyword));
                
                if (matchesFullSector || matchesKeywords) {
                    console.log(`Found matching sector: "${buttonText}" (exclude: "${excludeSector}")`);
                    return true;
                }
            } catch (e) {
                // Continue checking other buttons
                continue;
            }
        }
        
        return false;
    } catch (error) {
        console.warn('Error checking category:', error);
        // If we can't determine, don't skip the business
        return false;
    }
}

/**
 * Extract business data from a single result
 * @param page Puppeteer page instance
 * @returns Partial BusinessData object
 */
async function extractBusinessData(page: Page): Promise<Partial<BusinessData>> {
    try {
        // Extract business name
        let businessName = '';
        try {
            const nameElement = await page.waitForSelector('h1.DUwDvf', { timeout: 5000 });
            if (nameElement) {
                businessName = await page.evaluate(el => el.textContent || '', nameElement);
            }
        } catch (e) {
            console.warn('Could not find business name');
        }

        // Extract website
        let website: string | null = null;
        try {
            const websiteButton = await page.$('a[data-item-id="authority"]');
            if (websiteButton) {
                website = await page.evaluate(el => el.getAttribute('href'), websiteButton);
            }
        } catch (e) {
            console.warn('Could not find website');
        }

        // Extract phone number
        let phoneNumber: string | null = null;
        try {
            const phoneButton = await page.$('button[data-item-id^="phone:tel:"]');
            if (phoneButton) {
                const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), phoneButton);
                if (ariaLabel) {
                    // Extract phone from aria-label like "Telefon: +90 555 123 45 67"
                    const phoneMatch = ariaLabel.match(/[\d\s\+\(\)\-]+/);
                    if (phoneMatch) {
                        phoneNumber = phoneMatch[0].trim();
                    }
                }
            }
        } catch (e) {
            console.warn('Could not find phone number');
        }

        return {
            businessName: businessName.trim(),
            website,
            phoneNumber,
        };
    } catch (error) {
        console.error('Error extracting business data:', error);
        return {
            businessName: '',
            website: null,
            phoneNumber: null,
        };
    }
}

/**
 * Get count of result items with multiple selector strategies
 * @param page Puppeteer page instance
 * @returns Count of result items
 */
async function getResultItemsCount(page: Page): Promise<number> {
    try {
        // Try multiple selector strategies
        const selectors = [
            '[role="feed"] > div > div > a',
            '[role="feed"] a[href*="/maps/place/"]',
            '[role="feed"] a[data-value]',
            '[role="feed"] > div[data-value]',
        ];

        for (const selector of selectors) {
            try {
                const count = await page.$$eval(selector, items => items.length);
                if (count > 0) {
                    return count;
                }
            } catch (e) {
                // Try next selector
                continue;
            }
        }

        // Fallback to original selector
        return await page.$$eval('[role="feed"] > div > div > a', items => items.length);
    } catch (error) {
        console.warn('Error counting results:', error);
        return 0;
    }
}

/**
 * Check if "end of list" message is visible
 * @param page Puppeteer page instance
 * @returns True if end of list message is found
 */
async function hasReachedEndOfList(page: Page): Promise<boolean> {
    try {
        // Try multiple selectors for the "end of list" message
        const endOfListSelectors = [
            'span.HlvSq',
            '.HlvSq',
            '[class*="HlvSq"]',
            'span:contains("Listenin sonuna ulaştınız")',
            'div.m6QErb span.HlvSq',
            'div.PbZDve span.HlvSq',
        ];

        // Check for text content
        const hasEndMessage = await page.evaluate(() => {
            // Try finding by text content
            const allElements = document.querySelectorAll('span, p, div');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i];
                const text = el.textContent || '';
                if (text.includes('Listenin sonuna ulaştınız') || 
                    text.includes('Listenin sonuna') ||
                    (text.toLowerCase().includes('list') && text.toLowerCase().includes('son'))) {
                    return true;
                }
            }
            
            // Try by class name
            const hlvSqElements = document.querySelectorAll('.HlvSq, [class*="HlvSq"]');
            if (hlvSqElements.length > 0) {
                for (let i = 0; i < hlvSqElements.length; i++) {
                    const el = hlvSqElements[i];
                    const text = el.textContent || '';
                    if (text.includes('sonuna') || text.includes('son')) {
                        return true;
                    }
                }
            }
            
            return false;
        });

        return hasEndMessage;
    } catch (error) {
        console.warn('Error checking end of list:', error);
        return false;
    }
}

/**
 * Scroll the results feed to load more items
 * @param page Puppeteer page instance
 * @param targetCount Target number of items to load
 * @param onStatusUpdate Optional callback called when status updates
 */
async function scrollResultsFeed(page: Page, targetCount: number, onStatusUpdate?: (message: string, current: number, total: number) => void): Promise<void> {
    try {
        let previousCount = 0;
        let currentCount = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 200; // Increased significantly to ensure we reach the end
        let noProgressCount = 0;
        let endReached = false;

        console.log(`Starting to scroll for ${targetCount} results...`);

        while (scrollAttempts < maxScrollAttempts && !endReached) {
            // Check if we've reached the end of the list
            endReached = await hasReachedEndOfList(page);
            if (endReached) {
                console.log(`"Listenin sonuna ulaştınız" mesajı bulundu. Scroll işlemi durduruluyor.`);
                break;
            }

            // Get current count using improved method
            currentCount = await getResultItemsCount(page);

            console.log(`Scroll attempt ${scrollAttempts + 1}: Loaded ${currentCount} results (target: ${targetCount})...`);
            
            // Update status
            if (onStatusUpdate) {
                onStatusUpdate(`Sonuçlar yükleniyor... (${currentCount}/${targetCount})`, currentCount, targetCount);
            }

            // If we have enough results, stop
            if (currentCount >= targetCount) {
                console.log(`Reached target count of ${targetCount}`);
                break;
            }

            // Check if we're making progress
            if (currentCount === previousCount) {
                noProgressCount++;
                // If no progress for 5 consecutive attempts, try more aggressive scrolling
                if (noProgressCount >= 5) {
                    // Try scrolling multiple times in a row
                    for (let i = 0; i < 3; i++) {
                        await page.evaluate(() => {
                            const feed = document.querySelector('[role="feed"]');
                            if (feed) {
                                feed.scrollTo(0, feed.scrollHeight);
                            }
                        });
                        await delay(1000);
                    }
                    
                    // Wait longer for content to load
                    await delay(3000);
                    
                    // Re-check for end of list
                    endReached = await hasReachedEndOfList(page);
                    if (endReached) {
                        console.log(`"Listenin sonuna ulaştınız" mesajı bulundu.`);
                        break;
                    }
                    
                    // Re-check count
                    const newCount = await getResultItemsCount(page);
                    if (newCount === currentCount) {
                        console.log(`No more results loading after ${scrollAttempts + 1} attempts. Final count: ${currentCount}`);
                        // One more check for end message before breaking
                        endReached = await hasReachedEndOfList(page);
                        if (!endReached) {
                            console.log(`End message not found, but no progress. Continuing...`);
                        }
                        if (endReached) {
                            break;
                        }
                    }
                    currentCount = newCount;
                    noProgressCount = 0;
                }
            } else {
                noProgressCount = 0;
            }

            // Scroll the results feed to the bottom with smooth scrolling
            await page.evaluate(() => {
                const feed = document.querySelector('[role="feed"]');
                if (feed) {
                    // Try smooth scroll first
                    feed.scrollTo({
                        top: feed.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });

            // Wait for new results to load - increased wait time
            await delay(3000);

            previousCount = currentCount;
            scrollAttempts++;
        }

        // Final check for end message
        if (!endReached) {
            endReached = await hasReachedEndOfList(page);
            if (endReached) {
                console.log(`Final check: "Listenin sonuna ulaştınız" mesajı bulundu.`);
            }
        }

        const finalCount = await getResultItemsCount(page);
        console.log(`Finished scrolling after ${scrollAttempts} attempts. Total results available: ${finalCount}${endReached ? ' (End of list reached)' : ''}`);
    } catch (error) {
        console.warn('Error scrolling results feed:', error);
    }
}

/**
 * Process search results sequentially and extract business data
 * @param page Puppeteer page instance
 * @param maxResults Maximum number of results to process
 * @param onResultFound Optional callback called when a result is found
 * @param onStatusUpdate Optional callback called when status updates
 * @returns Object with results array and total found count
 */
async function processSearchResults(
    page: Page,
    maxResults: number = 10000,
    onResultFound?: (business: BusinessData) => void,
    onStatusUpdate?: (message: string, current: number, total: number) => void,
    excludeSector?: string
): Promise<{ results: BusinessData[]; totalFound: number }> {
    const results: BusinessData[] = [];
    let totalFound = 0;

    try {
        // First, scroll to load enough results
        if (onStatusUpdate) {
            onStatusUpdate('Sonuçlar yükleniyor...', 0, maxResults);
        }
        await scrollResultsFeed(page, maxResults, onStatusUpdate);

        // Get all result items after scrolling - try multiple selectors
        let resultItems = await page.$$('[role="feed"] > div > div > a');
        
        if (resultItems.length === 0) {
            // Try alternative selectors
            resultItems = await page.$$('[role="feed"] a[href*="/maps/place/"]');
        }
        
        if (resultItems.length === 0) {
            resultItems = await page.$$('[role="feed"] a[data-value]');
        }

        totalFound = resultItems.length;
        const itemsToProcess = Math.min(resultItems.length, maxResults);

        console.log(`Found ${totalFound} total items. Processing ${itemsToProcess} results...`);
        
        if (onStatusUpdate) {
            onStatusUpdate(`İşletme bilgileri çıkarılıyor... (0/${itemsToProcess})`, 0, itemsToProcess);
        }

        // Process each result sequentially
        for (let i = 0; i < itemsToProcess; i++) {
            try {
                // Re-query result items to avoid stale elements - try multiple selectors
                let currentItems = await page.$$('[role="feed"] > div > div > a');
                
                if (currentItems.length === 0) {
                    currentItems = await page.$$('[role="feed"] a[href*="/maps/place/"]');
                }
                
                if (currentItems.length === 0) {
                    currentItems = await page.$$('[role="feed"] a[data-value]');
                }

                if (i >= currentItems.length) {
                    console.log(`No more results available at index ${i} (total: ${currentItems.length})`);
                    break;
                }

                // Scroll the result into view before clicking
                await page.evaluate((index) => {
                    const feed = document.querySelector('[role="feed"]');
                    const items = document.querySelectorAll('[role="feed"] > div > div > a, [role="feed"] a[href*="/maps/place/"]');
                    if (feed && items[index]) {
                        const item = items[index] as HTMLElement;
                        // Scroll item into view in the center of the feed
                        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, i);
                
                // Wait for scroll to complete
                await delay(1000);

                // Click on the result item to open details
                try {
                    await Promise.race([
                        currentItems[i].click(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Click timeout')), 5000))
                    ]);
                } catch (clickError) {
                    console.warn(`Failed to click item ${i + 1}, trying alternative method...`);
                    // Try clicking with JavaScript
                    await page.evaluate((index) => {
                        const items = document.querySelectorAll('[role="feed"] > div > div > a, [role="feed"] a[href*="/maps/place/"]');
                        if (items[index]) {
                            (items[index] as HTMLElement).click();
                        }
                    }, i);
                }

                // Wait for details to load - increased wait time
                await delay(3000);

                // Check if business matches excluded sector - skip if true
                const matchesExcludedSector = await isMatchingSector(page, excludeSector);
                if (matchesExcludedSector) {
                    console.log(`Skipping ${i + 1}/${itemsToProcess}: Excluded sector detected (${excludeSector})`);
                    // Close the details panel and continue with next result
                    try {
                        await page.keyboard.press('Escape');
                        await delay(500);
                    } catch (e) {
                        // Ignore if escape doesn't work
                    }
                    continue;
                }

                // Extract business data
                const data = await extractBusinessData(page);

                // Only add if we have at least a business name
                if (data.businessName && data.businessName.trim().length > 0) {
                    const businessData: BusinessData = {
                        id: `${Date.now()}-${i}`,
                        businessName: data.businessName,
                        website: data.website || null,
                        phoneNumber: data.phoneNumber || null,
                        scrapedAt: new Date(),
                    };
                    
                    results.push(businessData);
                    
                    // Call callback immediately if provided
                    if (onResultFound) {
                        try {
                            onResultFound(businessData);
                        } catch (callbackError) {
                            console.warn('Error in onResultFound callback:', callbackError);
                        }
                    }

                    console.log(`✓ Extracted ${results.length}/${itemsToProcess}: ${data.businessName}`);
                    
                    // Update status
                    if (onStatusUpdate) {
                        onStatusUpdate(`İşletme bilgileri çıkarılıyor... (${results.length}/${itemsToProcess})`, results.length, itemsToProcess);
                    }
                } else {
                    console.warn(`✗ Skipped ${i + 1}/${itemsToProcess}: No business name found`);
                }

                // Close details panel before next item
                try {
                    await page.keyboard.press('Escape');
                    await delay(500);
                } catch (e) {
                    // Ignore if escape doesn't work
                }

                // Add delay between processing items to avoid rate limiting
                await delay(1500);

            } catch (error) {
                console.warn(`Error processing result ${i + 1}:`, error);
                // Continue with next result
                continue;
            }
        }

    } catch (error) {
        console.error('Error processing search results:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to process search results: ${errorMessage}`);
    }

    return { results, totalFound };
}

/**
 * Main scraping function that orchestrates the entire process
 * @param searchTerm Search term to query
 * @param maxResults Maximum number of results to scrape
 * @param onResultFound Optional callback called when a result is found
 * @param onStatusUpdate Optional callback called when status updates
 * @returns Object with results array and total found count
 */
async function scrapeGoogleMaps(
    searchTerm: string,
    maxResults: number = 20,
    onResultFound?: (business: BusinessData) => void,
    onStatusUpdate?: (message: string, current: number, total: number) => void,
    excludeSector?: string
): Promise<{ results: BusinessData[]; totalFound: number }> {
    let browser: Browser | null = null;

    try {
        // Initialize browser
        browser = await initBrowser();
        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({ width: 1920, height: 1080 });

        // Set user agent to avoid detection
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Perform search
        if (onStatusUpdate) {
            onStatusUpdate('Arama yapılıyor...', 0, maxResults);
        }
        await searchGoogleMaps(page, searchTerm);

        // Process results
        const { results, totalFound } = await processSearchResults(page, maxResults, onResultFound, onStatusUpdate, excludeSector);

        return { results, totalFound };

    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    } finally {
        // Always cleanup browser
        if (browser) {
            await closeBrowser(browser);
        }
    }
}

// Export for testing
const SELECTORS = {
    searchInput: '#searchboxinput',
    searchButton: '#searchbox-searchbutton',
    resultsList: '[role="feed"]',
    resultItem: '[role="article"]',
    businessName: 'h1.DUwDvf span.a5H0ec',
    website: 'div.AeaXub div.Io6YTe.fontBodyMedium',
    phoneNumber: 'div.AeaXub div.Io6YTe.fontBodyMedium',
};

export {
    initBrowser,
    closeBrowser,
    searchGoogleMaps,
    extractBusinessData,
    processSearchResults,
    scrapeGoogleMaps,
    SELECTORS
};

