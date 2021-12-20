FROM node:16.10.0

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt install -y --no-install-recommends \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* 

COPY ./ /app/column-name-auto-generator

COPY ./.env /app/column-name-auto-generator/server

WORKDIR /app/column-name-auto-generator/server

RUN npm i typescript && npm i

ENTRYPOINT [ "npm", "run", "start" ]