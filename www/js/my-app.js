var myApp,
    url = 'https://accordapp.com/',
    church_id = 3,
    mediaPlayer,
    playTimer,
    auth_token = localStorage.getItem('auth_token'),
    username = localStorage.getItem('username'),
    params,
    elapsedTime = 0,
    playingItem,
    mainView,
    device_id = false,
    pageData,
    gaCode;

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
    // write log to console
    ImgCache.options.debug = true;
    // increase allocated space on Chrome to 50MB, default was 10MB
    ImgCache.options.chromeQuota = 50*1024*1024;
    
    try {
        device_id = device.uuid;
    }
    catch (e) {
        console.log(e);
        device_id = false;
    }
    if (!username) {
        if (device_id) {
            username = device_id;
        }
        else {
            username = guid();
        }
    }
    if (!auth_token) {
        password = guid();
        $.ajax({
            url: url + 'account/',
            method: 'PUT',
            dataType: 'json',
            data: {
                'username': username,
                'password': password
            },
            success: function(response) {
                auth_token = response.auth_token;
                localStorage.setItem('auth_token', auth_token);
                localStorage.setItem('username', response.username);
                localStorage.setItem('user_id', response.pk);
                checkModified();
            },
            error: function(response) {
                console.log('Username exists', response);
                $.ajax({
                    url: url + 'account/',
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        'username': username
                    },
                    success: function(response) {
                        console.log('response', response[0].username, 'local', username);
                        auth_token = response[0].auth_token;
                        localStorage.setItem('auth_token', auth_token);
                        localStorage.setItem('username', response[0].username);
                        localStorage.setItem('user_id', response[0].pk);
                        checkModified();
                    },
                    error: function(response) {
                        console.log(response);
                    }
                });
            }
        });
    }
	else	{
		checkModified();
	}
    
    
    
}
function checkModified() {
    //load pages
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
	    console.log('ajaxSetup setting Auth header to ' + auth_token);
            xhr.setRequestHeader('Authorization', 'Token '+auth_token);
        }
    });
    console.log(device_id, username);
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
    pageData = data;
    try {
        gaCode = data.ga;
    }
    catch(e) {}
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
    myApp.request.setup({
	headers:{
            Authorization: 'Token ' + auth_token
        }
    });
    // Export selectors engine
    var $$ = Dom7;
    $$(document).on('ajaxStart', function(e){
       var xhr = e.detail.xhr;
       console.log('on ajaxStart setting Auth header to ' + auth_token);
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
            last_name = $('#last_name').val(),
            email = $('#email').val();
        if (first_name && last_name) {
            $.ajax({
                url: url+'account/',
                method: 'POST',
                dataType: 'json',
                data: {
                    'first_name': first_name,
                    'last_name': last_name,
					'email': email,
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
    ga('create', gaCode, {
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
    
    var editor = new wysihtml.Editor('editor', {
        toolbar: 'toolbar',
        parserRules:  wysihtmlParserRules
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
