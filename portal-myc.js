/* The one line every other page runs inline in its <head>: unless the visitor asks for reduced motion, the
   mycelium's threads wait to grow in (mycelium.js does the rest; without this the soil simply shows the whole
   network, still). portal.html's security line allows no inline scripts, so for the portal it lives here. */
matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.add('myc-js');
