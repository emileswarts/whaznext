# syntax=docker.io/docker/dockerfile:1

FROM node:23-alpine3.20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY ./ .
CMD npm run dev
