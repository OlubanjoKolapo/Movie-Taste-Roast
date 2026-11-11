import type { Genre, Kind, Title } from "../lib/types";

/**
 * Curated starter catalogue. Every poster path was checked against the TMDb image CDN.
 * Row format: key | kind | title | year | poster | genres | lang | pop | acclaim | tags | line | savage line
 * kind: f film, s series, a anime. Lines are hand-written and always name the title.
 */
const ROWS = `
m27205|f|Inception|2010|/oYuLEt3zVCKq57qu2F8dT7NIa6f|sci,act,thr|en|3|84|nolan|Inception. You’ve explained the ending at a party. Nobody asked.|Inception. You think the ending is ambiguous. It isn’t. You just wanted it to be.
m155|f|The Dark Knight|2008|/qJ2tW6WMUDux911r6m7haRef0WH|act,cri,dra|en|3|90|nolan,dc,canon,literally|The Dark Knight. You’ve said “Why so serious?” unironically. This decade.|The Dark Knight. Your favourite character is the one with the speech about society. We noticed.
m157336|f|Interstellar|2014|/gEU2QniE6E77NI6lCU6MxlNBvIx|sci,adv,dra|en|3|85|nolan,long|Interstellar. You cried at the docking scene and called it “the physics”.|Interstellar. You’ve said “love transcends dimensions” out loud, with no irony at all.
m77|f|Memento|2000|/yuNs09hvpHVU1cBTCAk9zxsL2oW|mys,thr|en|2|86|nolan|Memento. You’ve explained the timeline to someone who didn’t ask. Twice, in order.|
m1124|f|The Prestige|2006|/tRNlZbgNCNOpLpbPEz5L8G8A0JN|mys,thr,dra|en|2|85|nolan|The Prestige. You call it “Nolan’s most underrated”. It is rated very highly.|
m577922|f|Tenet|2020|/k68nPLbIST6NP96JmTxmZijEvCA|act,sci,thr|en|3|72|nolan|Tenet. You claim you understood it. Nolan never claimed that.|Tenet. You put the one Nolan film nobody could hear in your top five. Commitment.
m872585|f|Oppenheimer|2023|/8Gxv8gSFCU0XGDykEGv7zR1n2ua|dra,war|en|3|81|nolan,oscar,long|Oppenheimer. Three hours of men in hats talking. You call it a thriller.|
m550|f|Fight Club|1999|/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK|dra,thr|en|3|88|literally,cult,fincher|Fight Club. Most people who list it missed the point. You might be most people.|Fight Club. The first rule is you don’t talk about it. You have never once followed the first rule.
m807|f|Se7en|1995|/6yoghtyTpznpBik8EngEmJskVUO|cri,mys,thr|en|3|86|fincher|Se7en. You’ve said “What’s in the box?” about a delivery. More than once.|
m210577|f|Gone Girl|2014|/ts996lKsxvjkO2yiYG0ht4qAicO|mys,thr,dra|en|3|81|fincher|Gone Girl. You’ve recited the Cool Girl speech. Alone. In the car.|
m37799|f|The Social Network|2010|/n0ybibhJtQ5icDqTp8eRytcIHJx|dra|en|2|79|fincher,literally|The Social Network. A film about a website, picked by someone who calls it “a film about ambition”.|
m680|f|Pulp Fiction|1994|/d5iIlFn5s0ImszYzBPb8JPIfbXD|cri,thr|en|3|89|tarantino,canon,cult|Pulp Fiction. The dorm room poster of films. You probably had the poster.|Pulp Fiction. You picked it so we’d know you’re “into dialogue”. We know.
m24|f|Kill Bill: Vol. 1|2003|/v7TaX8kXMXs5yFFGR41guUDNcnB|act,cri|en|3|81|tarantino,cult|Kill Bill: Vol. 1. Half a story, and you still call it a favourite.|Kill Bill: Vol. 1. You picked volume one. The ending is in volume two. Interesting.
m16869|f|Inglourious Basterds|2009|/7sfbEnaARXDDhKm0CZ7D7uc2sbo|war,dra,act|en|3|84|tarantino|Inglourious Basterds. You’ve tried to say “bingo” like Landa. In public.|
m68718|f|Django Unchained|2012|/7oWY8VDWW7thTzWh3OKYRkWUlD5|western,dra|en|3|85|tarantino|Django Unchained. Your entire western phase started and ended here.|
m466272|f|Once Upon a Time in Hollywood|2019|/8j58iEBw9pOXFD2L0nt0ZXeHviB|com,dra|en|2|74|tarantino,long|Once Upon a Time in Hollywood. Two hours of Brad Pitt driving. You call it “the vibe”.|
m238|f|The Godfather|1972|/3bhkrj58Vtu7enYsRolD1fZdja1|cri,dra|en|3|92|canon,old,gangster,long|The Godfather. You picked the film everyone says is the best film. Brave of you to agree.|The Godfather. You’ve said “an offer he can’t refuse” about a meal deal.
m769|f|Goodfellas|1990|/aKuFiU82s5ISJpGZp7YkIr3kCUd|cri,dra|en|2|89|scorsese,canon,gangster,old|Goodfellas. You’ve done the “funny how?” bit at dinner. Nobody laughed. Funny how?|
m103|f|Taxi Driver|1976|/ekstpH614fwDX8DUln1a2Opz0N8|cri,dra|en|2|86|scorsese,literally,old|Taxi Driver. You’ve said “You talkin’ to me?” to a mirror. Don’t lie.|
m106646|f|The Wolf of Wall Street|2013|/34m2tygAYBGqA9MXKhRDtzYd4MR|com,cri,dra|en|3|80|scorsese,literally|The Wolf of Wall Street. You watched a cautionary tale and took notes.|The Wolf of Wall Street. You saw three hours of consequences and remembered the chest thump.
m466420|f|Killers of the Flower Moon|2023|/dB6Krk806zeqd0YNp2ngQ9zXteH|cri,dra|en|2|75|scorsese,long|Killers of the Flower Moon. Three and a half hours. You watched it in two sittings and still list it.|
m278|f|The Shawshank Redemption|1994|/q6y0Go1tsGEsmtFryDOJo3dEmqu|dra,cri|en|3|93|canon,old|The Shawshank Redemption. The number one film on every list. You took the first result.|The Shawshank Redemption. That’s not taste. That’s a search result.
m13|f|Forrest Gump|1994|/arw2vcBveWOVZr6pxd9XTd1TdQa|dra,rom,com|en|3|85|canon,oscar,old|Forrest Gump. The film equivalent of saying your favourite food is pizza.|Forrest Gump. Your taste is a box of chocolates where every one is the same chocolate.
m98|f|Gladiator|2000|/ty8TGRuvJLPUmAR1H1nRIsgwvim|act,dra,adv|en|3|85|canon,oscar,literally|Gladiator. You think about the Roman Empire. Daily, probably.|Gladiator. Are you not entertained? We are, by this list.
m603|f|The Matrix|1999|/f89U3ADr1oiB1s9GkdPOEpXUk5H|act,sci|en|3|87|canon,cult|The Matrix. You’ve used “red pill” in a conversation about a phone contract.|
m62|f|2001: A Space Odyssey|1968|/ve72VxNqjGM69Uky4WTo2bK6rfq|sci,mys|en|2|88|canon,old,slow|2001: A Space Odyssey. You say it changed your life. You also skipped the light show.|
m78|f|Blade Runner|1982|/63N9uy8nd9j7Eog2axPQ8lbr3Wj|sci,thr|en|2|84|old,cult,literally|Blade Runner. Which cut? Exactly. You have opinions about which cut.|
m335984|f|Blade Runner 2049|2017|/gajva2L0rPYkEWjzgFlBXCAVBE5|sci,dra|en|2|81|villeneuve,literally,long,slow|Blade Runner 2049. You call it “literally me”. It’s three hours of a man being sad in fog.|
m438631|f|Dune|2021|/d5NXSklXo0qyIYkgV94XAgMIckC|sci,adv|en|3|78|villeneuve,lore|Dune. You read half the book and explain all of it.|
m693134|f|Dune: Part Two|2024|/1pdfLvkbY9ohJlCjQH2CZjjYVvJ|sci,adv|en|3|82|villeneuve,lore,long|Dune: Part Two. You’ve said “Lisan al Gaib” in a supermarket queue.|
m348|f|Alien|1979|/vfrQk5IPloGg1v9Rzbh2Eg3VGyM|hor,sci|en|2|86|old,canon|Alien. Respect. You’re still not over the dinner scene. Neither are we.|
m694|f|The Shining|1980|/b6ko0IKC8MdYBBPkkA1aBPLe2yz|hor,thr|en|2|86|old,canon|The Shining. You’ve typed “All work and no play” as a work status.|
m274|f|The Silence of the Lambs|1991|/uS9m8OBk1A8eM9I042bx8XXpqAq|thr,cri,hor|en|3|86|canon,oscar,old|The Silence of the Lambs. You did the fava beans noise while reading this.|
m329|f|Jurassic Park|1993|/oU7Oq2kFAAlGqbU4VoAE36g4hoI|adv,sci|en|3|83|canon,franchise,old,comfort|Jurassic Park. Timeless. You’ve watched every sequel hoping it would happen again. It didn’t.|
m105|f|Back to the Future|1985|/fNOH9f1aA7XRTzl1sAOx9iF553Q|sci,com,adv|en|3|86|canon,old,comfort|Back to the Future. Nobody has ever been roasted for this one. You’re playing it safe.|
m11|f|Star Wars|1977|/6FfCtAuVAW8XJjZ7eWeLibRLWTw|adv,sci,act|en|3|88|franchise,canon,old|Star Wars. The pick everyone’s dad made. Lucasfilm thanks you for your service.|Star Wars from 1977. Your taste has a pension plan.
m120|f|The Fellowship of the Ring|2001|/6oom5QYQ2yQTMJIbnvbkBL9cHo6|fan,adv|en|3|88|franchise,canon,long,lore|The Fellowship of the Ring. Extended edition, obviously. Your ideal Saturday is nine hours long.|
m122|f|The Return of the King|2003|/rCzpDGLbOoPwLjy3OAm5NUPOTrC|fan,adv|en|3|89|franchise,canon,long,oscar,lore|The Return of the King. Eleven Oscars and eight endings. You cried at every one of them.|
m671|f|Harry Potter and the Philosopher’s Stone|2001|/wuMc08IPKEatf9rnMNXvIDxqP4W|fan,adv,fam|en|3|79|franchise,comfort|Harry Potter and the Philosopher’s Stone. You know your house. You’ve announced it at work.|
m22|f|Pirates of the Caribbean|2003|/z8onk7LV9Mmw6zKz4hT6pzzvmvl|adv,fan,act|en|3|78|franchise,comfort|Pirates of the Caribbean. You still do the Jack Sparrow walk. We can tell.|
m597|f|Titanic|1997|/9xjZS2rlVxm8SFx8kPC3aIGCOYQ|rom,dra|en|3|79|oscar,long,sad,romance|Titanic. You still think there was room on the door. You’re right. It’s still a choice.|
m11036|f|The Notebook|2004|/rNzQyW4f8B8cQeg7Dgj3n6eT5k9|rom,dra|en|3|77|sad,romance|The Notebook. You think it’s romantic. Have you watched it lately?|The Notebook. Your standards were set by a man who built a house out of spite.
m313369|f|La La Land|2016|/uDO8zWDhfWwoFdKS4fzkUJt0Rf0|rom,mus,dra|en|3|79|sad,romance|La La Land. You still think they should have ended up together. The film disagrees.|
m4348|f|Pride & Prejudice|2005|/sGjIvtVvTlWnia2zfJfHz81pZ9Q|rom,dra|en|2|81|period,comfort,romance|Pride & Prejudice. You rewind the hand flex. Repeatedly. For “the cinematography”.|
m8966|f|Twilight|2008|/3Gkb6jm6962ADUPaCBqzz9CTbn9|fan,rom,dra|en|3|58|franchise,romance,guilty|Twilight. You say you like it ironically. You said that in 2008 too.|Twilight. Not Team Edward. Not Team Jacob. Team Questionable Choices.
m350|f|The Devil Wears Prada|2006|/8912AsVuS7Sj915apArUFbv6F9L|com,dra|en|3|76|comfort|The Devil Wears Prada. You’ve done the cerulean speech at someone who works in finance.|
m10625|f|Mean Girls|2004|/fXm3YKXAEjx7d2tIWDg9TfRZtsU|com|en|3|72|comfort|Mean Girls. You know it’s October 3rd. You’ve posted about it.|
m8363|f|Superbad|2007|/ek8e8txUyUwd2BNqj6lFEerJfbq|com|en|3|76|comfort|Superbad. A comedy you found at sixteen and never updated.|
m18785|f|The Hangover|2009|/uluhlXubGu1VxU63X9VHCLWDAYP|com|en|3|73|comfort|The Hangover. Your group chat still runs on this film. It’s been fifteen years.|The Hangover. Your sense of humour has a 2009 timestamp on it.
m771|f|Home Alone|1990|/onTSipZ8R3bliBdKfPtsDuHTdlL|com,fam|en|3|77|comfort,old|Home Alone. A Christmas film in your all-time list. It’s December in your heart, every day.|
m37165|f|The Truman Show|1998|/vuza0WqY239yBXOadKlGwJsZJFE|com,dra|en|3|82|old|The Truman Show. Great pick. You’ve said “in case I don’t see ya” to a cashier.|
m38|f|Eternal Sunshine of the Spotless Mind|2004|/5MwkWH9tYHv3mV9OdYTMR5qreIz|rom,sci,dra|en|2|84|sad,indie,romance|Eternal Sunshine. You’ve explained a situationship using this film. More than once.|
m152601|f|Her|2013|/eCOtqtfvn7mxGl6nfmq4b1exJRc|rom,sci,dra|en|2|80|indie,sad,romance|Her. A man falls for his operating system. You found it relatable in 2013. It’s worse now.|
m120467|f|The Grand Budapest Hotel|2014|/eWdyYQreja6JGCzqHWXpWHDrrPo|com,dra|en|2|81|indie|The Grand Budapest Hotel. You’ve described a café as “very Wes Anderson”.|
m244786|f|Whiplash|2014|/7fn624j5lj3xTme2SgiLCeuedmO|dra,mus|en|2|85|literally|Whiplash. You think Fletcher had a point. He did not have a point.|Whiplash. You watched a film about abuse and came away with a work ethic.
m76341|f|Mad Max: Fury Road|2015|/hA2ple9q4qnwxp3hKVNhroipsir|act,adv,sci|en|3|86||Mad Max: Fury Road. Two hours of car chase and you call it “visual storytelling”. Fair, actually.|
m245891|f|John Wick|2014|/fZPSd91yGE9fCcCe6OoQr6E3Bev|act,thr|en|3|74|franchise,literally|John Wick. A man avenges a dog across four films. You relate to all four.|
m361743|f|Top Gun: Maverick|2022|/62HCnUTziyWcpDaBO2i1DX17ljH|act,dra|en|3|82|franchise|Top Gun: Maverick. You’ve said “Talk to me, Goose” on a motorway. Please slow down.|
m51497|f|Fast Five|2011|/gEfQjjQwY7fh5bI4GlG0RrBu7Pz|act,thr,cri|en|3|73|franchise,ff|Fast Five. Family. You’ve said it. About a film where a safe drags a city.|
m385687|f|Fast X|2023|/fiVW06jE7z9YnO4trhaMEdclSiC|act,cri|en|3|62|franchise,ff|Fast X. The tenth one. Loyal to family through ten films and a submarine.|Fast X. Ten films in and you still think this one will be the good one.
m19995|f|Avatar|2009|/kyeqWdyUXW608qlYkRqosgbbJyK|sci,adv,act|en|3|76|franchise|Avatar. The biggest film ever and you can’t name one character. Nobody can.|
m76600|f|Avatar: The Way of Water|2022|/t6HIqrRAclMCA60NsSmeqe9RmNV|sci,adv|en|3|76|franchise,long|Avatar: The Way of Water. Three hours of underwater screensaver. You stayed awake. Respect, sort of.|
m1726|f|Iron Man|2008|/78lPtwv72eTNqFW9COBYI0dWDJa|act,sci|en|3|79|mcu,franchise|Iron Man. You say it started everything. It did. That’s the problem.|
m24428|f|The Avengers|2012|/RYMX2wcKCBAr24UyPD7xwmjaTn|act,sci,adv|en|3|77|mcu,franchise|The Avengers. The circle shot. You still talk about the circle shot.|
m118340|f|Guardians of the Galaxy|2014|/r7vmZjiyZw9rpJMQJdXpjgiCOk9|act,sci,com|en|3|79|mcu,franchise|Guardians of the Galaxy. Your favourite part is the soundtrack. That’s a playlist, not a film.|
m271110|f|Captain America: Civil War|2016|/rAGiXaUfPzY7CDEyNKUofk3Kw2e|act,adv,sci|en|3|74|mcu,franchise|Captain America: Civil War. You picked a side in 2016. You still argue about it.|
m284053|f|Thor: Ragnarok|2017|/rzRwTcFvttcN1ZpX2xv4j3tSdJu|act,com,fan|en|3|76|mcu,franchise|Thor: Ragnarok. A favourite. It’s mostly bits. Good bits, but bits.|
m284054|f|Black Panther|2018|/uxzzxijgPIY7slzFvMotPv8wjKA|act,adv,sci|en|3|73|mcu,franchise|Black Panther. A great Marvel pick. Still a Marvel pick.|
m299536|f|Avengers: Infinity War|2018|/7WsyChQLEftFiDOVTGkv3hFpyyt|act,sci,adv|en|3|82|mcu,franchise|Avengers: Infinity War. Half a story, and it made your all-time list.|
m299534|f|Avengers: Endgame|2019|/or06FN3Dka5tukK1e9sl16pB3iy|act,sci,adv|en|3|83|mcu,franchise,long|Avengers: Endgame. You cheered at “Avengers assemble”. In a cinema. Loudly.|Avengers: Endgame. Your favourite scene is a group photo with explosions.
m634649|f|Spider-Man: No Way Home|2021|/1g0dhYtq4irTY1GPXvft6k4YLjm|act,adv,sci|en|3|79|mcu,franchise|Spider-Man: No Way Home. You screamed when Andrew showed up. The whole row heard you.|
m533535|f|Deadpool & Wolverine|2024|/8cdWjvZQUExUUTzyp4t6EDMubfO|act,com|en|3|75|mcu,franchise|Deadpool & Wolverine. Two hours of cameos. You clapped at every one.|Deadpool & Wolverine. Your favourite film is a list of references with a budget.
m414906|f|The Batman|2022|/74xTEgt7R36Fpooo50r9T25onhq|cri,mys,act|en|3|77|dc,literally,long|The Batman. Three hours of a man brooding to Nirvana. You called it “literally me”.|
m475557|f|Joker|2019|/udDclJoHjfjb8Ekgsd4FDteOkCU|cri,thr,dra|en|3|81|dc,literally|Joker. You’ve done the stairs dance. On actual stairs.|Joker. We live in a society, and you made it your favourite film.
m324857|f|Spider-Man: Into the Spider-Verse|2018|/iiZZdoQBEYBv6id8su7ImL0oCbD|ani,act,adv|en|3|84||Into the Spider-Verse. The animation pick for people who don’t watch animation. Great film, though.|
m569094|f|Spider-Man: Across the Spider-Verse|2023|/8Vt6mWEReuy4Of61Lnj5Xj704m8|ani,act,adv|en|3|84||Across the Spider-Verse. It ends on a cliffhanger and you still put it in your top five. Optimistic.|
m862|f|Toy Story|1995|/uXDfjJbdP4ijW5hWSBrPrlKpxab|ani,com,fam|en|3|84|pixar,comfort,old|Toy Story. Sweet. A top-five pick with its own toy aisle.|
m12|f|Finding Nemo|2003|/eHuGQ10FUzK1mdOY69wF5pGgEf5|ani,fam,adv|en|3|82|pixar,comfort|Finding Nemo. A strong pick for someone whose last cinema trip was a school trip.|Finding Nemo. Bold choice for a grown adult with free will and a library card.
m2062|f|Ratatouille|2007|/t3vaWRPSf6WjDSamIkKDs1iQWna|ani,com,fam|en|3|81|pixar,comfort|Ratatouille. You think you could run a kitchen. With help from a rat.|
m10681|f|WALL·E|2008|/hbhFnRzzg6ZDmm8YAmxBnQpQIPh|ani,sci,fam|en|3|84|pixar,sad|WALL·E. Forty minutes with no dialogue and you cried in all of them.|
m14160|f|Up|2009|/mFvoEwSfLqbcWwFsDjQebn9bzFe|ani,adv,fam|en|3|80|pixar,sad|Up. You love it for the first ten minutes. The other eighty are a talking dog.|
m150540|f|Inside Out|2015|/2H1TmgdfNtsKlU9jKdeNyYL5y8T|ani,fam,com|en|3|79|pixar,sad|Inside Out. You use it to explain your feelings. To adults.|
m354912|f|Coco|2017|/gGEsBPAijhVUFoiNpgZXqRVWJt2|ani,fam,mus|en|3|82|pixar,sad|Coco. You’ve sung “Remember Me” at a family dinner. Lovely. Unprompted.|
m8587|f|The Lion King|1994|/sKCr78MXSLixwmZ8DyJLrpMsd15|ani,fam,dra|en|3|83|disney,comfort,old,sad|The Lion King. You still aren’t over Mufasa. It’s been thirty years.|
m808|f|Shrek|2001|/iB64vpL3dIObOtMZgX3RqdVdQDc|ani,com,fam|en|3|79|comfort|Shrek. An all-time pick. You’re either twelve or very online. We suspect online.|
m129|f|Spirited Away|2001|/39wmItIWsg5sZMyRUHLkWBcuVCM|ani,fan,fam|ja|3|89|ghibli,anime|Spirited Away. The most popular answer to “I watch anime, but the respectable kind”.|
m128|f|Princess Mononoke|1997|/cMYCDADoLKLbB83g4WnJegaZimC|ani,fan,adv|ja|2|87|ghibli,anime,old|Princess Mononoke. You call it “the mature Ghibli” so we’ll know you’ve seen the others.|
m4935|f|Howl’s Moving Castle|2004|/TkTPELv4kC3u1lkloush8skOjE|ani,fan,rom|ja|3|84|ghibli,anime|Howl’s Moving Castle. You picked it for Howl. Not the castle.|
m8392|f|My Neighbor Totoro|1988|/rtGDOeG9LzoerkDGZF9dnVeLppL|ani,fam,fan|ja|2|82|ghibli,anime,comfort,old|My Neighbor Totoro. Ninety minutes of nothing happening, and you call it your favourite.|
m12477|f|Grave of the Fireflies|1988|/k9tv1rXZbOhH7eiCk378x61kNQ1|ani,dra,war|ja|2|85|ghibli,anime,sad,old|Grave of the Fireflies. A masterpiece nobody has ever rewatched. You listed it as a favourite.|
m372058|f|Your Name|2016|/q719jXXEzOoYaps6babgKnONONX|ani,rom,dra|ja|3|85|anime,sad|Your Name. The film you show people to prove anime is “actually deep”.|
m149|f|Akira|1988|/neZ0ykEsPqxamsX6o5QNUFILQrz|ani,sci,act|ja|2|82|anime,cult,old|Akira. You’ve tried the bike slide. Spiritually.|
m10494|f|Perfect Blue|1997|/6WTiOCfDPP8XV4jqfloiVWf7KHq|ani,thr,hor|ja|1|84|anime,cult,old|Perfect Blue. You list it so people know you’ve seen anime that isn’t about fighting.|
m346|f|Seven Samurai|1954|/8OKmBV5BUFzmozIC3pPWKHy17kx|act,dra,adv|ja|1|91|old,canon,long,arthouse|Seven Samurai. Three and a half hours, from 1954. You put this here to scare us.|
m496243|f|Parasite|2019|/7IiTTgloJzvGI1TAYymCfbfl3vT|com,thr,dra|ko|3|85|oscar,arthouse|Parasite. The one subtitled film you’ve seen. You mention it like it’s twelve.|Parasite. You conquered the one-inch barrier exactly once and never went back.
m670|f|Oldboy|2003|/pWDtjs568ZfOTMbURQBYuT4Qxka|thr,mys,act|ko|2|84|arthouse,cult|Oldboy. You recommend it, then leave the room before the ending.|
m396535|f|Train to Busan|2016|/3H1WFCuxyNRP35oiL2qqwhAXxc0|hor,act,thr|ko|2|78||Train to Busan. A zombie film you’re allowed to call world cinema. Clever.|
m598|f|City of God|2002|/k7eYdWvhYQyRQoU2TB2A2Xu2TfD|cri,dra|pt|2|89|arthouse|City of God. Great pick. You bring it up when someone says they don’t do foreign films.|
m843|f|In the Mood for Love|2000|/iYypPT4bhqXfq1b6EnmxvRt6b2Y|rom,dra|zh|1|88|arthouse,slow,romance|In the Mood for Love. You watched it once in 2019 and have mentioned it weekly since.|
m194|f|Amélie|2001|/nSxDa3M9aMvGVLoItzWTepQ5h5d|rom,com|fr|2|82|indie,romance|Amélie. Your first subtitled film. You still list it like it was a dare.|
m531428|f|Portrait of a Lady on Fire|2019|/2LquGwEhbg3soxSCs9VNyh5VJd9|rom,dra|fr|1|82|arthouse,romance|Portrait of a Lady on Fire. Your Letterboxd bio has a quote from it. We can tell.|
m915935|f|Anatomy of a Fall|2023|/kQs6keheMwCxJxrzV83VUwFtHkB|thr,dra,mys|fr|1|76|arthouse|Anatomy of a Fall. You’ve argued about the verdict with someone who hasn’t seen it.|
m579974|f|RRR|2022|/nEufeZlyAOLqO2brrs0yeF1lgXO|act,dra|te|2|78|long|RRR. You’ve shown the “Naatu Naatu” clip to everyone you know. It deserves it.|
m376867|f|Moonlight|2016|/4911T5FbJ9eD2Faz5Z8cT3SUhU3|dra|en|1|74|a24,oscar,indie|Moonlight. A beautiful pick. You also want us to know you picked it.|
m391713|f|Lady Bird|2017|/iySFtKLrWvVzXzlFj7x1zalxi5G|com,dra|en|2|73|a24,indie|Lady Bird. You call your hometown by its full name like it wronged you.|
m493922|f|Hereditary|2018|/p9fmuz2Oj3HtEJEqbIwkFGUhVXD|hor,mys,dra|en|2|73|a24|Hereditary. You recommend it as “a family drama”. Then you watch their faces.|
m530385|f|Midsommar|2019|/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ|hor,dra,mys|en|2|72|a24|Midsommar. You call it “a breakup movie”. You’re not wrong. It’s still a lot.|
m545611|f|Everything Everywhere All at Once|2022|/w3LxiVYdWWRvEVdn5RYq6jIqkb1|act,com,sci|en|2|78|a24,oscar|Everything Everywhere All at Once. You cried at the rocks. You’ll cry at rocks forever now.|
m666277|f|Past Lives|2023|/k3waqVXSnvCZWfJYNtdamTgTtTA|rom,dra|en|1|78|a24,indie,sad,romance|Past Lives. You’ve thought about your in-yun with someone from primary school.|
m419430|f|Get Out|2017|/tFXcEccSQMf3lfhfXKSU9iRBpa3|hor,mys,thr|en|3|76||Get Out. A modern classic. You’ve called a Monday “the sunken place”.|
m792307|f|Poor Things|2023|/kCGlIMHnOm8JPXq3rXM6c5wMxcT|sci,com,rom|en|2|76|indie|Poor Things. You call it “a coming-of-age story”. That’s technically true.|
m930564|f|Saltburn|2023|/qjhahNLSZ705B5JP92YMEYPocPz|dra,thr,com|en|2|67|trend|Saltburn. The film everyone watched once, discussed for a week, then quietly forgot. Except you.|
m346698|f|Barbie|2023|/iuFNMS8U5cb6xfzi51Dbkovj7vM|com,fan|en|3|70|trend|Barbie. You went for the culture. You stayed for Ken. Everyone did.|
m331482|f|Little Women|2019|/yn5ihODtZ7ofn8pDYfxCmxh8AXI|dra,rom|en|2|79|period,romance|Little Women. You think you’re a Jo. Everyone thinks they’re a Jo.|
m398818|f|Call Me by Your Name|2017|/gXiE0WveDnT0n5J4sW9TMxXF4oT|rom,dra|en|2|77|indie,sad,romance|Call Me by Your Name. You romanticise long Italian summers you have never had.|
m546554|f|Knives Out|2019|/pThyQovXQrw2m0s9x82twj48Jq4|mys,com,cri|en|3|78||Knives Out. You think you’d have solved it. You wouldn’t have.|
t1396|s|Breaking Bad|2008|/ztkUQFLlC19CCMYHW9o1zWhJRNq|dra,cri,thr|en|3|89|canon,literally|Breaking Bad. You still say “I am the one who knocks” when someone’s at the door.|Breaking Bad. You rooted for a chemistry teacher with a hat and called it character study.
t60059|s|Better Call Saul|2015|/fC2HDm5t0kHl7mTm7jxMR31b7by|cri,dra|en|2|88||Better Call Saul. You say it’s better than Breaking Bad. You say it louder each year.|
t1398|s|The Sopranos|1999|/rTc7ZXdroqjkKivFPvCPX0Ru7uw|dra,cri|en|2|85|gangster,canon,old|The Sopranos. You’ve explained the ending. Nobody can explain the ending.|
t1438|s|The Wire|2002|/4lbclFySvugI51fwsyxBTOm4DqK|cri,dra|en|1|86|canon|The Wire. You tell people to give it five episodes. You’ve said this to everyone.|
t1399|s|Game of Thrones|2011|/1XS1oqL89opfnbLl8WnZY1O1uJx|dra,fan,adv|en|3|84|lore,long|Game of Thrones. You still defend it. Up to season six. Then you go quiet.|Game of Thrones. You invested eight seasons and got that ending. And you’d do it again.
t94997|s|House of the Dragon|2022|/z2yahl2uefxDCl0nogcRBstwruJ|dra,fan|en|3|83|lore|House of the Dragon. You can name every Targaryen. That isn’t the flex you think it is.|
t2316|s|The Office|2005|/7DJKHzAi83BmQrWLrYYOqcoKfhR|com|en|3|86|comfort,sitcom|The Office. Your fall-asleep show for six years running. That’s not taste. That’s a sleep routine.|
t1668|s|Friends|1994|/2koX1xLkpTQM4IZebYvKysFW1Nh|com|en|3|84|comfort,sitcom,old|Friends. Rewatch number eleven. You know every line and still pick it over anything new.|Friends. Your comfort show is older than the phone you’re reading this on. And its phone.
t48891|s|Brooklyn Nine-Nine|2013|/hgRMSOt7a1b8qyQR68vUixJPang|com,cri|en|3|82|comfort,sitcom|Brooklyn Nine-Nine. You’ve said “Noice” in a work meeting. Toit.|
t37680|s|Suits|2011|/vQiryp6LioFxQThywxbC6TuoDjy|dra,com|en|3|79|comfort|Suits. Nine seasons of people winning arguments by standing in doorways.|
t97546|s|Ted Lasso|2020|/5fhZdwP1DVJ0FyVH6vrFdHwpXIn|com,dra|en|3|85|comfort|Ted Lasso. You’ve said “Believe” to a colleague. Unironically.|
t66732|s|Stranger Things|2016|/49WJfeN0moxb9IPfGn8AIqMGskD|sci,hor,dra|en|3|86||Stranger Things. Nostalgia for an era you probably weren’t around for. Impressive work.|
t19885|s|Sherlock|2010|/7WTsnHkbA0FaG6R9twfFde0I9hl|cri,mys,dra|en|3|84||Sherlock. You think you’re observant. You still didn’t see season four coming.|
t42009|s|Black Mirror|2011|/7PRddO7z7mcPi21nZTCMGShAyy1|sci,dra,thr|en|3|83||Black Mirror. You say “that’s so Black Mirror” about a software update.|
t67070|s|Fleabag|2016|/27vEYsRKa3eAniwmoccOoluEXQ1|com,dra|en|2|87||Fleabag. You’ve glanced at an imaginary camera. In a lift.|
t76331|s|Succession|2018|/7HW47XbkNQ5fiwQFYGWdw9gs144|dra,com|en|2|87||Succession. You unwind by watching billionaires insult each other. Relaxing.|
t136315|s|The Bear|2022|/sHFlbKS3WLqMnp9t2ghADIJFnuQ|dra,com|en|2|85||The Bear. You say “Yes, chef” to your microwave.|
t95396|s|Severance|2022|/lFf6LLrQjYldcZItzOkGmMMigP7|dra,sci,mys|en|2|87||Severance. You joke about severing your work self. It’s less of a joke every Monday.|
t65494|s|The Crown|2016|/1M876KPjulVwppEpldhdc8V4o68|dra|en|2|81|period,long|The Crown. You watch royal family drama to relax. Interesting choice of relaxing.|
t60574|s|Peaky Blinders|2013|/vUUqzWa2LnHIVqkaKVlVGkVcZIW|cri,dra|en|3|85|literally,gangster|Peaky Blinders. You’ve walked in slow motion to that song. In your head, but still.|
t76479|s|The Boys|2019|/stTEycfG9928HYGEISBFaG1ngjM|act,sci,com|en|3|84||The Boys. You like your superheroes awful. Honestly, healthy.|
t85552|s|Euphoria|2019|/3Q0hd3heuWwDWpwcDkhQOA6TYWI|dra|en|3|82|trend|Euphoria. You picked it for the glitter. The plot never stood a chance.|
t93405|s|Squid Game|2021|/dDlEmu3EZ0Pgg93K2SVNLCjCSvE|dra,thr,act|ko|3|79|trend|Squid Game. You watched it dubbed and called it world cinema.|
t100088|s|The Last of Us|2023|/uKvVjHNqB5VmOrdxqAt2F7J78ED|dra,act,hor|en|3|87||The Last of Us. You played the game first and you need everyone to know.|
t119051|s|Wednesday|2022|/9PFonBhy4cQy7Jz20NpMygczOkv|com,mys,fan|en|3|84|trend|Wednesday. You learnt the dance. You performed the dance. We won’t ask where.|
t126308|s|Shōgun|2024|/7O4iVfOMQmdCSxhOg1WnzG1AgYT|dra,war|en|2|86||Shōgun. You turned the subtitles on for prestige TV. Growth.|
t94605|s|Arcane|2021|/fqldf2t8ztc9aiwn3k6mlX3tvRT|ani,act,dra|en|2|90||Arcane. You’ve told someone “it’s not just for gamers”. They hadn’t mentioned gamers.|
t1429|a|Attack on Titan|2013|/hTP1DtLGFamjfu8WqjnuQdP1n4i|ani,act,dra|ja|3|88|anime,shonen,lore|Attack on Titan. You’ve explained the ending for forty minutes. It was still divisive.|
t13916|a|Death Note|2006|/tCZFfYTIwrR7n94J6G14Y4hAFU6|ani,mys,thr|ja|3|86|anime,literally|Death Note. You think you’d have outsmarted L. You would not have outsmarted L.|
t31911|a|Fullmetal Alchemist: Brotherhood|2009|/5ZFUEOULaVml7pQuXxhpR2SmVUw|ani,adv,fan|ja|2|91|anime,shonen|Fullmetal Alchemist: Brotherhood. You say it’s “not like other anime”. It is a lot like other anime.|
t30991|a|Cowboy Bebop|1998|/xDiXDfZwC6XYC6fxHI1jl3A3Ill|ani,act,sci|ja|2|87|anime,old,cult|Cowboy Bebop. You say “See you, space cowboy” when you leave a group chat.|
t890|a|Neon Genesis Evangelion|1995|/y2ah9t0navXyIvoHg1uIbIHO3tt|ani,sci,dra|ja|2|84|anime,old,cult|Neon Genesis Evangelion. You understood the ending. Nobody understood the ending.|
t85937|a|Demon Slayer|2019|/xUfRZu2mi8jH6SzQEJGP6tjBuYj|ani,act,fan|ja|3|87|anime,shonen|Demon Slayer. You watch it “for the animation”. Every fan says it’s for the animation.|
t95479|a|Jujutsu Kaisen|2020|/fHpKWq9ayzSk8nSwqRuaAUemRKh|ani,act,fan|ja|3|86|anime,shonen|Jujutsu Kaisen. You’ve done the Domain Expansion hand sign. Recently.|
t37854|a|One Piece|1999|/cMD9Ygz11zjJzAovURpO75Qg7rT|ani,adv,act|ja|3|87|anime,shonen,long|One Piece. Over a thousand episodes. You recommend it to people with jobs.|
t46260|a|Naruto|2002|/xppeysfvDKVx775MFuH8Z9BlpMk|ani,act,adv|ja|3|83|anime,shonen,old|Naruto. You’ve run with your arms back. In a corridor. As an adult.|
t46298|a|Hunter x Hunter|2011|/i2EEr2uBvRlAwJ8d8zTG2Y19mIa|ani,adv,act|ja|2|90|anime,shonen|Hunter x Hunter. You’re still waiting for it to come back. Your patience is a lifestyle.|
t65930|a|My Hero Academia|2016|/phuYuzqWW9ru8EA3HVjE9W2Rr3M|ani,act|ja|3|80|anime,shonen|My Hero Academia. You’ve shouted “Plus Ultra”. It was not appropriate. It never is.|
t12971|a|Dragon Ball Z|1989|/ydf1CeiBLfdxiyNTpskM0802TKl|ani,act|ja|3|83|anime,shonen,old|Dragon Ball Z. A five-episode scream counted as a plot point. You were fine with that.|
t209867|a|Frieren: Beyond Journey’s End|2023|/dqZENchTd7lp5zht7BdlqM7RBhD|ani,adv,fan|ja|2|91|anime|Frieren. You picked the slow, beautiful anime. You want credit for patience.|
t120089|a|Spy x Family|2022|/3r4LYFuXrg3G8fepysr4xSLWnQL|ani,com,act|ja|3|86|anime,comfort|Spy x Family. You watch it for Anya. Everybody does. It’s fine.|
t114410|a|Chainsaw Man|2022|/npdB6eFzizki0WaZ1OvKcJrWe97|ani,act,hor|ja|3|85|anime,shonen|Chainsaw Man. You picked the anime with “chainsaw” in the title. Subtle.|
t127532|a|Solo Leveling|2024|/geCRueV3ElhRTr0xtJuEWJt6dJ1|ani,act,fan|ja|3|85|anime,shonen,trend|Solo Leveling. A man levels up alone. You describe your gym routine the same way.|
`;

const GENRE: Record<string, Genre> = {
  act: "action", adv: "adventure", ani: "animation", com: "comedy", cri: "crime", doc: "documentary",
  dra: "drama", fam: "family", fan: "fantasy", hor: "horror", mys: "mystery", rom: "romance",
  sci: "scifi", thr: "thriller", war: "war", western: "western", mus: "music",
};
const KIND: Record<string, Kind> = { f: "film", s: "series", a: "anime" };

export const POSTER_BASE = "https://image.tmdb.org/t/p/";
export const poster = (path: string, size: "w92" | "w185" | "w342" | "w500" = "w342") =>
  path ? `${POSTER_BASE}${size}${path}` : "";

export const CATALOGUE: Title[] = ROWS.trim()
  .split("\n")
  .map((row) => {
    const [key, kind, title, year, path, genres, lang, pop, acclaim, tags, line, savage] = row.split("|");
    return {
      key,
      kind: KIND[kind],
      title,
      year: Number(year),
      poster: poster(`${path}.jpg`),
      genres: genres.split(",").map((g) => GENRE[g]).filter(Boolean),
      lang,
      pop: Number(pop) as 1 | 2 | 3,
      acclaim: Number(acclaim),
      tags: tags ? tags.split(",") : [],
      line: line || undefined,
      savage: savage || undefined,
    };
  });

export const BY_KEY = new Map(CATALOGUE.map((t) => [t.key, t]));

/** Swap a poster URL to another size, used for thumbnails and exports. */
export const resize = (url: string, size: "w92" | "w185" | "w342" | "w500") =>
  url.startsWith(POSTER_BASE) ? url.replace(/\/t\/p\/w\d+\//, `/t/p/${size}/`) : url;
