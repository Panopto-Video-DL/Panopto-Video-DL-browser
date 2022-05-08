// ==UserScript==
// @name         Panopto-Video-DL
// @namespace    https://github.com/Panopto-Video-DL
// @description  Download video from Panopto!
// @icon         https://www.panopto.com/wp-content/themes/panopto/library/images/favicons/favicon-96x96.png
// @author       Panopto-Video-DL
// @version      3.2.0
// @copyright    2021, Panopto-Video-DL
// @license      MIT
// @homepageURL  https://github.com/Panopto-Video-DL
// @require      https://greasyfork.org/scripts/401626-notify-library/code/Notify%20Library.js
// @match        https://*.panopto.com/Panopto/Pages/Viewer.aspx?*id=*
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?*id=*
// @connect      panopto.com
// @connect      panopto.eu
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  const url = new URL(location.href)
  const lesson_id = url.searchParams.get('id');

  if (!lesson_id) {
    new Notify({
        text: 'Failed to get Lesson ID. Try to reload the page',
        type: 'error'
      }).show();
    return; }

  addStyle('#Panopto-Video-DL{position:fixed;top:10%;left:50%;width:70%;padding:2em 3em 1em;background-color:#2d3436;transform:translateX(-50%);z-index:1050}#Panopto-Video-DL *{margin-bottom:10px;color:#fff!important;font-size:18px;}#Panopto-Video-DL > div {margin-top: 1em;}#Panopto-Video-DL ul,#Panopto-Video-DL ol,#Panopto-Video-DL li{margin:0 .5em;padding:0 .5em;list-style:decimal}#Panopto-Video-DL button{margin-left:5px;margin-right:5px;color:#000!important;font-size:16px;}#Panopto-Video-DL p{margin-top:0.5em;}#Panopto-Video-DL input{color:black!important;}')
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
      const streamUrl = data?.Delivery?.PodcastStreams[0]?.StreamUrl;
      const streams = (data?.Delivery?.Streams || []).filter(x => x.StreamUrl != streamUrl);

      const element = document.createElement('a');
      element.id = 'downloadTabHeader';
      element.classList = 'event-tab-header';
      element.style = 'position:absolute;bottom:30px;padding:5px 10px;text-decoration:none;cursor:pointer;';
      element.innerHTML = '<b>Download</b> <span class="material-icons" style="font-size:15px;vertical-align:middle;">file_download</span>';
      element.addEventListener('click', event => {
        if (!streamUrl) {
          new Notify({
            text: 'Stream URL not ready yet',
            type: 'error'
          }).show();
          return; }

        if (streamUrl.endsWith('master.m3u8')) {
          if (localStorage.getItem('popup-viewed') != 'true') {
            showModal('<h1 style="text-align:center;font-size:30px;">READ ME</h1> <p>To download the video follow these steps:</p> <ol><li>Download this program from <a href="https://github.com/Panopto-Video-DL/Panopto-Video-DL" target="_blank">GitHub</a> (No installation needed) and open it</li> <li>Paste the automatically copied link</li> <li>Set the destination folder</li> <li>Wait for the download to finish</li> </ol> <p style="text-align:center;"> <button onclick="this.parentElement.parentElement.remove();">Close</button> <button onclick="localStorage.setItem(\'popup-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button> </p>');
          }
          copyToClipboard(streamUrl);
        } else {
          if (typeof GM_openInTab !== 'undefined')
            GM_openInTab(streamUrl, false);
          else
            window.open(streamUrl);
        }

        if (streams.length && localStorage.getItem('other-source-viewed') != 'true') {
          const modal = showModal('<h2 style="font-size:20px;">Download another source video</h2><ul></ul><p style="text-align:center;"><button onclick="this.parentElement.parentElement.remove();">Close</button><button onclick="localStorage.setItem(\'other-source-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button></p>');
          streams.forEach((value, index) => {
            const li = document.createElement('li');
            li.innerHTML = value.Name.replace(/-?(\d{8}T\d+Z)+((.)?(\w+))?/g, '').replace(/_/g, ' ') + '<button>Copy</button>';
            li.querySelector('button').addEventListener('click', (e) => { copyToClipboard(value.StreamUrl); })
            modal.querySelector('ul').appendChild(li);
          });
        }
      });
      document.querySelector('#eventTabControl').appendChild(element);
    },
    error: function(response) {
      console.error(response)
      new Notify({
        text: 'Failed to get DeliveryInfo of lesson. Request failed.',
        type: 'error'
      }).show();
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

  function copyToClipboard(text) {
    if (typeof GM_setClipboard !== 'undefined') {
      GM_setClipboard(text, 'text');
      new Notify({
        text: 'Link copied!',
        type: 'success'
      }).show();
    } else {
      navigator.clipboard.writeText(text).then(() => {
        new Notify({
          text: 'Link copied!',
          type: 'success'
        }).show();
      }).catch(e => {
        console.error(e);const modal = showModal('<h3>There was an error when copying the download link</h3> <p> Copy it manually: <input type="text" value=""></p>');
        modal.querySelector('input').value = text;
      });
    }
  }

  function showModal(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    if (document.querySelector('#Panopto-Video-DL')) {
      const hr = document.createElement('hr');
      div.prepend(hr);
      document.querySelector('#Panopto-Video-DL').append(div);
    } else {
      div.id = 'Panopto-Video-DL';
      document.querySelector('body').appendChild(div);
    }
    return div;
  }

  function addStyle(CSS) {
    if (typeof GM_addStyle != 'undefined') {
      GM_addStyle(CSS);
    } else {
      const style = document.createElement('style');
      style.innerText = CSS;
      document.head.appendChild(style);
    }
  }

})();