FROM node:16.11.1

# Create app directory
WORKDIR /usr/src/podpisaka

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 8000

CMD ["node", "index.js"]
#  "start": "sudo mount -v nt-t nfs -o vers=4.0 192.168.1.65:/tmp/gfgallery /home/alex/git/podpisaka/server/gallery;node index.js;",
# "stop": "sudo umount /home/alex/git/podpisaka/server/gallery",
 