/* The two videos Pollen records for the portal and the getting-started page (Nov 19 2026).
   EMPTY until she has watched and approved a video (videos-need-approval): a video with no address here is hidden everywhere
   and nothing is promised in words. To switch one on: set `src` to the video's address on webfaery.love (/how/<name>.mp4),
   `vtt` to its captions file (/how/<name>.vtt, captions are on by default), and `poster` to a still (optional), then bump the
   ?v= on wf-videos.js in portal.html and start.html. Only https://webfaery.love/how/ addresses are used. */
window.WF_VIDEOS = {
  start: { src: '', vtt: '', poster: '', minutes: 0 } // the getting-started video: the process, and picking a build
};
