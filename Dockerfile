FROM  --platform=linux/amd64 node:23-alpine3.20

RUN apk add --update musl-dev gcc cargo

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY ./ .
CMD npm run dev
