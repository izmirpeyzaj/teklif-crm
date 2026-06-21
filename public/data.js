const APP_DATA = {
    jobs: [
        {
            id: 'j1',
            name: 'Çim Biçme ve Yeşil Alan Bakımı',
            description: 'Profesyonel ekipmanlarla çim biçme, kenar düzeltme ve kök havalandırma işlemi.',
            unit: 'm²',
            price: 75,
            image: 'images/services/peyzaj_bakim.png',
            conditions: 'Biçim sonrası çıkan yeşil atıkların nakliyesi fiyata dahildir.',
            taxRate: 20
        },
        {
            id: 'j2',
            name: 'Genel Bahçe Temizliği',
            description: 'Mevsimlik yaprak temizliği, kurumuş dalların budanması ve atıkların toplanması.',
            unit: 'Saat',
            price: 600,
            image: 'images/services/temizlik_bahce.png',
            conditions: 'Temizlik sırasında çıkan bahçe atıkları poşetlenerek teslim edilir.',
            taxRate: 20
        },
        {
            id: 'j3',
            name: 'Doğal Taş & Zemin Döşeme',
            description: 'Yürüyüş yolları ve teraslar için yüksek kaliteli doğal taş döşeme işçiliği.',
            unit: 'm²',
            price: 1250,
            image: 'images/services/parke-yol.png',
            conditions: 'Taşların nakliyesi ve zemin hazırlığı (kırım/hafriyat) fiyata dahil değildir.',
            taxRate: 20
        },
        {
            id: 'j4',
            name: 'Otomatik Sulama Sistemi Kurulumu',
            description: 'Zaman ayarlı, sensörlü otomatik sulama sistemi projelendirme ve montajı.',
            unit: 'm²',
            price: 350,
            image: 'images/services/sulama.png',
            conditions: 'Su ve elektrik hattının bağlantı noktasına kadar getirilmesi müşteriye aittir.',
            taxRate: 20
        },
        {
            id: 'j5',
            name: 'Ağaç ve Çalı Budama',
            description: 'Meyve ağaçları ve süs bitkilerinin mevsimsel form ve gençleştirme budaması.',
            unit: 'Adet',
            price: 450,
            image: 'images/services/peyzaj_budama.png',
            conditions: 'Budama sonrası çıkan odunsu atıklar yerinde parçalanarak mülç olarak bırakılabilir veya nakledilebilir.',
            taxRate: 20
        },
        {
            id: 'j6',
            name: 'Bitki İlaçlama ve Gübreleme',
            description: 'Hastalık ve zararlılara karşı koruyucu ilaçlama ve mevsimlik bitki besleme uygulaması.',
            unit: 'Depo',
            price: 1500,
            image: 'images/services/peyzaj_ilaclama.png',
            conditions: 'Uygulama esnasında evcil hayvanların ve çocukların alandan uzak tutulması gerekmektedir.',
            taxRate: 20
        },
        {
            id: 'j7',
            name: 'Rulo Çim Serimi',
            description: 'Hazır rulo çim temini, zemin hazırlığı ve profesyonel serim hizmeti.',
            unit: 'm²',
            price: 480,
            image: 'images/services/rulo-cim.png',
            conditions: 'Zemin hazırlığı fiyata dahil olup, toprak takviyesi gerekirse ayrıca m³ üzerinden hesaplanır.',
            taxRate: 20
        },
        {
            id: 'j8',
            name: 'Peyzaj Projelendirme (3D)',
            description: 'Bahçeniz için fotogerçekçi 3D tasarım ve bitkilendirme projesi çizimi.',
            unit: 'Proje',
            price: 7500,
            image: 'images/services/ic_mimarlik_render.png',
            conditions: 'Proje teslimi dijital formatta (PDF/MP4) yapılır. 2 adet revizyon hakkı fiyata dahildir.',
            taxRate: 20
        },
        {
            id: 'j9',
            name: 'Süs Havuzu ve Şelale Bakımı',
            description: 'Havuz temizliği, pompa kontrolü ve su kalitesi stabilizasyonu.',
            unit: 'Sefer',
            price: 1800,
            image: 'images/services/peyzaj_havuz.png',
            conditions: 'Kimyasal sarf malzemeleri (Klor, yosun önleyici vb.) fiyata dahildir.',
            taxRate: 20
        },
        {
            id: 'j10',
            name: 'Dış Mekan Aydınlatma Montajı',
            description: 'Bahçe, ağaç ve yol aydınlatmaları için kablolama ve armatür montajı.',
            unit: 'Adet',
            price: 850,
            image: 'images/services/aydinlatma.png',
            conditions: 'Armatürlerin IP65/67 koruma sınıfında olması taahhüt edilir.',
            taxRate: 20
        },
        {
            id: 'j11',
            name: 'Dikey Bahçe (Vertical Garden) Kurulumu',
            description: 'Otomatik sulama destekli yaşayan duvar sistemleri kurulumu.',
            unit: 'm²',
            price: 4500,
            image: 'images/services/peyzaj_bakim.png',
            conditions: 'Kurulan dikey bahçe ünitesinin 1 yıl bitki değişim garantisi vardır.',
            taxRate: 20
        },
        {
            id: 'j12',
            name: 'Ateş Çukuru (Fire Pit) Yapımı',
            description: 'Modern tasarımlı, doğal taş veya betonarme ateş alanı inşası.',
            unit: 'Adet',
            price: 12500,
            image: 'images/services/peyzaj_kaya_bahcesi.png',
            conditions: 'Gazlı sistemler için tesisat çekimi hariçtir, odunlu sistemler için taban izolasyonu dahildir.',
            taxRate: 20
        },
        {
            id: 'j13',
            name: 'Dış Mekan Mutfak Tasarımı',
            description: 'Paslanmaz çelik eviye, barbekü alanı ve tezgah kurulumu.',
            unit: 'Metretül',
            price: 15500,
            image: 'images/services/insaat_mutfak.png',
            conditions: 'Mutfak tezgahı doğal granit veya seramik kaplamadır.',
            taxRate: 20
        },
        {
            id: 'j14',
            name: 'Pergola ve Veranda Sistemleri',
            description: 'Emprenyeli ahşap veya alüminyum gölgelendirme sistemleri montajı.',
            unit: 'm²',
            price: 3200,
            image: 'images/services/pergola.png',
            conditions: 'Zemin sabitleme pabuçları ve gizli vida sistemleri kullanılır.',
            taxRate: 20
        },
        {
            id: 'j15',
            name: 'İstinat Duvarı (Zemin Tutma)',
            description: 'Kademeli bahçeler için doğal taş veya kilit taşı istinat duvarı.',
            unit: 'm²',
            price: 2800,
            image: 'images/services/duvar.png',
            conditions: 'Duvar arkası drenaj borulaması ve geotekstil serimi fiyata dahildir.',
            taxRate: 20
        },
        {
            id: 'j16',
            name: 'Otomatik Gübreleme Ünitesi',
            description: 'Sulama sistemine entegre sıvı gübre dozajlama pompası kurulumu.',
            unit: 'Sistem',
            price: 8500,
            image: 'images/services/peyzaj_ilaclama.png',
            conditions: 'Dozaj pompası ve ilk dolum tankı dahildir.',
            taxRate: 20
        },
        {
            id: 'j17',
            name: 'Sentetik Çim (Yapay) Serimi',
            description: 'Yüksek kaliteli, UV dayanımlı yapay çim halı montajı.',
            unit: 'm²',
            price: 650,
            image: 'images/services/rulo-cim.png',
            conditions: 'Alt zemin mıcır dolgusu ve kompaktör sıkıştırması dahildir.',
            taxRate: 20
        },
        {
            id: 'j18',
            name: 'Dekoratif Gölet ve Şelale Yapımı',
            description: 'Doğal taş görünümlü, filtrasyonlu su öğeleri inşası.',
            unit: 'm²',
            price: 9500,
            image: 'images/services/sus-havuzu.png',
            conditions: 'Kauçuk liner ve UV filtreli pompa sistemi kullanılır.',
            taxRate: 20
        },
        {
            id: 'j19',
            name: 'Fransız Drenaj Sistemi',
            description: 'Bahçe drenajı için çakıl dolgulu delikli boru hattı tesisi.',
            unit: 'Metretül',
            price: 450,
            image: 'images/services/peyzaj_drenaj.png',
            conditions: 'Toprak altı geotekstil bohçalama yöntemi uygulanır.',
            taxRate: 20
        },
        {
            id: 'j20',
            name: 'Yetişkin Ağaç Nakli (Vinçli/Makineli)',
            description: 'Büyük ağaçların sökülerek başka bir alana taşınması.',
            unit: 'Saat',
            price: 3500,
            image: 'images/services/agac-dikimi.png',
            conditions: 'Vinç kiralama bedeli 4 saati aşan işlemlerde ek ücrete tabidir.',
            taxRate: 20
        },
        {
            id: 'j21',
            name: 'Ahşap Dek Boyama ve Koruma',
            description: 'Mevcut ahşap zeminlerin zımparalanması ve tik yağı uygulaması.',
            unit: 'm²',
            price: 250,
            image: 'assets/jobs/deck_stain.png',
            conditions: 'Eski boyanın kazınması gerekiyorsa işçilik farkı eklenir.',
            taxRate: 20
        },
        {
            id: 'j22',
            name: 'Mevsimlik Çiçeklendirme',
            description: 'Yazlık veya kışlık çiçek fidelerinin dikimi ve toprak hazırlığı.',
            unit: 'Viyol',
            price: 1200,
            image: 'assets/jobs/flower_planting.png',
            conditions: 'Viyol içeriği ortalama 45 adet fidedir.',
            taxRate: 20
        },
        {
            id: 'j23',
            name: 'Dekoratif Mıcır ve Çakıl Yollar',
            description: 'Stabilize edilmiş zemin üzerine renkli doğal çakıl serimi.',
            unit: 'm²',
            price: 350,
            image: 'assets/jobs/gravel_path.png',
            conditions: 'Alt kısma ot önleyici membran serimi dahildir.',
            taxRate: 20
        },
        {
            id: 'j24',
            name: 'Formlu Çit ve Budama (Hedging)',
            description: 'Mazı, leylandi ve şimşir gibi çit bitkilerinin profesyonel budaması.',
            unit: 'Metretül',
            price: 120,
            image: 'assets/jobs/hedging.png',
            conditions: 'Lazerli hizalama tekniği ile simetrik kesim yapılır.',
            taxRate: 20
        },
        {
            id: 'j25',
            name: 'Kışlık Bitki Koruma ve Sarma',
            description: 'Hassas bitkilerin don etkilerine karşı tela/branda ile kapatılması.',
            unit: 'Adet',
            price: 150,
            image: 'assets/jobs/winter_protection.png',
            conditions: 'Kullanılan materyal bitkinin nefes almasına imkan sağlar.',
            taxRate: 20
        },
        {
            id: 'j26',
            name: 'Kaya Bahçesi (Rockery) Oluşturma',
            description: 'Büyük kaya kütleleri ve alp bitkileri ile tematik bahçe yapımı.',
            unit: 'm²',
            price: 1200,
            image: 'assets/jobs/boulders.png',
            conditions: 'Kayaların nakliyesi ve yerleşimi proje dahilindedir.',
            taxRate: 20
        },
        {
            id: 'j27',
            name: 'Sulama Sistemi Arıza ve Onarım',
            description: 'Patlak boru, bozuk vana veya spring değişimi hizmeti.',
            unit: 'Servis',
            price: 1500,
            image: 'assets/jobs/irrigation_repair.png',
            conditions: 'Servis ücreti ilk 1 saatlik işçiliği kapsar, parça ücretleri hariçtir.',
            taxRate: 20
        },
        {
            id: 'j28',
            name: 'Bahçe Heykeli ve Odak Noktası Kurulumu',
            description: 'Sanatsal objelerin montajı ve öne çıkartıcı aydınlatması.',
            unit: 'Adet',
            price: 2500,
            image: 'assets/jobs/statue.png',
            conditions: 'Heykel kaidesi beton dökümü dahildir. Heykelin kendisi hariçtir.',
            taxRate: 20
        },
        {
            id: 'j29',
            name: 'Toprak Analizi ve Islahı',
            description: 'Toprağın pH ve besin değerlerinin ölçülerek eksiklerin tamamlanması.',
            unit: 'Numune',
            price: 2000,
            image: 'assets/jobs/pest.png',
            conditions: 'Laboratuvar sonuçlarına göre önerilecek gübreleme reçetesi dahildir.',
            taxRate: 20
        },
        {
            id: 'j30',
            name: 'Sert Zemin Yıkama ve Derz Dolgu',
            description: 'Taş yolların basınçlı suyla yıkanması ve derzlerinin yenilenmesi.',
            unit: 'm²',
            price: 180,
            image: 'assets/jobs/paving.png',
            conditions: 'Özel taş koruyucu vernik uygulaması istenirse m² başı extra ücretlendirilir.',
            taxRate: 20
        }
    ],
    products: [
        { id: 'p1', name: 'Çim Tohumu (Premium Karışım)', price: 180, unit: 'kg', description: '4 mevsim yeşil kalan, kuraklığa dayanıklı premium çim tohumu karışımı.' },
        { id: 'p2', name: 'Rulo Çim (35m² Palet)', price: 4500, unit: 'palet', description: 'Hazır yetiştirilmiş, anında yeşil görünüm sağlayan rulo çim paleti.' },
        { id: 'p3', name: 'Organik Gübre (25kg)', price: 320, unit: 'çuval', description: 'Doğal fermente edilmiş, toprak yapısını iyileştiren organik gübre.' },
        { id: 'p4', name: 'NPK Gübre 20-20-20 (25kg)', price: 480, unit: 'çuval', description: 'Dengeli besin içerikli, çim ve bitki besleme için ideal NPK gübre.' },
        { id: 'p5', name: 'Sulama Pop-up Sprinkler', price: 85, unit: 'adet', description: 'Gizlenebilir, ayarlanabilir açılı otomatik sulama başlığı.' },
        { id: 'p6', name: 'Damlama Hortumu (100m)', price: 650, unit: 'rulo', description: 'Su tasarrufu sağlayan, kök bölgesine doğrudan sulama yapan damlatıcılı hortum.' },
        { id: 'p7', name: 'Sulama Kontrol Ünitesi (4 İstasyon)', price: 1250, unit: 'adet', description: 'WiFi bağlantılı, mobil uygulama ile kontrol edilebilen zamanlayıcı.' },
        { id: 'p8', name: 'Bahçe Bordür Taşı (1m)', price: 45, unit: 'adet', description: 'Beton bazlı, çim kenarları için dekoratif bordür elemanı.' },
        { id: 'p9', name: 'Doğal Traverten Plak (40x60)', price: 180, unit: 'adet', description: 'Dış mekan yürüyüş yolları için antik patineli traverten.' },
        { id: 'p10', name: 'Granit Küp Taş (10x10)', price: 8, unit: 'adet', description: 'Yol ve meydan döşemeleri için doğal granit küp taş.' },
        { id: 'p11', name: 'Dekoratif Beyaz Çakıl (25kg)', price: 120, unit: 'çuval', description: 'Bahçe süsleme ve mülçleme için yıkanmış beyaz çakıl.' },
        { id: 'p12', name: 'Kırmızı Volkanik Taş (25kg)', price: 95, unit: 'çuval', description: 'Toprak nemini koruyan, dekoratif volkanik pomza taşı.' },
        { id: 'p13', name: 'Çam Kabuğu Mülç (70L)', price: 85, unit: 'çuval', description: 'Bitki diplerinde nem tutma ve yabani ot önleme için organik mülç.' },
        { id: 'p14', name: 'Geotekstil Keçe (100m²)', price: 750, unit: 'rulo', description: 'Ot önleyici, zemin ayırıcı geçirimli membran.' },
        { id: 'p15', name: 'Solar Bahçe Lambası', price: 180, unit: 'adet', description: 'Güneş enerjili, paslanmaz çelik gövdeli dekoratif lamba.' },
        { id: 'p16', name: 'LED Spot Armatür (5W)', price: 350, unit: 'adet', description: 'Dış mekan IP67, ağaç ve bitki aydınlatması için LED spot.' },
        { id: 'p17', name: 'Ahşap Pergola Kiti (3x4m)', price: 18500, unit: 'set', description: 'Emprenye işlemli çam ahşaptan hazır kurulum pergola seti.' },
        { id: 'p18', name: 'Sentetik Çim (35mm, m²)', price: 280, unit: 'm²', description: 'UV dayanımlı, doğal görünümlü yapay çim örtüsü.' },
        { id: 'p19', name: 'Peyzaj Teli (100m)', price: 450, unit: 'rulo', description: 'Bahçe sınırlandırma ve bitki desteği için galvaniz tel.' },
        { id: 'p20', name: 'Saksı Toprağı (50L)', price: 120, unit: 'çuval', description: 'Perlit ve torf karışımlı, havadar saksı toprağı.' },
        { id: 'p21', name: 'Humus Zenginleştirilmiş Toprak (1m³)', price: 850, unit: 'm³', description: 'Çim ve bitki dikimi için hazırlanmış verimli bahçe toprağı.' },
        { id: 'p22', name: 'PP Boru (40mm, 6m)', price: 85, unit: 'adet', description: 'Sulama sistemleri için dayanıklı polipropilen boru.' },
        { id: 'p23', name: 'PVC Elektrik Borusu (20mm, 3m)', price: 25, unit: 'adet', description: 'Dış mekan aydınlatma kablolaması için UV dayanımlı boru.' },
        { id: 'p24', name: 'Bahçe Sulama Tabancası', price: 120, unit: 'adet', description: 'Çok modlu püskürtme başlıklı ergonomik sulama tabancası.' },
        { id: 'p25', name: 'Kompast Kutusu 400L', price: 950, unit: 'adet', description: 'Bahçe atıklarını gübreye dönüştüren havalandırmalı kompast kabı.' }
    ],
    references: [
        {
            id: 'r1',
            title: 'Modern Villa Bahçesi',
            category: 'Konut',
            tags: ['j1', 'j3', 'j10', 'j7'],
            image: 'images/references/ref_villa_garden_1769570748550.png'
        },
        {
            id: 'r2',
            title: 'Şehir Parkı Düzenlemesi',
            category: 'Kamu',
            tags: ['j1', 'j2', 'j5', 'j24'],
            image: 'images/references/ref_city_park_1769570766111.png'
        },
        {
            id: 'r3',
            title: 'Lüks Havuz Başı',
            category: 'Konut',
            tags: ['j3', 'j9', 'j10', 'j18'],
            image: 'images/references/ref_luxury_pool_1769570783680.png'
        },
        {
            id: 'r4',
            title: 'Zen Meditasyon Bahçesi',
            category: 'Tasarım',
            tags: ['j3', 'j8', 'j26', 'j23'],
            image: 'images/references/ref_zen_garden_1769570799177.png'
        },
        {
            id: 'r5',
            title: 'Kurumsal Kampüs Alanı',
            category: 'Ticari',
            tags: ['j1', 'j4', 'j7', 'j11', 'j19'],
            image: 'images/references/ref_corporate_campus_1769570813051.png'
        },
        {
            id: 'r6',
            title: 'Meyve Bahçesi Bakımı',
            category: 'Tarım',
            tags: ['j5', 'j6', 'j20', 'j29'],
            image: 'images/references/ref_orchard_1769570839350.png'
        },
        {
            id: 'r7',
            title: 'Profesyonel Futbol Sahası',
            category: 'Spor',
            tags: ['j1', 'j7', 'j4', 'j16'],
            image: 'images/references/ref_football_field_1769570856489.png'
        },
        {
            id: 'r8',
            title: 'Teras Bahçe Tasarımı',
            category: 'Konut',
            tags: ['j8', 'j10', 'j6', 'j11', 'j22'],
            image: 'images/references/ref_terrace_garden_1769570871712.png'
        },
        {
            id: 'r9',
            title: 'Gece Yürüyüş Yolu',
            category: 'Tasarım',
            tags: ['j10', 'j3', 'j23', 'j30'],
            image: 'images/references/ref_night_walkway_1769570888107.png'
        },
        {
            id: 'r10',
            title: 'Arka Bahçe Yenileme',
            category: 'Konut',
            tags: ['j2', 'j7', 'j12', 'j14', 'j15'],
            image: 'images/references/ref_backyard_reno_1769570906346.png'
        },
        {
            id: 'r11',
            title: 'Otel Lobi Dikey Bahçe',
            category: 'Ticari',
            tags: ['j11', 'j8', 'j10'],
            image: 'images/references/ref_hotel_vertical_1769570932256.png'
        },
        {
            id: 'r12',
            title: 'Modern Villa Dış Mutfak',
            category: 'Konut',
            tags: ['j13', 'j12', 'j3', 'j10'],
            image: 'images/references/ref_outdoor_kitchen_1769570946772.png'
        },
        {
            id: 'r13',
            title: 'Doğal Gölet ve Şelale',
            category: 'Tasarım',
            tags: ['j18', 'j26', 'j10', 'j28'],
            image: 'images/references/ref_koi_pond_1769570963804.png'
        },
        {
            id: 'r14',
            title: 'Kolej Çocuk Oyun Alanı',
            category: 'Kamu',
            tags: ['j17', 'j19', 'j24'],
            image: 'images/references/ref_kids_playground_1769570977798.png'
        },
        {
            id: 'r15',
            title: 'Dik Yamaç Islah Projesi',
            category: 'İnşaat',
            tags: ['j15', 'j19', 'j3', 'j7'],
            image: 'images/references/ref_slope_protection_1769570993310.png'
        },
        {
            id: 'r16',
            title: 'Aydınlatmalı Palmiye Yolu',
            category: 'Tasarım',
            tags: ['j10', 'j23', 'j20'],
            image: 'images/references/ref_palm_lighting_1769571020078.png'
        },
        {
            id: 'r17',
            title: 'Minimalist Japon Bahçesi',
            category: 'Tasarım',
            tags: ['j23', 'j26', 'j8', 'j28'],
            image: 'images/references/ref_japanese_garden_1769571036308.png'
        },
        {
            id: 'r18',
            title: 'Lounge & Ateş Alanı',
            category: 'Ticari',
            tags: ['j12', 'j14', 'j10', 'j3'],
            image: 'images/references/ref_outdoor_kitchen_1769570946772.png'
        },
        {
            id: 'r19',
            title: 'AVM Meydan Düzenlemesi',
            category: 'Ticari',
            tags: ['j3', 'j4', 'j10', 'j30', 'j28'],
            image: 'images/references/ref_city_park_1769570766111.png'
        },
        {
            id: 'r20',
            title: 'Kış Bahçesi Bitkilendirme',
            category: 'Konut',
            tags: ['j22', 'j25', 'j8', 'j6'],
            image: 'images/references/ref_terrace_garden_1769570871712.png'
        }
    ],
    products: [
        { id: 'p1', name: 'Çim Tohumu (Premium Mix)', price: 450, unit: 'kg', description: '4 mevsim yeşil kalan özel karışım çim tohumu' },
        { id: 'p2', name: 'Organik Gübre (25kg)', price: 320, unit: 'çuval', description: 'Doğal sığır gübresi, kokusuz işlenmiş' },
        { id: 'p3', name: 'NPK Gübre (15-15-15)', price: 280, unit: 'çuval', description: 'Genel amaçlı mineral gübre 25kg' },
        { id: 'p4', name: 'Bahçe Toprağı', price: 150, unit: 'm³', description: 'Organik zenginleştirilmiş verimli toprak' },
        { id: 'p5', name: 'Perlit', price: 85, unit: 'torba', description: 'Havalandırma için 100L perlit' },
        { id: 'p6', name: 'Torf', price: 120, unit: 'balya', description: 'Asit seven bitkiler için torf 250L' },
        { id: 'p7', name: 'Dekoratif Çakıl (Beyaz)', price: 95, unit: 'çuval', description: '25kg yıkanmış beyaz dere çakılı' },
        { id: 'p8', name: 'Dekoratif Çakıl (Siyah)', price: 110, unit: 'çuval', description: '25kg volkanik siyah çakıl' },
        { id: 'p9', name: 'Bordo Bulamaç', price: 65, unit: 'kg', description: 'Mantar hastalıklarına karşı koruyucu' },
        { id: 'p10', name: 'Yaprak Parlatıcı Sprey', price: 45, unit: 'adet', description: '500ml yaprak parlatıcı' },
        { id: 'p11', name: 'Köklendirme Hormonu', price: 55, unit: 'adet', description: '100g toz köklendirici' },
        { id: 'p12', name: 'Damla Sulama Borusu (16mm)', price: 4.5, unit: 'mt', description: 'UV korumalı PE boru' },
        { id: 'p13', name: 'Damlatıcı (2L/h)', price: 1.2, unit: 'adet', description: 'Basınç dengeleyici damlatıcı' },
        { id: 'p14', name: 'Pop-up Sprinkler', price: 85, unit: 'adet', description: 'Hunter marka 10cm pop-up' },
        { id: 'p15', name: 'Sulama Programlayıcı', price: 650, unit: 'adet', description: '6 istasyonlu dijital timer' },
        { id: 'p16', name: 'Bahçe Bordürü (Plastik)', price: 12, unit: 'mt', description: 'Esnek plastik kenar sınırlayıcı' },
        { id: 'p17', name: 'Ahşap Sınır Çiti', price: 45, unit: 'mt', description: 'Emprenye işlenmiş çam ahşap' },
        { id: 'p18', name: 'Geotekstil Keçe', price: 8, unit: 'm²', description: '150gr yabani ot önleyici' },
        { id: 'p19', name: 'Malç (Çam Kabuğu)', price: 180, unit: 'm³', description: 'Dekoratif çam kabuğu örtüsü' },
        { id: 'p20', name: 'LED Bahçe Lambası', price: 320, unit: 'adet', description: 'Solar şarjlı IP65 lamba' },
        { id: 'p21', name: 'Yer Spot (Gömme)', price: 180, unit: 'adet', description: '3W LED paslanmaz çelik spot' },
        { id: 'p22', name: 'Lavanta Fidesi', price: 25, unit: 'adet', description: 'Kokulu İngiliz lavantası' },
        { id: 'p23', name: 'Gül Fidanı (Aşılı)', price: 75, unit: 'adet', description: 'Kırmızı kokulu gül' },
        { id: 'p24', name: 'Zeytin Ağacı (3 Yaş)', price: 450, unit: 'adet', description: 'Bodur zeytin fidanı' },
        { id: 'p25', name: 'Palmiye (Trachycarpus)', price: 850, unit: 'adet', description: '1.5m gövde boylu palmiye' }
    ],
    company: {
        name: 'İzmir Peyzaj ve Sulama LTD.ŞTİ.',
        address: 'Adalet Mah. Manas Blv. No:39 / 3408,<br>Folkart Towers B Kule, Bayraklı / İzmir',
        phone: '0532 655 07 84 (Bulut Öncü)<br>0232 388 23 45 (Ofis)',
        email: 'oncupeyzaj@gmail.com<br>info@izmirpeyzaj.com.tr',
        logo: 'logo2.png',
        logo_text: 'İZMİR PEYZAJ'
    }
};
