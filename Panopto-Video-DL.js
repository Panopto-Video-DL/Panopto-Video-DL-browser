// ==UserScript==
// @name         Panopto-Video-DL
// @namespace    https://github.com/Panopto-Video-DL
// @description  Download video from Panopto!
// @icon         https://www.panopto.com/wp-content/themes/panopto/library/images/favicons/favicon-96x96.png
// @author       Panopto-Video-DL
// @version      3.1.1
// @copyright    2021, Panopto-Video-DL
// @license      MIT
// @homepageURL  https://github.com/Panopto-Video-DL
// @match        https://*.panopto.com/Panopto/Pages/Viewer.aspx?*id=*
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?*id=*
// @connect      panopto.com
// @connect      panopto.eu
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @noframes
// ==/UserScript==

(function(panopto) {
  'use strict';

  const url = new URL(location.href)
  const lesson_id = url.searchParams.get('id');
  if (!lesson_id) {
    alert('Failed to get Lesson ID')
    return; }

  request({
    url: location.origin + '/Panopto/Pages/Viewer/DeliveryInfo.aspx',
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    data: 'deliveryId=' + lesson_id + '&isEmbed=true&responseType=json',
    success: function(response) {
      const data = JSON.parse(response);
      let stream = undefined;

      try {
        stream = data.Delivery.PodcastStreams[0].StreamUrl;
      } catch (error) {
        console.error(error)
      }

      const element = document.createElement('a');
      element.id = 'downloadTabHeader';
      element.classList = 'event-tab-header';
      element.style = 'position:absolute;bottom:40px;padding:5px 10px;text-decoration:none;cursor:pointer;';
      element.innerHTML = '<b>Download</b> <span class="material-icons" style="font-size:15px;vertical-align:middle;">file_download</span>';
      element.addEventListener('click', event => {
        if (!stream) {
          alert('Stream URL not ready yet');
          return; }

        if (stream.endsWith('master.m3u8')) {
          if (localStorage.getItem('popup-viewed') != 'true') {
            const div = document.createElement('div');
            div.id = 'Panopto-Video-DL';
            div.innerHTML += '<style>#Panopto-Video-DL{position:fixed;top:10%;left:50%;width:80%;padding:3em 3em 1em;background-color:#2d3436;transform:translateX(-50%);z-index:1050}#Panopto-Video-DL *:not(small){margin-bottom:10px;color:#fff!important;font-size:18px}#Panopto-Video-DL li,#Panopto-Video-DL ol{margin:0 .5em;padding:0 .5em;list-style:decimal}#Panopto-Video-DL button{margin-top:1em;margin-right:10px;color:#000!important}</style>';
            div.innerHTML += '<h1 style="text-align:center;font-size:26px;">READ ME!</h1> <p>To download the video follow these steps:</p> <ol><li>Download this program from GitHub <a href="https://github.com/Panopto-Video-DL/Panopto-Video-DL" target="_blank">Download</a> (No installation needed) and open it</li> <li>Paste the automatically copied link</li> <li>Set the destination folder</li> <li>Wait for the download to finish</li> </ol> <p style="text-align:center;"> <button onclick="this.parentElement.parentElement.remove();">Close</button> <button onclick="localStorage.setItem(\'popup-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button> </p>';
            document.querySelector('body').appendChild(div);
          }

          if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(stream, 'text');
            alert('Link copied!')
          } else {
            navigator.clipboard.writeText(stream).then(() => {
              alert('Link copied!')
            }).catch(e => {
              const div = document.createElement('div');
              div.innerHTML += '<style>#Panopto-Video-DL p{font-size:16px}#Panopto-Video-DL input{color:black!important;}</style>';
              div.innerHTML += '<h3>There was an error when automatically copying the download link</h3> <p> Copy it manually: <input type="text" value=""></p>';
              div.querySelector('input').value = stream;
              if (document.querySelector('#Panopto-Video-DL'))
                document.querySelector('#Panopto-Video-DL').append(div)
              else {
                div.id = 'Panopto-Video-DL';
                div.querySelector('style').innerText += '#Panopto-Video-DL{position:fixed;top:10%;left:50%;width:80%;padding:3em 3em 1em;background-color:#2d3436;transform:translateX(-50%);z-index:999999}';
                document.querySelector('body').appendChild(div);
              }
            });
          }
        } else {
          if (typeof GM_openInTab !== 'undefined') {
            GM_openInTab(stream, false);
          } else {
            window.open(stream);
          }
        }
      });
      document.querySelector('#eventTabControl').appendChild(element);
    },
    error: function(response) {
      console.error(response)
      alert('Failed to get DeliveryInfo of lesson');
    }
  });

  // Functions
  function request(options) {
    const onreadystatechange = function() {
      if (this.readyState === 4 && (this.status >= 200 && this.status <= 299))
        options.success(this.responseText);
      else if (this.readyState === 4)
        options.error(this.responseText);
    };
    if (typeof GM_xmlhttpRequest != 'undefined') {
      options.onload = onreadystatechange;
      GM_xmlhttpRequest(options);
    } else {
      const xhttp = new XMLHttpRequest();
      xhttp.open(options.method || 'GET', options.url);
      if (options.headers) {
        for (let key in options.headers)
          xhttp.setRequestHeader(key, options.headers[key])
      }
      xhttp.onreadystatechange = onreadystatechange;
      xhttp.send(options.data);
    }
  }

})(Panopto);