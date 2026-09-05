# Görsel Üretim Rehberi

Sektör paketlerindeki **242 hizmetin 242 tanesinin görseli hazır**, 
**0 eksik.** Bu dosya, referans istemleri ve üretim kurallarını listeler.

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

### 🖨️ Matbaa ve Promosyon — 7 görsel

| Dosya adı | Hizmet | İstem (konu) |
|---|---|---|
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
