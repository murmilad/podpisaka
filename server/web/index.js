
const express = require('express')
const bodyParser = require('body-parser')
const { exec } = require('child_process')
const sizeOf = require('image-size')
const checksum = require("json-checksum")
const dirTree = require('directory-tree');

const PORT = process.env.PORT || 8000

const GALLERY_PATH = '/usr/src/podpisaka/gallery'
const PHOTO_PATH = '/usr/src/podpisaka/photo'
const RESUME_FOLDER = 'resume'
const RESUME_FILE = 'resume.txt'

var fs = require('fs');
var { parse } = require('csv-parse');
var { stringify } = require('csv-stringify');

const { Client } = require('pg')
const client = new Client({
  user: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: 'gallery',
  password: 'postgres',
  port: process.env.DB_PORT || 5559,
})

// Touch file
const time = new Date();

try {
  fs.utimesSync(GALLERY_PATH + '/' + RESUME_FOLDER + '/' + RESUME_FILE, time, time);
} catch (err) {
  fs.closeSync(fs.openSync(GALLERY_PATH + '/' + RESUME_FOLDER + '/' + RESUME_FILE, 'w'));
}

var photoPaths = {}

const tree = dirTree(PHOTO_PATH, {extensions:/\.(jpg|jpeg|png|gif)$/}, (item) => {
  photoPaths[item.name] = item.path;
});


var parser = parse({
  columns: true,
  delimiter: '|',
  quote :'`',
  columns: ['name', 'resume', 'ignored']
}, async function (err, records)  {
  if (err){
    console.error('Parsing file: '+GALLERY_PATH + '/' + RESUME_FOLDER + '/' + RESUME_FILE+' error:' + err);
    process.exit(1);
  }
  //console.log('records:' + JSON.stringify(records));

  await client.connect()

  //sync resume file
  await client.query(`
    WITH
      source_data AS (
        SELECT j->>'name' AS name,
              j->>'resume' AS resume,
              (CASE WHEN j->>'ignored' = '1' THEN true ELSE false END)::BOOLEAN AS ignored
        FROM JSON_ARRAY_ELEMENTS($1::JSON) j
      ),
      updated AS (
        UPDATE resume
        SET resume = s.resume,
            ignored = s.ignored
        FROM source_data s
        WHERE resume.name = s.name
        RETURNING resume.name
      )
    INSERT INTO resume
    SELECT name, resume, ignored
    FROM source_data s
    WHERE s.name NOT IN (SELECT name FROM updated);`,
    [JSON.stringify(records)]
  )
  let table_json = await client.query('SELECT * FROM resume');

  console.log(`Checksum ` + checksum(table_json.rows))  
  await client.query('UPDATE resume_checksum SET table_checksum = $1, file_checksum = $1', [checksum(table_json.rows)]) 

  const app = express()
  app.use(bodyParser.json())

  // Login

  // usernames are keys and passwords are values
  const users = {
    username: 'password',
  }

  app.post('/login', (req, res) => {
    const {username, password} = req.body

    if (!username || !password) return res.status(400).send('Missing username or password')
    // in practice, this is potentially revealing too much information.
    // an attacker can probe the server to find all of the usernames.
    if (!users[username]) return res.status(403).send('User does not exist')
    if (users[username] !== password) return res.status(403).send('Incorrect password')
    return res.json({token:'thisIsARealToken'})
  })

  app.get('/check', (req, res) =>  {

    return res.json({result:'ok'})
  })


  // Gallery

  app.get('/gallery',async (req, res) =>  {


    let albumPath = GALLERY_PATH + '/' + RESUME_FOLDER
    let gallery = []
    let resume = {}
    let foundResume  = await client.query('SELECT * FROM resume')
    foundResume.rows.forEach(item => resume[item.name] = item)

    fs.readdirSync(albumPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort().reverse()
      .forEach(main_folder => {

        let imageCount = 0;
        let signedImageCount = 0;
        let thumbnails = [];
        fs.readdirSync(albumPath + '/' + main_folder, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
          .forEach(folder => {

            fs.readdirSync(albumPath + '/' + main_folder + '/' + folder)
              .forEach(file => {
                thumbnails.push(file)

                if (resume[file] && (resume[file].resume || resume[file].ignored)) signedImageCount++
                imageCount++
              })
          })

        let albumData = {}
        console.log('found imageCount ' + imageCount )


        albumData.thumbnail_name = thumbnails
        albumData.name = main_folder
        albumData.header = main_folder.replace(/^\w+_/,'').replaceAll(/-/g,' ')
        albumData.imageCount = imageCount
        albumData.unsignedImageCount = imageCount - signedImageCount
        gallery.push(albumData)


      })

    return res.json(gallery)
  })


  // Album

  app.get('/album/:album', async (req, res) => {
    
    let resume = {}
    let foundResume  = await client.query('SELECT * FROM resume')
    foundResume.rows.forEach(item => resume[item.name] = item)

    if (!req.params.album) return res.status(400).send('Missing album')

    
    let albumPath = GALLERY_PATH + '/' + RESUME_FOLDER + '/' + req.params.album;
    let albumList = [];
    fs.readdirSync(albumPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .forEach(folder => {

        fs.readdirSync(albumPath + '/' + folder).forEach(async file =>  {

          let imageData = {}

          imageData.thumbnail_name = file
          imageData.name = file
          imageData.albumName = req.params.album
          imageData.imageName = file
          imageData.resume = resume[file] ? resume[file].resume : undefined
          imageData.ignored = resume[file] ? resume[file].ignored : undefined
          albumList.push(imageData)
        })
    })

    return res.json(albumList)
  })

  // Image

  app.get('/album/:album/image/:image',  (req, res) => {
    

    if (!req.params.album) return res.status(400).send('Missing album')
    if (!req.params.image) return res.status(400).send('Missing image')


    let albumPath = GALLERY_PATH + '/' + RESUME_FOLDER + '/' + req.params.album;

    let file = req.params.image
    let imageData = {}
    fs.readdirSync(albumPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .forEach(folder => {

        if (fs.existsSync(albumPath + '/' + folder + '/' + file)) {
          let bitmap = fs.readFileSync(albumPath + '/' + folder + '/' + file)
          let dimensions = sizeOf(albumPath + '/' + folder + '/' + file)

          imageData.thumbnail = Buffer.from(bitmap).toString('base64')
          imageData.width = dimensions.width
          imageData.height = dimensions.height
          imageData.name = file
        }
    })

    return res.json(imageData)
  })

  // Art

  app.get('/album/:album/art/:art', async (req, res) => {
    

    if (!req.params.album) return res.status(400).send('Missing album')
    if (!req.params.art) return res.status(400).send('Missing art')


    let albumPath = GALLERY_PATH + '/' + RESUME_FOLDER + '/' + req.params.album;

    let file = req.params.art
    let foundResume  = await client.query('SELECT * FROM resume WHERE name = $1', [file])
    let imageData = {}
    fs.readdirSync(albumPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .forEach(folder => {

        if (fs.existsSync(albumPath + '/' + folder + '/' + file)) {
          let bitmap;
          let dimensions;
          if (photoPaths[file]) {
            bitmap = fs.readFileSync(photoPaths[file])
            dimensions = sizeOf(photoPaths[file])
          } else {
            bitmap = fs.readFileSync(albumPath + '/' + folder + '/' + file)
            dimensions = sizeOf(albumPath + '/' + folder + '/' + file)
          }

          imageData.image = Buffer.from(bitmap).toString('base64')
          imageData.size = {width: dimensions.width, height: dimensions.height}
          imageData.name = file
          imageData.resume = (foundResume.rows.length > 0 && foundResume.rows[0].resume) ? foundResume.rows[0].resume.replace(/\\"/g, '"') : undefined
          imageData.ignored = foundResume.rows.length  > 0 ? foundResume.rows[0].ignored : undefined
        }
    })

    return res.json(imageData)
  })
  
  app.post('/art/set', async (req, res) => {
    const {albumName, imageName, resume, ignored} = req.body

    if (!albumName || !imageName) return res.status(400).send('Missing albumName or imageName')

    console.log(`Set `, {name: imageName, resume: resume, ignored: ignored ? 1 : 0})  

    let foundResume = await client.query('SELECT * FROM resume WHERE name = $1', [imageName])
    if (foundResume.rows.length > 0) {
      
      await client.query('UPDATE resume SET resume = $2, ignored = $3 WHERE name = $1', [imageName, resume ? resume : '', ignored ? true : false])
    } else {
      await client.query('INSERT INTO resume(name, resume, ignored) VALUES($1, $2, $3)', [imageName, resume ? resume : '', ignored ? true : false])
    }

    return res.json({status: 'ok'});
  })


  setInterval(async function(){
    let table_checksum = await client.query('SELECT table_checksum FROM resume_checksum');
    let table_json = await client.query('SELECT * FROM resume');
    if (table_checksum.rows[0].table_checksum !== checksum(table_json.rows)) {
      await client.query('UPDATE resume_checksum SET table_checksum = $1', [checksum(table_json.rows)])
      stringify(table_json.rows, {
        header: false,
        quote :'`',
        delimiter: '|',
        columns: ['name', 'resume', 'ignored'],
        cast: {
          boolean: value => value ? '1': '0'
        }
      }, function (err, output) {
          fs.writeFile(GALLERY_PATH + '/' + RESUME_FOLDER + '/' + RESUME_FILE, output, function (err) {
            if (err) {
                return console.log(err);
            }
            console.log("File saved successfully!");
        });
      })
    }

  }, 1000 * 60 * 10);

  // catch 404
  app.use((req, res, next) => {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
  })

  app.use((err, req, res, next) => res.status(err.status || 500).send(err.message || 'There was a problem'))

  const server = app.listen(PORT)
  console.log(`Listening at http://localhost:${PORT}`)  
})

fs.createReadStream(GALLERY_PATH + '/' + RESUME_FOLDER + '/' + RESUME_FILE).pipe(parser);

process.on('SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  // some other closing procedures go here
  exec('npm stop');
  process.exit(0);
});
