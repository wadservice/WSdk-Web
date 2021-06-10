(function() {
    var reqId = 0
    var BASE_URL = "http://ssp.wafour.com"

    if (!String.format) {
        String.format = function (format) {
            var args = Array.prototype.slice.call(arguments, 1);
            return format.replace(/{(\d+)}/g, function (match, number) {
                return typeof args[number] != 'undefined'
                    ? args[number]
                    : match
                    ;
            });
        };
    }

    window.addEventListener('message', function(response) {
        // Make sure message is from our iframe, extensions like React dev tools might use the same technique and mess up our logs
        if (response.data && response.data.source === 'iframe') {
          // Do whatever you want here.
          console.log(response.data.message);
        }
    });

    var SCALE_SCRIPT = `<script>
    // Save the current console log function in case we need it.
    const _log = console.log;
    // Override the console
    console.log = function(...rest) {
      // window.parent is the parent frame that made this window
      window.parent.postMessage(
        {
          source: 'iframe',
          message: rest,
        },
        '*'
      );
      // Finally applying the console statements to saved instance earlier
      _log.apply(console, arguments);
    };
    </script>
    <script>
        document.body.style['transform'] = 'scale(0.25);'
        window.addEventListener('DOMContentLoaded', function () {
            var sw = document.body.scrollWidth;
            var sh = document.body.scrollHeight;
            var w = window.innerWidth;
            var h = window.innerHeight;

            var ar = sw/sh
            var far = w/h

                console.log(w,h, sw, sh)
            var scale = 1.0
            var offsetX=0, offsetY=0
            if(far > ar) {
                scale = h/sh
                console.log(w, sw, scale)
                offsetX = (w-(sw*scale))/2
            } else {
                scale = w/sw
                console.log('height')
                console.log(h, sh, scale)
                offsetY = (h-(sh*scale))/2
            }
            console.log(offsetX, offsetY)

            document.body.style['margin'] = '0'
            document.body.style['padding'] = '0'
            document.body.style['background-color'] = 'black'
            document.body.style['transform-origin'] = 'left top'
            document.body.style['transform'] = 'scale('+scale+')'
            document.body.style['margin-left'] = offsetX
            document.body.style['margin-top'] = offsetY
        })
    </script>`;

    function request(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === xhr.DONE) {
                var ret;
                if (xhr.status === 200 || xhr.status === 201) {
                    ret = xhr.responseText;
                } 
                try {
                    callback(ret);
                } catch(e) {
                }
            }
        };
        xhr.open('GET', url);
        xhr.send();
    }

    function doTracks(urls) {
        urls = urls || []
        urls.forEach(function(url) {
            request(url);
        })
    }

    function clickHandler(url) {
        window.open(url)
    }

    function makeIFrame(ad, w, h, restart) {
        var link = ad.adm
        if(ad.video) {
            link = link.replace("__RESTART__", restart ? "true" : "false");
        }
        if(w != ad.adSizeW || h != ad.adSizeH) {
            link = link + SCALE_SCRIPT 
        }
        else {
            link = link + SCALE_SCRIPT 
        }

        var iframe = document.createElement('iframe');
        iframe.id="wad_ad_frame";
        iframe.style.width=w+"px";
        iframe.style.height=h+"px";
        iframe.style.margin=0
        iframe.style.padding=0
        iframe.style.left='0px'
        iframe.style.top='0px'
        iframe.style.border="none"
        iframe.frameBorder=0
        iframe.scrolling = 'no';

        if(link.startsWith("<") || link.startsWith("http")) {
            link = "data:text/html;charset=utf-8," + link
        }

        iframe.setAttribute("src", link);
        iframe.addEventListener('load', function(e) {
            //console.log('iframe load ', e.target.getAttribute('src'))
            //console.log(e.target)
            doTracks(ad.itrackers);
        })


        var overlay =  document.createElement('div');
        overlay.style.position='absolute'
        overlay.style.top='0px'
        overlay.style.left='0px'
        overlay.style.zIndex ='998'
        overlay.style.width=w + "px";
        overlay.style.height=h + "px";
        overlay.style.margin=0
        overlay.style.padding=0
        overlay.style.backgroundColor="#ff0000"

        var infoIcon = document.createElement('img');
        infoIcon.setAttribute('src', 'img/info.png')
        infoIcon.style.width="16px"
        infoIcon.style.height="16px"
        infoIcon.style.position='absolute'
        infoIcon.style.zIndex ='999'
        infoIcon.style.top=4+'px'
        infoIcon.style.left=w-20+'px'
        infoIcon.style.margin="0px"
        infoIcon.style.padding="0px"

        return {
            frame: iframe,
            overlay: overlay,
            infoIcon: infoIcon,
        }
    }
    function createAdFrame(element, ad, w, h, infoIcon, restart) {
        var o = makeIFrame(ad, w, h, restart)

        element.appendChild(o.frame)
        //element.appendChild(o.overlay)
        if(infoIcon === true) {
            element.appendChild(o.infoIcon)
        }

        element.style.width = w+ 'px'
        element.style.height = h+ 'px'
        element.style.padding = "0px"
        element.style.margin = "0px"
        element.style.position='relative'
        element.addEventListener('click', function(e) {
            console.log('parent click');
            return false

        })
        o.overlay.addEventListener('click', function(e) {
            console.log('click overlay', e)
            return false;
        })
        o.infoIcon.addEventListener('click', function(e) {
            console.log('click infoicon', e)
            return false;
        })

        window.focus()
        window.addEventListener('blur', function() {
            if (document.activeElement === o.frame){
                /* click iframe */
                doTracks(ad.ctrackers);
                console.log("iframe click")
            }
            window.blur();
            setTimeout(window.focus, 0);
        });
        window.addEventListener('focus', function() {
            console.log('focus')

        })

    }


    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function serialize(obj, prefix) {
        var str = [], p;
        for (p in obj) {
            if (obj.hasOwnProperty(p)) {
                var k = prefix ? prefix + "[" + p + "]" : p,
                    v = obj[p];
                str.push((v !== null && typeof v === "object") ?
                    serialize(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
        }
        return str.join("&");
    }

    function makeAdParamStr(appId, unitId, test, width, height) {
        var params = {}
        params.reqId = reqId++
        params.adType = "BANNER"
        params.appId = appId
        params.unitId = unitId
        params.test = test
        var userAgent = window.navigator.userAgent
        params.ua = userAgent
        params.os = "OTHER"
        params.osv = navigator.appVersion
        params.udid = ""
        params.dwid = ""
        params.dtype = "PERSONAL_COMPUTER"
        params.ptype = "PC_WEB"
        params.connectionType = "UNKNOWN"
        params.language = navigator.language
        params.adSizeW = width
        params.adSizeH = height

        try {
            params.country = navigator.language.split('-')[1]
        } catch(e) {}

        var adid = localStorage.getItem("__wad_adid__");
        if(!adid) {
            adid = uuidv4();
            localStorage.setItem("__wad_adid__", adid)
        }
        params.udid = adid
        params.dwid = adid
        params.dnt = 0
        return serialize(params)
    }

    function loadAd(element) {

        var unitId = element.getAttribute("data-ad-unitId")
        var appId = element.getAttribute("data-ad-appId")
        var width = element.getAttribute("data-ad-width") || element.clientWidth
        var height = element.getAttribute("data-ad-height") || element.clientHeight
        var test = element.getAttribute("data-ad-test") || false
        var infoIcon = element.getAttribute('data-info-icon') || true
        var restart = element.getAttribute('data-ad-restart') || false

        console.log("unitId = " + unitId)
        console.log("width= " + width)
        console.log("height= " + height)
        var url = BASE_URL + "/api/v1/ad/?"
        var params = makeAdParamStr(appId, unitId, test, width, height)
        console.log(params);

        request(url+params, function(ret) {
            if(ret) {
                var r = JSON.parse(ret);
                if(r.code == 0) {
                    createAdFrame(element, r.data, width, height, infoIcon, restart);
                }
            }
        })

    }

    function initAdFrames() {
        var elements = document.getElementsByClassName("__wad__")
        console.log(elements);
        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];
            console.log("+++++++++++ Load AD ++++++++++");
            loadAd(element)
            console.log("----------- Load AD ----------");
        }
    }


    window.addEventListener('load', function(){
        initAdFrames();
    })
})();
