var myApp,
    url = 'http://accordapp.com/',
    church_id = 3,
    mediaPlayer,
    playTimer,
    auth_token = localStorage.getItem('auth_token'),
    username = localStorage.getItem('username'),
    params,
    elapsedTime = 0,
    playingItem,
    mainView;

window.addEventListener("load", function () {
    window.loaded = true;
});
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
$(document).ready(function() {
    document.addEventListener("deviceready", startSetup, false);
});

function startSetup() {
    try {
        var device_id = device.uuid;
    }
    catch (e) {
        console.log(e);
        var device_id = false;
    }
    if (!username) {
        if (device_id) {
            console.log('updating username to device id');
            username = device_id;
        }
        else {
            console.log('creating username guid');
            username = guid();
        }
    }
    if (!auth_token) {
        password = guid();
        console.log(username, device_id);
        $.ajax({
            url: url + 'account/',
            method: 'PUT',
            dataType: 'json',
            data: {
                'username': username,
                'password': password
            },
            success: function(response) {
                console.log('response', response.username, 'local', username);
                auth_token = response.auth_token;
                localStorage.setItem('auth_token', auth_token);
                localStorage.setItem('username', response.username);
                localStorage.setItem('user_id', response.pk);
            },
            error: function(response) {
                console.log(response);
            }
        });
    }
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            xhr.setRequestHeader('Authorization', 'Token '+auth_token);
        }
    });
    
    if(device_id && username != device_id) {
        username = device_id;
        $.ajax({
            url: url+'account/',
            method: 'POST',
            dataType: 'json',
            data: {
                'username': username,
            },
            success: function(response) {
                localStorage.setItem('username', response.username);
            },
            error: function(response) {
                console.log(response);
            },
        });
    }
    
    // write log to console
    ImgCache.options.debug = true;
    // increase allocated space on Chrome to 50MB, default was 10MB
    ImgCache.options.chromeQuota = 50*1024*1024;
    //load pages
    checkModified();
}
function checkModified() {
    $.ajax({
        url: url+'modified/'+ church_id +'/',
        crossDomain: true,
        dataType: 'json',
        success: function(data) {
            var saved = localStorage.cacheModified,
                modified = new Date(data.modified);
            if (localStorage.cacheModified === undefined || localStorage.pages === undefined || saved != modified) {
                loadPages(modified);
            }
            else {
                renderPages(JSON.parse(localStorage.pages));
            }
        }
    });
}

function loadPages(modified) {
    $.ajax({
        url: url+'api/'+ church_id +'/',
        crossDomain: true,
        dataType: 'json',
        success: function(data) {
            renderPages(data);
        }
    });
}

function renderPages(data) {
    var pageData = data;
    $.each(pageData.pages, function(index){
        $('div.pages').append(this.content);
        var link = $('<a href="#'+slugify(this.title)+'" class="no-animation">'+this.title+'</a>')
        $('.toolbar-inner').append(link)
        link.click(function(){
            $('.active').removeClass('active');
            $(this).addClass('active');
        });
        if (index == 0) {
            link.addClass('active');
        }
    });
   
    ImgCache.init(function () {
        console.log('ImgCache init: success!');
        $('img').not('.noCache').each(function() {
            var image = $(this);
            ImgCache.isCached(image.attr('src'), function(path, success) {
              if (success) {
                // already cached
                console.log('loading cached image');
                ImgCache.useCachedFile(image);
              } else {
                // not there, need to cache the image
                ImgCache.cacheFile(image.attr('src'), function () {
                    console.log('caching image');
                  ImgCache.useCachedFile(image);
                });
              }
            });
        });
    }, function () {
        console.error('ImgCache init: error! Check the log for errors');
    });
    
    get_bible();
    setup();
}

function loadInsta() {
    if (localStorage.cacheExpires === undefined || localStorage.instaFeed === undefined || new Date(localStorage.cacheExpires) <= new Date()) {
        $.ajax({
            url: 'https://www.instagram.com/loveworks2016/media/',
            success: function(data) {
                renderInsta(data);
                var expires = new Date();
                expires.setDate(expires.getDate() + 1); 
                localStorage.setItem('cacheExpires', expires);
                localStorage.setItem('instaFeed', JSON.stringify(data));
            }
        });   
    }
    else {
        renderInsta(JSON.parse(localStorage.instaFeed));
    }
}

function renderInsta(data) {
    var instaData = data;
    ImgCache.init(function () {
        console.log('ImgCache init: success!');
        $.each(instaData.items, function(index) {
            var item = this,
            image = $('<img src="'+item.images.low_resolution.url+'" />');
            ImgCache.isCached(image.attr('src'), function(path, success) {
              if (success) {
                // already cached
                ImgCache.useCachedFile(image);
              } else {
                // not there, need to cache the image
                ImgCache.cacheFile(image.attr('src'), function () {
                  ImgCache.useCachedFile(image);
                });
              }
            });
            $('.instafeed').append(image);
        });

    }, function () {
        console.error('ImgCache init: error! Check the log for errors');
    });
    setup();
}

function setup() {
    try {
        window.plugins.headerColor.tint("#232323");
    }
    catch(e) {}
    // Initialize your app
    myApp = new Framework7({
        animatePages: true
    });
    // Export selectors engine
    var $$ = Dom7;
    $$(document).on('ajaxStart', function(e){
       var xhr = e.detail.xhr;
       xhr.setRequestHeader('Authorization', 'Token '+auth_token);
    });
    // Add view
    mainView = myApp.addView('.view-main', {
        domCache: true //enable inline pages
    });
    if (!localStorage.getItem('login_finished')) {
        myApp.loginScreen('.login-screen', true);
    }
    $$('.login-skip').click(function() {
        if ($$('#disable-login').val())
            localStorage.setItem('login_finished', true);
        myApp.closeModal('.login-screen', true);
    });
    $('#login-save').click(function() {
        var first_name = $('#first_name').val(),
            last_name = $('#last_name').val();
        if (first_name && last_name) {
            $.ajax({
                url: url+'account/',
                method: 'POST',
                dataType: 'json',
                data: {
                    'first_name': first_name,
                    'last_name': last_name,
                },
                success: function(response) {
                    localStorage.setItem('login_finished', true);
                    myApp.closeModal('.login-screen', true);
                },
                error: function(response) {
                    console.log(response);
                },
            });
        }
    });
    ga('create', 'UA-85602316-1', {
        'storage': 'none',
        'clientId':device.uuid
    });
    ga('set','checkProtocolTask',null);
    ga('set','checkStorageTask',null);
    myApp.onPageInit('*', function (page) {
        ga('set', 'page', page.name);
        ga('send', 'pageview');
    });
    $$('body').on('beforeSubmit', '.ajax-submit', function(e) {
        myApp.showPreloader('Submitting');
    });
    $$('body').on('submit', '.ajax-submit', function(e) {
        // Required attribute HTML5 info http://stackoverflow.com/a/25010485 
        var missingMessages = [];
        $$('form [required]').each(function(key, value) {
            trimmedVal = $$(this).val().replace(/^\s+|\s+$/g, '');
            if (trimmedVal === '') {
                missingMessages.push($$(this).attr('placeholder') + ' is required.');
            }
        })
        if (missingMessages.length !== 0) {
            myApp.alert(missingMessages.join('<br/>'), '');
            event.preventDefault();
            event.stopPropagation();
        }
    });
    $$('body').on('submitted', '.ajax-submit', function (e) {
      var xhr = e.detail.xhr; // actual XHR object
      var data = JSON.parse(e.detail.data); // Ajax response from action file
        ga('send', 'event', 'App', 'Form Submit', $(this).find('#id_form').val());
      if(data.success) {
          $(this).html('<p>Thanks for contacting us!</p>')
      }
      else {
          console.log(data);
      }
      myApp.hidePreloader();
    });
    $$('body').on('submitError', '.ajax-submit', function (e) {
      var xhr = e.detail.xhr; // actual XHR object
      var data = e.detail.data; // Ajax response from action file
      // do something with response data
        myApp.alert('There was a problem submitting this form.', '');
        myApp.hidePreloader();
    });
    $$('body').on('opened', '*', function() {
        var item = $$(this),
            container = $$('.page-on-center .page-content');
        container.scrollTop(item.offset().top + container.scrollTop(), 300);
    });
	var position = "center";
	var lastPosition = "center";
	var contentCSS = "";
	var body = $(".background-block");
	var content = $(".foreground-block");
	window.suspendAnimation = false;
	 
	var xMovement = 15;
	var yMovement = 40;
	var halfX = xMovement/2;
	var halfY = yMovement/2;
	 
	window.ondeviceorientation = function(event) {
	 var gamma = event.gamma/90;
	 var beta = event.beta/180;
	 
	 var temp = 0;
	 
	 //fix for holding the device upside down
	 if ( gamma >= 1 ) {
	  gamma = 2- gamma;
	 } else if ( gamma <= -1) {
	  gamma = -2 - gamma;
	 }
	 
	 // update positions to be used for CSS
	 var yPosition = -yMovement - (beta * yMovement);
	 var xPosition = -xMovement - (gamma * xMovement);
	 var contentX = (-xMovement - xPosition)/2;
	 var contentY = (-yMovement - yPosition)/2;
	 
	 // generate css styles
	 position = "translate3d( " + (contentX.toFixed(1) * -1) + "px, " + (contentY.toFixed(1) * -1) + "px, " + " 0px)";
	 contentCSS = "translate3d( " + (contentX.toFixed(1)) + "px, " + (contentY.toFixed(1)) + "px, " + " 0px)";
	}
	 
	function updateBackground() {
	 
	 if (!window.suspendAnimation) {
	  if ( position.valueOf() != lastPosition.valueOf() ) {	 
	   body.css( "-webkit-transform", position);
	   content.css( "-webkit-transform", contentCSS);
	   lastPosition = position;
	  }
	 } else {
	  lastPosition = "translate3d(0px, 0px, 0px)";;
	 }
	 
	 window.requestAnimationFrame(updateBackground);
	}
	 
	window.requestAnimationFrame(updateBackground);
    (function listen () {
	    if (window.loaded) {
            try {
                navigator.splashscreen.hide();
            }
            catch(e) {
                console.log(e);
            }
	    } else {
		window.setTimeout(listen, 50);
	    }
	})();
    
    function events(action) {
        switch(action) {
            case 'music-controls-pause':
                mediaPlayer.pause();
                $('.playing').addClass('paused').removeClass('playing');
                MusicControls.updateIsPlaying(false);
                clearInterval(playTimer);
                break;
            case 'music-controls-play':
                mediaPlayer.play();
                $('.paused').addClass('playing').removeClass('paused');
                MusicControls.updateIsPlaying(true);
                playTimer = setInterval(function() {
                    start_play_timer();
                }, 1000);
                break;
            case 'music-controls-destroy':
                destroy_media_player();
                break;
            default:
                break;
        }
    }

    // Register callback
    MusicControls.subscribe(events);

    // Start listening for events
    // The plugin will run the events function each time an event is fired
    MusicControls.listen();

    function start_play_timer() {
        mediaPlayer.getCurrentPosition(function(position){
            elapsedTime = position;
        });
        params[5] = elapsedTime;
        window.remoteControls.updateMetas(function(success){
            //console.log(success);
        }, function(fail){
            //console.log(fail);
        }, params);
    }
    function create_music_controls() {
        var artist = "Fairfield West Baptist Church",
            title = playingItem.attr("data-title"),
            album = "Sermons",
            image = playingItem.parent().parent().parent().parent().find('img').attr("src"),
            duration = -1,
            counter = 0;
        mediaPlayer.getCurrentPosition(function(position){
            elapsedTime = position;
        });

        MusicControls.create({
            track: title,
            artist: artist,
            cover: image,
            isPlaying: true,
            dismissable: false,
            // hide previous/next/close buttons:
            hasPrev: false,
            hasNext: false,
            duration: duration,
            elapsed: elapsedTime,
            // Android only, optional
            // text displayed in the status bar when the notification (and the ticker) are updated
            ticker: 'Now playing ' + title
        });
        
        params = [artist, title, album, image, duration, elapsedTime];
        var timerDur = setInterval(function() {
            counter = counter + 100;
            if (counter > 2000) {
                clearInterval(timerDur);
            }
            var dur = mediaPlayer.getDuration();
            if (dur > 0) {
                clearInterval(timerDur);
                duration = dur;
                params[4] = dur;
            }
        }, 100);
        playTimer = setInterval(function() {
            start_play_timer();
        }, 1000);
    }

    function create_media_player(item) {
        var media_url = item.attr('href');
        playingItem = item;
        mediaPlayer = new Media(media_url);
        mediaPlayer.play();
        item.addClass('playing');

        create_music_controls();
        
        document.addEventListener('pause', create_music_controls, false);

        document.addEventListener("remote-event", function(event) {
            console.log(event);
            switch (event.remoteEvent.subtype) {
                case 'pause':
                    mediaPlayer.pause();
                    $('.playing').addClass('paused').removeClass('playing');
                    clearInterval(playTimer);
                    break;
                case 'play':
                    mediaPlayer.play();
                    $('.paused').addClass('playing').removeClass('paused');
                    playTimer = setInterval(function() {
                        start_play_timer();
                    }, 1000);
                    break;
                default:
                    break;
            }
        })
    }

    function destroy_media_player(){
        console.log('destroying');
        clearInterval(playTimer);
        elapsedTime = 0;
        $('.playing').removeClass('playing');
        $('paused').removeClass('paused');
        MusicControls.destroy();
        mediaPlayer.stop();
        mediaPlayer.release();
        document.removeEventListener('pause', create_music_controls, false);
    }
    
    $('.playSermon').click(function(e) {
        e.preventDefault();
        item = $(this);
        if (item.hasClass('playing')) {
            mediaPlayer.pause();
            item.addClass('paused').removeClass('playing');
            MusicControls.updateIsPlaying(false);
            playTimer = setInterval(function() {
                start_play_timer();
            }, 1000);
        }
        else if (item.hasClass('paused')) {
            mediaPlayer.play();
            item.addClass('playing').removeClass('paused');
            MusicControls.updateIsPlaying(true);
            clearInterval(playTimer);
        }
        else if (typeof mediaPlayer !== "undefined") {
            destroy_media_player();
            create_media_player(item);
        }
        else {  
            create_media_player(item);
        }
    });
    
    var editor = new wysihtml.Editor('editor', {
        toolbar: 'toolbar',
        parserRules:  wysihtmlParserRules
    });
    
    setupNotifications();
}

function setupNotifications() {
    console.log('calling push init');
    var push = PushNotification.init({
        "android": {
            "senderID": "663980513133"
        },
        "browser": {},
        "ios": {
            "sound": true,
            "vibration": true,
            "badge": true
        },
        "windows": {}
    });
    console.log('after init');

    push.on('registration', function(data) {
        var oldRegId = localStorage.getItem('registrationId');
        if (oldRegId !== data.registrationId) {
            var push_url = url+'device/gcm/';
            // Save new registration ID
            localStorage.setItem('registrationId', data.registrationId);
            // Post registrationId to your app server as the value has changed
            if (device.platform == 'iOS') {
                push_url = url+'device/apns/';
            }
            $.ajax({
                url: push_url,
                method: 'POST',
                dataType: 'json',
                data: {
                    'device_id': username,
                    'registration_id': data.registrationId,
                    'active': true
                },
                success: function(data) {
                    console.log('registration event: ' + data.registrationId);
                },
                error: function(error) {
                    console.error(error);
                }
            });
        }
    });

    push.on('error', function(e) {
        console.log("push error = " + e.message);
    });
    
    push.on('notification', function(data) {
        if(data.additionalData['content-available'] == 1 && data.additionalData.action) {
		console.log(data);
		if (data.additionalData.action == 'update') {
		    localStorage.removeItem('cacheModified');
		    if(data.additionalData.foreground) {
			push.finish(function() {
			    console.log("processing of push data is finished");
			});
			myApp.confirm(data.message, 'Update Available', function () {
				navigator.splashscreen.show();
				location.reload();
			});
		    }
		    else {
		    navigator.splashscreen.show();
			location.reload();
		    }
		}
		else if(data.additionalData.action == 'change_page') {
			if(data.additionalData.foreground) {
				myApp.confirm(data.message, '', function () {
					mainView.router.loadPage(data.additionalData.url);
				});
			}
			else {
				mainView.router.loadPage(data.additionalData.url);
			}
		}
        }
        else {
            myApp.alert(data.message, '');
        }
   });
}

function slugify(Text)
{
    return Text
        .toLowerCase()
        .replace(/ /g,'-')
        .replace(/[^\w-]+/g,'')
        ;
} 
