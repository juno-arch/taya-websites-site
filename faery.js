/* The Web Faery: a little faery who sits on a golden mushroom in the corner of every page.
   Tap her and ask her things. She is flaky, silly, on her ninth break, and always points to the real answer.

   ADD HER TO A PAGE: in the <head>,
     <link rel="stylesheet" href="faery.css">
     <script src="faery.js" defer></script>
   Nothing else. No libraries, no network calls, no trackers. The only thing she remembers is "shoo"
   (sessionStorage, for this visit only).

   WHAT'S WHERE IN THIS FILE
     1. CONFIG   the art files, the links, how often she flies, how fast she talks
     2. LINES    everything she says (edit freely: keep the [link text](key) bits so nobody gets stuck)
     3. FACES    which face and body move goes with each expression
     4. the machinery, then the stand-in drawing at the very bottom

   REPLACING THE STAND-IN DRAWING WITH POLLEN'S (what to draw and export)
     Style: cute chibi anime, big head (about 1 : 1.3 head to body), huge sparkly eyes with two white
     highlights each, the tiny ":3" cat mouth in every pose, warm peach cheeks, pointy ears. Chanterelle-gold hair in a short,
     tousled pixie cut (a little volume, one curl and a few tufts on top, soft wispy bangs that leave her
     brows showing, short pointed wisps by the ears and at the nape, nothing past the jaw, no ponytail) with
     a golden mushroom clip. A moss green dress made of leaves: a zig-zag hem of pointed leaf tips all the
     way around, every other leaf a shade deeper with a light vein, a tier of bigger petal leaves from the waist, a
     sweetheart bodice of two leaf cups crossing in a V, bare shoulders with a small leaf capping each (no
     puffed sleeves). Bare feet (faeries don't wear shoes). See-through honey wings with pointed tips and gold edges. She sits on a tall golden toadstool:
     a round, spotted cap on a slim cream stem that ends in a soft rounded bottom (no grass, no ground).
     Draw everything on ONE canvas size, at least 1000 x 1300 px (10 : 13, same as the stand-in's
     100 x 130), and export each layer as its own transparent PNG. Because every file is the same canvas,
     the layers line up by themselves, like layers in Procreate. Keep her where the stand-in sits
     (open images/faery/sit.svg to see it): head in the upper middle, seat about 2/3 of the way down.
       sit.png         sitting on the mushroom, facing us, no wings, no mushroom
       sit-blink.png   the same with her eyes closed
       fly.png         flying, facing RIGHT (arms out, legs trailing, leaf hem fluttering); flipped for left
       wing-left.png   her left-side wing (the one on the viewer's left), on its own
       wing-right.png  the other wing
       mushroom.png    the golden toadstool she sits on, on its own: tall stem, soft rounded bottom, no grass
                       or ground (it stays put when she flies)
     Optional, for talking and faces (same canvas, only the part that changes, skin under it filled in):
       mouth-o.png, mouth-open.png                    her mouth while she talks
       face-happy.png, face-proud.png, ...            one per expression in FACES below
     Put the files in images/faery/ and write their paths in CONFIG.art. Leave a path empty and she uses
     the stand-in for that layer's set. The stand-in files in images/faery/ show every layer's placement. */
(function () {
  'use strict';

  /* ================= 1. CONFIG ================= */
  var CONFIG = {
    art: {
      sit: '',        // 'images/faery/sit.png'   (empty = the built-in stand-in drawing, all expressions)
      sitBlink: '',   // 'images/faery/sit-blink.png'
      fly: '',        // 'images/faery/fly.png'
      wingLeft: '',   // 'images/faery/wing-left.png'
      wingRight: '',  // 'images/faery/wing-right.png'
      mushroom: '',   // 'images/faery/mushroom.png'
      mouthO: '', mouthOpen: '',
      faces: {}       // { happy: 'images/faery/face-happy.png', proud: '...', ... }
    },
    links: {
      prices: 'index.html#prices', costs: 'index.html#costs', founding: 'index.html#founding',
      faq: 'index.html#faq', care: 'index.html#care-includes', how: 'index.html#how', about: 'index.html#about', work: 'index.html#work',
      guestbook: 'index.html#guestbook', start: 'intake.html', quiz: 'quiz.html', domain: 'domain.html',
      email: 'mailto:taya@webfaery.love',
      // the contact section (Taya is email-first: no booking calls with her from the site)
      chat: 'index.html#contact'
    },
    flightEvery: [45, 120],  // seconds between little flights (random)
    typeMs: 30               // how fast she types, per letter
  };

  /* ================= 2. LINES =================
     Each set: ex = her usual expression for it, keys = words that lead here (| between them; a phrase
     with spaces must appear as is; word* = any word starting with it), say = what she says. The first line
     is her first answer to it; after that she picks at random, never the same line twice in a row.
     Start a line with (giggle) or another face name to give that one line its own face.
     [text](key) makes a link; the key is from CONFIG.links. No em dashes, please. */
  var GREET = [
    'Oh! A visitor! Hi! I’m the help desk. Ask me anything, I might even know it ✨',
    'Hello hello! You found me. I’m on break, but a small one. What do you need?',
    'Hi! I’m Bramble, and I’m in charge of questions around here. Allegedly.',
    'Oh hi! Sorry, I was napping on this mushroom. How can I help? 😂'
  ];
  var CHIPS = [['How much?', 'how much is a website'], ['How long?', 'how long does it take'], ['Who are you?', 'who are you'],
    ['Can you make my site?', 'can you make my site'], ['My own art?', 'can i bring my own artwork'], ['Anything else?', 'anything else']];
  var LINES = {
    rude: { ex: 'pouty', keys: 'stupid|dumb|idiot|suck|sucks|useless|hate you|shut up|ugly|worst|annoying|wtf|stfu|crap|garbage|trash|lame|go away|fuck|fucking|shit|moron',
      say: ['Hmph. Rude. I forgive you though, I’m a very forgiving faery. Taya is even nicer: [taya@webfaery.love](email)',
        'Well, my mushroom likes me. Can I help with something else? Prices? [Here they are →](prices)',
        'Oof. Tough day? Taya’s a real human and very kind. [Email her →](email)',
        'I’m going to pretend you said “you’re lovely.” Anyway! [Want the prices? →](prices)'] },
    price: { ex: 'proud', keys: 'how much|price|prices|pric*|cost|costs|expensive|cheap|afford*|budget|maiden|mother|crone|planted|tended|in bloom|bloom|dollar*|$|fee|fees|charge|rates|quotes|estimate*|money|package*|tiers|included|includes|what do i get',
      say: ['(giggle) Three acorns and a moonbeam! ...Taya says that’s ‘not a real price.’ Fine. [The real ones are here →](prices)',
        'Ooh, I know this one! Planted is $600, Tended is $1,200, In Bloom is $1,800. Paid once, then it’s yours. [What each one gets →](prices)',
        'A one-page site is $600. A full site is $1,200. Booking or a little shop is $1,800. Very leafy names, very honest prices. [Compare them →](prices)',
        '(giggle) More than a mushroom, less than a castle. $600 to $1,800 for the build, paid once, then care from $12 a month. I checked twice. Okay, once. [The list →](prices)'] },
    costs: { ex: 'proud', keys: 'other costs|other cost|any other|hidden|extra costs|extras|ongoing|monthly|monthly fee|per month|a month|every month|renew*|upkeep|catch|subscription|recurring',
      say: ['After the build, it’s just care: $12, $45 or $90 a month, matching your site. It covers hosting and your web address, so there’s nothing to renew. [Every cost, said plainly →](costs)',
        '(giggle) Hidden fees? The only thing hidden here is me, in the moss. Every cost is written right out. [All the costs →](costs)',
        '(happy) Care keeps your site running: hosting, your web address, backups, and Taya making your changes whenever you email. $12, $45 or $90 a month. [The whole list →](costs)',
        'Nope, nothing sneaky! The build is paid once and it’s yours, and care is one small monthly bill. Change something? One email and done ✨ [Every cost →](costs)'] },
    time: { ex: 'happy', keys: 'how long|long does|timeline|weeks|week|fast|quick*|turnaround|deadline|soon|rush|asap|how soon|by when|ready|go live|goes live|live yet|be live|launch|launched',
      say: ['(giggle) Depends. How long is a piece of moss? About 2 to 4 weeks, apparently. I’ve been here since spring. [How it works →](how)',
        '(proud) Planted is about 2 weeks, Tended about 3, In Bloom about 4, counted from when your content is in. [The steps →](how)',
        'You see a first draft in about a week, then two rounds of changes, then it goes live. I’d need a nap in between. [How it works →](how)',
        '(sleepy) About 2, 3 or 4 weeks, depending on the size. Taya is quick. I am... resting. [How it works →](how)'] },
    who: { ex: 'giggle', keys: 'bramble|who are you|who are u|what r u|wat r u|what are u|your name|ur name|what are you|whats your name|who r u|who is this|who you|what do you do|where do you live',
      say: ['(sleepy) I’m Bramble, customer service! I’m on my ninth break today.',
        '(proud) I’m Bramble! Like the blackberry kind: sweet, a little prickly, and I grow on you ✨',
        'Bramble. Bramble Puddlesworth the Third, technically. The first two were also me.',
        'I’m Bramble! I lost my name tag in the moss, so you’ll just have to trust me 😂',
        '(happy) I’m Bramble, the faery who lives on this mushroom! Taya makes the websites. I make... vibes. [Meet Taya →](about)'] },
    taya: { ex: 'proud', keys: 'taya|who made|who built|who runs|owner|designer|developer|about|humboldt|where are you|location|local|arcata|eureka|california|team|agency|who is behind|just you|outside|anywhere|remote|far away|out of state|scam|legit|trust*',
      say: ['Taya! She tends gardens and builds websites here in Humboldt County, California. She’s the real deal. I’m the mascot. [Meet her →](about)',
        '(happy) Taya’s the one who actually knows things, and she writes back to every email herself. [Say hi →](email)',
        'Just Taya. No big agency, no robots, one very kind human who answers her own email. [Who you’d work with →](about)',
        '(happy) We’re in Humboldt County, California, with the redwoods and the moss. Taya builds for anyone, near or far. [About Taya →](about)'] },
    start: { ex: 'happy', keys: 'make my site|make me|make a site|make a website|build my|build me|build a|hire|hiring|start|started|begin|sign up|sign me up|get started|work with|want a website|need a website|want a site|need a site|can you make|can you build|new site|new website|intake|questionnaire|interested|next step*|lets do|redo|redesign|rebuild|makeover|ready to start|ready to go|im ready|love a website|love a site|love a new|like a website|like a site|love to work|massage|bodywork*|healer*|therapist*|practitioner*|acupunct*|reiki|yoga',
      say: ['Yes!! Well, Taya can. I’d just add glitter. Start with a few easy questions: [Getting started →](start) Or just say hi: [taya@webfaery.love](email)',
        '(proud) Ooh, a new site! First step: a few easy questions, or just email Taya about your work. [Get started →](start)',
        'Taya only takes a few new builds a month, so hop in! [Answer the getting-started questions →](start)',
        '(proud) Ooh, here’s a secret that isn’t a secret: answer a few questions and Taya makes you a FREE mockup of your site within a week ✨ [Get your mockup →](start)',
        '(giggle) I’d build it out of twigs. Taya builds it out of actual code, which Google likes better. [Start here →](start)'] },
    work: { ex: 'proud', keys: 'examples|example|portfolio|your work|past work|other sites|sites you made|see work|samples|clients',
      say: ['Taya made jomastudios.com for her friend Juliet, and gardenfaery.love for her own garden business. Both are live right now! [Recent work →](work)',
        '(giggle) My portfolio is one mushroom. Taya’s is much better. [See her recent work →](work)',
        '(happy) Real sites, live right now: a bodywork practice and a garden business. [Take a peek →](work)'] },
    quiz: { ex: 'thinking', keys: 'quiz|which one|which build|which plan|which size|which package|difference|recommend*|should i|choose|pick|compare|best for|right for',
      say: ['(giggle) There’s a quiz! Two minutes. I got In Bloom, which feels right, I am very flowery 😂 [Take the quiz →](quiz)',
        'Planted is one page, kept healthy. Tended is a full site, tended through the seasons. In Bloom adds booking, payments or a little shop, in full bloom. Still torn? [The quiz picks for you →](quiz)',
        '(happy) Picking is hard. I’ve had the same mushroom for a year. [Which build? →](quiz)'] },
    care: { ex: 'proud', keys: 'care|care plan|care cost|does care|is care|change*|update*|edit*|maintenance|maintain*|fix|fixes|broken|breaks|tweak*|after launch|support|look after|settl*|no time|too busy|hassle|overwhelm*|not techy|tech savvy|not good with tech|not good with computers|up to date|keep it updated|handle it',
      say: ['Care comes with every site: you just email Taya when something changes, and it’s handled. $12, $45 or $90 a month, matching your site. [What care covers →](care)',
        'Changes are part of care, as many as you need: hours, prices, photos, wording. Something big, like a new page, she quotes first. [How changes work →](faq)',
        '(sleepy) Updates? I update my nap schedule daily. Taya updates websites whenever you ask. [Care, explained →](care)',
        '(happy) New hours, a new photo? It’s just an email, and poof, it’s updated. Anything broken is fixed free. [Details →](care)',
        '(happy) The first 30 days after launch, tweaks are on Taya. After that, care keeps it going the same way: you email, she does it. [How care works →](care)',
        '(sleepy) Taya looks after your website so you don’t have to. More time for naps. I mean, your business 😂 [Care, explained →](care)'] },
    booking: { ex: 'proud', keys: 'book*|cal com|calcom|calendly|schedul*|appointment*|calendar|reservation*|stripe|sell|selling|shop|online store|products|ecommerce',
      say: ['Online booking lives in your own Cal.com account, free for one person, and it can take payments through your own Stripe. [See In Bloom →](prices)',
        '(sleepy) I book naps. Taya sets up real booking! Tended adds a Book button to the app you already use, and In Bloom sets it all up for you. [Prices →](prices)',
        'In Bloom sets up booking, payments or a little shop for you, and keeps it all running. [In Bloom →](prices)'] },
    newsletter: { ex: 'proud', keys: 'newsletter*|mailing list|email list|subscriber*|mailchimp|buttondown|substack',
      say: ['A newsletter sign-up comes with Tended and In Bloom, and care covers the sending. [Every cost →](costs)',
        '(giggle) I’d send a newsletter, but my only reader is a snail. Yours can have real readers! [The costs, said plainly →](costs)',
        '(happy) Tended and In Bloom come with a newsletter sign-up, and care covers sending it. [More →](costs)'] },
    google: { ex: 'proud', keys: 'google|seo|search|found|find me|rank*|map|maps|business profile|yelp|visible|traffic|mobile|phones|responsive|phone friendly|on my phone|on phones',
      say: ['Every site is built to be found: fast, phone-first, with clear titles for Google. Every build sets up your Google Business Profile too. [The Google answer →](faq)',
        '(giggle) Google and I aren’t speaking. But your site will be ready for it! [Will people find me? →](faq)',
        '(thinking) Taya won’t promise you’ll outrank a national chain. Nobody honestly can. But your site is built to be found. [Details →](faq)'] },
    hosting: { ex: 'proud', keys: 'host|hosting|hosted|domain*|web address|url|godaddy|squarespace|wix|wordpress|server*|porkbun|namecheap|email address|own email|the domain|a domain|my domain|get email|business email',
      say: ['Your web address’s first year comes with your build, and after that care covers it, hosting too. Nothing to renew. [Every cost →](costs)',
        '(thinking) A web address is your site’s name, like webfaery.love. Mine is “the mushroom.” [The web address guide →](domain)',
        '(happy) Your web address is in your name, so it’s yours. Email from your own address comes with Tended and In Bloom care. [How to get one →](domain)'] },
    founding: { ex: 'proud', keys: 'founding|founder*|discount*|deal|deals|sale|half off|coupon|promo*|special|offer|spots',
      say: ['Founding clients get half off the build! There are only a few spots. [The founding deal →](founding)',
        '(giggle) Half off the build for founding clients. I asked for half off too. They said I’m not a client. [See if spots are left →](founding)',
        'Half off the build for the first 5 founding clients, through December 31. Care stays the same small monthly price. [Details →](founding)'] },
    leave: { ex: 'proud', keys: 'leave|leaving|cancel*|own it|own my|ownership|mine|keep it|move it|transfer*|lock in|stuck|contract|quit|switch|take it with',
      say: ['It’s yours! Your site, your web address, your newsletter list. If you ever stop care, Taya hands you every file and login. [What if I want to leave? →](faq)',
        '(happy) No trap doors here. Leaving is easy and free, and Taya moves everything over to you within a week. [The details →](faq)',
        '(giggle) You can leave anytime! I can’t, I’m glued to this mushroom. [How leaving works →](faq)'] },
    guestbook: { ex: 'happy', keys: 'guestbook|guest book|guestbooks|sign it|leave a note|note|notes',
      say: ['There’s a guestbook! Like 2003! Leave a note in the soil ✨ [Sign the guestbook →](guestbook)',
        '(blushing) Oh, please sign it. Taya reads every note. I just look at the stamps. [The guestbook →](guestbook)',
        '(giggle) Remember guestbooks? I do. I’m very old. [Go sign it →](guestbook)'] },
    real: { ex: 'proud', keys: 'real|bot|robot|ai|chatgpt|gpt|human|alive|fake|computer|program|fairy|faery|chatbot|machine',
      say: ['A bot?! I’m Bramble, a faery. Obviously. Look at my wings ✨',
        '(giggle) Am I real? I’m as real as a mushroom at midnight.',
        'Not a robot! Robots don’t take ninth breaks.'] },
    joke: { ex: 'giggle', keys: 'joke|jokes|funny|make me laugh|something funny|pun|puns',
      say: ['Why did the mushroom get invited to every party? He’s a fungi 😂 ...I’ll see myself out.',
        'Why don’t faeries need wifi? We use the mushroom network. Slow, but very friendly ✨',
        'What’s a faery’s favorite kind of website? Hand-built. I’m biased 😂'] },
    compliment: { ex: 'blushing', keys: 'cute|adorable|pretty|beautiful|lovely|love|love you|like you|awesome|amazing|great|sweet|cool|nice|best|gorgeous|good job|well done|charming|smart|helpful',
      say: ['Stop it! ...No, keep going ✨', 'Eee! Thank you! I’ll tell the mushroom, it’ll be so proud.',
        'Aw. You’re sweet. I’d give you an acorn, but I spent them all on a moonbeam.', 'You’re making my wings go all fluttery.'] },
    hello: { ex: 'happy', keys: 'hi|hello|hey|heya|hiya|howdy|yo|good morning|good evening|greetings|sup|whats up|how are you|hows it going|hi faery|hey faery|hello faery|hi fairy|hey fairy|hello fairy|hi there|hey there|hello there',
      say: ['Hi hi! ✨ Ask me about prices, timing, or my many naps.', 'Hello! Welcome to the corner. It’s cozy here.', '(sleepy) Oh, hello! I was just resting my eyes.'] },
    thanks: { ex: 'happy', keys: 'thanks|thank you|thank|ty|thx|appreciate*|cheers',
      say: ['Anytime! Well, most times. I’m on a lot of breaks.', '(blushing) You’re welcome! That’s the most helpful I’ve been all week.',
        'Yay! Go have a lovely website ✨ [Get started →](start)'] },
    bye: { ex: 'happy', keys: 'bye|goodbye|good bye|see ya|see you|cya|good night|gotta go|farewell|later',
      say: ['Bye! I’ll be right here. On my mushroom. Probably asleep.', '(sleepy) Bye bye! Time for break number ten.', 'See you! Tell Taya I was helpful 😂'] },
    pay: { ex: 'proud', keys: 'do i pay|pay|payment*|deposit|card|credit|bank|invoice|venmo|paypal|installment*|upfront|up front',
      say: ['Half to start, which holds your spot, and half at launch. Card or bank transfer. Not acorns. [How paying works →](faq)',
        '(giggle) I tried paying in moonbeams once. Taya takes card or bank transfer: half to start, half at launch. [Details →](faq)',
        'Two halves: one to start, one at launch. Easy peasy. [How paying works →](faq)'] },
    contact: { ex: 'happy', keys: 'email|contact|reach|talk to|phone|call|text|message|get in touch|speak|real person|call taya|email taya|free chat|a chat|30 minute|video call|zoom|consult*|chat|talk|chat with|quick chat|quick call|book a call|book a chat|book a time|book time|schedule a call|can we talk|lets talk|love to talk|can we meet',
      say: ['Taya reads every email and writes back herself: [taya@webfaery.love](email)',
        '(proud) Email is best! She writes back personally: [taya@webfaery.love](email)', 'Here’s the magic portal: [taya@webfaery.love](email) ✨'] },
    writing: { ex: 'proud', keys: 'write|writing|words|copy|content|do i have to|text for|how does it work|how does this work|how it works|process|steps',
      say: ['Nope, you don’t have to write it! You answer a few easy questions by email (or chat with Taya, if you’d rather), and she writes your words from that. [How it works →](how)',
        '(happy) Taya writes it for you! You answer a few questions about your work. I would answer them all with moss. [How it works →](how)',
        '(giggle) She writes, you read it and say what doesn’t sound like you, she fixes it. I just supervise. [The steps →](how)'] },
    ownart: { ex: 'proud', keys: 'own artwork|own art|my art|my artwork|bring my|artwork|art|artist|artists|drawing*|illustrat*|flash|lettering|sketch*|painting*|logo|logos|graphic*|tattoo*|my designs|own designs',
      say: ['Yes!! Send Taya your flash, lettering, drawings, patterns, whatever you make, and she builds it right into your site: headers, dividers, buttons, backgrounds, even the little animation. [Email her your art →](email)',
        '(giggle) Your art, on your site? That’s the whole point! It should look like YOU made it, not a template. I asked if she’d put my doodles on hers. She said “maybe.” 😂 [Send yours →](email)',
        '(proud) Bring it all! Tattoo flash, hand lettering, a logo you drew on a napkin. Taya turns it into the bones of your site. [Start here →](start)'] },
    ok: { ex: 'giggle', keys: 'ok|okay|k|yes|yeah|yep|yup|no|nope|nah|lol|haha|hehe|lmao|hmm|hm|sure',
      say: ['Hehe ✨ Ask me anything else! Prices, timing, naps...', '(happy) Okay! I’ll be right here, on my mushroom.',
        '(sleepy) Mm-hm. Sorry, I dozed off. Where were we? [The questions page →](faq)'] },
    more: { ex: 'thinking', keys: 'anything else|what else|more|other questions|faq|questions|help|what can you do|what do you know|what can i ask',
      say: ['Ooh, I know things! Ask me about hosting, Google, booking or leaving. Or [every answer is here →](faq)',
        '(happy) Anything else? Um. Did you know there’s a guestbook? And a quiz? [The quiz →](quiz) [The guestbook →](guestbook)',
        'All the real answers live in the questions section. I just live on a mushroom. [Questions →](faq)'] },
    nap: { ex: 'sleepy', keys: 'sleep|sleepy|nap|naps|napping|tired|lazy|yawn|on break|ninth break|your break|a break|wings|mushroom|mushrooms|do you fly|can you fly|flying',
      say: ['(giggle) I nap, I fly, I sit on a mushroom. Taya does the actual work. [Her work →](work)',
        'Break number nine is going great, thanks for asking. Zzz.',
        '(proud) This mushroom? Best seat in the whole corner. I don’t share it 😂',
        '(blushing) My wings? Aw. They’re mostly for show. And for little flights when nobody’s looking ✨'] },
    weird: { ex: 'surprised', keys: 'meaning of life|weather|favorite|favourite|how old|unicorn*|dragon*|pizza|coffee|tea|cat|cats|dog|dogs|sing|dance|magic|spell*|potion*|marry|horoscope|zodiac|moon|stars|ghost*|alien*|taco*|snack*|hungry',
      say: ['Oh! That’s a big question for a small faery. Taya might know. [She reads every email →](email)',
        'Whoa. I did not study for this. [Ask Taya →](email)',
        '(giggle) My answer is “mushrooms.” It’s always mushrooms.',
        '(sleepy) I only know three things: moss, naps and websites. Mostly naps.'] },
    long: { ex: 'surprised', keys: '',
      say: ['Whoa, that’s a lot of words! Big questions are Taya’s thing. [She reads every email →](email)',
        '(flustered) Okay, I read the first bit and then a moth flew by. Could you send that to Taya? [taya@webfaery.love](email)',
        'That’s a real question! It deserves a real human. [Email Taya →](email)'] },
    fallback: { ex: 'flustered', keys: '',
      say: ['No idea! But Taya does. [She reads every email →](email)',
        'Hmm. That one’s above my pay grade. My pay is acorns. [Ask Taya →](email)',
        'I... don’t know that one. Taya will though: [taya@webfaery.love](email)',
        'Oops, I was on break. Try [the questions page →](faq) or [email Taya →](email)',
        '(thinking) Hmm. The moss doesn’t know either. [Email Taya →](email)'] }
  };

  /* ================= 3. FACES =================
     eyes  brows  mouth  arms  blush  effect  body-move        (- = none)
     eyes: open star shut happy wink wide droopy flat squeeze, or open + a glance: up shy side
     arms: rest wave chin mouth cheeks crossed hips shrug fly */
  var FACES = {
    neutral:   'open normal cat rest n - -',
    happy:     'happy up open rest n note bounce',
    giggle:    'wink normal cat mouth n sparkle shake',
    proud:     'star up cat hips n sparkle chin',
    thinking:  'up worried cat chin n dots think',
    flustered: 'squeeze worried wavy shrug big sweat shrug',
    sleepy:    'droopy worried yawn rest n zzz droop',
    blushing:  'shy worried cat cheeks big heart wiggle',
    pouty:     'shut cross pout crossed puff grr huff',   // eyes shut, "hmph!": a pout, never a glare
    surprised: 'wide up o rest n bang hop',
    flying:    'open normal open fly n - -'     // not an answer face: how she looks mid-flight
  };
  var LOOK = { up: [1.4, -1.9], shy: [-1.3, 1.3], side: [-1.7, 0.4] };

  /* ================= 4. the machinery ================= */
  var d = document, W = window, A = CONFIG.art, png = !!A.sit, BASE = W.webFaeryBase || '';
  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var coarse = W.matchMedia && W.matchMedia('(pointer: coarse)').matches;
  try { if (sessionStorage.getItem('webfaery-shoo')) return; } catch (e) { /* storage blocked: she just stays */ }
  if (W.webFaery) return;

  var root, dock, btn, rig, act, panel, log, input, live, parts = {}, looks = [], timers = {}, st = { eyes: 'open', lift: 0 },
    isOpen = false, flying = null, typing = null, pointer = null, gone = false;
  function still() { return mq.matches; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function later(k, fn, ms) { clearTimeout(timers[k]); timers[k] = setTimeout(fn, ms); }

  function build() {
    var art = standInArt();
    function img(src, part, v) { return src ? '<img src="' + src + '" alt="" draggable="false"' + (part ? ' data-part="' + part + '" data-v="' + v + '"' : '') + '>' : ''; }
    function layer(cls, html) { return '<span class="fy-l ' + cls + '">' + html + '</span>'; }
    var body = png ? img(A.sit, 'pose', 'sit') + img(A.sitBlink, 'pose', 'blink') + img(A.fly, 'pose', 'fly') + img(A.mouthO, 'mouth', 'o') + img(A.mouthOpen, 'mouth', 'open') +
      Object.keys(A.faces || {}).map(function (k) { return img(A.faces[k], 'face', k); }).join('') : art.body;
    root = d.createElement('div');
    root.className = 'fy';
    root.innerHTML = '<div class="fy-dock">' +
      '<div class="fy-panel" role="dialog" aria-labelledby="fy-title" tabindex="-1" hidden>' +
        '<div class="fy-top"><p class="fy-title" id="fy-title">Ask Bramble <small>Customer service · on break</small></p>' +
        '<button type="button" class="fy-shoo" aria-label="Shoo, hide Bramble for this visit" title="Hide her for this visit">Shoo</button>' +
        '<button type="button" class="fy-x" aria-label="Close"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button></div>' +
        '<div class="fy-log"></div><div class="fy-chips"></div>' +
        '<form class="fy-form"><label class="fy-sr" for="fy-q">Ask me anything</label>' +
        '<input id="fy-q" type="text" placeholder="Ask me anything" autocomplete="off" enterkeyhint="send" maxlength="400">' +
        '<button type="submit" aria-label="Send"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5.5 15.5 10 11 14.5"/></svg></button></form>' +
        '<p class="fy-sr" aria-live="polite"></p></div>' +
      '<button type="button" class="fy-btn" aria-label="Ask Bramble the faery a question" aria-haspopup="dialog" aria-expanded="false">' +
        layer('fy-mush', png && A.mushroom ? img(A.mushroom) : art.mushroom) +
        '<span class="fy-rig"><span class="fy-sway"><span class="fy-act">' +
          layer('fy-wl', png && A.wingLeft ? img(A.wingLeft) : art.wingL) + layer('fy-wr', png && A.wingRight ? img(A.wingRight) : art.wingR) +
          layer('fy-body', body) + layer('fy-fx', art.fx) +
        '</span></span></span></button></div>';
    dock = root.firstChild; panel = dock.firstChild; btn = dock.lastChild;
    rig = btn.querySelector('.fy-rig'); act = btn.querySelector('.fy-act');
    log = panel.querySelector('.fy-log'); input = panel.querySelector('input'); live = panel.lastChild;
    root.querySelectorAll('[data-part]').forEach(function (el) { (parts[el.getAttribute('data-part')] = parts[el.getAttribute('data-part')] || []).push(el); });
    looks = [].slice.call(root.querySelectorAll('.fy-look'));
    var chips = panel.querySelector('.fy-chips');
    CHIPS.forEach(function (c) {
      var b = d.createElement('button'); b.type = 'button'; b.className = 'fy-chip'; b.textContent = c[0];
      b.onclick = function () { ask(c[0], c[1]); }; chips.appendChild(b);
    });
    d.body.appendChild(root);
    pose('sit'); face('neutral');
  }

  /* ---- showing one variant of each part ---- */
  function show(part, v) { (parts[part] || []).forEach(function (el) { el.style.display = el.getAttribute('data-v') === v ? '' : 'none'; }); }
  function mouth(v) { st.mouth = v; show('mouth', v); }
  function arms(v) { show('armsB', v); show('armsF', v); }
  function gaze(v) { var t = v ? 'translate(' + v[0] + 'px,' + v[1] + 'px)' : ''; looks.forEach(function (g) { g.style.transform = t; }); }
  function face(name, arm, move) {
    var f = (FACES[name] || FACES.neutral).split(' '), eyes = f[0];
    st.ex = name;
    root.setAttribute('data-ex', name);   // the curl on her head reads this (faery.css)
    st.eyes = LOOK[eyes] ? 'open' : eyes;
    show('eyes', st.eyes); gaze(LOOK[eyes]); show('brows', f[1]); mouth(f[2]);
    if (st.pose !== 'fly') arms(arm || f[3]);
    show('blush', f[4]); show('cheek', f[4] === 'puff' ? 'puff' : 'none'); show('fx', f[5]); show('face', name);
    root.classList.remove('fy-tl', 'fy-tr');
    act.className = 'fy-act'; void act.offsetWidth;
    move = move || f[6];
    if (move !== '-') act.classList.add('fy-m-' + move);
  }
  function pose(p) {
    st.pose = p; root.setAttribute('data-pose', p); show('pose', p);
    if (p === 'fly') { arms('fly'); gaze([1.5, 0]); }
  }
  function blink() {
    later('blink', blink, rnd(2200, 6400));
    if (png) {
      if (st.ex !== 'neutral' || st.pose !== 'sit' || !A.sitBlink) return;
      show('pose', 'blink'); setTimeout(function () { if (st.pose === 'sit') show('pose', 'sit'); }, 140); return;
    }
    if (st.eyes !== 'open') return;
    show('eyes', 'shut');
    setTimeout(function () { if (st.eyes === 'open') show('eyes', 'open'); }, 130);
    if (Math.random() < 0.2) setTimeout(function () { if (st.eyes === 'open') { show('eyes', 'shut'); setTimeout(function () { if (st.eyes === 'open') show('eyes', 'open'); }, 110); } }, 300);
  }
  /* idle life: glance at the pointer, tilt her head, kick her feet */
  function idle() {
    later('idle', idle, rnd(1800, 4200));
    if (typing || flying || st.ex !== 'neutral' || gone) return;
    var r = Math.random();
    if (r < 0.4 && pointer && Date.now() - pointer.t < 5000) {
      var b = btn.getBoundingClientRect(), dx = pointer.x - (b.left + b.width / 2), dy = pointer.y - (b.top + b.height * 0.36), l = Math.hypot(dx, dy) || 1;
      gaze([dx / l * 1.7, dy / l * 1.5]);
    } else if (r < 0.55) gaze(null);
    else if (r < 0.68 && !still()) { root.classList.add(Math.random() < 0.5 ? 'fy-tl' : 'fy-tr'); later('tilt', function () { root.classList.remove('fy-tl', 'fy-tr'); }, 1700); }
    else if (r < 0.78 && !still()) { root.classList.add('fy-kick'); later('kick', function () { root.classList.remove('fy-kick'); }, 800); }
  }

  /* ---- understanding a question ---- */
  var EMOJI = [[/[❤♥💕💖💗💓💞💘💜💚💛🧡💙😍🥰😘🤩]/gu, ' cute '], [/[😂🤣😆😹😄😁😀😃😊🙂😅]/gu, ' lol '], [/👋/gu, ' hi '],
    [/🙏/gu, ' thanks '], [/🍄/gu, ' mushroom '], [/🧚/gu, ' faery '], [/[💰💵💸🤑]/gu, ' price '], [/[🖕💩😡🤬👎]/gu, ' stupid '], [/[😴💤🥱]/gu, ' nap ']];
  function norm(s) {
    EMOJI.forEach(function (e) { s = s.replace(e[0], e[1]); });
    return ' ' + s.toLowerCase().replace(/[’‘`]/g, "'").replace(/\$/g, ' $ ').replace(/'/g, '').replace(/[^a-z0-9$ ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }
  /* one typo apart: a letter added, dropped, changed, or two swapped */
  function near(a, b) {
    var la = a.length, lb = b.length, i = 0;
    if (Math.abs(la - lb) > 1) return false;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }
  /* a typo, unless the word is one she already knows ("love" is love, not a misspelled "move") */
  var KNOWN;
  function typo(w, k) {
    if (!KNOWN) { KNOWN = {}; Object.keys(LINES).forEach(function (n) { (LINES[n].keys || '').replace(/\*/g, '').split(/[| ]/).forEach(function (x) { KNOWN[x] = 1; }); }); }
    return w.length > 3 && !KNOWN[w] && near(w, k);
  }
  /* a phrase, allowing one typo in each word of four letters or more ("how mcuh", "how lnog") */
  function phrase(words, key) {
    var kw = key.split(' ');
    for (var i = 0; i + kw.length <= words.length; i++) {
      if (kw.every(function (k, j) { var w = words[i + j]; return w === k || (k.length > 3 && typo(w, k)); })) return true;
    }
    return false;
  }
  /* "how much" questions about one thing (care, hosting, booking...) get that thing's answer, not the price list */
  var SPECIFIC = ['care', 'hosting', 'newsletter', 'booking', 'founding', 'costs', 'pay'];
  function match(q) {
    var t = norm(q), words = t.trim().split(' '), best = 'fallback', top = 0, score = {};
    if (q.length > 180) return 'long';
    Object.keys(LINES).forEach(function (k) {
      var s = 0;
      (LINES[k].keys || '').split('|').forEach(function (key) {
        if (!key) return;
        if (key.indexOf(' ') > -1) { if (t.indexOf(' ' + key + ' ') > -1) s += key.length + 2; else if (phrase(words, key)) s += key.length; }
        else if (key.slice(-1) === '*') { var stem = key.slice(0, -1); if (words.some(function (w) { return w.indexOf(stem) === 0; })) s += stem.length; }
        else if (words.indexOf(key) > -1) s += key.length;
        else if (key.length > 4 && words.some(function (w) { return typo(w, key); })) s += key.length - 2;
      });
      score[k] = s;
      if (s > top) { top = s; best = k; }
    });
    if (best === 'price') SPECIFIC.forEach(function (k) { if (score[k] >= 4 && (best === 'price' || score[k] > score[best])) best = k; });
    return best;
  }
  function pick(set) {
    var n = set.say.length, last = set.last, i = last == null ? 0 : Math.floor(Math.random() * (n < 2 ? n : n - 1));
    if (last != null && n > 1 && i >= last) i++;
    set.last = i; return set.say[i];
  }
  function href(k) {
    var h = CONFIG.links[k] || k, m = /^index\.html#(.+)$/.exec(h);
    if (m && /(^|\/)(index\.html)?$/.test(location.pathname) && d.getElementById(m[1])) return '#' + m[1];
    return /^(mailto:|https?:|#)/.test(h) ? h : BASE + h;
  }
  function render(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, txt, k) {
        var h = href(k);
        var out = /^https?:/.test(h);
        return '<a href="' + h + '"' + (out ? ' target="_blank" rel="noopener"' : '') + '>' + txt + (out ? '<span class="fy-sr"> (opens in a new tab)</span>' : '') + '</a>';
      });
  }

  /* ---- talking ---- */
  function addMsg(cls, text) {
    var el = d.createElement('div'); el.className = 'fy-msg ' + cls; el.textContent = text || '';
    log.appendChild(el);
    while (log.children.length > 12) log.removeChild(log.firstChild);
    scroll(); return el;
  }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function ask(shown, q) {
    finish();
    addMsg('fy-you', shown);
    var key = match(q || shown);
    say(pick(LINES[key]), LINES[key].ex);
  }
  function say(line, ex, arm, now) {
    var m = /^\((\w+)\)\s*/.exec(line);
    if (m && FACES[m[1]]) { ex = m[1]; line = line.slice(m[0].length); }
    clearTimeout(timers.calm);
    var el = addMsg('fy-her'), html = render(line);
    typing = { el: el, html: html, ex: ex, arm: arm };
    if (still()) { face(ex, arm); return done(); }
    if (now) { face(ex, arm, 'hop'); return later('think', function () { type(); }, 420); }
    el.className += ' fy-typing'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="fy-dots"><i></i><i></i><i></i></span>';
    face('thinking');
    later('think', function () { face(ex, arm); later('think', type, 380); }, rnd(550, 1000));
  }
  function type() {
    var el = typing.el, nodes = [], w, n, i = 0, j = 0;
    el.classList.remove('fy-typing'); el.setAttribute('aria-hidden', 'true'); el.innerHTML = typing.html;
    w = d.createTreeWalker(el, 4);
    while ((n = w.nextNode())) { if (n.parentNode.className === 'fy-sr') continue; nodes.push({ n: n, t: Array.from(n.data) }); n.data = ''; }   // hidden words aren't typed out
    talk(true);
    (function step() {
      var cur = nodes[i];
      if (!cur) return done();
      var ch = cur.t[j++];
      cur.n.data += ch;
      if (j >= cur.t.length) { i++; j = 0; }
      var pause = /[.!?…]/.test(ch) ? 260 : /[,:;]/.test(ch) ? 130 : 0;
      st.talking = !pause;
      if (j % 16 === 0) scroll();
      timers.type = setTimeout(step, pause || CONFIG.typeMs);
    })();
  }
  function talk(on) {
    clearInterval(timers.talk);
    if (still()) return mouth((FACES[st.ex] || FACES.neutral).split(' ')[2]);   // no flapping: keep the face's own mouth
    if (!on) return mouth('cat');
    var k = 0, F = ['o', 'open', 'o', 'cat'];
    timers.talk = setInterval(function () { mouth(st.talking ? F[k++ % 4] : 'cat'); }, 105);
  }
  function done() {
    if (!typing) return;
    clearTimeout(timers.type); clearTimeout(timers.think); talk(false);
    var t = typing; typing = null;
    t.el.classList.remove('fy-typing'); t.el.innerHTML = t.html; t.el.removeAttribute('aria-hidden');
    live.textContent = '';
    setTimeout(function () { live.textContent = t.el.textContent; }, 60);
    scroll();
    later('calm', function () { if (!typing) face('neutral'); }, 3800);
  }
  function finish() { if (typing) { if (st.ex === 'thinking') face(typing.ex, typing.arm); done(); } }

  /* ---- opening and closing the bubble ---- */
  function openChat(kb) {
    if (isOpen || gone) return;
    isOpen = true;
    if (flying) land(true);
    clearTimeout(timers.flight);
    lift(0); root.classList.remove('fy-away');
    panel.hidden = false; root.classList.add('fy-open'); btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('fy-shown'); }); });
    viewport();
    if (!log.children.length) say(GREET[Math.floor(Math.random() * GREET.length)], 'happy', 'wave', true);
    else { face('happy', 'wave', 'hop'); later('calm', function () { if (!typing) face('neutral'); }, 1600); }
    (kb ? input : panel).focus({ preventScroll: true });
  }
  function closeChat(refocus) {
    if (!isOpen) return;
    isOpen = false;
    finish();
    root.classList.remove('fy-shown'); btn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (!isOpen) { panel.hidden = true; root.classList.remove('fy-open'); } }, still() ? 0 : 220);
    face('happy', 'wave', '-');
    later('calm', function () { face('neutral'); }, 1400);
    if (refocus) btn.focus({ preventScroll: true });
    plan(); later('place', place, 400);
  }
  function shoo() {
    try { sessionStorage.setItem('webfaery-shoo', '1'); } catch (e) { /* fine, she leaves anyway */ }
    closeChat(false);
    gone = true;
    Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); clearInterval(timers[k]); });
    face('happy', 'wave', '-');
    root.classList.add('fy-bye');
    setTimeout(function () { root.remove(); }, still() ? 400 : 1500);
  }
  /* phones: keep the bubble above the on-screen keyboard */
  function viewport() {
    var v = W.visualViewport, kb = isOpen && v && d.activeElement === input;
    root.style.setProperty('--fy-kb', kb ? Math.max(0, innerHeight - v.height - v.offsetTop) + 'px' : '0px');
    if (v) root.style.setProperty('--fy-vh', (kb ? v.height : innerHeight) + 'px');
  }

  /* ---- never in the way: lift above buttons and fields under her, or tuck away ---- */
  var SEL = 'a[href],button,input,select,textarea,summary,label,[role=button],[tabindex]:not([tabindex="-1"])';
  function lift(px) { st.lift = px; dock.style.setProperty('--fy-lift', px + 'px'); }
  function under(x0, y0, x1, y1) {
    var top = null;
    // five rows down her height (about every 18px), so even a one-line label can't slip between them
    for (var i = 0; i < 3; i++) for (var j = 0; j < 5; j++) {
      var els = d.elementsFromPoint(x0 + 3 + (x1 - x0 - 6) * i / 2, y0 + 3 + (y1 - y0 - 6) * j / 4);
      for (var k = 0; k < els.length; k++) {
        if (root.contains(els[k])) continue;
        var h = els[k].closest(SEL), b = h && h.getBoundingClientRect();
        // a big card link stays easy to tap around her, so only smaller targets count, plus every form field
        // and every answer choice (a label, however tall: its words are what people read before they pick)
        if (h && (b.height < 150 || /^(INPUT|SELECT|TEXTAREA|LABEL)$/.test(h.tagName)) && (top === null || b.top < top)) top = b.top;
        break;
      }
    }
    return top;
  }
  function place() {
    if (isOpen || flying || gone) return;
    var r = btn.getBoundingClientRect(), base = r.bottom + st.lift, h = r.height, up = 0, away = false;
    for (var n = 0; n < 4; n++) {
      var top = under(r.left, base - up - h, r.right, base - up);
      if (top === null) break;
      up = base - top + 10;
      if (up > 130) { away = true; up = 0; break; }
    }
    var f = d.activeElement;
    if (coarse && f && !root.contains(f) && f.matches('input,select,textarea,[contenteditable="true"]')) away = true;
    lift(up); root.classList.toggle('fy-away', away);
  }

  /* ---- little flights ---- */
  function plan() {
    clearTimeout(timers.flight);
    if (!still() && !gone) timers.flight = setTimeout(fly, rnd(CONFIG.flightEvery[0], CONFIG.flightEvery[1]) * 1000);
  }
  function cr(p0, p1, p2, p3, t) {
    return [0, 1].map(function (a) {
      return 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t * t + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t * t * t);
    });
  }
  function fly() {
    if (isOpen || d.hidden || still() || typing || gone || root.classList.contains('fy-away') || !rig.animate) return plan();
    var r = btn.getBoundingClientRect(), X = Math.min(r.left - 16, 620), Y = Math.min(r.top - 16, innerHeight * 0.62, 480);
    if (X < 90 || Y < 90) return plan();
    var j = function (v) { return v + rnd(-0.07, 0.07); };
    var P = [[0, 0], [j(-0.1), j(-0.4)], [j(-0.5), j(-0.9)], [j(-0.92), j(-0.58)], [j(-0.62), j(-0.2)], [j(-0.36), j(-0.52)], [j(-0.56), j(-0.74)], [j(-0.3), j(-0.36)], [0, 0]]
      .map(function (p) { return [p[0] * X, Math.min(0, p[1] * Y)]; });
    var pts = [];
    for (var i = 0; i < P.length - 1; i++) for (var s = 0; s < 7; s++) pts.push(cr(P[Math.max(0, i - 1)], P[i], P[i + 1], P[Math.min(P.length - 1, i + 2)], s / 7));
    pts.push([0, 0]);
    var dir = -1, frames = pts.map(function (p, k) {
      var q = pts[Math.min(k + 1, pts.length - 1)], dx = q[0] - p[0], dy = q[1] - p[1];
      if (dx > 2) dir = 1; else if (dx < -2) dir = -1;
      var a = Math.max(-16, Math.min(16, dir * Math.atan2(dy, Math.abs(dx) + 0.01) * 57.3 * 0.4));
      return { transform: 'translate(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px) rotate(' + a.toFixed(1) + 'deg) scaleX(' + dir + ')' };
    });
    frames[0].transform = frames[frames.length - 1].transform = 'none';
    pose('fly'); face('flying'); pose('fly');
    flying = rig.animate(frames, { duration: rnd(4400, 5800), easing: 'ease-in-out' });
    var lastX = null, lastY = null;
    timers.trail = setInterval(function () {
      var b = rig.getBoundingClientRect(), x = b.left + b.width * 0.5, y = b.top + b.height * 0.6;
      if (lastX !== null && Math.hypot(x - lastX, y - lastY) < 8) return;
      lastX = x; lastY = y;
      var sp = d.createElement('i'); sp.className = 'fy-spark'; sp.style.left = x + 'px'; sp.style.top = y + 'px';
      root.appendChild(sp); setTimeout(function () { sp.remove(); }, 1100);
    }, 90);
    flying.onfinish = function () { land(false); };
  }
  function land(fast) {
    if (!flying) return;
    var cur = fast ? getComputedStyle(rig).transform : null;
    clearInterval(timers.trail);
    flying.onfinish = null; flying.cancel(); flying = null;
    if (cur && cur !== 'none') rig.animate([{ transform: cur }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    pose('sit'); face(fast ? 'happy' : 'neutral', null, 'bounce');
    if (!fast) { plan(); later('place', place, 300); }
  }

  /* ---- wiring ---- */
  function init() {
    if (!d.body || gone) return;
    build();
    btn.addEventListener('click', function (e) { if (isOpen) closeChat(true); else openChat(e.detail === 0); });
    panel.querySelector('.fy-x').onclick = function () { closeChat(true); };
    panel.querySelector('.fy-shoo').onclick = shoo;
    panel.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (q) { input.value = ''; ask(q); } else input.focus();
    };
    log.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return finish();   // tap the words to skip the typing
      if (a.getAttribute('href').charAt(0) === '#') {
        var t = d.getElementById(a.getAttribute('href').slice(1));
        if (t && t.tagName === 'DETAILS') t.open = true;
        closeChat(false);
      }
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) { e.preventDefault(); closeChat(root.contains(d.activeElement)); } });
    d.addEventListener('pointerdown', function (e) {
      pointer = { x: e.clientX, y: e.clientY, t: Date.now() };
      if (isOpen && !root.contains(e.target)) closeChat(false);
    }, true);
    d.addEventListener('pointermove', function (e) { pointer = { x: e.clientX, y: e.clientY, t: Date.now() }; }, { passive: true });
    function soon() { later('place', place, 160); later('place2', place, 1200); }   // again once scroll-reveals settle
    W.addEventListener('scroll', soon, { passive: true });
    // the page's own entrances (the hero's buttons rising into place) can end under her after she last looked
    d.addEventListener('animationend', function (e) { var t = e.target; if (!root.contains(t) && t.matches && (t.matches(SEL) || t.querySelector(SEL))) soon(); }, true);
    W.addEventListener('resize', function () { soon(); if (isOpen) viewport(); });
    d.addEventListener('focusin', function () { soon(); viewport(); });
    d.addEventListener('focusout', function () { soon(); setTimeout(viewport, 50); });
    if (W.visualViewport) { W.visualViewport.addEventListener('resize', function () { if (isOpen) viewport(); }); W.visualViewport.addEventListener('scroll', function () { if (isOpen) viewport(); }); }
    d.addEventListener('visibilitychange', function () { if (!d.hidden) plan(); });
    if (mq.addEventListener) mq.addEventListener('change', function () { if (still() && flying) land(true); plan(); });
    blink(); idle(); plan(); soon();
    W.webFaery = { ask: function (q) { openChat(false); ask(q); }, face: face, fly: fly, match: match, lines: LINES, faces: FACES };
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();

/* ================= the stand-in drawing ================= */
/*ART-START*/
  /* The stand-in drawing. Every layer shares one canvas, viewBox 0 0 100 130 (like layers in Procreate),
     so they line up on their own. pick = { eyes: 'open', ... } keeps only those variants (for the exported
     files); without it, every variant is included and the script shows one of each at a time. */
  function standInArt(pick) {
    var O = '#1b1016', SK = '#ffeadc', SKS = '#f7c9b7', HA = '#d9a85a', HAD = '#9c6a2c', HAL = '#f3d79c',
      DR = '#5e7d40', DRD = '#3f5a2a', DRL = '#88a660', CR = '#ece3d3', BO = '#4d3524', MO = '#83403a';
    function num(v) { return Math.round(v * 100) / 100; }
    function P(d, fill, w, x) { return '<path d="' + d + '" fill="' + (fill || 'none') + '"' + (w ? ' stroke="' + O + '" stroke-width="' + w + '"' : '') + (x || '') + '/>'; }
    function S(d, c, w, x) { return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '"' + (x || '') + '/>'; }
    function E(cx, cy, rx, ry, fill, w, x) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' + (w ? ' stroke="' + O + '" stroke-width="' + w + '"' : '') + (x || '') + '/>'; }
    function limb(d, w) { return S(d, O, w + 1.9) + S(d, SK, w); }
    function hand(x, y, r) { return E(x, y, r || 2.2, r || 2.2, SK, 1); }
    function mir(d) { var i = 0; return d.replace(/-?\d*\.?\d+/g, function (m) { return (i++ % 2) ? m : num(100 - m); }); }
    function V(part, v, s, cls) { return pick && pick[part] !== v ? '' : '<g data-part="' + part + '" data-v="' + v + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + s + '</g>'; }
    function svg(body, defs) { return '<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><g stroke-linecap="round" stroke-linejoin="round">' + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</g></svg>'; }
    function star(x, y, r, c) { var k = r * 0.22; return P('M' + x + ' ' + (y - r) + ' Q' + num(x + k) + ' ' + num(y - k) + ' ' + (x + r) + ' ' + y + ' Q' + num(x + k) + ' ' + num(y + k) + ' ' + x + ' ' + (y + r) + ' Q' + num(x - k) + ' ' + num(y + k) + ' ' + (x - r) + ' ' + y + ' Q' + num(x - k) + ' ' + num(y - k) + ' ' + x + ' ' + (y - r) + ' Z', c); }
    function at(x, s) { return '<g transform="translate(' + x + ' 0)">' + s + '</g>'; }

    /* ---- eyes, drawn around x = 0 and moved into place (40 and 60) ---- */
    var SCL = 'M-5 45.6 C-5 42.4 -2.8 41 0 41 C2.8 41 5 42.4 5 45.6 L5 50.2 C5 53 2.8 54.4 0 54.4 C-2.8 54.4 -5 53 -5 50.2 Z';
    function lash(s) { return S('M-5.5 46.2 C-5.3 42.4 -2.8 40.5 0 40.5 C2.9 40.5 5.3 42.2 5.6 45.8', O, 2.2) + S('M' + (s * 5.1) + ' 44 L' + (s * 7) + ' 42.4', O, 1.4) + S('M-2.4 54.9 Q0 55.6 2.4 54.9', O, 0.7); }
    function iris(big) {
      return '<g class="fy-look">' + E(0, 48.4, 4.2, 5.5, 'url(#fy-iris)') + E(0, 49, 2.1, 3, '#0f1c16') + E(0, 52.3, 2.7, 1.3, '#efe0a8', 0, ' opacity=".8"') +
        (big === 'star' ? star(-1.5, 46, 2.5, '#fff') : '<circle cx="-1.7" cy="45.9" r="1.75" fill="#fff"/>') + '<circle cx="1.9" cy="51.2" r=".85" fill="#fff"/></g>';
    }
    function open(s, big) { return '<g clip-path="url(#fy-eclip)">' + P(SCL, '#fffaf6') + iris(big) + '</g>' + lash(s); }
    function wide(s) { return '<g clip-path="url(#fy-eclip)">' + P(SCL, '#fffaf6') + '<g class="fy-look">' + E(0, 48.2, 2.9, 3.7, 'url(#fy-iris)') + E(0, 48.4, 1.4, 2, '#0f1c16') + '<circle cx="-1" cy="46.8" r="1.1" fill="#fff"/></g></g>' + S('M-5.5 45.4 C-5.3 41.2 -2.8 39.6 0 39.6 C2.9 39.6 5.3 41 5.6 45', O, 2) + S('M' + (s * 5.1) + ' 43.2 L' + (s * 6.9) + ' 41.6', O, 1.3); }
    function lid(y, s) { return P('M-6 39 L6 39 L6 ' + y + ' C3 ' + (y + 0.9) + ' -3 ' + (y + 0.9) + ' -6 ' + y + ' Z', SK) + S('M-5.5 ' + (y + 0.2) + ' C-3 ' + (y + 1) + ' 3 ' + (y + 1) + ' 5.5 ' + (y + 0.2), O, 2.1) + S('M' + (s * 5.2) + ' ' + (y + 0.1) + ' L' + (s * 6.8) + ' ' + (y + 1.1), O, 1.2); }
    var shut = S('M-5 47.8 C-3 50.6 3 50.6 5 47.8', O, 2);
    var happy = S('M-4.9 50.2 C-3.2 44.6 3.2 44.6 4.9 50.2', O, 2.2);
    function both(fl, fr) { return at(40, fl(-1)) + at(60, (fr || fl)(1)); }
    var eyes =
      V('eyes', 'open', both(open, open)) +
      V('eyes', 'star', both(function (s) { return open(s, 'star'); }, function (s) { return open(s, 'star'); })) +
      V('eyes', 'shut', at(40, shut) + at(60, shut)) +
      V('eyes', 'happy', at(40, happy) + at(60, happy)) +
      V('eyes', 'wink', at(40, open(-1)) + at(60, happy)) +
      V('eyes', 'wide', both(wide, wide)) +
      V('eyes', 'droopy', both(function (s) { return open(s) + P('M-7.6 39 L7.6 39 L7.6 48.6 L6 49.4 C3 51.6 -3 51.6 -6 49.4 L-7.6 48.6 Z', SK) + S('M-5.4 49.6 C-3 51.8 3 51.8 5.4 49.6', O, 2) + S('M' + (s * 5.2) + ' 49.8 L' + (s * 6.6) + ' 51', O, 1.1); }, null)) +
      V('eyes', 'flat', both(function (s) { return open(s) + lid(44.6, s); }, function (s) { return open(s) + lid(44.6, s); })) +
      V('eyes', 'squeeze', at(40, S('M-3.4 43.6 L3.6 47.8 L-3.4 52', O, 2.1)) + at(60, S('M3.4 43.6 L-3.6 47.8 L3.4 52', O, 2.1)));

    var BR = '#5e3d1f';
    function brow(d) { return S(d, BR, 1.15) + S(mir(d), BR, 1.15); }
    var brows =
      V('brows', 'normal', brow('M35.6 38.5 C37.6 37.1 40.6 36.9 43.2 37.9')) +
      V('brows', 'up', brow('M35.6 36.6 C37.6 35 40.6 34.8 43.2 35.8')) +
      V('brows', 'worried', brow('M35.4 38.8 C37.8 38.6 40.8 37.6 42.8 35.6')) +
      V('brows', 'cross', brow('M35.6 36.8 C37.8 36.8 40.6 37.4 42.8 38.8'));

    var mouths =
      V('mouth', 'cat', S('M47.2 56.7 C47.8 58.4 49.3 58.5 50 57 C50.7 58.5 52.2 58.4 52.8 56.7', O, 1.05)) +
      V('mouth', 'o', E(50, 57.9, 1.4, 1.7, MO, 0.9)) +
      V('mouth', 'open', P('M46.8 56.5 C48.6 57.3 51.4 57.3 53.2 56.5 C53 59.5 51.6 61.1 50 61.1 C48.4 61.1 47 59.5 46.8 56.5 Z', MO, 0.95) + P('M48.1 59.8 C49 58.9 51 58.9 51.9 59.8 C51.2 60.7 48.8 60.7 48.1 59.8 Z', '#ff9aad')) +
      V('mouth', 'pout', S('M51.2 56.2 C49.4 56 49.2 57.5 50.6 57.7 C49.2 57.9 49.4 59.5 51.2 59.3', O, 1.05)) +
      V('mouth', 'yawn', E(50, 58.3, 2.2, 2.9, MO, 0.95) + E(50, 60, 1.3, 0.8, '#e5967f')) +
      V('mouth', 'wavy', S('M46.4 58 C47 57 47.6 57 48.2 58 C48.8 59 49.4 59 50 58 C50.6 57 51.2 57 51.8 58 C52.4 59 53 59 53.6 58', O, 0.95));

    var PK = '#e79a7c';
    function hatch(x, y) { return S('M' + (x - 1.8) + ' ' + (y + 1) + ' L' + (x - 1) + ' ' + (y - 1) + ' M' + x + ' ' + (y + 1) + ' L' + (x + 0.8) + ' ' + (y - 1) + ' M' + (x + 1.8) + ' ' + (y + 1) + ' L' + (x + 2.6) + ' ' + (y - 1), '#e0668c', 0.55); }
    var blush =
      V('blush', 'n', E(35, 54.8, 3.8, 2.1, PK, 0, ' opacity=".55"') + E(65, 54.8, 3.8, 2.1, PK, 0, ' opacity=".55"') + hatch(34.4, 54.8) + hatch(64.6, 54.8)) +
      V('blush', 'big', E(35, 54.6, 5.2, 2.9, PK, 0, ' opacity=".78"') + E(65, 54.6, 5.2, 2.9, PK, 0, ' opacity=".78"') + S('M41 54.2 C46 55.4 54 55.4 59 54.2', PK, 1.8, ' opacity=".55"') + hatch(33.6, 54.6) + hatch(36.8, 54.6) + hatch(63.2, 54.6) + hatch(66.4, 54.6)) +
      V('blush', 'puff', E(35, 54.8, 3.8, 2.1, PK, 0, ' opacity=".55"') + E(65, 54.8, 3.8, 2.1, PK, 0, ' opacity=".55"') + hatch(34.4, 54.8) + hatch(64.6, 54.8));
    var puff = V('cheek', 'puff', P('M62 50.6 C68.6 48.6 73.4 51.6 73.2 55.8 C73 60 67.4 62 62.4 60.6 Z', SK) + S('M66.4 49.8 C71 49.8 73.4 52.6 73.2 55.8 C73 59.2 69.6 61.2 65.4 61.2', O, 1.15) + E(67.6, 55.6, 3.4, 2.3, PK, 0, ' opacity=".75"') + hatch(67, 55.6)) + V('cheek', 'none', '');

    /* ---- hair (a short, tousled pixie cut), head ---- */
    // the back of the crop: only its edges show, as short pointed wisps under the ears, at the nape
    var hairBack = P('M50 13.4 C37.8 13.4 27.6 21.2 25.8 33.4 C24.8 40.2 25 46.2 25.8 50.4 C25.4 52.6 24.4 54.6 22.8 56 C24.8 56.2 26.4 55.8 27.8 55 C28 56.8 27.8 58.4 27.2 59.8 C29.6 58.8 31.6 57.2 33 55.2 ' +
      'C40 57.6 60 57.6 67 55.2 C68.4 57.2 70.4 58.8 72.8 59.8 C72.2 58.4 72 56.8 72.2 55 C73.6 55.8 75.2 56.2 77.2 56 C75.6 54.6 74.6 52.6 74.2 50.4 C75 46.2 75.2 40.2 74.2 33.4 C72.4 21.2 62.2 13.4 50 13.4 Z', HAD, 1.3);
    var EAR = 'M31.2 44.4 C27 43.4 22 40.4 17.2 36.4 C18.2 42.6 22 48.8 30.4 51.8 Z', EARIN = 'M28.4 46.6 C25 45.2 22.4 43.2 20.6 41';
    var ears = P(EAR, SK, 1.15) + P(mir(EAR), SK, 1.15) + S(EARIN, '#e6ad94', 1.2) + S(mir(EARIN), '#e6ad94', 1.2);
    var face = P('M28.6 43 C28.6 29.4 38 21.4 50 21.4 C62 21.4 71.4 29.4 71.4 43 C71.4 51.6 68.6 57.6 63.4 60.9 C59.4 63.4 54.8 64.3 50 64.3 C45.2 64.3 40.6 63.4 36.6 60.9 C31.4 57.6 28.6 51.6 28.6 43 Z', SK, 1.3);
    // the front: tufts on top, little flicks over the ears, pointed sideburns down to the cheeks, and a wispy
    // fringe that leaves her brows showing (open V over each brow, a few soft wisps between her eyes)
    // the curl on top lives in its own group so it can sway, bounce, droop and sproing with her mood (faery.css)
    var ahoge = '<g class="fy-ahoge"><g transform="translate(48.8 11.6) scale(1.35) translate(-48.8 -11.6)">' + P('M47.6 11.4 C46.8 8.2 48.6 5.4 52 5 C54.6 4.8 56.2 6.4 55.6 8.4 C54.8 7 53.2 6.8 51.8 7.4 C50.2 8.2 49.6 9.8 50 11.6 Z', HA, 1.1) + '</g></g>';
    var bangs = ahoge + P('M30.6 53.8 C28.6 51 27 47.4 26.4 43.4 C25.2 41.8 23.8 40.4 22.2 39.4 C23.8 38.8 24.8 38.2 25.4 37.4 C24.8 28.8 28 21.8 33.6 17.4 ' +
        'C32.6 15.6 31.2 14.2 29.4 13.4 C33.6 11.4 37.6 11.2 41 12.2 C44.4 10.4 49.4 9.8 53.6 10.4 C57.6 10.8 61 11.8 63.6 13.4 ' +
        'C64.4 12.4 65.6 11.8 67 11.6 C66.4 13 66.4 14.4 66.8 15.8 C72.4 19.6 75.2 27 74.6 37.4 C75.2 38.2 76.2 38.8 77.8 39.4 C76.2 40.4 74.8 41.8 73.6 43.4 ' +
        'C73 47.4 71.4 51 69.4 53.8 C68.8 50.6 68.2 47.2 67.8 43.6 C67.6 42 67.4 40.8 67 39.6 C66.4 40.2 65.6 40.6 64.8 40.8 C64.6 38.4 63.2 35.2 60.6 33.2 ' +
        'C59.8 36.4 57.8 39.2 54.8 40.8 C55.4 38.6 55 36.8 53.2 35.2 C52.4 38.4 50.6 41 48 42.6 C48.4 40.4 48 38.2 46.8 36.6 C46.4 38.2 45.6 39.2 44.4 39.8 ' +
        'C44 37.4 42.2 34.6 39.4 33.2 C36.8 35.2 35.4 38.4 35.2 40.8 C34.4 40.6 33.6 40.2 33 39.6 C32.6 40.8 32.4 42 32.2 43.6 C31.8 47.2 31.2 50.6 30.6 53.8 Z', HA, 1.3) +
      P('M65.6 16.6 C71.6 20.2 74.4 28.6 73.8 38.6 L71.2 41.6 C70.8 33 68.4 25.4 63.8 19.6 Z', HAD, 0, ' opacity=".5"') +
      S('M60.6 33.2 C60.4 27 58.4 21.6 55 17.4 M53.2 35.2 C52.8 29 51.6 23 49.2 18 M46.8 36.6 C46.2 30 44.6 24 41.4 19 M39.4 33.2 C37.8 28.4 36.4 24.2 35.8 20.4 ' +
        'M28.6 44.4 C29 47.4 29.6 50 30.4 52 M71.4 44.4 C71 47.4 70.4 50 69.6 52', HAD, 0.75) +
      P('M34.2 24.6 C39.4 19.8 44.8 18.2 50 18.2 C55.2 18.2 60.6 19.8 65.8 24.6 C63.6 23.8 62 23.6 60.8 24 L59.4 22.4 L57.8 23.4 L56.2 21.8 L54.2 22.8 L52.2 21.2 L50 22.4 L47.8 21.2 L45.8 22.8 L43.8 21.8 L42.2 23.4 L40.6 22.4 L39.2 24 C38 23.6 36.4 23.8 34.2 24.6 Z', HAL, 0, ' opacity=".9"');
    var clip = '<g transform="rotate(18 70.2 22)">' + P('M65.2 23.6 C65.2 19.8 67.6 17.8 70.2 17.8 C72.8 17.8 75.2 19.8 75.2 23.6 C73 24.6 67.4 24.6 65.2 23.6 Z', '#f2b64f', 0.95) +
      '<circle cx="68.2" cy="20.6" r=".85" fill="#fff4dc"/><circle cx="71.8" cy="20" r=".65" fill="#fff4dc"/><circle cx="73.2" cy="22.3" r=".5" fill="#fff4dc"/>' +
      P('M68.8 24.3 L69.2 26.8 L71.3 26.8 L71.7 24.3', '#f3e6cf', 0.75) + '</g>';

    /* ---- body ---- */
    // bare feet (Pollen, Oct 1: "faeries don't wear shoes"): a little foot with a hint of toes, same place and turn the boots had
    function boot(x, y, a) { return '<g transform="rotate(' + a + ' ' + x + ' ' + y + ')">' + P('M' + (x - 2.4) + ' ' + (y - 3.8) + ' L' + (x + 2.2) + ' ' + (y - 3.8) + ' C' + (x + 2.4) + ' ' + (y - 1.6) + ' ' + (x + 4.4) + ' ' + (y - 0.6) + ' ' + (x + 4.8) + ' ' + (y + 1) + ' C' + (x + 5.2) + ' ' + (y + 2.6) + ' ' + (x + 3.6) + ' ' + (y + 3.4) + ' ' + (x + 0.8) + ' ' + (y + 3.4) + ' C' + (x - 1.6) + ' ' + (y + 3.4) + ' ' + (x - 3) + ' ' + (y + 2.4) + ' ' + (x - 3) + ' ' + (y + 0.8) + ' C' + (x - 3) + ' ' + (y - 0.8) + ' ' + (x - 2.6) + ' ' + (y - 2.2) + ' ' + (x - 2.4) + ' ' + (y - 3.8) + ' Z', SK, 1) + S('M' + (x + 2.6) + ' ' + (y + 1.6) + ' L' + (x + 2.8) + ' ' + (y + 2.6) + ' M' + (x + 1.2) + ' ' + (y + 1.9) + ' L' + (x + 1.3) + ' ' + (y + 2.8), SKS, 0.6) + '</g>'; }
    var LF = '#4a6a33';   // every other leaf of her dress, a shade deeper, so the hem reads as leaves and not a sawtooth
    function pt(p) { return num(p[0]) + ' ' + num(p[1]); }
    function bz(c, t) { var u = 1 - t; return [0, 1].map(function (k) { return u * u * u * c[0][k] + 3 * u * u * t * c[1][k] + 3 * u * t * t * c[2][k] + t * t * t * c[3][k]; }); }
    // one side of a leaf, from p to q, bowed outward a little so each point reads as a leaf
    function bow(p, q, k) { var ex = q[0] - p[0], ey = q[1] - p[1]; return ' Q' + num((p[0] + q[0]) / 2 - ey * k) + ' ' + num((p[1] + q[1]) / 2 + ex * k) + ' ' + pt(q); }
    /* the zig-zag leaf hem: n pointed leaves along the curve c (four points, left to right), len long, the end ones
       fanned out by fan degrees and all of them turned by tilt (a flutter, for flying). Gives the hem's outline for
       the skirt's path, the notches between the leaves, and the leaves: every other one deeper, a vein in each */
    function leafHem(c, n, len, fan, tilt) {
      var zig = '', odd = '', veins = '', ns = [];
      for (var i = 0; i <= n; i++) ns.push(bz(c, i / n));
      for (i = 0; i < n; i++) {
        var a = ns[i], b = ns[i + 1], m = bz(c, (i + 0.5) / n), l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = (a[1] - b[1]) / l, ny = (b[0] - a[0]) / l,
          f = (i + 0.5) / n * 2 - 1, r = (tilt - f * fan) * Math.PI / 180, tx = nx * Math.cos(r) - ny * Math.sin(r), ty = nx * Math.sin(r) + ny * Math.cos(r),
          L = len * (1 - 0.15 * f * f), tip = [m[0] + tx * L, m[1] + ty * L], base = [m[0] - tx * L * 0.8, m[1] - ty * L * 0.8];
        zig += bow(a, tip, 0.14) + bow(tip, b, 0.14);
        if (i % 2) odd += 'M' + pt(a) + bow(a, tip, 0.14) + bow(tip, b, 0.14) + bow(b, base, 0.2) + bow(base, a, 0.2) + ' Z';
        veins += 'M' + pt([m[0] - tx * L * 0.3, m[1] - ty * L * 0.3]) + ' L' + pt([m[0] + tx * L * 0.7, m[1] + ty * L * 0.7]);
      }
      return { zig: zig, ns: ns, leaves: P(odd, LF) + S(veins, DRL, 0.55, ' opacity=".85"') };
    }
    // one leaf on its own, from its base (x, y) toward a (degrees: 0 = straight down, + = toward the viewer's right)
    function leaf(x, y, a, len, wid, fill, vein) {
      var r = a * Math.PI / 180, dx = Math.sin(r), dy = Math.cos(r), h = wid / 2;
      function at(f, s) { return [x + dx * len * f + dy * h * s, y + dy * len * f - dx * h * s]; }
      return P('M' + pt(at(0, 0)) + ' Q' + pt(at(0.35, -1.5)) + ' ' + pt(at(1, 0)) + ' Q' + pt(at(0.35, 1.5)) + ' ' + pt(at(0, 0)) + ' Z', fill, 0.85) +
        (vein ? S('M' + pt(at(0.15, 0)) + ' L' + pt(at(0.7, 0)), vein, 0.45) : '');
    }
    function fold(p, q) { return 'M' + pt(p) + ' Q' + pt([(p[0] + q[0]) / 2 + (p[0] < 50 ? 0.8 : p[0] > 50 ? -0.8 : 0), (p[1] + q[1]) / 2]) + ' ' + pt(q); }
    var sitHem = leafHem([[28.4, 89.2], [37.6, 93.4], [62.4, 93.4], [71.6, 89.2]], 7, 5.8, 28, 0);
    var SITSK = 'M39 75.4 C35.6 80 31.6 85 28.4 89.2' + sitHem.zig + ' C68.4 85 64.4 80 61 75.4 Z';
    var sitSkirt = P(SITSK, DR) + '<g clip-path="url(#fy-sk)">' + sitHem.leaves + P('M55 75.8 C58 81 60 86 61.2 100 L80 100 L80 75.4 Z', DRD, 0, ' opacity=".5"') + '</g>' +
      S(fold([44.2, 77], sitHem.ns[2]) + fold([55.8, 77], sitHem.ns[5]), DRD, 0.8) + S(SITSK, O, 1.2);
    var legsSit = '<g class="fy-legL">' + limb('M44.6 89 C44.3 93.6 44 97 43.6 100.4', 4.8) + '<g transform="translate(86.8 0) scale(-1 1)">' + boot(43.4, 103.4, -8) + '</g></g>' +
      '<g class="fy-legR">' + limb('M55.4 89 C55.7 93.6 56 97 56.4 100.4', 4.8) + boot(56.6, 103.4, -8) + '</g>';
    var flyHem = leafHem([[22.6, 84], [27, 88.6], [44, 91.6], [57.6, 89.6]], 6, 5.6, 16, 14);
    var FLYSK = 'M39.2 75.4 C34.6 78.4 28.4 81.6 22.6 84' + flyHem.zig + ' C60.4 85.4 61.4 80 60.8 75.4 Z';
    var flySkirt = P(FLYSK, DR) + '<g clip-path="url(#fy-fk)">' + flyHem.leaves + '</g>' + S(fold([44, 77.2], flyHem.ns[2]) + fold([50.6, 77.4], flyHem.ns[4]), DRD, 0.8) + S(FLYSK, O, 1.2);
    var legsFly = limb('M45.6 88.2 C42.4 92.6 38.8 95.8 35 97.8', 4.6) + '<g transform="translate(66 0) scale(-1 1)">' + boot(33.4, 100.6, -40) + '</g>' +
      limb('M52.4 89 C51.6 93.8 49 97.8 45.4 100.4', 4.6) + '<g transform="translate(86 0) scale(-1 1)">' + boot(43.6, 103.2, -52) + '</g>';
    // a leaf collar: one leaf each side of her neck, where the cream collar was
    function collar(v) { return leaf(49.6, 65.6, -68, 6.4, 4.6, DRL, v); }
    // the top, from Pollen's reference (Oct 1): a sweetheart bodice of two leaf cups that meet in a little dip at
    // the middle and cross in a V, bare shoulders above it with a small leaf capping each one, and the leaf waistband
    var torso = P('M40.4 66 C39.8 69.6 39.4 72.2 38.6 75.6 L61.4 75.6 C60.6 72.2 60.2 69.6 59.6 66 C56 64.6 44 64.6 40.4 66 Z', SK, 1.15) +
      P('M39.8 69.6 C42 68.6 44.8 68.4 47 69.4 C48.2 70 49.4 70.8 50 71.6 C50.6 70.8 51.8 70 53 69.4 C55.2 68.4 58 68.6 60.2 69.6 C60.6 71.6 61 73.6 61.4 75.6 L38.6 75.6 C39 73.6 39.4 71.6 39.8 69.6 Z', DR, 1.1) +
      S('M40.8 74.6 C42.4 72.4 44.8 70.6 47.8 70.4 M59.2 74.6 C57.6 72.4 55.2 70.6 52.2 70.4', DRL, 0.6, ' opacity=".9"') +
      P('M38.6 74 L61.4 74 L61.8 76.8 L38.2 76.8 Z', DRD, 0.9) + P('M47.6 73.8 C46 72.4 44.4 73.6 45 75.2 C45.6 76.6 47.4 76 48.6 75.4 Z M52.4 73.8 C54 72.4 55.6 73.6 55 75.2 C54.4 76.6 52.6 76 51.4 75.4 Z', '#f2b64f', 0.7) + E(50, 75, 1.3, 1.2, '#f2b64f', 0.7);
    var neck = P('M46.8 61.6 L46.6 66.2 L53.4 66.2 L53.2 61.6 Z', SKS, 0.9);
    // shoulders: no puffed sleeves (too princessy), just two little leaves capping each shoulder, like a leaf-petal dress
    var cap = leaf(41.2, 66.2, -64, 6.2, 4.2, DR, DRL) + leaf(40.4, 67.6, -28, 5.2, 3.4, LF, DRL);
    var shoulder = leaf(41.8, 66.4, -84, 6.4, 4.2, DR, DRL) + leaf(41.2, 67.4, -54, 5, 3.4, LF, DRL);
    var sleeves = shoulder + '<g transform="translate(100 0) scale(-1 1)">' + shoulder + '</g>';   // no puffs: a small leaf cap on each shoulder
    // the bodice: two leaves crossing over her chest
    var bodice = leaf(46.4, 75.4, 150, 5.6, 3.4, DRL, DRD) + '<g transform="translate(100 0) scale(-1 1)">' + leaf(46.4, 75.4, 150, 5.6, 3.4, DRL, DRD) + '</g>';   // the two leaves crossing in a V where the cups meet
    // the skirt's top tier: big petal leaves fanning down from the waist over the zig-zag hem
    function tier(turn) {
      var L = [[42.2, 76.6, 26], [46, 77, 10], [50, 77.2, -2], [54, 77, -12], [57.8, 76.6, -26]], s = '';
      L.forEach(function (l, i) { s += leaf(l[0], l[1], l[2] + turn, 13 - Math.abs(i - 2) * 1.1, 7, i % 2 ? LF : DR, DRL); });
      return s;
    }

    /* ---- arms: B = behind the head, F = in front of the face ---- */
    var REST = 'M38.8 68.4 C36.2 72.6 37.6 78 44 80.4';
    var restL = limb(REST, 3.6) + hand(45, 80.6), restR = limb(mir(REST), 3.6) + hand(55, 80.6);
    function arms(v, b, f) { return [V('armsB', v, b), V('armsF', v, f || '')]; }
    var A = [
      arms('rest', restL + restR),
      arms('wave', restL, limb('M61.4 68.4 C64.6 69.8 67.6 69.8 69.6 68.6', 3.6) + '<g class="fy-wavef">' + limb('M69.6 68.6 C71.6 64.8 73 61.2 73.6 57.6', 3.4) + hand(73.8, 56.4, 2.4) + '</g>'),
      arms('chin', restL, limb('M61.4 68.4 C63.8 72 64 74.8 62 75.4 C59.8 76 56.6 70.4 55.2 66.2', 3.4) + hand(54.8, 65.2, 2.3)),
      arms('mouth', restL, limb('M61.4 68.4 C63.8 72 63.8 74.6 61.8 75 C59.4 75.4 57.6 66.8 56.8 60.8', 3.4) + hand(56.6, 59.6, 2.3)),
      arms('cheeks', '', limb('M38.6 68.4 C35 71.8 33.2 66.2 33 60.6', 3.4) + hand(33.2, 59, 2.5) + limb(mir('M38.6 68.4 C35 71.8 33.2 66.2 33 60.6'), 3.4) + hand(66.8, 59, 2.5)),
      arms('crossed', limb('M38.8 68.4 C36.4 71.4 37.4 74.2 40.2 74 C44 73.8 50 72.6 56.4 71.2', 3.5) + hand(57, 71, 2.1) + limb('M61.2 68.4 C63.6 71.4 62.6 74.4 59.8 74.4 C56 74.4 50 73.4 43.6 72.4', 3.5) + hand(43, 72.2, 2.1)),
      arms('hips', limb('M38.8 68.4 C35 70.6 33.2 73.4 35.4 75.4 C36.6 76.4 38.6 76.4 40.2 75.8', 3.5) + hand(40.6, 75.6, 2) + limb(mir('M38.8 68.4 C35 70.6 33.2 73.4 35.4 75.4 C36.6 76.4 38.6 76.4 40.2 75.8'), 3.5) + hand(59.4, 75.6, 2)),
      arms('shrug', limb('M38.8 68.4 C36.8 72 36.4 74.6 34 74.6 C31.8 74.6 30.2 72.8 29.4 71', 3.5) + E(28.8, 70.2, 2.5, 1.8, SK, 1) + limb(mir('M38.8 68.4 C36.8 72 36.4 74.6 34 74.6 C31.8 74.6 30.2 72.8 29.4 71'), 3.5) + E(71.2, 70.2, 2.5, 1.8, SK, 1)),
      arms('fly', limb('M38.8 68.4 C34.4 70.2 30.6 71.6 26.6 72.4', 3.5) + hand(25.6, 72.6) + limb('M61.2 68.4 C65.8 67.4 70 65.6 74 62.8', 3.5) + hand(75, 62.2))
    ];
    var armsB = A.map(function (a) { return a[0]; }).join(''), armsF = A.map(function (a) { return a[1]; }).join('');

    var defs = '<linearGradient id="fy-iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16261f"/><stop offset=".5" stop-color="#4f7a3a"/><stop offset="1" stop-color="#b8cf78"/></linearGradient>' +
      '<clipPath id="fy-eclip"><path d="' + SCL + '"/></clipPath><clipPath id="fy-sk"><path d="' + SITSK + '"/></clipPath><clipPath id="fy-fk"><path d="' + FLYSK + '"/></clipPath>';
    var head = '<g class="fy-head">' + hairBack + ears + neck + face + blush + eyes + brows + mouths + bangs + puff + clip + '</g>';
    var body = svg(
      V('pose', 'sit', legsSit + sitSkirt + tier(0)) + V('pose', 'fly', legsFly + flySkirt + tier(-28)) + torso + bodice + armsB + head + armsF + sleeves, defs);

    /* ---- wings: translucent mint with candle-gold edges ---- */
    var WU = 'M47 66.4 C41 55.6 27 41.4 5.2 33.6 C9.6 45.4 23.2 59.6 46.6 68.2 Z',
      WL = 'M46.8 69 C38 71.6 26.4 78.8 15.4 93.2 C30 88.6 40.6 80.6 47.6 71.2 Z',
      WV = 'M46.4 67 C36 58.6 23 46.6 9.6 36.6 M30.4 55.6 C25.4 54.2 20.4 50.6 15.6 45.4 M46.8 70.4 C37.6 76 27.6 83.6 18.8 90.6 M34 78.2 C31 80.2 28 82.8 25.4 86';
    function wing(side) {
      var m = side === 'R' ? mir : function (d) { return d; }, cx = side === 'R' ? 54 : 46;
      return svg(P(m(WU), 'url(#fy-wg' + side + ')') + P(m(WL), 'url(#fy-wg' + side + ')') + S(m(WU) + ' ' + m(WL), '#e3c27e', 1.15) + S(m(WV), '#f0dca0', 0.55, ' opacity=".85"') +
        '<g fill="#fff" opacity=".85"><circle cx="' + num(side === 'R' ? 86.4 : 13.6) + '" cy="39.6" r=".8"/><circle cx="' + num(side === 'R' ? 78 : 22) + '" cy="47.6" r=".55"/><circle cx="' + num(side === 'R' ? 76.6 : 23.4) + '" cy="86.4" r=".6"/></g>',
        '<radialGradient id="fy-wg' + side + '" gradientUnits="userSpaceOnUse" cx="' + cx + '" cy="68" r="44"><stop offset="0" stop-color="#e2c27f" stop-opacity=".92"/><stop offset=".5" stop-color="#efdfb9" stop-opacity=".7"/><stop offset="1" stop-color="#faf3e3" stop-opacity=".5"/></radialGradient>');
    }

    /* ---- the golden toadstool she sits on: a round cap on a tall, slim stem with a soft rounded bottom, no ground ---- */
    // (each outline is drawn after its shading, so no shading can poke over the edge)
    var STEM = 'M43.8 100 C43.4 108 42 114 40.8 119.4 C39.8 124 43.6 127.4 50 127.4 C56.4 127.4 60.2 124 59.2 119.4 C58 114 56.6 108 56.2 100 Z',
      CAP = 'M18.8 100.6 C17.8 87.2 31.6 79.2 50 79.2 C68.4 79.2 82.2 87.2 81.2 100.6 C81 104.4 71.6 106.2 50 106.2 C28.4 106.2 19 104.4 18.8 100.6 Z';
    var mushroom = svg(
      P(STEM, '#f3e6cf') +
      P('M53.4 101 C54 108 55.4 114 56.2 119.4 C56.8 123.2 55.4 126 52.6 127.1 C57.4 126.6 60.2 123.6 59.2 119.4 C58 114 56.6 108 56.2 100 Z', '#d9c6a4') +
      P('M41.4 123.4 C43 126 46 127 50 127 C54 127 57 126 58.6 123.4 C56.4 125.2 53.6 125.8 50 125.8 C46.4 125.8 43.6 125.2 41.4 123.4 Z', '#d9c6a4') +
      P('M43.6 105.4 C47 107.2 53 107.2 56.4 105.4 L56.5 108.4 C53 109.8 47 109.8 43.5 108.4 Z', '#d9c6a4', 0, ' opacity=".8"') +
      S('M45 111.4 C44.4 114.6 43.6 117.8 43.2 121', '#fffaf0', 1, ' opacity=".8"') + S(STEM, O, 1.2) +
      P(CAP, 'url(#fy-cap)') +
      P('M19.4 101.8 C21.6 104.4 31.6 106 50 106 C68.4 106 78.4 104.4 80.6 101.8 C75 103.8 64.2 104.6 50 104.6 C35.8 104.6 25 103.8 19.4 101.8 Z', '#bf7a2a') +
      S('M23.4 94.2 C24.4 87.8 31.4 83 39.8 82.2', '#fff0c8', 1.8, ' opacity=".75"') +
      '<g fill="#fff4dc">' + E(27.2, 95.8, 3.2, 2.2, '#fff4dc') + E(72.8, 95.2, 3, 2.1, '#fff4dc') + E(62.4, 101, 2.3, 1.4, '#fff4dc') + E(37.4, 101.2, 2.4, 1.4, '#fff4dc') + E(78.2, 101.4, 1.4, 0.9, '#fff4dc') + E(22, 101.6, 1.3, 0.9, '#fff4dc') + E(33.6, 87.2, 1.7, 1.2, '#fff4dc') + E(66.6, 86.8, 1.6, 1.1, '#fff4dc') + E(56.6, 82.4, 1.2, 0.8, '#fff4dc') + '</g>' + S(CAP, O, 1.35),
      '<linearGradient id="fy-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9d58a"/><stop offset=".55" stop-color="#eeaa4a"/><stop offset="1" stop-color="#dc9136"/></linearGradient>');

    /* ---- little effects around her head ---- */
    function zz(x, y, s) { var d = 'M' + x + ' ' + y + ' L' + (x + s) + ' ' + y + ' L' + x + ' ' + (y + s) + ' L' + (x + s) + ' ' + (y + s); return S(d, O, 2.6) + S(d, '#ece3d3', 1.2); }
    var fx = svg(
      V('fx', 'sweat', P('M22.6 22.6 C24.9 26 26.1 28.3 26.1 29.9 C26.1 31.9 24.5 33.2 22.6 33.2 C20.7 33.2 19.1 31.9 19.1 29.9 C19.1 28.3 20.3 26 22.6 22.6 Z', '#cdefff', 0.9) + S('M21.2 29.8 C21.2 28.7 21.7 27.7 22.2 27.1', '#fff', 0.8), 'fy-sweat') +
      V('fx', 'zzz', '<g class="fy-z1">' + zz(72, 19, 3) + '</g><g class="fy-z2">' + zz(77.6, 11.6, 4) + '</g><g class="fy-z3">' + zz(84.2, 3, 5) + '</g>') +
      V('fx', 'dots', E(71.8, 21.4, 1, 1, '#ece3d3', 0.7) + E(75, 17.6, 1.5, 1.5, '#ece3d3', 0.7) + '<rect x="74.4" y="3.4" width="20" height="10.6" rx="5.3" fill="#ece3d3" stroke="' + O + '" stroke-width=".8"/>' +
        '<g fill="' + O + '"><circle class="fy-d1" cx="79.4" cy="8.7" r="1.2"/><circle class="fy-d2" cx="84.4" cy="8.7" r="1.2"/><circle class="fy-d3" cx="89.4" cy="8.7" r="1.2"/></g>') +
      V('fx', 'sparkle', '<g class="fy-tw1">' + star(18.6, 18, 3.4, '#ffe08a') + '</g><g class="fy-tw2">' + star(84, 9, 2.6, '#fff4dc') + '</g><g class="fy-tw3">' + star(88.6, 25, 1.8, '#ffe08a') + '</g>') +
      V('fx', 'heart', '<g class="fy-float">' + P('M80.6 19 C75.8 15.8 76.2 11.2 78.9 11.2 C80 11.2 80.6 12.2 80.6 12.2 C80.6 12.2 81.2 11.2 82.3 11.2 C85 11.2 85.4 15.8 80.6 19 Z', PK, 0.85) + '</g>' + '<g class="fy-float fy-late">' + P('M88.4 27.6 C85.8 25.8 86 23.4 87.4 23.4 C88 23.4 88.4 24 88.4 24 C88.4 24 88.8 23.4 89.4 23.4 C90.8 23.4 91 25.8 88.4 27.6 Z', PK, 0.7) + '</g>') +
      V('fx', 'note', '<g class="fy-float">' + S('M80.6 16.6 L80.6 8.2 C82.4 8.8 84 9.8 84.6 11.8', O, 2.4) + S('M80.6 16.6 L80.6 8.2 C82.4 8.8 84 9.8 84.6 11.8', '#a2d496', 1) + E(78.8, 17, 2.1, 1.6, '#a2d496', 0.8, ' transform="rotate(-20 78.8 17)"') + '</g>') +
      V('fx', 'bang', '<g class="fy-pop">' + P('M79.4 4.6 L83 4.6 L82 14.6 L80.4 14.6 Z', '#ffe08a', 0.85) + E(81.2, 17.8, 1.5, 1.5, '#ffe08a', 0.85) + '</g>') +
      V('fx', 'grr', '<g class="fy-jit">' + P('M76.2 13.4 C74 10.2 77.2 7.4 79.4 9.6 C80.4 7 84.6 7.6 84.2 10.6 C87.2 10.8 87.4 14.6 84.6 15.2 C85.2 18 81.4 19 80.2 16.8 C78.2 19 74.6 17.2 76.2 13.4 Z', '#ece3d3', 0.9) + S('M77.6 13 C78.8 11.4 80.2 14.8 81.6 12.8 C82.4 11.8 83.2 12.6 83.6 13.4', '#8a7896', 0.8) + '</g>'));

    return { body: body, wingL: wing('L'), wingR: wing('R'), mushroom: mushroom, fx: fx };
  }
/*ART-END*/
})();
