FROM node:22-slim

WORKDIR /src

# On copie uniquement le package.json d'abord
COPY package.json ./

# On lance l'installation
RUN npm install

# Ensuite on copie le reste des fichiers
COPY . .

EXPOSE 3000 24678
CMD ["npm", "run", "dev"]