FROM node:16.10.0

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt install -y --no-install-recommends \
    git yarn \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* 

COPY ./ /app/column-name-auto-generator

WORKDIR /app/column-name-auto-generator/server

RUN yarn add typescript && npm install

ENTRYPOINT [ "yarn", "start" ]