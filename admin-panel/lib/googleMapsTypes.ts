/**
 * Type definitions for Business Data Scraper Application
 */

/**
 * Business data extracted from search
 */
export interface BusinessData {
  id: string;                    // Unique identifier
  businessName: string;          // Şirket ismi
  website: string | null;        // Web sitesi URL
  phoneNumber: string | null;    // Telefon numarası
  scrapedAt: Date;              // Kazıma zamanı
}

/**
 * Request payload for scraping operation
 */
export interface ScrapeRequest {
  searchTerm: string;            // Arama terimi
  maxResults?: number;           // Maksimum sonuç sayısı (default: 20)
  excludeSector?: string;         // Hariç tutulacak sektör/kategori (opsiyonel)
}

/**
 * Response from scraping operation
 */
export interface ScrapeResponse {
  success: boolean;
  data: BusinessData[];
  error?: string;
  count: number;
  totalFound?: number; // Toplam bulunan sonuç sayısı
}

