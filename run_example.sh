#!/bin/sh

if [ ! -f /root/.npmrc ]; then
    echo ${NPM_TOKEN} > /root/.npmrc
fi

echo "Installing npm packages"
npm install

echo "Waiting for papiea to be ready..."
./node_modules/.bin/wait-port papiea:3000

echo "Compile typescript"
npm run build

echo "Running UI server"
npm run start_example_provider