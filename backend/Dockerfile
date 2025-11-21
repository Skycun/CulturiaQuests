FROM node:22-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    autoconf \
    automake \
    zlib1g-dev \
    libpng-dev \
    nasm \
    bash \
    libvips-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# ✅ Copier package.json ET package-lock.json
COPY package*.json ./

# ✅ Utiliser npm ci pour une installation plus rapide
RUN npm ci

COPY . .

EXPOSE 1337
CMD ["npm", "run", "develop"]