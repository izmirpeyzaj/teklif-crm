# Node 20+ zorunlu: better-sqlite3 12.x engines alani 18'i desteklemiyor
# (node:18 ile npm install derleme asamasinda hata veriyor). 22 = aktif LTS.
FROM node:22-slim

# better-sqlite3 derleme araçları + Puppeteer için sistem Chromium'u ve fontlar
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    chromium \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer kendi Chromium'unu indirmesin; sistemdekini kullan
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Sadece package dosyalarını kopyala (cache için)
COPY package*.json ./

# Bağımlılıkları kur (temiz bir kurulum ve derleme yap)
RUN npm install

# Kaynak kodun tamamını kopyala
COPY . .

# Hangi surumun yayinda oldugunu sunucunun kendisi soylesin.
#
# Gerekce: /api/health 200 donuyor olmasi yeni kodun yayinda oldugu anlamina
# gelmiyor — derleme basarisiz olursa eski kap hizmet vermeye devam eder ve
# saglik kontrolu yine "ok" der. 25 Agustos 2026'da 15 dakika boyunca eski kod
# servis edildi ve bu fark edilmedi. Artik /api/health icindeki commit degeri
# hangi kodun calistigini kesin soyluyor.
#
# Coolify derleme sirasinda SOURCE_COMMIT'i saglar; baska bir ortamda derlenirse
# deger bos kalir ve saglik ciktisinda 'bilinmiyor' gorunur (zarari yok).
ARG SOURCE_COMMIT=""
ENV SOURCE_COMMIT=$SOURCE_COMMIT

# Portu ayarla
ENV PORT=3000
EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"]
