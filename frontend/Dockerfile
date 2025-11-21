FROM node:22-slim

WORKDIR /src

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000 24678
CMD ["npm", "run", "dev"]