# 1. IMPORTANT : On utilise "slim" (Debian), PAS "alpine"
FROM node:22-slim

# 2. Comme on est sur Debian, on peut utiliser apt-get
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

# 3. Installation
COPY package.json ./
RUN npm install

# 4. Copie du code
COPY . .

EXPOSE 1337
CMD ["npm", "run", "develop"]