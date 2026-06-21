FROM node:18-slim

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

# Portu ayarla
ENV PORT=3000
EXPOSE 3000

# Uygulamayı başlat
CMD ["npm", "start"]
