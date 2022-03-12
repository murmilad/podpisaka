# Using
## Two images folders?
Why you have two separate PHOTO and GALLERY folders
* PHOTO folder for all your photo in HI res
* GALLERY folder for gallery photo only. And only that photos will in Polpisaka application
## Images folder
* every image has unique name
* make folder 'res*ume'
* images folders structure inside 'resume'
    * <Album #1 name>
        * <Image #1>
        * <Image #2>
    * <Album #2 name>
        * <Image #3>
        * <Image #4>
        * <...>
## Setup server
* checkout server
* configure .env
    * set GALLERY_PATH wirh your GALLERY folder path
    * set PHOTO_PATH wirh your PHOTO folder path (set GALLERY folder if not exists)
    * build and start server
```bash
cd server; docker-compose build; docker-compose up -d
```
## Use the application
* setup your server connection
<img src="https://github.com/murmilad/podpisaka/blob/master/images/password.png?raw=true" style="width:300px;"/>
* login to your server 
<img src="https://github.com/murmilad/podpisaka/blob/master/images/login.png?raw=true" style="width:300px;"/>
* lookup your gallery 
<img src="https://github.com/murmilad/podpisaka/blob/master/images/gallery.png?raw=true" style="width:300px;"/>
* navigate your album 
<img src="https://github.com/murmilad/podpisaka/blob/master/images/album.png?raw=true" style="width:300px;"/>
* look your image 
<img src="https://github.com/murmilad/podpisaka/blob/master/images/art.png?raw=true" style="width:300px;"/>
* sign your image 
<img src="https://github.com/murmilad/podpisaka/blob/master/images/sign.png?raw=true" style="width:300px;"/>

## Here you have an resume.txt with your signs for your pleasure

# Other
## Local building
https://docs.expo.dev/classic/turtle-cli/