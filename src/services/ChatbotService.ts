import { ChatMessage, QuickReply } from '../components/Chatbot';
import { Linking } from 'react-native';
import { apiService } from '../utils/api-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../utils/types';
import { Order } from '../utils/types';

export interface ChatbotResponse {
  text: string;
  type?: 'text' | 'quick_reply' | 'product' | 'order' | 'image' | 'product_card' | 'order_card' | 'voice';
  quickReplies?: QuickReply[];
  data?: any;
  product?: Product;
  order?: Order;
}

export class ChatbotService {
  private static intents: { [key: string]: string[] } = {
    greeting: [
      'merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar',
      'selamlar', 'merhabalar', 'iyi geceler', 'hayırlı günler', 'günaydın', 'iyi sabahlar',
      'naber', 'nasılsın', 'nasılsınız', 'hoş geldin', 'hoş geldiniz'
    ],
    order_tracking: [
      'sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim',
      'sipariş durumu', 'sipariş numarası', 'sipariş sorgula', 'sipariş sorgulama',
      'siparişim nerede', 'siparişim geldi mi', 'kargo nerede', 'kargo durumu',
      'teslim edildi mi', 'hazırlanıyor mu', 'kargoya verildi mi', 'sipariş takip',
      'sipariş sorgulama', 'sipariş bilgisi', 'sipariş detay', 'sipariş öğren',
      'sipariş kontrol', 'sipariş durum', 'sipariş listesi', 'siparişlerim'
    ],
    product_search: [
      'ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama',
      'ürün bul', 'ürün ara', 'ürün sorgula', 'ürün listesi', 'ürün katalog',
      'hangi ürün', 'ne var', 'ne satıyorsunuz', 'ürünler', 'katalog',
      'stokta var mı', 'stok durumu', 'fiyat nedir', 'fiyatı ne kadar',
      'ürün fiyat', 'ürün stok', 'ürün bilgisi', 'ürün detay', 'ürün özellik',
      'kategori', 'kategoriler', 'hangi kategori', 'kategoriye göre', 'ürün türü'
    ],
    campaigns: [
      'kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif',
      'kampanyalar', 'indirimler', 'fırsatlar', 'promosyonlar', 'özel fırsat',
      'kampanya var mı', 'indirim var mı', 'kupon kod', 'kupon kodu',
      'indirim kodu', 'promosyon kodu', 'özel indirim', 'büyük indirim',
      'fırsat ürün', 'kampanyalı ürün', 'indirimli ürün', 'özel kampanya',
      'size özel', 'bana özel', 'kişisel kampanya', 'üyelere özel'
    ],
    recommendations: [
      'öneri', 'bana ne önerirsin', 'ne alsam', 'beni tanı', 'kişisel öneri', 'kişiselleştir',
      'öner', 'tavsiye', 'tavsiye et', 'ne önerirsiniz', 'hangi ürün',
      'bana uygun', 'bana göre', 'benim için', 'size özel', 'kişisel',
      'popüler ürün', 'trend ürün', 'çok satan', 'en çok satan',
      'beğenilen ürün', 'yeni ürün', 'yeni çıkan', 'öne çıkan',
      'öneriler', 'tavsiyeler', 'kişiselleştirilmiş', 'özel öneri'
    ],
    support: [
      'yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek',
      'yardıma ihtiyacım var', 'yardım edin', 'destek almak', 'destek istiyorum',
      'sorun var', 'problem var', 'hata var', 'çalışmıyor', 'olmadı',
      'iletişim', 'ulaşmak', 'konuşmak', 'görüşmek', 'danışmak',
      'şikayet var', 'şikayet etmek', 'memnun değilim', 'beğenmedim',
      'müşteri hizmetleri', 'müşteri desteği', 'teknik destek', 'bilgi almak'
    ],
    payment: [
      'ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit',
      'nasıl öderim', 'ödeme yapmak', 'ödeme yöntemi', 'ödeme seçenekleri',
      'kart ile ödeme', 'havale', 'eft', 'banka transferi', 'kapıda ödeme',
      'taksit yapmak', 'taksitli ödeme', 'kaç taksit', 'taksit seçenekleri',
      'fatura almak', 'e-fatura', 'fatura istiyorum', 'fatura bilgisi',
      'ödeme güvenliği', 'güvenli ödeme', 'ödeme güvenli mi', 'güvenlik'
    ],
    return: [
      'iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış',
      'iade etmek', 'iade yapmak', 'iade talep', 'iade istiyorum',
      'değiştirmek', 'değişim yapmak', 'değişim istiyorum',
      'hasarlı geldi', 'yanlış ürün', 'hatalı ürün', 'kusurlu',
      'iade koşulları', 'iade süresi', 'iade nasıl', 'iade ücreti',
      'geri göndermek', 'geri vermek', 'iade süreci', 'iade formu'
    ],
    shipping: [
      'kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres',
      'kargo ücreti', 'kargo fiyatı', 'kargo ne kadar', 'ücretsiz kargo',
      'ne zaman gelir', 'ne zaman teslim', 'teslimat süresi', 'kargo süresi',
      'kargo firması', 'hangi kargo', 'kargo takip', 'kargo numarası',
      'adres değiştir', 'adres ekle', 'teslimat adresi', 'gönderim adresi',
      'kargo nerede', 'kargo durumu', 'kargo bilgisi', 'kargo sorgula',
      'teslim edildi mi', 'kargoya verildi mi', 'hazırlanıyor mu'
    ],
    account: [
      'hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik',
      'hesabım', 'profilim', 'hesap ayarları', 'profil ayarları',
      'şifre değiştir', 'şifre sıfırla', 'şifremi unuttum', 'şifre yenile',
      'giriş yap', 'giriş yapmak', 'kayıt ol', 'üye ol', 'üyelik oluştur',
      'profil güncelle', 'bilgilerimi güncelle', 'adres ekle', 'adres düzenle',
      'e-posta değiştir', 'telefon değiştir', 'iletişim bilgileri',
      'üyelik avantajları', 'üye fırsatları', 'seviye sistemi', 'puan sistemi'
    ],
    goodbye: [
      'görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış',
      'görüşmek üzere', 'hoşça kalın', 'iyi günler', 'iyi akşamlar',
      'teşekkürler', 'sağ olun', 'çok teşekkür', 'teşekkür ederim',
      'tamam', 'oldu', 'yeterli', 'yeter', 'tamamlandı', 'bitti',
      'kapat', 'kapatmak', 'çıkış', 'çıkmak', 'bitir', 'bitirmek'
    ]
  };

  private static quickResponses: { [key: string]: ChatbotResponse } = {
    greeting: {
      text: '👋 Merhaba! Huğlu Outdoor\'a hoş geldiniz! 🎯\n\nSize nasıl yardımcı olabilirim? Sipariş takibi, ürün arama, kampanyalar ve daha fazlası için buradayım. Sorularınızı yazabilir veya aşağıdaki seçeneklerden birini seçebilirsiniz.',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
        { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    },
    order_tracking: {
      text: '📦 Sipariş takibi için size yardımcı olabilirim!\n\n• Sipariş numaranızı yazabilirsiniz\n• "Siparişlerim" sayfasından tüm siparişlerinizi görüntüleyebilirsiniz\n• Kargo takip numarası ile anlık durum öğrenebilirsiniz\n\nHangi yöntemi tercih edersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📋 Siparişlerim', action: 'view_orders' },
        { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
        { id: '3', text: '📞 Destek Çağır', action: 'live_support' },
      ]
    },
    product_search: {
      text: '🔍 Ürün arama konusunda size yardımcı olabilirim!\n\n• Ürün adı, marka veya kategori yazarak arama yapabilirsiniz\n• Kategorilere göz atabilirsiniz\n• Popüler ürünleri keşfedebilirsiniz\n• Özel üretim talepleriniz için de destek sunuyoruz\n\nNe aramak istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
        { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
        { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
        { id: '4', text: '👕 Giyim', action: 'search_category_giyim' },
      ]
    },
    campaigns: {
      text: '🎁 Kampanyalar hakkında bilgi verebilirim!\n\n• Aktif kampanyaları gösterebilirim\n• Size özel kampanyaları kontrol edebilirim\n• Kampanya kodlarını nasıl kullanacağınızı anlatabilirim\n• Özel fırsatları paylaşabilirim\n\nHangi konuda bilgi almak istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
        { id: '2', text: '✅ Uygun Kampanyam Var mı?', action: 'check_campaign_eligibility' },
        { id: '3', text: 'ℹ️ Kampanya Detayları', action: 'campaign_info' },
      ]
    },
    recommendations: {
      text: '⭐ Size özel öneriler hazırlayabilirim!\n\n• Geçmiş alışverişlerinize göre kişiselleştirilmiş ürün önerileri\n• Size uygun kampanyalar ve fırsatlar\n• Popüler ve trend ürünler\n• Benzer müşterilerin beğendiği ürünler\n\nHangi tür önerileri görmek istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Ürün Önerileri', action: 'show_recommendations' },
        { id: '2', text: '🎯 Bana Özel Kampanyalar', action: 'check_campaign_eligibility' },
        { id: '3', text: '🛒 Popüler Ürünler', action: 'view_products' },
      ]
    },
    support: {
      text: '🎧 Size nasıl yardımcı olabilirim?\n\n• Sorununuzu açıklayabilirsiniz, size en uygun çözümü bulalım\n• Canlı destek ile anında iletişime geçebilirsiniz\n• S.S.S. bölümümüzde sık sorulan soruların cevaplarını bulabilirsiniz\n• E-posta veya WhatsApp üzerinden de ulaşabilirsiniz\n\nHangi yöntemi tercih edersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📞 Canlı Destek', action: 'live_support' },
        { id: '2', text: '📧 E-posta Gönder', action: 'email_support' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '📱 WhatsApp', action: 'whatsapp_support' },
      ]
    },
    payment: {
      text: '💳 Ödeme konusunda size yardımcı olabilirim!\n\n• Ödeme yöntemleri ve güvenlik bilgileri\n• Taksit seçenekleri ve komisyon oranları\n• Fatura ve e-fatura işlemleri\n• Ödeme hataları ve çözümleri\n\nHangi konuda bilgi almak istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '💰 Ödeme Yöntemleri', action: 'payment_methods' },
        { id: '2', text: '📊 Taksit Seçenekleri', action: 'installment_options' },
        { id: '3', text: '🧾 Fatura Sorunu', action: 'invoice_issue' },
        { id: '4', text: '🔒 Güvenlik', action: 'payment_security' },
      ]
    },
    return: {
      text: '↩️ İade işlemleri konusunda size yardımcı olabilirim!\n\n• İade talebi oluşturma ve süreç\n• İade koşulları ve gereksinimler\n• İade kargo ücretleri\n• Para iadesi süreleri\n• İade takibi\n\nNe yapmak istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📝 İade Talebi Oluştur', action: 'create_return' },
        { id: '2', text: '📋 İade Taleplerim', action: 'view_returns' },
        { id: '3', text: '❓ İade Koşulları', action: 'return_policy' },
        { id: '4', text: '🚚 İade Kargo', action: 'return_shipping' },
      ]
    },
    shipping: {
      text: '🚚 Kargo ve teslimat hakkında detaylı bilgi verebilirim!\n\n• Teslimat süreleri ve bölgelere göre farklılıklar\n• Kargo ücretleri ve ücretsiz kargo koşulları\n• Teslimat adresi ekleme ve değiştirme\n• Kargo takip ve bildirimler\n• Özel teslimat seçenekleri\n\nHangi konuda bilgi almak istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⏰ Teslimat Süreleri', action: 'delivery_times' },
        { id: '2', text: '💰 Kargo Ücretleri', action: 'shipping_costs' },
        { id: '3', text: '📍 Teslimat Adresi', action: 'delivery_address' },
        { id: '4', text: '📦 Kargo Takibi', action: 'track_shipment' },
      ]
    },
    account: {
      text: '👤 Hesap işlemleri için size yardımcı olabilirim!\n\n• Şifre sıfırlama ve güvenlik ayarları\n• Profil bilgilerini güncelleme\n• E-posta ve telefon değişikliği\n• Adres ekleme ve düzenleme\n• Üyelik avantajları ve seviye sistemi\n\nHangi işlemi yapmak istersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🔐 Şifre Sıfırlama', action: 'reset_password' },
        { id: '2', text: '📝 Profil Güncelleme', action: 'update_profile' },
        { id: '3', text: '📧 E-posta Değiştir', action: 'change_email' },
        { id: '4', text: '🏠 Adres Ekle', action: 'add_address' },
      ]
    },
    goodbye: {
      text: '👋 Teşekkür ederim! Size yardımcı olabildiysem ne mutlu bana! 😊\n\nBaşka bir sorunuz olursa her zaman buradayım. Huğlu Outdoor ailesi olarak sizlere hizmet vermekten mutluluk duyuyoruz.\n\nİyi günler, iyi alışverişler! 🎯',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Değerlendir', action: 'rate_chat' },
        { id: '2', text: '🔄 Yeni Sohbet', action: 'new_chat' },
      ]
    }
  };

  private static faqData: { [key: string]: string } = {
    // Sipariş Kategorisi
    'sipariş nasıl takip': 'Siparişinizi takip etmek için "Hesabım > Siparişlerim" bölümüne gidin veya sipariş numaranızla takip yapın. Sipariş durumunuzu anlık olarak görebilir, kargo bilgilerinizi takip edebilirsiniz.',
    'sipariş iptal': 'Siparişinizi iptal etmek için "Siparişlerim" sayfasından siparişinize gidin. Sadece "Beklemede" durumundaki siparişler iptal edilebilir. Onaylanmış siparişler için canlı destek ile iletişime geçin.',
    'sipariş durumu': 'Sipariş durumları: Beklemede (onay bekleniyor), Onaylandı (hazırlanıyor), Hazırlanıyor (paketleniyor), Kargoda (yola çıktı), Teslim Edildi (ulaştı). Her aşamada size bildirim gönderilir.',
    'sipariş değişiklik': 'Siparişinizde değişiklik yapmak için "Beklemede" durumunda olması gerekir. Adres değişikliği için kargo çıkmadan önce canlı destek ile iletişime geçin.',
    'sipariş faturası': 'Faturanız siparişinizle birlikte kargoda gönderilir. E-fatura tercih ediyorsanız hesap ayarlarınızdan e-posta adresinizi doğrulayın. Fatura talebi için "Faturalarım" bölümünden erişebilirsiniz.',
    
    // Kargo Kategorisi
    'kargo ücreti': '150 TL ve üzeri alışverişlerde kargo ücretsizdir. Altındaki siparişler için 19,90 TL kargo ücreti alınır. Hızlı kargo seçeneği için ek 15 TL ücret uygulanır.',
    'teslimat süresi': 'Stokta bulunan ürünler 1-3 iş günü içinde kargoya verilir. Teslimat süresi bulunduğunuz ile göre 1-5 iş günü arasında değişir. İstanbul, Ankara, İzmir gibi büyük şehirlerde genellikle 1-2 gün içinde teslim edilir.',
    'kargo firması': 'Siparişleriniz Yurtiçi Kargo, MNG Kargo ve Aras Kargo ile gönderilir. Kargo firması otomatik olarak belirlenir. Tercih belirtmek için canlı destek ile iletişime geçebilirsiniz.',
    'kargo takip': 'Kargo takip numaranız sipariş detaylarında yer alır. Kargo firmasının web sitesinden veya mobil uygulamasından takip edebilirsiniz. SMS ile de takip bilgileri gönderilir.',
    'adres değişikliği': 'Kargo çıkmadan önce adres değişikliği yapılabilir. "Siparişlerim" sayfasından siparişinize gidip "Adres Değiştir" seçeneğini kullanın veya canlı destek ile iletişime geçin.',
    'kargo hasarlı': 'Kargo hasarlı geldiyse lütfen kargo görevlisinin yanında paketi açın ve hasarı fotoğraflayın. "İade Taleplerim" bölümünden hasarlı ürün iadesi başlatın. Kargo ücreti bizden!',
    
    // Ödeme Kategorisi
    'ödeme yöntemleri': 'Kredi kartı, banka kartı (Visa, Mastercard), havale/EFT seçenekleri mevcuttur. Tüm ödemeleriniz SSL sertifikası ile korunur. Kapıda ödeme seçeneği bulunmamaktadır.',
    'taksit': 'Kredi kartınızla 2, 3, 6, 9 ve 12 aya varan taksit seçenekleri kullanabilirsiniz. 2 taksit komisyonsuz, diğer taksitlerde bankanıza göre komisyon uygulanır. Ödeme sayfasında tüm seçenekleri görebilirsiniz.',
    'ödeme güvenliği': 'Tüm ödemeleriniz 3D Secure ile korunur. Kart bilgileriniz saklanmaz ve işlemleriniz şifrelenir. Iyzico ödeme altyapısı kullanılmaktadır.',
    'ödeme hatası': 'Ödeme sırasında hata alıyorsanız kart limitinizi, internet bağlantınızı kontrol edin. Sorun devam ederse bankanızla iletişime geçin veya farklı bir kart deneyin. Para çekilmediyse tekrar deneyebilirsiniz.',
    'fatura': 'Faturanız siparişinizle birlikte kargoda gönderilir. E-fatura için hesap ayarlarınızdan e-posta adresinizi doğrulayın. Kurumsal faturalama için canlı destek ile iletişime geçin.',
    
    // İade Kategorisi
    'iade nasıl': 'Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz. "İade Taleplerim" bölümünden işlem yapın. Ürün orijinal ambalajında, etiketli ve kullanılmamış olmalıdır.',
    'iade süresi': 'İade süresi ürünü teslim aldığınız tarihten itibaren 14 gündür. Bu süre içinde "İade Taleplerim" bölümünden başvuru yapabilirsiniz. Süre dolduktan sonra iade kabul edilmez.',
    'iade koşulları': 'İade için ürün orijinal ambalajında, etiketli, kullanılmamış ve hasarsız olmalıdır. Hijyen ürünleri, iç çamaşırı ve kişisel bakım ürünleri iade edilemez. Hasarlı ürünlerde kargo ücreti bizden!',
    'iade ücreti': '150 TL üzeri siparişlerde iade kargo ücretsizdir. Altındaki siparişlerde 19,90 TL iade kargo ücreti alınır. Ancak hasarlı, yanlış veya eksik ürün gönderilmesi durumunda tüm kargo ücretleri bizden!',
    'iade para iadesi': 'İade onaylandıktan sonra ödeme yönteminize göre 3-7 iş günü içinde para iadesi yapılır. Kredi kartı ile ödemenizde kartınıza, havale/EFT ile ödemenizde hesabınıza iade edilir.',
    
    // Hesap Kategorisi
    'şifre unuttum': 'Giriş ekranında "Şifremi Unuttum" linkine tıklayın ve e-posta adresinizi girin. Size şifre sıfırlama linki gönderilecektir. E-postayı bulamazsanız spam klasörünüze bakın.',
    'şifre değiştir': 'Şifrenizi değiştirmek için "Hesabım > Ayarlar > Şifre Değiştir" bölümüne gidin. Mevcut şifrenizi ve yeni şifrenizi girin. Şifreniz en az 8 karakter olmalıdır.',
    'profil güncelle': 'Profil bilgilerinizi güncellemek için "Hesabım > Profil Düzenle" sayfasına gidin. Ad, soyad, telefon ve e-posta bilgilerinizi güncelleyebilirsiniz.',
    'e-posta değiştir': 'E-posta adresinizi değiştirmek için "Hesabım > Profil Düzenle" sayfasına gidin. Yeni e-posta adresinizi girin ve doğrulama e-postası gönderilir. E-postayı doğrulamadan değişiklik aktif olmaz.',
    'üyelik avantajları': 'Üyelerimize özel kampanyalar, erken erişim fırsatları, özel indirimler ve kişiselleştirilmiş ürün önerileri sunuyoruz. Ayrıca seviye sistemi ile alışveriş yaptıkça puan kazanıp özel fırsatlardan yararlanabilirsiniz.',
    
    // Ürün Kategorisi
    'stok': 'Ürün sayfasında stok durumu gösterilir. Stokta olmayan ürünler için "Stok gelince haber ver" seçeneğini kullanın. Stok geldiğinde size e-posta ve bildirim gönderilir.',
    'ürün özellikleri': 'Ürün detay sayfasında tüm özellikler, teknik bilgiler, kullanım alanları ve ölçü tabloları yer alır. Sorularınız için ürün sayfasındaki "Soru Sor" bölümünü kullanabilirsiniz.',
    'beden seçimi': 'Ürün sayfasında beden rehberi ve ölçü tabloları bulunur. Doğru bedeni seçmek için ürün ölçülerini kontrol edin. Beden konusunda yardım için canlı destek ile iletişime geçin.',
    'ürün yorumu': 'Ürün yorumlarını ürün detay sayfasında görebilirsiniz. Satın aldığınız ürünler için yorum yazabilir ve fotoğraf ekleyebilirsiniz. Yorumlarınız diğer müşterilere yardımcı olur.',
    'ürün karşılaştır': 'Favorilerinize eklediğiniz ürünleri karşılaştırabilirsiniz. Ürün sayfasında "Favorilere Ekle" butonunu kullanın, sonra favoriler sayfasından karşılaştırma yapabilirsiniz.',
    
    // Genel Kategorisi
    'iletişim': 'Bize ulaşmak için:\n📞 Telefon: 0530 312 58 13\n📱 WhatsApp: +90 530 312 58 13\n📧 E-posta: info@hugluoutdoor.com\n🕐 Çalışma Saatleri: Hafta içi 09:00-18:00',
    'gizlilik': 'Kişisel verileriniz KVKK kapsamında korunur. Verileriniz sadece sipariş ve hizmet süreçleri için kullanılır. Detaylı bilgi için "Gizlilik Politikası" sayfasını inceleyebilirsiniz.',
    'güvenlik': 'Sitemiz SSL sertifikası ile korunur. Tüm ödemeleriniz şifrelenir ve güvenli ödeme altyapısı kullanılır. Kart bilgileriniz saklanmaz. Güvenli alışveriş için tüm önlemler alınmıştır.',
    'kampanya': 'Aktif kampanyaları "Kampanyalar" sayfasından görebilirsiniz. Size özel kampanyalar için "Bana Özel Kampanyalar" bölümüne bakın. Kampanya kodlarınızı ödeme sayfasında kullanabilirsiniz.',
    'garanti': 'Tüm ürünlerimiz orijinal ve garantilidir. Garanti süreleri ürün kategorisine göre değişir. Garanti bilgileri ürün sayfasında ve faturada yer alır. Garanti kapsamı dışındaki durumlar için canlı destek ile iletişime geçin.'
  };

  static async processMessage(message: string, actionType: string = 'text', productId?: number, userId?: number, voiceUrl?: string): Promise<ChatMessage> {
    const timestamp = new Date();
    // GÜVENLİK: Kriptografik olarak güvenli message ID
    let messageId: string;
    try {
      const cryptoUtils = await import('../utils/crypto-utils');
      messageId = cryptoUtils.generateSecureMessageId();
    } catch (error) {
      // Fallback: Basit message ID
      messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      // Backend API'ye mesaj gönder (userId parametresi varsa onu kullan)
      const activeUserId = userId !== undefined ? userId : await this.getActiveUserId();
      
      let response;
      try {
        response = await apiService.post('/chatbot/message', {
          message,
          actionType,
          userId: activeUserId || null,
          productId: productId || undefined,
          voiceUrl: voiceUrl || undefined
        });
      } catch (apiError: any) {
        console.error('❌ Chatbot API error:', apiError);
        throw new Error(apiError?.message || 'API isteği başarısız');
      }

      if (response && response.success && response.data) {
        // Backend'den gelen yanıtı kullan
        let quickReplies = response.data.quickReplies;
        
        // live_support action'ı için telefon butonlarını filtrele (sadece "Telefon Et" kalsın)
        if (actionType === 'live_support' && quickReplies && Array.isArray(quickReplies)) {
          quickReplies = quickReplies.filter((reply: QuickReply) => {
            // "Telefon" butonunu kaldır, sadece "Telefon Et" kalsın
            if (reply.action === 'phone_support' || (reply.text && reply.text.includes('📞 Telefon') && !reply.text.includes('Telefon Et'))) {
              return false;
            }
            return true;
          });
        }
        
        return {
          id: response.data.id || messageId,
          text: response.data.text || 'Yanıt alınamadı',
          isBot: true,
          timestamp: new Date(response.data.timestamp || timestamp),
          type: response.data.type || 'text',
          quickReplies: quickReplies || [],
          data: response.data.data,
          product: response.data.product,
          order: response.data.order,
        };
      } else {
        throw new Error(response?.message || 'Backend response failed');
      }
    } catch (error) {
      console.error('❌ Backend chatbot error, using fallback:', error);
      
      // Fallback: Yerel işleme
      const localResponse = await this.processMessageLocally(message, actionType, messageId, timestamp);
      
      // live_support için telefon butonlarını filtrele
      if (actionType === 'live_support' && localResponse.quickReplies && Array.isArray(localResponse.quickReplies)) {
        localResponse.quickReplies = localResponse.quickReplies.filter((reply: QuickReply) => {
          // "Telefon" butonunu kaldır, sadece "Telefon Et" kalsın
          if (reply.action === 'phone_support' || (reply.text && reply.text.includes('📞 Telefon') && !reply.text.includes('Telefon Et'))) {
            return false;
          }
          return true;
        });
      }
      
      return localResponse;
    }
  }

  private static async processMessageLocally(message: string, actionType: string, messageId: string, timestamp: Date): Promise<ChatMessage> {
    // Özel eylem tipleri
    if (actionType !== 'text') {
      return await this.handleSpecialAction(actionType, message, messageId, timestamp);
    }

    // Mesaj analizi
    const intent = this.detectIntent(message.toLowerCase());
    const response = await this.generateResponse(intent, message);

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies,
      data: response.data,
      product: response.product,
      order: response.order,
    };
  }

  private static detectIntent(message: string): string {
    // Önce S.S.S. veritabanında ara
    for (const [key, answer] of Object.entries(this.faqData)) {
      if (message.includes(key)) {
        return 'faq_match';
      }
    }

    // Intent tespiti
    for (const [intent, keywords] of Object.entries(this.intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    // Sipariş numarası tespiti
    if (/\b\d{5,}\b/.test(message)) {
      return 'order_number';
    }

    // Ürün arama tespiti
    if (message.length > 3 && !this.quickResponses[message]) {
      return 'product_search_query';
    }

    return 'unknown';
  }

  private static async generateResponse(intent: string, message: string): Promise<ChatbotResponse> {
    // Geleneksel rule-based yanıtlar
    switch (intent) {
      case 'faq_match':
        return this.handleFAQQuery(message);

      case 'order_number':
        return await this.handleOrderTrackingLocal(message);

      case 'product_search_query':
        return await this.handleProductSearchLocal(message);

      case 'show_product_card':
        return await this.handleProductCard(message);

      case 'show_order_card':
        return await this.handleOrderCard(message);

      case 'campaigns':
        return await this.handleCampaignsLocal();

      case 'recommendations':
        return await this.handleRecommendationsLocal();

      case 'unknown':
        return {
          text: '🤔 Tam olarak anlayamadım. Size nasıl yardımcı olabileceğimi belirtir misiniz?',
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
            { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '4', text: '❓ S.S.S.', action: 'faq' },
          ]
        };

      default:
        return this.quickResponses[intent] || this.quickResponses.greeting;
    }
  }

  private static handleFAQQuery(message: string): ChatbotResponse {
    for (const [key, answer] of Object.entries(this.faqData)) {
      if (message.includes(key)) {
        return {
          text: `💡 ${answer}`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '✅ Yeterli', action: 'satisfied' },
            { id: '2', text: '❓ Daha Fazla', action: 'faq' },
            { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
          ]
        };
      }
    }

    return {
      text: '🔍 S.S.S. bölümümüzde bu sorunun cevabını bulamadım. Üzgünüm! 😔\n\nSize yardımcı olmak için:\n• S.S.S. bölümüne göz atabilirsiniz - belki farklı bir ifadeyle aradığınız bilgiyi bulabilirsiniz\n• Canlı destek ekibimizle iletişime geçebilirsiniz - sorunuzu detaylı olarak yanıtlayabilirler\n• Sorunuzu farklı şekilde yazmayı deneyebilirsiniz\n\nHangi yöntemi tercih edersiniz?',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '❓ S.S.S. Gör', action: 'faq' },
        { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        { id: '3', text: '🔄 Tekrar Dene', action: 'search_faq' },
      ]
    };
  }

  private static async handleOrderTrackingLocal(message: string): Promise<ChatbotResponse> {
    const orderNumber = message.match(/\b\d{5,}\b/)?.[0];
    
      if (orderNumber) {
        return {
          text: `📦 ${orderNumber} numaralı siparişinizi kontrol ediyorum...\n\nSipariş durumunuzu öğrenmek için:\n• "Siparişlerim" sayfasından detaylı bilgi alabilirsiniz\n• Canlı destek ile anlık durum sorgulayabilirsiniz\n• Başka bir sipariş numarası sorgulayabilirsiniz\n\nHangi işlemi yapmak istersiniz?`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '📋 Siparişlerim', action: 'navigate_orders' },
            { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
            { id: '3', text: '🔢 Başka Numara', action: 'enter_order_number' },
          ]
        };
      }

    return this.quickResponses.order_tracking;
  }

  private static async handleProductSearchLocal(query: string): Promise<ChatbotResponse> {
    try {
      // Arama sorgusunu temizle
      const searchQuery = query.trim();
      
      if (!searchQuery || searchQuery.length < 2) {
        return {
          text: '🔍 Lütfen en az 2 karakter girin.',
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
            { id: '2', text: '🎯 Avcılık', action: 'search_category_avcilik' },
            { id: '3', text: '🎣 Balıkçılık', action: 'search_category_balik' },
            { id: '4', text: '👕 Giyim', action: 'search_category_giyim' },
          ]
        };
      }

      // ProductController ile ürün ara
      const { ProductController } = await import('../controllers/ProductController');
      const products = await ProductController.searchProducts(searchQuery);

      if (!products || products.length === 0) {
        return {
          text: `🔍 "${searchQuery}" için ürün bulunamadı. Üzgünüm! 😔\n\nSize yardımcı olmak için:\n• Farklı bir arama terimi deneyebilirsiniz (örn: marka adı, kategori)\n• Kategorilere göz atabilirsiniz\n• Tüm ürünler sayfasından keşif yapabilirsiniz\n• Canlı destek ile ürün önerisi alabilirsiniz\n\nNe yapmak istersiniz?`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '🛒 Tüm Ürünler', action: 'view_products' },
            { id: '2', text: '🏕️ Kamp Malzemeleri', action: 'search_category_kamp' },
            { id: '3', text: '🎯 Avcılık', action: 'search_category_avcilik' },
            { id: '4', text: '🎣 Balıkçılık', action: 'search_category_balik' },
            { id: '5', text: '👕 Giyim', action: 'search_category_giyim' },
            { id: '6', text: '🎧 Canlı Destek', action: 'live_support' },
          ]
        };
      }

      // İlk 3 ürünü göster
      const topProducts = products.slice(0, 3);
      const productCards = topProducts.map((product, index) => ({
        id: `product-${product.id}`,
        text: `📦 ${product.name}\n💰 ${ProductController.formatPrice(product.price)}${product.stock > 0 ? ' ✅ Stokta' : ' ❌ Stokta Yok'}`,
        isBot: true,
        timestamp: new Date(),
        type: 'product_card' as const,
        product: product,
      }));

      // Eğer 3'ten fazla ürün varsa bilgi ver
      const moreProductsText = products.length > 3 
        ? `\n\n💡 Toplam ${products.length} ürün bulundu. Tüm sonuçları görmek için "Ürünler" sayfasına gidebilirsiniz.`
        : '';

      return {
        text: `🔍 "${searchQuery}" için ${products.length} ürün bulundu:${moreProductsText}`,
        type: 'text',
        // İlk ürünü direkt göster, diğerlerini ayrı mesajlar olarak ekleyeceğiz
        data: {
          products: topProducts,
          totalCount: products.length,
          query: searchQuery
        }
      };
    } catch (error: any) {
      console.error('Product search error:', error);
      return {
        text: `❌ Ürün arama sırasında bir hata oluştu. Üzgünüm! 😔\n\nLütfen:\n• İnternet bağlantınızı kontrol edin\n• Birkaç saniye sonra tekrar deneyin\n• Farklı bir arama terimi kullanın\n• Ürünler sayfasından kategorilere göz atın\n\nSorun devam ederse canlı destek ile iletişime geçebilirsiniz.`,
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🛒 Ürünlere Git', action: 'view_products' },
          { id: '2', text: '🔄 Tekrar Dene', action: 'product_search' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      };
    }
  }

  private static async handleCampaignsLocal(): Promise<ChatbotResponse> {
    return {
      text: '🎁 Aktif kampanyaları kontrol ediyorum...\n\nKampanyalarımız hakkında bilgi almak için:\n• "Kampanyalar" sayfasından tüm aktif kampanyaları görebilirsiniz\n• Size özel kampanyalar için öneriler sayfasına göz atabilirsiniz\n• Ürünler sayfasından kampanyalı ürünleri keşfedebilirsiniz\n\nKampanyalarımız:\n• Üyelere özel indirimler\n• Sezonluk fırsatlar\n• Kategori bazlı kampanyalar\n• Özel ürün teklifleri\n\nHemen kampanyaları keşfedin!',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        { id: '2', text: '🛒 Ürünlere Göz At', action: 'view_products' },
        { id: '3', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '4', text: '🏠 Ana Menü', action: 'greeting' },
      ]
    };
  }

  private static async handleRecommendationsLocal(): Promise<ChatbotResponse> {
    return {
      text: '⭐ Size özel öneriler hazırlıyorum...\n\nKişiselleştirilmiş öneriler için:\n• "Öneriler" sayfasından size özel ürün ve kampanya önerilerini görebilirsiniz\n• Geçmiş alışverişlerinize göre öneriler sunulur\n• Popüler ürünler sayfasından trend ürünleri keşfedebilirsiniz\n• Kampanyalar sayfasından size uygun fırsatları bulabilirsiniz\n\nÖnerilerimiz:\n• Geçmiş alışverişlerinize göre ürünler\n• Benzer müşterilerin beğendiği ürünler\n• Size özel kampanyalar\n• Popüler ve trend ürünler\n\nHemen önerileri keşfedin!',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '⭐ Öneriler', action: 'show_recommendations' },
        { id: '2', text: '🛒 Popüler Ürünler', action: 'view_products' },
        { id: '3', text: '🎁 Kampanyalar', action: 'view_campaigns' },
        { id: '4', text: '🔍 Ürün Ara', action: 'product_search' },
      ]
    };
  }

  // Ürün kartı göster
  private static async handleProductCard(message: string): Promise<ChatbotResponse> {
    try {
      // Mesajdan ürün ID'sini çıkar
      const productIdMatch = message.match(/ürün[:\s]*(\d+)/i) || message.match(/(\d+)/);
      if (!productIdMatch) {
        return {
          text: 'Ürün ID\'si bulunamadı. Lütfen ürün numarasını belirtin.',
          type: 'text',
        };
      }

      const productId = parseInt(productIdMatch[1], 10);
      const productResponse = await apiService.getProductById(productId);

      if (productResponse.success && productResponse.data) {
        return {
          text: 'Ürün detayları:',
          type: 'product_card',
          data: { product: productResponse.data },
        };
      }

      return {
        text: 'Ürün bulunamadı.',
        type: 'text',
      };
    } catch (error) {
      console.error('Product card error:', error);
      return {
        text: 'Ürün bilgileri alınamadı.',
        type: 'text',
      };
    }
  }

  // Sipariş kartı göster
  private static async handleOrderCard(message: string): Promise<ChatbotResponse> {
    try {
      // Mesajdan sipariş ID'sini çıkar
      const orderIdMatch = message.match(/sipariş[:\s]*(\d+)/i) || message.match(/(\d+)/);
      if (!orderIdMatch) {
        return {
          text: 'Sipariş ID\'si bulunamadı. Lütfen sipariş numarasını belirtin.',
          type: 'text',
        };
      }

      const orderId = parseInt(orderIdMatch[1], 10);
      const orderResponse = await apiService.getOrderById(orderId);

      if (orderResponse.success && orderResponse.data) {
        return {
          text: 'Sipariş detayları:',
          type: 'order_card',
          data: { order: orderResponse.data },
        };
      }

      return {
        text: 'Sipariş bulunamadı.',
        type: 'text',
      };
    } catch (error) {
      console.error('Order card error:', error);
      return {
        text: 'Sipariş bilgileri alınamadı.',
        type: 'text',
      };
    }
  }

  // Gelişmiş AI önerileri (kullanıcı context ile)
  static async getAdvancedRecommendations(userId: number): Promise<ChatbotResponse> {
    try {
      // Kullanıcı geçmişini al
      const userOrdersResponse = await apiService.getUserOrders(userId);
      const orders = userOrdersResponse.success ? (userOrdersResponse.data || []) : [];

      // Son siparişlerden kategori çıkar
      const categories = new Set<string>();
      orders.slice(0, 5).forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            if (item.product?.category) {
              categories.add(item.product.category);
            }
          });
        }
      });

      // ML servisi entegrasyonu (gelecekte)
      // Şimdilik basit öneriler
      const categoryArray = Array.from(categories);
      
      if (categoryArray.length > 0) {
        return {
          text: `⭐ Size özel öneriler hazırladım! 😊\n\nSon alışverişlerinize göre ${categoryArray.join(', ')} kategorilerinde ürünler önerebilirim. Bu kategorilerdeki yeni ürünler, kampanyalar ve özel fırsatlar için öneriler sayfasına göz atabilirsiniz.\n\nHemen önerileri keşfedin!`,
          type: 'quick_reply',
          quickReplies: [
            { id: '1', text: '⭐ Önerileri Gör', action: 'view_products', data: { categories: categoryArray } },
            { id: '2', text: '🎁 Kampanyalar', action: 'view_campaigns' },
            { id: '3', text: '🛒 Tüm Ürünler', action: 'view_products' },
          ],
        };
      }

      return {
        text: '⭐ Size özel öneriler için alışveriş yapmanız gerekiyor.\n\nKişiselleştirilmiş öneriler almak için:\n• Ürünler sayfasından alışveriş yapın\n• Geçmiş alışverişlerinize göre öneriler sunulur\n• Popüler ürünler ve kampanyaları keşfedin\n\nHemen alışverişe başlayın ve size özel önerileri görün!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🛒 Ürünlere Göz At', action: 'view_products' },
          { id: '2', text: '🎁 Kampanyalar', action: 'view_campaigns' },
          { id: '3', text: '⭐ Popüler Ürünler', action: 'view_products' },
        ],
      };
    } catch (error) {
      console.error('Advanced recommendations error:', error);
      return {
        text: '❌ Öneriler hazırlanırken bir hata oluştu. Üzgünüm! 😔\n\nLütfen birkaç saniye sonra tekrar deneyin. Sorun devam ederse canlı destek ile iletişime geçebilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🔄 Tekrar Dene', action: 'show_recommendations' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        ],
      };
    }
  }

  private static async handleSpecialAction(
    action: string, 
    message: string, 
    messageId: string, 
    timestamp: Date
  ): Promise<ChatMessage> {
    const responses: { [key: string]: ChatbotResponse } = {
      live_support: {
        text: '🎧 Canlı destek ekibimize ulaşmak için size birkaç seçenek sunuyoruz:\n\n📞 Telefon: 0530 312 58 13\n   Çalışma Saatleri: Hafta içi 09:00-18:00\n   Ortalama bekleme: 2-3 dakika\n\n📱 WhatsApp: +90 530 312 58 13\n   7/24 mesaj gönderebilirsiniz\n   En geç 1 saat içinde yanıt verilir\n\n📧 E-posta: info@hugluoutdoor.com\n   Detaylı sorularınız için\n   En geç 24 saat içinde yanıt\n\nHangi yöntemi tercih edersiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Telefon Et', action: 'call_support' },
          { id: '2', text: '📱 WhatsApp', action: 'whatsapp_support' },
          { id: '3', text: '📧 E-posta', action: 'email_support' },
        ]
      },
      
      faq: {
        text: '❓ Sık Sorulan Sorular (S.S.S.) bölümümüzde en çok merak edilen konuların cevaplarını bulabilirsiniz.\n\nKategoriler:\n• 📦 Sipariş ve Kargo\n• 💳 Ödeme ve Taksit\n• ↩️ İade ve Değişim\n• 👤 Hesap ve Profil\n• 🛒 Ürün Bilgileri\n• 🔒 Güvenlik ve Gizlilik\n\nAradığınız soruyu bulamazsanız canlı destek ile iletişime geçebilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📖 S.S.S. Gör', action: 'view_faq' },
          { id: '2', text: '🔍 Soru Ara', action: 'search_faq' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      view_orders: {
        text: '📋 Siparişlerinizi görüntülemek için "Hesabım > Siparişlerim" sayfasına yönlendiriyorum.\n\nBu sayfada:\n• Tüm siparişlerinizin listesi\n• Sipariş durumları (Beklemede, Onaylandı, Kargoda, vb.)\n• Sipariş detayları ve faturalar\n• Kargo takip numaraları\n• İade talebi oluşturma\n\nHemen siparişlerinize göz atabilirsiniz!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📱 Siparişlerime Git', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara ile Ara', action: 'enter_order_number' },
        ]
      },

      enter_order_number: {
        text: '🔢 Sipariş numaranızı yazabilirsiniz (örn: 12345 veya 123456).\n\nSipariş numaranızı yazdığınızda:\n• Sipariş durumunu kontrol ederim\n• Kargo bilgilerini paylaşırım\n• Detaylı bilgi için yönlendirme yaparım\n\nSipariş numaranızı yazın:'
      },

      search_order: {
        text: '🔍 Sipariş numaranızı yazabilirsiniz.\n\nSipariş numaranız genellikle 5-6 haneli bir sayıdır. Sipariş onay e-postanızda veya SMS\'inizde bulabilirsiniz.\n\nNumarayı yazdığınızda size:\n• Sipariş durumunu\n• Kargo bilgilerini\n• Teslimat tahminini\n\nanlık olarak söyleyebilirim.'
      },

      create_return: {
        text: '📝 İade talebi oluşturmak için "İade Taleplerim" sayfasına yönlendiriyorum.\n\nİade işlemi için:\n• Ürünü teslim aldığınız tarihten itibaren 14 gün içinde başvuru yapabilirsiniz\n• Ürün orijinal ambalajında, etiketli ve kullanılmamış olmalıdır\n• İade formunu doldurup kargo bilgilerini alacaksınız\n• 150 TL üzeri siparişlerde iade kargo ücretsizdir\n\nHemen iade talebi oluşturabilirsiniz!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 İade Taleplerim', action: 'navigate_returns' },
          { id: '2', text: '❓ İade Koşulları', action: 'return_policy' },
        ]
      },

      rate_chat: {
        text: '⭐ Bu sohbeti nasıl değerlendirirsiniz?\n\nGeri bildirimleriniz bizim için çok değerli! Hizmet kalitemizi artırmak için görüşlerinizi paylaşabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⭐⭐⭐⭐⭐ Mükemmel', action: 'rate_5' },
          { id: '2', text: '⭐⭐⭐⭐ İyi', action: 'rate_4' },
          { id: '3', text: '⭐⭐⭐ Orta', action: 'rate_3' },
          { id: '4', text: '⭐⭐ Kötü', action: 'rate_2' },
        ]
      },

      satisfied: {
        text: '✅ Harika! Size yardımcı olabildiysem ne mutlu bana! 😊\n\nBaşka bir konuda yardıma ihtiyacınız olursa her zaman buradayım. Huğlu Outdoor olarak sizlere en iyi hizmeti sunmak için çalışıyoruz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '⭐ Değerlendir', action: 'rate_chat' },
        ]
      },

      rate_5: {
        text: '🎉 Harika! 5 yıldız için çok teşekkür ederim! ⭐⭐⭐⭐⭐\n\nSizinle yardımcı olabildiğim için mutluyum. Bu tür geri bildirimler bizi motive ediyor ve daha iyi hizmet vermemize katkı sağlıyor.\n\nBaşka bir konuda yardıma ihtiyacınız olursa her zaman buradayım!',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },

      rate_4: {
        text: '😊 4 yıldız için teşekkürler! ⭐⭐⭐⭐\n\nGeri bildiriminiz bizim için çok değerli. Daha iyi hizmet verebilmek için sürekli çalışıyoruz. Eksik gördüğünüz noktalar varsa lütfen paylaşın, böylece hizmet kalitemizi artırabiliriz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🆕 Yeni Soru', action: 'new_chat' },
          { id: '2', text: '💬 Geri Bildirim Ver', action: 'feedback' },
        ]
      },

      rate_3: {
        text: '🤔 3 yıldız için teşekkürler. ⭐⭐⭐\n\nNasıl daha iyi hizmet verebiliriz? Görüşleriniz bizim için çok önemli. Eksik gördüğünüz noktaları paylaşırsanız, hizmet kalitemizi artırmak için çalışabiliriz.\n\nDetaylı geri bildirim vermek ister misiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💬 Geri Bildirim Ver', action: 'feedback' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      rate_2: {
        text: '😔 Üzgünüm, beklentilerinizi karşılayamadık. ⭐⭐\n\nLütfen canlı destek ekibimizle iletişime geçin. Sorununuzu detaylı olarak dinleyip en kısa sürede çözüm bulalım. Geri bildiriminiz sayesinde hizmet kalitemizi artırmak için çalışıyoruz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
          { id: '2', text: '📧 Şikayet Gönder', action: 'complaint' },
        ]
      },

      new_chat: {
        text: '🆕 Yeni bir sohbet başlatalım! Size nasıl yardımcı olabilirim?\n\n• 📦 Sipariş takibi ve sorgulama\n• 🔍 Ürün arama ve bilgi\n• 🎁 Kampanyalar ve fırsatlar\n• ❓ Sık sorulan sorular\n• 🎧 Canlı destek\n\nHangi konuda yardıma ihtiyacınız var?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
          { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
          { id: '3', text: '❓ S.S.S.', action: 'faq' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },

      payment_methods: {
        text: '💳 Kabul ettiğimiz ödeme yöntemleri:\n\n• 💳 Kredi/Banka Kartı (Visa, Mastercard)\n   - 3D Secure ile güvenli ödeme\n   - Taksit seçenekleri mevcut\n\n• 🏦 Havale/EFT\n   - Banka hesabına transfer\n   - EFT onayı sonrası sipariş hazırlanır\n\n• 📱 Dijital Cüzdanlar\n   - Çeşitli dijital ödeme seçenekleri\n\n⚠️ Kapıda ödeme seçeneği bulunmamaktadır.\n\n🔒 Tüm ödemeleriniz SSL sertifikası ile korunur ve Iyzico güvenli ödeme altyapısı kullanılır.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📊 Taksit Seçenekleri', action: 'installment_options' },
          { id: '2', text: '🔒 Güvenlik', action: 'payment_security' },
        ]
      },

      installment_options: {
        text: '📊 Taksit seçeneklerimiz:\n\n• 2 Taksit - Komisyonsuz ✅\n• 3 Taksit - %2.9 komisyon\n• 6 Taksit - %3.9 komisyon\n• 9 Taksit - %4.9 komisyon\n• 12 Taksit - %5.9 komisyon\n\n💡 İpucu: 2 taksit seçeneği komisyonsuzdur!\n\n⚠️ Not: Komisyon oranları bankanıza ve kart tipinize göre değişebilir. Ödeme sayfasında gerçek oranları görebilirsiniz.\n\nDetaylı bilgi için canlı destek ile iletişime geçebilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💳 Ödeme Yöntemleri', action: 'payment_methods' },
          { id: '2', text: '🎧 Daha Fazla Bilgi', action: 'live_support' },
        ]
      },

      delivery_times: {
        text: '⏰ Teslimat süreleri:\n\n• 🚚 Standart Kargo: 2-5 iş günü\n   - Stokta olan ürünler 1-3 iş günü içinde kargoya verilir\n   - Büyük şehirlerde genellikle 1-2 gün içinde teslim\n   - İlçe ve köylerde 3-5 iş günü sürebilir\n\n• ⚡ Hızlı Kargo: 1-2 iş günü (+15 TL)\n   - Ek ücret ile daha hızlı teslimat\n   - Büyük şehirlerde genellikle 1 gün içinde\n\n• 🏪 Mağazadan Teslim: Aynı gün (sadece İstanbul)\n   - Seçili mağazalarımızdan aynı gün teslim\n\n📍 Kargo süresi bulunduğunuz ile ve kargo firmasına göre değişir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '💰 Kargo Ücretleri', action: 'shipping_costs' },
          { id: '2', text: '📦 Sipariş Ver', action: 'view_products' },
        ]
      },

      shipping_costs: {
        text: '💰 Kargo ücretleri:\n\n• 🆓 150 TL ve üzeri siparişler: ÜCRETSİZ\n   - Sepetiniz 150 TL\'yi geçtiğinde kargo bedava!\n\n• 📦 150 TL altı siparişler: 19.90 TL\n   - Standart kargo ücreti\n\n• ⚡ Hızlı Kargo: +15 TL\n   - Standart kargo ücretine ek olarak\n   - Daha hızlı teslimat için\n\n• 🏝️ Adalar: +25 TL\n   - Gökçeada, Bozcaada ve diğer adalar için\n\n💡 İpucu: 150 TL üzeri alışveriş yaparak ücretsiz kargo kazanabilirsiniz!\n\n⚠️ Not: Özel ürünlerde (büyük ebat, ağır ürünler) farklı ücretler uygulanabilir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '⏰ Teslimat Süreleri', action: 'delivery_times' },
          { id: '2', text: '🛒 Alışverişe Başla', action: 'view_products' },
        ]
      },

      return_policy: {
        text: '↩️ İade koşulları ve süreç:\n\n⏰ Süre:\n• Ürünü teslim aldığınız tarihten itibaren 14 gün içinde iade edebilirsiniz\n• Bu süre içinde "İade Taleplerim" bölümünden başvuru yapın\n\n📦 Koşullar:\n• Ürün orijinal ambalajında olmalı\n• Etiketler zarar görmemiş olmalı\n• Ürün kullanılmamış ve hasarsız olmalı\n• Fatura veya fiş ile birlikte gönderilmeli\n\n🚫 İade Edilemez:\n• Hijyen ürünleri\n• İç çamaşırı\n• Kişisel bakım ürünleri\n• Açılmış ve kullanılmış ürünler\n\n💚 Özel Durumlar:\n• Hasarlı, yanlış veya eksik ürün gönderilmesi durumunda tüm kargo ücretleri bizden!\n• 150 TL üzeri siparişlerde iade kargo ücretsizdir.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📝 İade Talebi', action: 'navigate_returns' },
          { id: '2', text: '🚚 İade Kargo', action: 'return_shipping' },
        ]
      },


      more_info: {
        text: '📚 Hangi konuda daha fazla bilgi almak istersiniz?\n\nSize yardımcı olabileceğim konular:\n\n• 📦 Sipariş & Kargo\n   - Sipariş takibi, kargo süreleri, ücretler\n\n• 💳 Ödeme & Taksit\n   - Ödeme yöntemleri, taksit seçenekleri, güvenlik\n\n• ↩️ İade & Değişim\n   - İade koşulları, süreç, kargo\n\n• 🎧 Canlı Destek\n   - Detaylı sorularınız için\n\nHangi konuda bilgi almak istersiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📦 Sipariş & Kargo', action: 'shipping' },
          { id: '2', text: '💳 Ödeme & Taksit', action: 'payment' },
          { id: '3', text: '↩️ İade & Değişim', action: 'return' },
          { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },
      campaign_info: {
        text: '🎁 Kampanyalar hakkında size yardımcı olabilirim!\n\nKampanya bilgileri:\n• Aktif kampanyaları görüntüleyebilirsiniz\n• Size uygun kampanyaları kontrol edebilirsiniz\n• Kampanya kodlarını nasıl kullanacağınızı öğrenebilirsiniz\n• Özel fırsatları keşfedebilirsiniz\n\nKampanyalarımız:\n• Üyelere özel indirimler\n• Sezonluk kampanyalar\n• Kategori bazlı fırsatlar\n• Özel ürün kampanyaları\n\nHangi konuda bilgi almak istersiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
          { id: '2', text: '✅ Uygun muyum?', action: 'check_campaign_eligibility' },
          { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
        ]
      },
      view_campaigns: await (async () => {
        const resp = await ChatbotService.handleCampaignsLocal();
        return resp;
      })(),
      show_recommendations: await (async () => {
        const resp = await ChatbotService.handleRecommendationsLocal();
        return resp;
      })(),
      check_campaign_eligibility: {
        text: '🔎 Size uygun kampanyaları kontrol ediyorum...\n\nSepetiniz ve geçmiş alışverişlerinize göre:\n• Size özel kampanyalar\n• Kategori bazlı indirimler\n• Üyelik seviyenize göre fırsatlar\n• Özel ürün kampanyaları\n\nBu özellik yakında aktif olacak. Şimdilik aktif kampanyaları görüntüleyebilir veya öneriler sayfasına göz atabilirsiniz.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🎁 Aktif Kampanyalar', action: 'view_campaigns' },
          { id: '2', text: '⭐ Öneriler', action: 'show_recommendations' },
        ]
      },
      // --- Order helpers ---
      order_last_status: {
        text: '📦 Son sipariş durumunuzu kontrol ediyorum...\n\nSipariş durumunuzu öğrenmek için:\n• "Siparişlerim" sayfasından tüm siparişlerinizi görebilirsiniz\n• Sipariş numaranızı yazarak sorgulama yapabilirsiniz\n• Canlı destek ile detaylı bilgi alabilirsiniz\n\nHangi yöntemi tercih edersiniz?',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📋 Siparişlerim', action: 'navigate_orders' },
          { id: '2', text: '🔢 Numara Gir', action: 'enter_order_number' },
          { id: '3', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      },
      cancel_order: {
        text: '❌ Sipariş iptali için size yardımcı olabilirim.\n\nİptal etmek istediğiniz sipariş numaranızı yazın (örn: 12345).\n\n⚠️ Önemli Bilgiler:\n• İptal sadece "Beklemede" durumundaki siparişlerde mümkündür\n• Onaylanmış siparişler için canlı destek ile iletişime geçin\n• İptal edilen siparişlerin parası 3-7 iş günü içinde iade edilir\n\nSipariş numaranızı yazın:'
      },
      track_shipment: {
        text: '📦 Kargo takibi için size yardımcı olabilirim!\n\nKargo takip yöntemleri:\n• Sipariş detaylarınızdaki takip numarasını kullanabilirsiniz\n• Kargo firmasının web sitesinden veya mobil uygulamasından takip edebilirsiniz\n• SMS ile gönderilen takip linkini kullanabilirsiniz\n\nKargo firmaları:\n• Yurtiçi Kargo\n• MNG Kargo\n• Aras Kargo\n\nDilerseniz kargo firmalarının iletişim bilgilerini de paylaşabilirim.',
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '📞 Kargo İletişim', action: 'cargo_contact' },
          { id: '2', text: '📋 Siparişlerim', action: 'navigate_orders' },
        ]
      },
      search_faq: {
        text: '🔍 S.S.S. içinde arama yapabilirsiniz!\n\nAramak istediğiniz konuyu yazın. Örneğin:\n• "kargo ücreti"\n• "iade süresi"\n• "ödeme yöntemleri"\n• "teslimat süresi"\n• "şifre sıfırlama"\n\nSize en uygun cevapları bulacağım. Sorunuzu yazın:'
      },
    };

    const response = responses[action] || {
      text: '🤖 Bu özellik şu anda geliştiriliyor. Size en kısa sürede bu hizmeti sunmak için çalışıyoruz.\n\nBu konuda yardıma ihtiyacınız varsa:\n• Canlı destek ekibimizle iletişime geçebilirsiniz\n• S.S.S. bölümümüze göz atabilirsiniz\n• Ana menüye dönüp başka bir konuda yardım alabilirsiniz\n\nAnlayışınız için teşekkür ederiz! 🙏',
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '🎧 Canlı Destek', action: 'live_support' },
        { id: '2', text: '❓ S.S.S.', action: 'faq' },
        { id: '3', text: '🏠 Ana Menü', action: 'greeting' },
      ]
    };

    return {
      id: messageId,
      text: response.text,
      isBot: true,
      timestamp,
      type: response.type || 'text',
      quickReplies: response.quickReplies,
      data: response.data,
      product: response.product,
      order: response.order,
    };
  }

  // Analitik fonksiyonları
  static async logChatInteraction(userId: number, message: string, intent: string, satisfaction?: number) {
    try {
      // Backend'e analitik verilerini gönder
      await apiService.post('/chatbot/analytics', {
        userId,
        message: message.substring(0, 100), // Gizlilik için kısalt
        intent,
        satisfaction,
      });
      
      console.log('✅ Chat analytics logged to backend');
    } catch (error) {
      console.error('❌ Error logging chat interaction:', error);
      // Fallback: Local logging
      console.log('Chat Analytics (local):', {
        userId,
        message: message.substring(0, 100),
        intent,
        timestamp: new Date(),
        satisfaction,
      });
    }
  }

  static async getChatAnalytics() {
    // Mock analytics data
    return {
      totalChats: 1250,
      averageRating: 4.3,
      topIntents: [
        { intent: 'order_tracking', count: 450 },
        { intent: 'product_search', count: 320 },
        { intent: 'support', count: 280 },
      ],
      resolutionRate: 0.85,
    };
  }

  // Yardımcı fonksiyonlar
  private static async getActiveUserId(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem('currentUserId');
      const uid = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(uid) && uid > 0 ? uid : 0;
    } catch {
      return 0;
    }
  }

  private static getOrderStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Beklemede',
      'confirmed': 'Onaylandı',
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'cancelled': 'İptal Edildi',
      'returned': 'İade Edildi',
    };
    return statusMap[status] || status;
  }

  static async handleNavigation(action: string, navigation: any, data?: any) {
    try {
      // Root-level navigate helper to avoid nested navigator issues
      const tryNavigate = (routeName: string, params?: any) => {
        if (!navigation) return false;
        try {
          // Try current navigator
          navigation.navigate(routeName, params);
          return true;
        } catch (_) {
          // Fallback: try parent navigator
          const parent = navigation.getParent?.();
          if (parent?.navigate) {
            parent.navigate(routeName as never, params as never);
            return true;
          }
          return false;
        }
      };
      switch (action) {
        case 'navigate_orders':
          if (!tryNavigate('Orders')) throw new Error('Navigator not found for Orders');
          break;
        case 'navigate_returns':
          if (!tryNavigate('ReturnRequests')) throw new Error('Navigator not found for ReturnRequests');
          break;
        case 'view_faq':
          if (!tryNavigate('FAQ')) throw new Error('Navigator not found for FAQ');
          break;
        case 'view_products':
          if (data?.query) {
            if (!tryNavigate('ProductList', { searchQuery: data.query })) throw new Error('Navigator not found for ProductList');
          } else {
            if (!tryNavigate('ProductList')) throw new Error('Navigator not found for ProductList');
          }
          break;
        case 'order_detail':
          if (!tryNavigate('OrderDetail', { orderId: data?.orderId })) throw new Error('Navigator not found for OrderDetail');
          break;
        case 'view_categories':
          if (!tryNavigate('ProductList')) throw new Error('Navigator not found for ProductList');
          break;
        case 'search_category_kamp':
          navigation.navigate('ProductList', { category: 'Kamp' });
          break;
        case 'search_category_avcilik':
          navigation.navigate('ProductList', { category: 'Avcılık' });
          break;
        case 'search_category_balik':
          navigation.navigate('ProductList', { category: 'Balıkçılık' });
          break;
        case 'search_category_giyim':
          navigation.navigate('ProductList', { category: 'Giyim' });
          break;
        case 'call_support':
          Linking.openURL('tel:05303125813');
          break;
        case 'whatsapp_support':
          Linking.openURL('https://wa.me/905303125813?text=Merhaba, yardıma ihtiyacım var.');
          break;
        case 'email_support':
          Linking.openURL('mailto:info@hugluoutdoor.com?subject=Destek Talebi');
          break;
        default:
          console.log('Unknown navigation action:', action);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      throw error;
    }
  }
}
