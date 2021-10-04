FROM node:16.10.0

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt install -y --no-install-recommends \
    git yarn \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* 

WORKDIR /app

RUN git clone https://github.com/yasudakn/column-name-auto-generator.git

RUN cd /app/column-name-auto-generator && yarn add react-scripts typescript && yarn build

WORKDIR /app/column-name-auto-generator

ENTRYPOINT [ "yarn", "start" ]
