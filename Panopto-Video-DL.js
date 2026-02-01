// ==UserScript==
// @name         Panopto-Video-DL
// @namespace    https://github.com/Panopto-Video-DL
// @description  Video downloader for Panopto
// @icon         https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://panopto.com&size=96
// @author       Panopto-Video-DL
// @version      3.5.2
// @copyright    2021, Panopto-Video-DL
// @license      MIT
// @homepage     https://github.com/Panopto-Video-DL/Panopto-Video-DL-browser
// @homepageURL  https://github.com/Panopto-Video-DL/Panopto-Video-DL-browser
// @supportURL   https://github.com/Panopto-Video-DL/Panopto-Video-DL-browser/issues
// @require      https://greasyfork.org/scripts/401626-notify-library/code/Notify%20Library.js
// @match        https://*.panopto.com/Panopto/Pages/Viewer.aspx?*id=*
// @match        https://*.panopto.eu/Panopto/Pages/Viewer.aspx?*id=*
// @match        https://*.panopto.com/Panopto/Pages/Embed.aspx?*id=*
// @match        https://*.panopto.eu/Panopto/Pages/Embed.aspx?*id=*
// @match        https://*.panopto.com/Panopto/Pages/Sessions/List.aspx*
// @match        https://*.panopto.eu/Panopto/Pages/Sessions/List.aspx*
// @connect      panopto.com
// @connect      panopto.eu
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @noframes
// ==/UserScript==

/* globals Notify */

(function () {
  'use strict';

  addStyle('#Panopto-Video-DL{position:fixed;top:10%;left:50%;width:70%;padding:2em 3em 1em;background-color:#2d3436;transform:translateX(-50%);z-index:1050}#Panopto-Video-DL *{margin-bottom:10px;color:#fff!important;font-size:18px;}#Panopto-Video-DL > div {margin-top: 1em;}#Panopto-Video-DL ul,#Panopto-Video-DL ol,#Panopto-Video-DL li{margin:0 .5em;padding:0 .5em;list-style:decimal}#Panopto-Video-DL button{margin-left:5px;margin-right:5px;color:#000!important;font-size:16px;}#Panopto-Video-DL p{margin-top:0.5em;}#Panopto-Video-DL input{color:black!important;}#Panopto-Video-DL textarea{width:100%;color:black!important;resize:vertical;white-space:nowrap;}')

  if (location.pathname.includes('/List.aspx')) {
    log('Service started');

    const button = document.createElement('button');
    button.className = 'css-t83cx2 css-tr3oo4 css-coghg4';
    button.role = 'button';
    button.style.marginLeft = '0.5rem';
    button.innerHTML = '<span class="material-icons css-6xugel" style="font-size: 18px;margin-bottom:-0.25rem;">file_download</span>Download';

    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      let _t;
      const list = (_t = document.querySelectorAll('#listViewContainer tbody > tr a.detail-title')).length ?
            _t : (_t = document.querySelectorAll('#detailsTable tbody > tr a.detail-title')).length ?
            _t : (_t = document.querySelectorAll('#thumbnailGrid > li a.detail-title')).length ?
            _t : null;
      if (!list) {
        log('No videos found', 'error');
        new Notify({
          text: 'No videos found',
          type: 'error'
        }).show();
        return;
      }

      const n = new Notify({
        text: 'Getting links. Please wait',
        type: 'info',
        timeout: 2000
      });
      n.show();

      const requestsList = [...list].map(item => {
        let videoId = new URL(item.getAttribute('href')).searchParams.get('id');
        const videoTitle = item.textContent.trim();
        return requestDeliveryInfo(videoId)
          .catch(error => {
          new Notify({
            text: 'Failed to get lesson link for "' + videoTitle + '"',
            type: 'error',
            timeout: null
          }).show();
        });
      });

      Promise.allSettled(requestsList)
        .then(responses => {
        // log(responses)
        n.close();
        let copyText = '';
        responses.forEach(response => {
          if (response.status == 'fulfilled' && response.value) {
            const streamUrl = response.value?.[0];
            if (streamUrl)
              copyText += streamUrl + '\n';
          }
        });
        if (copyText !== '')
          copyToClipboard(copyText);
      });
    });

    document.querySelector('#actionHeader button')?.parentElement.appendChild(button);
  }
  else if (location.pathname.includes('/Viewer.aspx')) {
    log('Service started');

    const button = document.createElement('a');
    button.href = '#';
    button.innerHTML = '<span class="material-icons" style="font-size:15px;margin-bottom:-0.25rem;">file_download</span> Download';
    button.classList = 'event-tab-header';
    button.style = 'display:inline-flex;align-items:center;position:absolute;bottom:30px;padding:5px 10px;text-decoration:none;cursor:pointer;';

    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      getVideoDownloadLink();
    });
    document.querySelector('#eventTabControl').appendChild(button);

    if (typeof GM_registerMenuCommand !== 'undefined')
      GM_registerMenuCommand('Download', () => getVideoDownloadLink());
  }
  else if (location.pathname.includes('/Embed.aspx')) {
    const button = document.createElement('div');
    button.role = 'button';
    button.title = 'Download';
    button.classList = 'button-control material-icons';
    button.innerHTML = '<span class="material-icons">file_download</span>';

    button.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();

      getVideoDownloadLink();
    });

    // document.querySelector('#navigationControls')?.appendChild(button);
    const searcher = () => setTimeout(() => {
      const nav = document.querySelector('#navigationControls');
      if (!nav) return searcher();
      nav.appendChild(button);
    }, 1_000);
    searcher();

    if (typeof GM_registerMenuCommand !== 'undefined')
      GM_registerMenuCommand('Download', () => getVideoDownloadLink());
  }


  // Functions
  function getVideoDownloadLink() {
    const url = new URL(location.href)
    const videoId = url.searchParams.get('id') ?? url.searchParams.get('tid');
    const isTid = url.searchParams.has('tid');
    if (!videoId) {
      new Notify({
        text: 'Failed to get Lesson ID.',
        type: 'error',
        timeout: null
      }).show();
      return;
    }

    const n = new Notify({
      text: 'Getting links. Please wait',
      type: 'info',
      timeout: 2000
    });
    n.show();

    requestDeliveryInfo(videoId, isTid)
      .then(_streams => {
      const streamUrl = _streams[0];
      const streams = _streams[1];
      const captions = _streams[2];

      if (streamUrl.endsWith('master.m3u8') || streamUrl.match(/\.panobf\d+/)) {
        if (localStorage.getItem('popup-viewed') != 'true')
          showModal('<h1 style="text-align:center;font-size:30px;">READ ME</h1> <p>To download the video follow these steps:</p> <ol><li>Download this program from <a href="https://github.com/Panopto-Video-DL/Panopto-Video-DL" target="_blank">GitHub</a> (No installation needed) and open it</li> <li>Paste the automatically copied link</li> <li>Set the destination folder</li> <li>Wait for the download to finish</li> </ol> <p style="text-align:center;"> <button onclick="this.parentElement.parentElement.remove();">Close</button> <button onclick="localStorage.setItem(\'popup-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button> </p>');

        copyToClipboard(streamUrl);
      }
      else {
        if (typeof GM_openInTab !== 'undefined')
          GM_openInTab(streamUrl, false);
        else
          window.open(streamUrl);
      }

      if ((streams.length || captions.length) && localStorage.getItem('other-source-viewed') != 'true') {
        const modal = showModal('<h2 style="font-size:20px;">Download another source video</h2><ul id="stream-list"></ul><h2 style="font-size:20px;">Download subtitles</h2><ul id="caption-list"></ul><p style="text-align:center;"><button onclick="this.parentElement.parentElement.remove();">Close</button><button onclick="localStorage.setItem(\'other-source-viewed\', true);this.parentElement.parentElement.remove();">Close and don\'t show again</button></p>');
        if (streams.length){
          const streamList = modal.querySelector('#stream-list')
          streams.forEach((value, index) => {
            const li = document.createElement('li');
            li.innerHTML = (value.Name?.replace(/-?(\d{8}T\d+Z)+((.)?(\w+))?/g, '').replace(/_/g, ' ') || 'Stream ' + (index + 1)) + '<button>Copy</button>';
            li.querySelector('button').addEventListener('click', (e) => { copyToClipboard(value.StreamUrl); })
            streamList.appendChild(li);
          });
        }
        if (captions.length) {
          const captionList = modal.querySelector('#caption-list')
          captions.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `Subtitle ${item.languageId}<button>Download</button>`;
            li.querySelector('button').addEventListener('click', (e) => { downloadCaptions(item.content, `${videoId}_${item.languageId}.srt`); });
            captionList.appendChild(li);
          })
        }
      }
    })
    .catch(error => {
      log(error);
      new Notify({
        text: 'Failed to get lesson link',
        type: 'error',
        timeout: null
      }).show();
    })
    .finally(() => n.close());
  }

  function requestDeliveryInfo(videoId, isTid) {
    const streamsBody = isTid ? `&tid=${videoId}&isLiveNotes=false&refreshAuthCookie=true&isActiveBroadcast=false&isEditing=false&isKollectiveAgentInstalled=false&isEmbed=false&responseType=json` : `deliveryId=${videoId}&isEmbed=true&responseType=json`;

    return fetch(
        location.origin + '/Panopto/Pages/Viewer/DeliveryInfo.aspx', {
        method: 'POST',
        headers: {
          accept: 'application/json, text/javascript, */*; q=0.01',
          'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: streamsBody
      })
      .then(response => response.json())
      .then((dataStreams) => {
        log(dataStreams);
        const errorCode = dataStreams.ErrorCode;
        if (errorCode)
          throw new Error(dataStreams.ErrorMessage ?? '', { code: errorCode ?? -1 });

        const streamUrl = dataStreams.Delivery?.PodcastStreams[0]?.StreamUrl;
        const streams = (dataStreams.Delivery?.Streams || []).filter(x => x.StreamUrl != streamUrl);
        if (!streamUrl)
          throw new Error('Stream URL not ready yet');

        const captions = dataStreams.Delivery?.AvailableCaptions || [];
        let captionPromises = [];
        if (captions.length) {
          captionPromises = captions.map(item => {
            const languageId = item.Language;
            const captionsBody = isTid ? `tid=${videoId}&getCaptions=true&language=${languageId}&responseType=json` : `deliveryId=${videoId}&getCaptions=true&language=${languageId}&responseType=json`;

            return fetch(
              location.origin + '/Panopto/Pages/Viewer/DeliveryInfo.aspx', {
              method: 'POST',
              headers: {
              accept: 'application/json, text/javascript, */*; q=0.01',
              'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
              },
              body: captionsBody
            })
            .then(response => response.json())
            .then(data => ({
              languageId,
              content: data,
            }))
          });
        }

        return Promise.all(captionPromises).then(captionData => {
          return [streamUrl, streams, captionData];
        })
    });
  }

  function downloadCaptions(captions, filename) {
    let srtContent = "";
    let counter = 1;

    const formatTime = (val) => {
      const hours = Math.floor(val / 3600);
      const minutes = Math.floor((val % 3600) / 60);
      const seconds = Math.floor(val % 60);
      const milliseconds = Math.floor((val - Math.floor(val)) * 1000);
      const pad = (num, size) => num.toString().padStart(size, '0');
      return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
    }

    captions.forEach(item => {
      if (!item.Caption) return;
      const start = item.Time;
      const dur = item.CaptionDuration;
      const end = start + dur;
      srtContent += `${counter}\n${formatTime(start)} --> ${formatTime(end)}\n${item.Caption}\n\n`;
      counter++;
    })

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click()
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text) {
    if (typeof GM_setClipboard !== 'undefined') {
      GM_setClipboard(text, 'text');
      new Notify({
        text: 'Copied!',
        type: 'success'
      }).show();
    } else {
      navigator.clipboard.writeText(text).then(() => {
        new Notify({
          text: 'Copied!',
          type: 'success'
        }).show();
      }).catch(e => {
        log(e);
        const modal = showModal('<h3>There was an error when copying the download link</h3> <p>Copy it manually:</p><textarea type="text" value="" rows="3" onclick="this.select();"></textarea><p style="text-align:center;"><button onclick="this.parentElement.parentElement.remove();">Close</button></p>');
        modal.querySelector('textarea').value = text;
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

  function log(message, level = 'log') {
    console[level]('%c Panopto-Video-DL ->', 'color:red;font-size:14px;', message);
  }

})();