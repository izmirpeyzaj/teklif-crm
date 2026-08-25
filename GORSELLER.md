# Görsel Üretim Rehberi

Sektör paketlerindeki **242 hizmetin 144 tanesinin görseli hazır**, 
**98 tanesi üretilmeyi bekliyor.** Bu dosya, hangi görselin nereye hangi adla 
konulacağını ve hangi istemle üretileceğini listeler.

## Sistem nasıl çalışıyor

- Paketlerdeki `image_url` alanı **görsel henüz üretilmemiş olsa bile** hedef dosya adını gösterir.
- Dosya yoksa uygulama `public/images/placeholder.svg` yer tutucusunu basar (`onerror`).
- **Dosyayı doğru adla klasöre koyduğun an görsel kendiliğinden görünür** — kod veya JSON değişikliği gerekmez.
- Bu yüzden dosya adları harfi harfine önemlidir; aşağıdaki adları kopyala-yapıştır kullan.

> Daha önce görseli olmayan hizmetlerde varsayılan bir **çim biçme fotoğrafı** basılıyordu.
> Peyzaj dışındaki her sektörde yanlıştı (reklam ajansının teklifinde çim fotoğrafı çıkıyordu);
> nötr yer tutucuyla değiştirildi.

## Klasör

```
public/images/services/
```

Tüm hizmet görselleri buraya. Alt klasör açma.

## Ortak stil (hepsine ekle)

Görsellerin tek bir fotoğraf kütüphanesinden çıkmış gibi durması için **her istemin sonuna**
aynı stil cümlesini ekle. Teklif belgesi içinde alt alta göründükleri için tutarlılık,
tek tek görsel kalitesinden daha çok fark ediyor:

```
professional editorial photograph, natural daylight, realistic, sharp focus, shallow depth of field, neutral colours, clean uncluttered composition, square 1:1 framing, no text, no watermark, no logos, no people looking at camera
```

## Nasıl üretilir

**Seçenek 1 — Uygulama içinden (en kolay).** Hizmetler sekmesinde hizmeti düzenle,
**"YZ ile Resim"** butonuna bas. Üretilen görsel hesabına kaydedilir. Toplu üretim için
uygun değil (günlük 15 görsel kotası var) ama tek tek düzeltmek için pratik.

**Seçenek 2 — Google AI Studio (toplu iş için).** [aistudio.google.com](https://aistudio.google.com)
→ `gemini-3.1-flash-image` modeli. Aşağıdaki konu cümlesini al, sonuna ortak stili ekle,
üret, **kare** olarak indir ve tablodaki adla klasöre koy.

Görseller teklif kağıdında yaklaşık 160×160 px basılıyor ve PDF üretilirken sunucuda
otomatik küçültülüyor. **1024×1024 fazlasıyla yeterli**, daha büyüğüne gerek yok.

## Fiyatlar hakkında

Paketlerdeki fiyatlar **başlangıç çapasıdır, piyasa araştırması değildir** —
%75'i 50'nin katı. Kullanıcı sektörünü seçtiğinde bu fiyatlarla başlar ve
gözden geçirmezse yanlış teklif gönderebilir. Görsellerden bağımsız olarak
bu listenin de belirli aralıklarla güncellenmesi gerekiyor.

---

## Üretilecek görseller

### 🔌 Elektrik Tesisatı — 3 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `elektrik_spot_lamba_montaji.png` | Spot Lamba Montajı | an electrician installing a recessed LED spot light into a plasterboard ceiling |
| `elektrik_sensorlu_aydinlatma_montaji.png` | Sensörlü Aydınlatma Montajı | a motion-sensor light fixture being mounted on an exterior wall at dusk |
| `elektrik_topraklama_tesisati.png` | Topraklama Tesisatı | a copper grounding rod and earthing cable connection in an electrical panel |

### 🚿 Su Tesisatı — 2 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `tesisat_su_kacak_tespiti.png` | Su Kaçak Tespiti | a plumber using a thermal camera to locate a hidden water leak behind a bathroom wall |
| `tesisat_termostatik_vana_montaji.png` | Termostatik Vana Montajı | a thermostatic radiator valve being fitted to a white panel radiator |

### 📐 İç Mimarlık ve Dekorasyon — 4 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `ic_mimarlik_mekanik_ve_havalandirma_projesi.png` | Mekanik ve Havalandırma Projesi | an HVAC and mechanical layout blueprint on a designer's desk with drafting tools |
| `ic_mimarlik_mobilya_ve_detay_tasarimi.png` | Mobilya ve Detay Tasarımı | a bespoke furniture design sketch beside wood and fabric samples |
| `ic_mimarlik_peyzaj_ve_dis_mekan_tasarimi.png` | Peyzaj ve Dış Mekan Tasarımı | a landscape design plan for a modern terrace with planting layout |
| `ic_mimarlik_anahtar_teslim_tadilat_yonetimi.png` | Anahtar Teslim Tadilat Yönetimi | an interior designer reviewing renovation progress on site with a clipboard |

### 💻 Yazılım ve Bilişim — 2 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `yazilim_qa_ve_otomasyon_testi.png` | QA ve Otomasyon Testi | a software tester reviewing automated test results on dual monitors |
| `yazilim_yazilim_bakim_ve_guncelleme.png` | Yazılım Bakım ve Güncelleme | a developer monitoring server health dashboards and applying updates |

### 📢 Reklam ve Dijital Pazarlama — 7 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `reklam_ajansi_kurumsal_kimlik_tasarimi.png` | Kurumsal Kimlik Tasarımı | a brand identity kit laid out flat: logo sheet, business cards, letterhead |
| `reklam_ajansi_influencer_pazarlama.png` | Influencer Pazarlama | a content creator filming a product review with a ring light and phone |
| `reklam_ajansi_e_mail_pazarlama_otomasyonu.png` | E-Mail Pazarlama Otomasyonu | an email marketing automation flow diagram on a laptop screen |
| `reklam_ajansi_halkla_iliskiler_pr_hizmeti.png` | Halkla İlişkiler (PR) Hizmeti | a press release document and journalists at a corporate press briefing |
| `reklam_ajansi_seo_icerik_stratejisi.png` | SEO İçerik Stratejisi | a keyword research and content calendar spread on a desk with a laptop |
| `reklam_ajansi_acik_hava_ooh_reklamcilik.png` | Açık Hava (OOH) Reklamcılık | a large billboard advertisement on a city street at golden hour |
| `reklam_ajansi_performans_pazarlamasi_auditi.png` | Performans Pazarlaması Auditi | an analytics dashboard showing advertising performance charts and ROI |

### 🚚 Nakliyat ve Taşımacılık — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `nakliyat_evden_eve_nakliyat_sehir_ici.png` | Evden Eve Nakliyat (Şehir İçi) | movers carrying wrapped furniture into a moving truck in front of an apartment |
| `nakliyat_sehirler_arasi_nakliyat.png` | Şehirler Arası Nakliyat | a large covered moving truck on an intercity highway at sunrise |
| `nakliyat_asansorlu_tasima_hizmeti.png` | Asansörlü Taşıma Hizmeti | an exterior furniture lift raising boxes to an upper floor balcony |
| `nakliyat_ofis_ve_isyeri_tasima.png` | Ofis ve İşyeri Taşıma | labelled crates and disassembled office desks ready for relocation |
| `nakliyat_ambalajlama_ve_paketleme.png` | Ambalajlama ve Paketleme | a mover wrapping a sofa in bubble wrap and stretch film |
| `nakliyat_mobilya_demontaj_ve_montaj.png` | Mobilya Demontaj ve Montaj | a worker assembling a wardrobe with a power screwdriver |
| `nakliyat_esya_depolama_aylik.png` | Eşya Depolama (Aylık) | a clean indoor storage warehouse with stacked labelled household crates |
| `nakliyat_piyano_kasa_tasima.png` | Piyano / Kasa Taşıma | specialists moving an upright piano with straps and a dolly |
| `nakliyat_parca_esya_tasima.png` | Parça Eşya Taşıma | a small van being loaded with a few wrapped furniture pieces |
| `nakliyat_nakliye_sigortasi.png` | Nakliye Sigortası | an insurance document and pen on a desk beside packed moving boxes |

### 🏊 Havuz Yapım ve Bakım — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `havuz_betonarme_havuz_yapimi.png` | Betonarme Havuz Yapımı | a reinforced concrete swimming pool under construction with rebar and formwork |
| `havuz_prefabrik_panel_havuz_kurulumu.png` | Prefabrik / Panel Havuz Kurulumu | workers assembling a prefabricated panel swimming pool in a garden |
| `havuz_havuz_filtrasyon_sistemi.png` | Havuz Filtrasyon Sistemi | a pool pump room with sand filter, pump and valve manifold |
| `havuz_havuz_su_isitma_isi_pompasi.png` | Havuz Su Isıtma (Isı Pompası) | a heat pump unit installed beside a swimming pool deck |
| `havuz_sualti_aydinlatma_led.png` | Sualtı Aydınlatma (LED) | an illuminated swimming pool at night with underwater LED lights |
| `havuz_havuz_kimyasal_bakimi_aylik.png` | Havuz Kimyasal Bakımı (Aylık) | a technician testing pool water chemistry with a test kit |
| `havuz_havuz_genel_temizlik_ve_kisa_hazirlik.png` | Havuz Genel Temizlik ve Kışa Hazırlık | a worker brushing an empty pool and fitting a winter cover |
| `havuz_liner_degisimi.png` | Liner Değişimi | installers fitting a new blue vinyl liner into a swimming pool |
| `havuz_havuz_otomasyon_sistemi.png` | Havuz Otomasyon Sistemi | a pool automation control panel with digital dosing display |
| `havuz_sus_havuzu_ve_selale_yapimi.png` | Süs Havuzu ve Şelale Yapımı | a decorative garden water feature with a stone waterfall |

### 🪟 PVC Doğrama ve Cam Balkon — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `dograma_pvc_pencere_imalat_ve_montaj.png` | PVC Pencere İmalat ve Montaj | installers fitting a white PVC double-glazed window into a wall opening |
| `dograma_pvc_kapi_balkon_giris.png` | PVC Kapı (Balkon/Giriş) | a modern white PVC balcony door with handle, seen from inside |
| `dograma_aluminyum_dograma.png` | Alüminyum Doğrama | slim dark aluminium window frames in a contemporary building facade |
| `dograma_cam_balkon_katlanir_sistem.png` | Cam Balkon (Katlanır Sistem) | a folding glass balcony enclosure partially open with a sea view |
| `dograma_isicamli_surme_sistem.png` | Isıcamlı Sürme Sistem | a large insulated sliding glass balcony system on a modern apartment |
| `dograma_sineklik_pileli_menteseli.png` | Sineklik (Pileli / Menteşeli) | a pleated insect screen fitted to an open window |
| `dograma_panjur_ve_stor_sistemleri.png` | Panjur ve Stor Sistemleri | exterior roller shutters half lowered on a residential window |
| `dograma_dusakabin_imalati.png` | Duşakabin İmalatı | a frameless tempered glass shower enclosure in a modern bathroom |
| `dograma_cam_ara_bolme_ofis_bolmesi.png` | Cam Ara Bölme / Ofis Bölmesi | a glass office partition wall with black frames in an open plan office |
| `dograma_dograma_sokumu_ve_nakliye.png` | Doğrama Sökümü ve Nakliye | workers removing an old window frame from a building wall |

### 🪑 Mobilya ve Mutfak İmalatı — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `mobilya_mutfak_dolabi_imalati_membran.png` | Mutfak Dolabı İmalatı (Membran) | a modern fitted kitchen with membrane-finish cabinet doors |
| `mobilya_mutfak_dolabi_lake.png` | Mutfak Dolabı (Lake) | a high-gloss lacquered kitchen cabinetry in a bright apartment |
| `mobilya_gardirop_giyinme_odasi.png` | Gardırop / Giyinme Odası | a custom built-in wardrobe with organised shelving and hanging rails |
| `mobilya_tezgah_cimstone_granit.png` | Tezgâh (Çimstone / Granit) | a quartz kitchen countertop being fitted with an undermount sink |
| `mobilya_tv_unitesi_ve_duvar_paneli.png` | TV Ünitesi ve Duvar Paneli | a modern living room TV unit with a wooden decorative wall panel |
| `mobilya_banyo_dolabi.png` | Banyo Dolabı | a moisture-resistant bathroom vanity cabinet with mirror |
| `mobilya_ofis_mobilyasi_calisma_masasi.png` | Ofis Mobilyası (Çalışma Masası) | a custom wooden office desk with drawer pedestal in a bright workspace |
| `mobilya_ahsap_merdiven_korkuluk.png` | Ahşap Merdiven / Korkuluk | a solid oak staircase with wooden handrail in a modern home |
| `mobilya_mobilya_kaplama_yenileme.png` | Mobilya Kaplama / Yenileme | a craftsman applying new foil finish to an old cabinet door |
| `mobilya_olcu_alma_ve_3d_tasarim.png` | Ölçü Alma ve 3D Tasarım | a designer measuring a kitchen wall with a laser meter beside a 3D render |

### 📸 Fotoğraf ve Video Prodüksiyon — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `fotograf_dugun_fotograf_ve_video_paketi.png` | Düğün Fotoğraf ve Video Paketi | a wedding photographer capturing a couple during the ceremony |
| `fotograf_dis_cekim_save_the_date.png` | Dış Çekim (Save the Date) | an engaged couple posing for an outdoor photo shoot at golden hour |
| `fotograf_nisan_kina_cekimi.png` | Nişan / Kına Çekimi | a photographer documenting a traditional Turkish henna night celebration |
| `fotograf_drone_ile_havadan_cekim.png` | Drone ile Havadan Çekim | a camera drone hovering above an outdoor event venue |
| `fotograf_urun_fotografi_e_ticaret.png` | Ürün Fotoğrafı (E-ticaret) | a product photography setup with softbox lights and a white sweep |
| `fotograf_kurumsal_tanitim_filmi.png` | Kurumsal Tanıtım Filmi | a film crew shooting a corporate interview with a cinema camera |
| `fotograf_etkinlik_kongre_cekimi.png` | Etkinlik / Kongre Çekimi | a photographer covering a conference presentation in a large hall |
| `fotograf_fotograf_rotus_ve_renk_duzenleme.png` | Fotoğraf Rötuş ve Renk Düzenleme | a retoucher colour grading photographs on a calibrated monitor |
| `fotograf_video_kurgu_ve_post_produksiyon.png` | Video Kurgu ve Post Prodüksiyon | a video editor working on a timeline in a dark editing suite |
| `fotograf_album_ve_baski_hizmeti.png` | Albüm ve Baskı Hizmeti | an open premium wedding photo album on a table |

### 🖨️ Matbaa ve Promosyon — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `matbaa_kartvizit_baski_kuse.png` | Kartvizit Baskı (Kuşe) | a stack of freshly printed business cards on a printing press |
| `matbaa_brosur_katalog_baski.png` | Broşür / Katalog Baskı | printed brochures and a bound catalogue fanned out on a table |
| `matbaa_afis_ve_poster_baski.png` | Afiş ve Poster Baskı | a large format printer producing a colourful poster |
| `matbaa_branda_vinil_baski.png` | Branda / Vinil Baskı | a printed vinyl banner with eyelets stretched on a frame |
| `matbaa_tabela_imalati_kutu_harf.png` | Tabela İmalatı (Kutu Harf) | illuminated channel letter signage on a shop facade at night |
| `matbaa_arac_giydirme.png` | Araç Giydirme | a van being wrapped with printed vinyl graphics in a workshop |
| `matbaa_promosyon_urun_baski_kalem_bardak.png` | Promosyon Ürün Baskı (Kalem/Bardak) | branded promotional pens and mugs arranged on a desk |
| `matbaa_tekstil_baski_tisort_yelek.png` | Tekstil Baskı (Tişört/Yelek) | a screen printing press applying a logo onto a t-shirt |
| `matbaa_etiket_ve_sticker_baski.png` | Etiket ve Sticker Baskı | a roll of die-cut printed labels coming off a machine |
| `matbaa_grafik_tasarim_hizmeti.png` | Grafik Tasarım Hizmeti | a graphic designer working on a layout on a large monitor |

### 📊 Mali Müşavirlik ve Danışmanlık — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `danismanlik_sirket_kurulus_islemleri.png` | Şirket Kuruluş İşlemleri | business registration documents and a company stamp on a desk |
| `danismanlik_aylik_muhasebe_sahis.png` | Aylık Muhasebe (Şahıs) | an accountant reviewing ledgers and invoices at a tidy desk |
| `danismanlik_aylik_muhasebe_limited_a_s.png` | Aylık Muhasebe (Limited/A.Ş.) | a corporate accounting team reviewing financial statements in a meeting |
| `danismanlik_bordro_ve_sgk_islemleri.png` | Bordro ve SGK İşlemleri | payroll spreadsheets and social security forms on a desk |
| `danismanlik_kdv_kurumlar_vergisi_beyannamesi.png` | KDV / Kurumlar Vergisi Beyannamesi | a tax declaration form being completed on a computer |
| `danismanlik_mali_rapor_ve_butce_analizi.png` | Mali Rapor ve Bütçe Analizi | financial charts and a cash flow report on a desk with a calculator |
| `danismanlik_tesvik_ve_hibe_danismanligi.png` | Teşvik ve Hibe Danışmanlığı | a consultant presenting a grant application plan to business owners |
| `danismanlik_vergi_denetim_ve_uzlasma_destegi.png` | Vergi Denetim ve Uzlaşma Desteği | a formal meeting across a table with tax documents and folders |
| `danismanlik_kvkk_uyum_danismanligi.png` | KVKK Uyum Danışmanlığı | a data protection compliance checklist and privacy policy documents |
| `danismanlik_is_plani_ve_fizibilite_raporu.png` | İş Planı ve Fizibilite Raporu | a printed business plan with financial projections and charts |

### 🧯 Yangın ve Asansör Sistemleri — 10 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
| `yangin_asansor_yangin_algilama_sistemi_kurulumu.png` | Yangın Algılama Sistemi Kurulumu | a technician installing a smoke detector on an office ceiling |
| `yangin_asansor_yangin_sondurme_tupu_dolumu.png` | Yangın Söndürme Tüpü Dolumu | red fire extinguishers lined up for servicing and refilling |
| `yangin_asansor_sprinkler_sistemi_montaji.png` | Sprinkler Sistemi Montajı | ceiling fire sprinkler heads on exposed red piping in a warehouse |
| `yangin_asansor_yangin_dolabi_ve_hidrant.png` | Yangın Dolabı ve Hidrant | a wall-mounted fire hose cabinet and outdoor hydrant |
| `yangin_asansor_yangin_pompa_grubu.png` | Yangın Pompa Grubu | a fire pump room with red pumps and control panel |
| `yangin_asansor_duman_tahliye_ve_basinclandirma.png` | Duman Tahliye ve Basınçlandırma | a stairwell pressurisation fan unit in a building service room |
| `yangin_asansor_asansor_montaji_yolcu.png` | Asansör Montajı (Yolcu) | technicians installing a passenger elevator cabin in a shaft |
| `yangin_asansor_asansor_periyodik_bakim.png` | Asansör Periyodik Bakım | an elevator technician servicing machinery with a checklist |
| `yangin_asansor_asansor_revizyon_modernizasyon.png` | Asansör Revizyon / Modernizasyon | a modernised elevator control cabinet with new wiring |
| `yangin_asansor_yillik_kontrol_ve_etiketleme.png` | Yıllık Kontrol ve Etiketleme | an inspector attaching a safety inspection label inside an elevator |

---

## Kontrol

Hangi görsellerin hâlâ eksik olduğunu görmek için proje kökünde:

```bash
node -e "const fs=require('fs'),p=require('path');const d=JSON.parse(fs.readFileSync('services/service-packs.json','utf8'));let y=0;for(const k of d.packs)for(const s of k.services){const r=(s.image_url||'').replace(/^\//,'');if(!fs.existsSync(p.join('public',r))){y++;console.log(k.id,'->',r)}}console.log('eksik:',y)" 
```

Çıktı boşsa hepsi tamam.

## Yeni sektör eklerken

1. `services/service-packs.json` içine paketi ekle.
2. Her hizmetin `image_url` alanını `/images/services/<paket_id>_<hizmet_slug>.png` biçiminde ver —
   görsel henüz yokken bile. Yer tutucu devreye girer.
3. Bu dosyayı yeniden üret, yeni satırlar tabloya eklensin.
4. Görselleri üretip klasöre koy.
